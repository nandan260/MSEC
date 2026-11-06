# MSEC authentication (students, teachers, admin)

## Goal

Only people on the college roster can sign in. Students see only their own records. Teachers see only the students in their assigned branch+semester classes. Sign-in follows the MediCluster pattern: Google OAuth plus email OTP, with email + password also available. Students are grouped by branch (`department`) and semester.

## Decisions

| Topic | Decision |
|---|---|
| Account creation | The admin roster only, managed through CSV upload and a per-user editor. There is no self-registration. The first admin comes from `python seed_admin.py <email>`. |
| Allowed emails | The roster email must be in `ALLOWED_EMAIL_DOMAINS`, default `gmail.com`. Not on the roster, or `active = 0`, means rejected. |
| Teacher scope | Only the branch+semester classes in `teacher_classes`. |
| Sign-in methods | Continue with Google, email + password, and "Sign in with a code instead" (email OTP). There is no GitHub sign-in. |
| Auth server | The Flask app in `student/backend` is the single auth server. The student app, the teacher app and the Node assistant (`teacher/backend`) all verify the same JWT. |
| Out of scope | Moving the teacher app's browser-local records into the database. That is a later project. |

## Data model (SQLite, `student/backend/database.py`)

The `users` table is migrated by rebuilding it with a copy, so it works on existing databases. It keeps `id, email (unique, lowercase), role (student|faculty|admin), name, identifier (USN or staff ID), department, semester, created_at` and adds:
- `password_hash` (now nullable);
- `google_sub` (unique, nullable);
- `active` (integer, default 1);
- `token_version` (integer, default 0).

New tables:
- `teacher_classes(id, user_id → users.id, department, semester, UNIQUE(user_id, department, semester))`
- `email_codes(id, email, purpose ('login'|'reset'), code_hash, expires_at, attempts, used_at, created_at)`
- `google_flows(id = sha256(state), browser_hash, code_verifier, nonce, platform ('web'|'android'), expires_at, exchange_hash, exchange_user_id, exchange_expires_at)`
- `login_attempts(key, window_start, count)`. The key is `email:<email>` or `ip:<ip>`.

Existing seeded data stays attached to user 1 (Alex Kumar). New students start with empty data.

## Tokens

- JWT, HS256, signed with `AUTH_SECRET`. The secret is required; Flask refuses to start in production without it.
- Claims: `sub` (user ID), `role`, `tv` (token_version), `iat`, `exp`.
- Expiry is 7 days, or 30 days with `remember: true`.
- Tokens travel as `Authorization: Bearer <jwt>`. The web app stores them in localStorage, and the APK in Capacitor Preferences.
- On every request Flask checks the signature and the expiry, then loads the user and checks `active = 1` and `tv == token_version`.

## Endpoints

Public:

| Endpoint | Behaviour |
|---|---|
| `GET /api/auth/config` | Returns `{google: bool, email: bool}`. |
| `POST /api/auth/login {email, password, remember?}` | Returns `{token, user}`. 401 for an invalid email or password, with one generic message. 409 `no_password` when the roster user has no password yet. 429 when locked. |
| `POST /api/auth/code/request {email, purpose?: 'login'\|'reset'}` | Always 200 with `{message: 'If this email is registered, a code was sent.'}`. Sends a code only to active roster emails. Limits: 1 per 60 seconds per email, 10 per hour per IP. |
| `POST /api/auth/code/verify {email, code, remember?}` | Returns `{token, user}`. Codes are 6 digits and expire after 5 minutes. After 5 wrong tries the code is dead and the response is 429. Codes are single-use. |
| `POST /api/auth/password/reset {email, code, new_password}` | Uses a `reset` code. Sets the password, raises `token_version`, and returns `{token, user}`. |
| `GET /api/auth/google/start?platform=web\|android` | Redirects to Google. Uses PKCE (S256), state and nonce, and sets a browser-binding cookie `msec_google` (httpOnly, SameSite=Lax, 10 minutes, `Secure` when `PUBLIC_ORIGIN` is https). |
| `GET /api/auth/google/callback` | Checks the state and the cookie, consumes the flow once, swaps the code, and verifies the ID token (audience `GOOGLE_CLIENT_ID`, nonce, `email_verified === true`). It then applies the roster rule and links or checks `google_sub`: a different `sub` on an already linked email is a conflict. It redirects to `${PUBLIC_ORIGIN}/#/auth-return?code=<one-time>` (web) or `msecstudent://auth-return?code=<one-time>` (android). On failure it uses `?error=google_failed\|google_cancelled\|not_registered\|google_conflict`. |
| `POST /api/auth/google/exchange {code}` | The code is one-time and expires after 60 seconds. Returns `{token, user}`. |

Authenticated:

| Endpoint | Behaviour |
|---|---|
| `GET /api/auth/me` | Returns `{user}`. |
| `POST /api/auth/logout-all` | Raises `token_version`. |
| `POST /api/auth/password {current_password?, new_password}` | Sets or changes the password. At least 8 characters. `current_password` is required if a password already exists. |

`user` has the shape `{id, email, role, name, identifier, department, semester, has_password, classes?: [{department, semester}]}`.

Password lockout: 5 failures per email within 15 minutes locks that email for 15 minutes. There is also a limit of 30 failures per IP in 15 minutes.

`POST /api/auth/register` is removed.

## Access control

`require_auth(roles=None)` is a decorator that sets `g.user`. It is applied to every `/api/*` route except:
- `/api/auth/config`, `/login`, `/code/*`, `/password/reset`, `/google/*`;
- `/api/profile/verify/<usn>`;
- `/uploads/*`;
- the static SPA routes.

Students:
- Every hardcoded `student_id = 1`, every `request.form.get('student_id', 1)`, and every `SELECT * FROM student_profiles LIMIT 1` becomes the current user's ID.
- A student can never read or write another student's rows.

Faculty, using `require_auth(['faculty','admin'])`:
- `GET /api/teacher/classes`
- `GET /api/teacher/students?department=&semester=`. Returns 403 unless the class is assigned to the teacher. Admin sees all.
- `GET /api/teacher/students/<id>`: profile, attendance summary and marks. Returns 403 outside the teacher's classes.

Admin, using `require_auth(['admin'])`:
- `GET /api/admin/roster?q=&role=&department=&semester=`
- `POST /api/admin/roster` (one user)
- `PATCH /api/admin/roster/<id>` (edit, `active`, `classes`, `logout_all`)
- `POST /api/admin/roster/import`, which takes multipart CSV or JSON `{csv}` and a `dry_run` flag. CSV columns are `email,name,usn,role,branch,sem,classes`, where `classes` looks like `CSE-6;CSE-4`. The import adds and updates rows and never deletes. It returns `{created, updated, errors: [{row, message}]}`.

Node assistant (`teacher/backend`):
- The `/student-assistant/*` and `/assistant/*` chat and export routes check the JWT with the same `AUTH_SECRET`, using `node:crypto` HMAC (no new dependency). They return 401 without a valid token.
- `/student-assistant/*` requires role `student`.
- `/assistant/*` requires `faculty` or `admin`.

## Screens

**Sign-in.** This is in the student app (`AuthScreen`) and as a gate in the teacher app. The layout follows the EtherX reference screenshot, with MSEC tokens instead of gold:
- The MSEC logo at the top left.
- "Welcome back", with "Sign in to continue to MSEC." under it.
- A full-width "Continue with Google" button (light, with the Google G).
- An "OR" divider.
- An Email field and a Password field with a show/hide eye.
- A "Remember me" checkbox, and a "Forgot password?" link on the right.
- A full-width primary "Sign in" button.
- A "Sign in with a code instead" link. In code mode the form shows email, then "Send code", then a 6-digit code input and "Verify", with a "Resend" link after 60 seconds.
- In "Forgot password?" mode: email, then the code, then a new password.
- Footer: "New here? Use the Gmail your college registered."
- Methods missing from `/auth/config` are hidden.
- Errors appear inline and keep what the user typed. The screen is responsive (it uses the existing breakpoints) and has a dark-on-light MSEC theme.

**Google on the APK.** The app opens `/api/auth/google/start?platform=android` in `@capacitor/browser`. It catches `msecstudent://auth-return` through `@capacitor/app` `appUrlOpen`, then exchanges the code. This needs an Android intent filter for the `msecstudent` scheme.

**Profile.** A "Password" section with set or change.

**More → Account.** "Log out" and "Log out everywhere". An "Admin" row is shown only to admins.

**Admin screen.** A roster list with search and filters, CSV upload with a dry-run preview and per-row errors, and an add/edit sheet with role, branch, sem and classes. The edit sheet also has "Disable" and "Log out everywhere".

**Teacher app.**
- A sign-in gate that uses the same Flask endpoints. `VITE`/config `AUTH_API_BASE` points at Flask.
- A class picker built from `/api/teacher/classes`.
- A student list from `/api/teacher/students`.
- Existing local records are unchanged.

**Global client behaviour.**
- A 401 clears the token and shows sign-in, then returns to the screen the user was on.
- A 403 shows "You don't have access."
- A 429 shows the server's message.

## Configuration

`student/backend/.env.example` gets these variables:
- `AUTH_SECRET`
- `PUBLIC_ORIGIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`
- `ALLOWED_EMAIL_DOMAINS=gmail.com`
- `AUTH_DEV_LOG_CODES=0`. Only when this is `1` and `FLASK_ENV != production` are OTP codes printed to the console, for local development. They are never printed otherwise.

`teacher/backend/.env.example` gets `AUTH_SECRET`.

Python dependencies: `PyJWT`, `requests`, `python-dotenv`. Google token checks call Google's token endpoint and use `google-auth` (`google.oauth2.id_token.verify_oauth2_token`).

## Security rules

- OTP codes, Google codes and secrets are never logged.
- Codes and one-time exchange codes are stored only as SHA-256 hashes.
- OTP code comparisons use `hmac.compare_digest`.
- Passwords are hashed with werkzeug `generate_password_hash` (scrypt).
- Every flow and code is consumed once, atomically, through an `UPDATE … WHERE used_at IS NULL` row-count check.
- CORS is limited to `PUBLIC_ORIGIN`, the dev origins and the Capacitor origins. Bearer tokens are used instead of cookies for the API, so no CSRF surface is added.
- Each error message is generic and the same whether or not the email exists.

## Testing

Backend tests use pytest in `student/backend/tests/test_auth.py`, with Google token verification and EmailJS stubbed. They cover:
- roster gating: not listed, disabled, wrong domain;
- OTP: expiry, 5 wrong tries, single use, request limits, and the same response for unknown emails;
- password: login, lockout, `no_password`, set or change, reset logging out other sessions;
- JWT: tampered, expired, wrong `tv`;
- Google: bad state, missing or wrong cookie, nonce mismatch, `email_verified` false, an unknown email, a `sub` conflict, and an exchange code that is one-time and expires after 60 seconds;
- a route-map test showing that every `/api/*` rule not on the public list returns 401 without a token;
- student isolation, where A cannot see B's assignments, attendance or marks;
- teacher 403 outside their classes;
- admin CSV import (create, update, errors, dry run) and the role checks on admin routes.

Frontend tests use Vitest. They cover:
- the sign-in modes (password, code, forgot);
- hidden methods;
- errors that keep the user's input;
- the 401 redirect that returns to the original screen;
- the admin roster upload preview.

Node tests check that the assistant returns 401 without a valid JWT and accepts a token signed with `AUTH_SECRET`. Existing tests are updated to send a token.

A manual check runs the real Google flow on the web and on the APK once the OAuth client is configured.

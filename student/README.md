# College Student Management Portal

A full-stack College Student Management Portal built with **React.js**, **Python Flask**, and **SQLite**.

---

## Technology Stack

- **Frontend**: React.js (Vite), Modular Components, Clean Light Theme, Responsive CSS.
- **Backend**: Python Flask REST API, CORS enabled.
- **Database**: SQLite (`student_portal.db`), initialized and seeded automatically.
- **API Communication**: Fetch API client connecting React frontend to Flask endpoints.

---

## Features & Navigation

Direct access to the student dashboard with a professional sidebar:

1. **Dashboard (Home)**:
   - Student Name, USN, Department, Semester
   - Overall Attendance Percentage (with eligibility badge)
   - Current SGPA & CGPA
   - Upcoming Examinations Table
   - Pending Assignments Table with interactive submission
   - Recent Announcements Feed
2. **Academic Performance**: Subject-wise CIE, SEE marks, and grades
3. **Attendance**: Course-level hours attended, totals, and percentage
4. **Attendance Calculator**: Interactive calculator for safe bunks or needed classes
5. **Timetable**: Day-wise lecture schedule with room and faculty details
6. **Assignments**: Assignment tracker with functional submission actions
7. **Notes & Study Materials**: Course documents with working download actions
8. **Examinations**: Exam schedule table and printable hall ticket
9. **SGPA & CGPA Calculator**: Editable course rows to project expected grades
10. **Student Profile**: Student academic records and emergency contact update form
11. **Placement & Career**: Active campus drives with apply actions
12. **Projects Hub**: Capstone and research projects with project registration
13. **Events & Clubs**: Symposiums and hackathons with registration
14. **Library**: Borrowed textbooks with due dates and loan renewal
15. **Campus Services**: Shuttle bus transit status and cafeteria dining information
16. **Notifications**: Institutional announcements and circulars
17. **Performance Analytics**: Semester SGPA progression and subject mastery tables
18. **Faculty Doubt Portal**: Interactive student-faculty Q&A submission

---

## Quick Start Guide

### 1. Start the Flask Backend
```bash
cd backend
python app.py
```
Backend runs at `http://localhost:5000`.

### 2. Run the React Frontend (Development Mode)
In a new terminal:
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:3000` (auto-proxies `/api` to Flask).

*Alternatively, Flask serves the built React app directly at `http://localhost:5000`.*

---

## Authentication

Only people on the college roster can sign in. There is no self-registration.

**Sign-in methods**
- **Continue with Google**
- **Email + password**
- **Sign in with a code instead**: a 6-digit code sent to the user's email

Each session is a signed token (JWT) that lasts 7 days, or 30 days with "Remember me". The Flask backend checks it on every `/api` route.

**Who sees what**
- Students see only their own records.
- Teachers see only the students in the branch+semester classes assigned to them.
- Admins manage the roster from **More → Admin: Roster**.

### Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `AUTH_SECRET` to 32 or more random characters:
   `python -c "import secrets; print(secrets.token_urlsafe(48))"`
3. Set `teacher/backend/.env` to use the same `AUTH_SECRET`. The Node assistant checks the same tokens.
4. Create the first admin:
   ```bash
   cd backend && .venv/bin/python seed_admin.py you@gmail.com "Your Name"
   ```
5. Sign in as that admin. In **More → Admin: Roster**, upload a CSV with these columns:
   ```
   email,name,usn,role,branch,sem,classes
   alex@gmail.com,Alex Kumar,1MS21CS084,student,CSE,6,
   rao@gmail.com,Dr. Rao,EMP014,faculty,CSE,,CSE-6;CSE-4
   ```
   - The upload shows a preview first.
   - It adds and updates people but never deletes anyone. To remove access, disable the person.
   - The `branch` text must match exactly between students and the teacher `classes` column.

### Google sign-in

In Google Cloud Console → Credentials, create an OAuth client of type "Web application".

**Authorized redirect URIs:** `${PUBLIC_ORIGIN}/api/auth/google/callback`, for example:
- `https://msec-1.onrender.com/api/auth/google/callback`
- `http://localhost:5000/api/auth/google/callback`

**Settings:** put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.

**Return URLs**
- **Web:** Google returns to `PUBLIC_ORIGIN/#/auth-return`.
- **Teacher Desk:** Google returns to `TEACHER_ORIGIN/#/auth-return`.
- **Android APK:** Google returns to `msecstudent://auth-return`. Add this intent filter to `MainActivity` in `AndroidManifest.xml`:
  ```xml
  <intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="msecstudent" android:host="auth-return" />
  </intent-filter>
  ```

### Email codes (EmailJS)

1. Create an EmailJS service and template. The template can use these variables: `to_email`, `to_name`, `otp`, `expires_minutes`, `purpose`.
2. Set `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` and `EMAILJS_PRIVATE_KEY` in `backend/.env`.

For local development without EmailJS, set `AUTH_DEV_LOG_CODES=1`. Codes are then printed to the Flask console instead of emailed. This setting is ignored when `FLASK_ENV=production`.

### Deploying (Render)

Set these environment variables:
- `FLASK_ENV=production`
- `TRUST_PROXY=1`, so rate limits see the real client IP
- `PUBLIC_ORIGIN=https://<your-app>`
- `ALLOWED_EMAIL_DOMAINS=gmail.com`
- the Google and EmailJS keys

### Tests

```bash
cd backend && .venv/bin/pytest -q
cd frontend && npm test
cd frontend && node qa/auth-e2e.mjs
```

`qa/auth-e2e.mjs` needs all the servers running, with `AUTH_DEV_LOG_CODES=1` and `FLASK_LOG` pointing at the Flask log.

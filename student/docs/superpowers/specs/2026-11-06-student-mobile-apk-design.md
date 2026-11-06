# Student Mobile APK — Design

Date: 2026-11-06
Status: Draft, awaiting review

## Goal

Ship the Student portal as an Android APK whose UI matches the Teacher
dashboard (MSEC theme), while keeping the existing React code and Flask API.

Success means:

- The APK installs on an Android phone and opens with the MSEC splash.
- Every one of the 19 Student screens uses the Teacher visual language and
  reads well at 390px width with no horizontal scrolling of the page.
- Login and all data calls work against a hosted Flask backend.
- Side-by-side screenshots of Student and Teacher at 390px look like one
  product family.

## Decisions already made

| Topic | Decision |
|---|---|
| Target app | Student (`student/frontend`, React 19 + Vite) |
| Packaging | Capacitor Android shell around the Vite build |
| Navigation | Bottom tab bar (4 tabs + More) |
| Backend | Hosted Flask server at a public HTTPS URL |

## Out of scope

- Choosing and deploying the host for Flask (separate task; this work only
  needs the URL to be configurable).
- iOS build, push notifications, Play Store release signing.
- Changes to Teacher or College apps.
- New features or backend endpoints.

## 1. Theme

Create `frontend/src/theme/tokens.css` that holds the final Teacher look, taken
from Teacher's layered CSS (`styles.css`, `reference-theme.css`,
`overview-refresh.css`, `phone-readability.css`):

- Colours: cream page background, white/cream card surfaces, deep green
  primary, light green tint for active states, and the Teacher meaning colours
  (green good, amber warning, red/coral needs attention, blue info).
- Fonts: Manrope for headings, DM Sans for body. Fonts are bundled locally
  (no Google Fonts call), because the APK must render offline.
- Shape: 16px card radius, 12px control radius, soft 1px borders, light shadow.
- Type scale: 12px minimum for any visible text (matches Teacher commit
  `63a0b9f`), 14px body, 22–28px page titles.
- Spacing: 4px base grid; 16px page padding on phone.

Add `frontend/src/theme/components.css` with shared classes used by every
screen: `.card`, `.stat-tile`, `.list-row`, `.pill` (status badge), `.btn`,
`.btn-primary`, `.btn-ghost`, `.field`, `.section-title`, `.empty-state`.

The old `index.css` and `App.css` rules get removed as screens move to the new
classes. Old and new styles do not stay layered on top of each other. Teacher
went through several theme layers, and Student does not repeat that.

## 2. App shell

New components in `frontend/src/components/Shell/`:

- `TopBar.jsx` — MS emblem, current screen title, notification bell (opens
  Notifications), avatar (opens Profile). It respects the Android status bar
  safe area.
- `BottomTabs.jsx` — five items: Home (`dashboard`), Attendance
  (`attendance`), Academics (`academics`), Timetable (`timetable`), More.
  Active tab uses the green tint and is announced with `aria-current`.
- `MoreScreen.jsx` — grouped list of the other 15 screens:
  - Study: Assignments, Notes & Study Materials, Examinations, SGPA & CGPA
    Calculator, Attendance Calculator, Performance Analytics
  - Campus: Events & Clubs, Library, Campus Services, Placement & Career,
    Projects Hub
  - Help: Faculty Doubt Portal, Faculty Mentor
  - Account: Fees Management, Student Profile, Notifications, Log out

`Sidebar.jsx` and `Navbar.jsx` get deleted. `App.jsx` keeps its existing
screen-id switch, so routing logic does not change. The Android hardware back
button goes back to the previous screen, and on Home it exits the app
(Capacitor `App` plugin `backButton` listener plus a small history stack).

The MSEC splash (`public/msec-splash.js`) stays for web. In the APK, the
Capacitor native splash shows the same emblem, and the JS splash is skipped
when the app runs inside Capacitor, so the user does not see two splashes.

## 3. Screens

All 19 screens get restyled with the shared classes. Rules:

- Data tables become stacked cards on phone, like the Teacher attendance
  roster: one card per row, key value on the right, secondary fields below.
- Forms use full-width fields and a sticky primary button at the bottom.
- Charts keep their data and use theme colours. Axis labels must not clip.
- No horizontal scroll at the page level. Inner scroll is allowed only for a
  wide timetable grid.

`ModuleViews.jsx` (8.8k lines) is split into one file per screen under
`frontend/src/screens/` as each screen is restyled. `FeesManagementView.jsx`
and `FacultyMentorView.jsx` move to the same folder. Behaviour and API calls
stay the same. Only structure and styling change.

Phases (each phase is reviewable on its own):

1. Theme, shell, More screen, Auth screen.
2. The four tab screens: Dashboard, Attendance, Academics, Timetable.
3. Study group screens.
4. Campus, Help and Account group screens.

## 4. API base URL

- `api.js` reads `import.meta.env.VITE_API_BASE`, with fallback `''`, so dev
  keeps using the Vite proxy for `/api` and `/uploads`.
- Every hard-coded `/uploads/...` or `/api/...` URL in components (image
  `src`, download links, `fetch` calls outside `api.js`) goes through one
  helper: `apiUrl(path)`.
- `.env.android` sets `VITE_API_BASE=https://<hosted-backend>`. The APK build
  uses `vite build --mode android`.
- Flask already allows CORS on `/api/*` from any origin. Add `/uploads/*` to
  the CORS rule so images and files load in the WebView.
- Auth stays as it is now (token in `localStorage`). The Capacitor WebView
  keeps `localStorage` between launches.
- No backend reachable: the app shows a clear offline/error card with a Retry
  button, not a blank screen.

## 5. Android packaging

- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
  `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`.
- `capacitor.config.json`: appId `in.msec.student`, appName
  `MSEC Student`, webDir `dist`.
- Android project lives in `frontend/android/` and is committed, but build
  output is git-ignored.
- App icon and splash are generated from `teacher/logos/Red Book Emblem with
  ESTD_ 2002.png` with `@capacitor/assets`.
- Status bar colour matches the top bar.
- Toolchain to install on this machine: JDK 17 and Android SDK command-line
  tools (platform 35, build-tools). Only jdk8 and `adb` exist now.
- Output: debug APK at
  `frontend/android/app/build/outputs/apk/debug/app-debug.apk`, installed with
  `adb install -r`.
- npm scripts: `build:android` (vite build + `cap sync android`) and
  `apk:debug` (Gradle `assembleDebug`).

## 6. Testing

- `npm run build` and `npm run lint` pass after each phase.
- A Playwright script captures every screen at 390×844 into
  `frontend/qa/screens/`, and Teacher's matching screens go next to them for
  comparison. Checks in the script: no page-level horizontal overflow, no
  visible text below 12px, and no console errors.
- Back-button and tab navigation are checked in the APK on a device or
  emulator.
- Smoke flow in the APK: log in, open each tab, open three More screens,
  log out.

## Risks

- Restyle size: 19 screens, about 15k lines. Phases keep each review small.
- The hosted backend URL is unknown until hosting is done. Until then, the APK
  can be built against a LAN IP for testing (`VITE_API_BASE=http://<ip>:5000`,
  and this needs cleartext allowed only in the debug build).
- SQLite and uploads on hosted platforms need a persistent disk. This is
  noted for the hosting task.

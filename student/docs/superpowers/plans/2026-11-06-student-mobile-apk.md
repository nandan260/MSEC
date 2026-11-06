# Student Mobile APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Student React app to match the Teacher dashboard and ship it as an Android debug APK through Capacitor.

**Architecture:** Keep the existing React 19 + Vite app and its screen-id switch. Replace Sidebar/Navbar with a TopBar + BottomTabs + More shell driven by one navigation module. Move every screen to `src/screens/`, restyle it with shared theme classes, then wrap the Vite build in a Capacitor Android project that calls a configurable hosted Flask URL.

**Tech Stack:** React 19, Vite 8, Vitest + @testing-library/react (new), Playwright (QA script), Capacitor 7 (core, cli, android, app, browser, splash-screen, status-bar, assets), @fontsource/manrope and @fontsource/dm-sans, Flask + flask-cors, pytest (new, backend dev-only).

**Spec:** `student/docs/superpowers/specs/2026-11-06-student-mobile-apk-design.md`

All paths below are relative to `student/` unless they start with `teacher/`.

## Global Constraints

- Visible text is never below 12px. Body text is 14px, and page titles are 22–28px.
- No page-level horizontal scroll at 390×844. Only the timetable grid may scroll inside its own box.
- Headings use Manrope and body uses DM Sans. Both are bundled locally, with no network font requests.
- Card radius 16px, control radius 12px, page padding 16px, 4px spacing grid.
- Colour comes only from CSS variables in `src/theme/tokens.css`. Screens set no hex colours in inline `style`.
- Screen behaviour, API endpoints and request payloads do not change. Only structure and styling change.
- Every backend URL goes through `apiUrl(path)`. The source has no literal `/api`, `/uploads` or `localhost:5000` outside `src/api.js` (checked by grep in Task 14).
- appId `in.msec.student`, appName `MSEC Student`, webDir `dist`.
- App starts with the hard-coded `STUDENT_PROFILE` user exactly as today. Login gating is not changed.
- Bottom tabs are, in this order: Home `dashboard`, Attendance `attendance`, Academics `academics`, Timetable `timetable`, More `more`.

## Review Focus

1. **Backend unreachable or slow:** the user sees an error card with a Retry button, not a blank screen or a spinner that never stops. Test in Task 1 (`apiRequest` throws `NetworkError`) and Task 5 (`ErrorCard` retry).
2. **Android back while on More, or on a screen opened from More:** back returns to More, then Home, then exits. Back must never leave the app from a non-Home screen. Test in Task 3 (`popScreen` history cases).
3. **File downloads and attachments in the WebView:** `<a href>` downloads do nothing inside Capacitor, so the user expects the file to open. Fixed with `openExternal(url)` in Task 1, and tested there.
4. **Server-returned relative URLs (`photo_url: "/uploads/..."`):** images must load from the hosted backend. Test in Task 1 (`apiUrl` keeps absolute URLs and prefixes relative ones).
5. **Long names, subjects and amounts on 390px cards:** text wraps or truncates with an ellipsis and never pushes the page wider. Checked by the overflow assertion in the QA script (Task 6), which runs in every screen task.

---

## File Structure

```
frontend/
  .env.android                 VITE_API_BASE for APK builds
  capacitor.config.json
  android/                     Capacitor project (committed; build/ ignored)
  vitest.config.js
  qa/screens.mjs               Playwright 390px screenshot + checks
  src/
    api.js                     apiUrl, apiRequest, NetworkError, openExternal (modified)
    nav.js                     SCREENS, TABS, MORE_GROUPS, history reducer
    native.js                  Capacitor glue: back button, status bar, splash
    theme/tokens.css           variables + font imports
    theme/components.css       shared classes
    components/Shell/TopBar.jsx, BottomTabs.jsx, MoreScreen.jsx
    components/ErrorCard.jsx
    components/DataCards.jsx   table-to-cards helper
    screens/<Name>Screen.jsx   one file per screen (19)
    screens/index.js           id -> component map
    App.jsx                    shell + history (modified)
  tests/*.test.js(x)
backend/
  app.py                       CORS for /uploads (modified)
  tests/test_cors.py
  requirements-dev.txt         pytest
```

Deleted by the end: `src/components/Layout/`, `src/components/Modules/`, `src/components/Dashboard/`, `src/App.css`, and every rule in `src/index.css` (the file is removed).

---

### Task 0: Branch and commit the spec

- [ ] **Step 1:** `cd /home/vinay/MSEC && git checkout -b student-mobile-apk`
- [ ] **Step 2:** Commit the spec and this plan:

```bash
git add student/docs/superpowers
git commit -m "docs: Student mobile APK design spec and implementation plan"
```

---

### Task 1: Configurable API URL, network errors, external open

**Files:**
- Modify: `frontend/src/api.js`, `frontend/package.json`
- Create: `frontend/vitest.config.js`, `frontend/tests/api.test.js`
- Modify: `frontend/src/components/Modules/FeesManagementView.jsx:3` and every `fetch(\`${BASE}...` there, plus `ModuleViews.jsx` lines 2613, 2871, 3490, 4125, 4691, 8586, 8625
- Modify: `backend/app.py:20`. Create: `backend/tests/test_cors.py`, `backend/requirements-dev.txt`

**Interfaces:**
- Produces: `apiUrl(path: string): string`, `class NetworkError extends Error`, `apiRequest(endpoint, options)` (unchanged signature), `openExternal(url: string): Promise<void>`, `isNative(): boolean`

- [ ] **Step 1: Add the test tooling.** Install dev dependencies: `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom`. Add `"test": "vitest run"`. `vitest.config.js` uses environment `jsdom` and includes `tests/**/*.test.{js,jsx}`.
- [ ] **Step 2: Write the failing tests** in `tests/api.test.js`:
  - `apiUrl('/api/x')` returns `'/api/x'` when `VITE_API_BASE` is unset. Use `vi.stubEnv` and re-import.
  - `apiUrl('/api/x')` returns `'https://h.example/api/x'` when `VITE_API_BASE='https://h.example'`, and also when it is `'https://h.example/'` (no double slash).
  - `apiUrl('https://cdn.example/a.png')` returns the input unchanged. `apiUrl('')` and `apiUrl(null)` return `''`.
  - `apiRequest('/x')` calls `fetch` with `apiUrl('/api/x')`.
  - `apiRequest` rejects with `NetworkError` when `fetch` rejects with `TypeError`. It rejects with a plain `Error` whose message is the server `error` field on a 4xx/5xx response.
  - `openExternal(url)` calls `window.open(url, '_blank')` when not native. When `window.Capacitor.isNativePlatform()` returns true, it calls the mocked `Browser.open({ url })`.
- [ ] **Step 3:** Run `npm test` and expect FAIL (`apiUrl` is not exported).
- [ ] **Step 4: Implement in `src/api.js`.** `API_BASE` becomes `(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')`. `apiRequest` builds its URL as `apiUrl('/api' + endpoint)`. `openExternal` imports `@capacitor/browser` dynamically (`npm i @capacitor/browser @capacitor/core`).
- [ ] **Step 5:** Run `npm test` and expect PASS.
- [ ] **Step 6: Route every hard-coded URL through the helpers.** In Fees, `BASE` becomes `apiUrl('/api')`. Image `src` values get wrapped in `apiUrl(...)`. Download `<a href>` links become buttons that call `openExternal(apiUrl(...))`. Check with `grep -rnE "localhost:5000|['\`\"]/(api|uploads)" src --include=*.jsx`, which must print nothing.
- [ ] **Step 7: Backend CORS test.** `backend/tests/test_cors.py` uses `app.test_client()`. `OPTIONS /uploads/profiles/default_student.png` with `Origin: https://localhost` must return `Access-Control-Allow-Origin` in its headers. Run `cd backend && pip install -r requirements-dev.txt && pytest -q` and expect FAIL. Then change the CORS resources to `{r"/api/*": {...}, r"/uploads/*": {"origins": "*"}}`, run it again and expect PASS.
- [ ] **Step 8:** Run `npm run build` and expect success. Commit with `feat(student): configurable API base, NetworkError, external open; CORS for uploads`.

---

### Task 2: Theme tokens, shared classes, local fonts

**Files:**
- Create: `frontend/src/theme/tokens.css`, `frontend/src/theme/components.css`
- Modify: `frontend/src/main.jsx` (import theme files before `index.css`), `frontend/index.html` (title `MSEC Student`, `viewport-fit=cover`)

**Interfaces:**
- Produces CSS variables: `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--line`, `--primary`, `--primary-ink`, `--primary-tint`, `--good`, `--warn`, `--bad`, `--info`, `--radius-card` (16px), `--radius-ctl` (12px), `--pad` (16px), `--shadow`, `--font-head`, `--font-body`, `--safe-top`, `--safe-bottom`.
- Produces classes: `.page`, `.page-title`, `.section-title`, `.card`, `.card-row`, `.stat-grid`, `.stat-tile`, `.list-row`, `.pill`, `.pill--good|warn|bad|info`, `.btn`, `.btn-primary`, `.btn-ghost`, `.field`, `.field label`, `.sticky-actions`, `.empty-state`, `.scroll-x` (only for the timetable grid), `.truncate`.

- [ ] **Step 1: Read the final Teacher values.** Take the cascaded values from Teacher at 390px by running `getComputedStyle` in the browser on `body`, a card, the primary button, the active nav item and `h1` (Teacher dev server: `cd teacher/frontend && npm run dev`, port 4173). Copy those values into `tokens.css`. Do not copy Teacher's CSS files.
- [ ] **Step 2:** Install `@fontsource/manrope` (weights 600, 700, 800) and `@fontsource/dm-sans` (400, 500, 700). Import them at the top of `tokens.css`. Set `--safe-top: env(safe-area-inset-top)` and `--safe-bottom: env(safe-area-inset-bottom)`.
- [ ] **Step 3:** Write `components.css`. `.truncate` is `overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0`. `.sticky-actions` is `position:sticky; bottom:calc(64px + var(--safe-bottom))`, which places it above the tab bar.
- [ ] **Step 4:** Run `npm run build` and check that `dist/assets` contains `.woff2` files and that `dist` has no `fonts.googleapis` string (`grep -r googleapis dist` prints nothing). Commit with `feat(student): Teacher-matched theme tokens and shared classes`.

---

### Task 3: Navigation model

**Files:**
- Create: `frontend/src/nav.js`, `frontend/tests/nav.test.js`

**Interfaces:**
- Produces:
  - `SCREENS: Record<id, { label: string, icon: string }>` with 19 ids (the current `Sidebar.jsx` list) plus `more`.
  - `TABS: id[]` = `['dashboard','attendance','academics','timetable','more']`
  - `MORE_GROUPS: { title: string, ids: id[] }[]` with exactly the spec groups: Study (`assignments, notes, examinations, gpa_calc, attendance_calc, analytics`), Campus (`events, library, services, placements, projects`), Help (`doubts, faculty_mentor`), Account (`fees, profile, notifications`). Log out is an action, not a screen.
  - `tabFor(id): id` returns the tab that is highlighted for a screen. A tab id returns itself, and any other id returns `'more'`.
  - `pushScreen(stack: id[], id): id[]`, `popScreen(stack: id[]): { stack: id[], exit: boolean }`

- [ ] **Step 1: Write the failing tests:**
  - Every `MORE_GROUPS` id plus the tab ids together cover exactly the 19 screen ids, with no duplicates.
  - `tabFor('library') === 'more'` and `tabFor('timetable') === 'timetable'`.
  - `pushScreen(['dashboard'], 'dashboard')` returns `['dashboard']` (no duplicate top).
  - Selecting a tab resets the stack: `pushScreen(['dashboard','more','library'], 'attendance')` returns `['dashboard','attendance']`. Home is always at the bottom, and `pushScreen(s,'dashboard')` returns `['dashboard']`.
  - `popScreen(['dashboard','more','library'])` returns stack `['dashboard','more']` with `exit:false`.
  - `popScreen(['dashboard'])` returns `exit:true`.
- [ ] **Step 2:** Run `npm test` and expect FAIL.
- [ ] **Step 3:** Implement `nav.js`. A tab id resets the stack to `['dashboard', tab]`. A non-tab id is pushed on top.
- [ ] **Step 4:** Run `npm test` and expect PASS. Commit with `feat(student): navigation model for tabs, More and back history`.

---

### Task 4: App shell (TopBar, BottomTabs, More) wired into App

**Files:**
- Create: `frontend/src/components/Shell/TopBar.jsx`, `BottomTabs.jsx`, `MoreScreen.jsx`, `frontend/src/screens/index.js`, `frontend/tests/shell.test.jsx`
- Modify: `frontend/src/App.jsx`
- Delete: `frontend/src/components/Layout/Sidebar.jsx`, `Navbar.jsx`

**Interfaces:**
- Consumes: `SCREENS, TABS, MORE_GROUPS, tabFor, pushScreen, popScreen` (Task 3), theme classes (Task 2).
- Produces:
  - `TopBar({ title, onBell, onAvatar, user })`
  - `BottomTabs({ active, onSelect })`
  - `MoreScreen({ onOpen, onLogout })`
  - `screens/index.js` default export `SCREEN_COMPONENTS: Record<id, Component>`, which re-exports from the current module files until each screen moves.
  - `App` keeps `stack` state, and exposes `navigate(id)` and `goBack(): boolean` (returns `exit`) on `window.__msecNav` for `native.js`.

- [ ] **Step 1: Write the failing tests** in `shell.test.jsx`:
  - `BottomTabs` renders 5 buttons with labels Home, Attendance, Academics, Timetable, More in that order. The active one has `aria-current="page"`.
  - `MoreScreen` renders the 4 group headings and calls `onOpen('library')` when Library is clicked. Its Log out button calls `onLogout`.
  - `App` renders TopBar title "Dashboard" at start. Clicking More and then Library shows title "Library", and the More tab stays `aria-current`.
- [ ] **Step 2:** Run `npm test` and expect FAIL.
- [ ] **Step 3: Implement the shell.** `App` renders `<TopBar/>`, `<main className="page">`, `<BottomTabs/>`. The bell opens `notifications` and the avatar opens `profile`. Remove the `mobileOpen` state. Keep the `switch` behaviour by looking up `SCREEN_COMPONENTS[id]`, and pass the same props as today (`userRole`, `currentUser`, and `onNavigate` for the dashboard).
- [ ] **Step 4:** Run `npm test` and expect PASS. Run `npm run build` and expect success.
- [ ] **Step 5:** Commit with `feat(student): mobile shell with bottom tabs and More screen`.

---

### Task 5: ErrorCard and the table-to-cards helper

**Files:**
- Create: `frontend/src/components/ErrorCard.jsx`, `frontend/src/components/DataCards.jsx`, `frontend/tests/components.test.jsx`

**Interfaces:**
- Produces:
  - `ErrorCard({ error, onRetry })`. It shows "Can't reach the server" and a Retry button when `error instanceof NetworkError`, otherwise it shows `error.message`.
  - `DataCards({ rows, title: row => node, value?: row => node, meta?: { label, render }[], keyOf })` renders one `.card` per row. `title` and `value` sit on one line (`.truncate` on the title), and the `meta` fields are listed below them.

- [ ] **Step 1: Write the failing tests:**
  - `ErrorCard` with `new NetworkError()` shows the text "Can't reach the server", and clicking Retry calls `onRetry` once.
  - `DataCards` with 3 rows renders 3 `.card` elements. With `rows=[]` it renders `.empty-state` with the text "Nothing here yet".
- [ ] **Step 2:** Run the tests and expect FAIL. **Step 3:** Implement. **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5:** Commit with `feat(student): ErrorCard and DataCards shared components`.

---

### Task 6: 390px QA script

**Files:**
- Create: `frontend/qa/screens.mjs`. Modify `package.json` (dev dependency `playwright`, script `"qa": "node qa/screens.mjs"`), `.gitignore` (`qa/out/`)

**Interfaces:**
- Produces: `node qa/screens.mjs [id ...]`. It starts nothing itself and expects `vite preview` on `http://localhost:4174` plus Flask on 5000. For each id it navigates through `window.__msecNav.navigate(id)`, waits for network idle and writes `qa/out/<id>.png`. It exits non-zero if any check fails.

- [ ] **Step 1: Implement the checks.** For each screen:
  - (a) `document.documentElement.scrollWidth <= 390`. On failure, print the widest offending element selector.
  - (b) Collect every visible text node whose `getComputedStyle(parent).fontSize` is below 12px. Fail on any and print the first 5.
  - (c) Any `console.error` or `pageerror` fails the run.
- [ ] **Step 2: Run it against the current state.** Commands: `npm run build && npx vite preview --port 4174 &`, then `(cd ../backend && python main.py &)`, then `npm run qa`. Expect FAIL on the unstyled screens. Record the failing ids in the commit message, because they are the baseline.
- [ ] **Step 3:** Commit with `test(student): 390px screen QA script`.

---

### Tasks 7–13: Restyle screens

The same recipe applies to every task below. Each task ends with `npm test`, `npm run build`, `npm run lint`, and `npm run qa <its ids>` all passing, then one commit `feat(student): restyle <screens>`.

Recipe for each screen:
1. Move the component into `src/screens/<Name>Screen.jsx`. Keep the export name and props, and update `screens/index.js`.
2. Replace inline `style={{...}}` colour, spacing, radius and font values with the Task 2 classes. Inline style may remain only for computed values such as a bar width percentage.
3. Replace each `<table>` with `DataCards`, except the timetable grid.
4. Show `ErrorCard` with a working `onRetry` wherever the screen currently swallows or prints an error from `apiRequest`.
5. Colour meaning follows Teacher: attendance ≥ 85 `good`, 75–84 `warn`, < 75 `bad`. Use the thresholds the screen already uses if it has them.
6. Put the 390px screenshot next to the matching Teacher screen (Teacher `#overview` for Dashboard, `#attendance` for Attendance) and fix any visible mismatch in card, heading or button style.

- [ ] **Task 7 (Phase 1):** `AuthScreen` moves to `screens/AuthScreen.jsx`. Fields are full width and the primary button uses `.btn-primary`. The QA id is `auth`: render it in the QA script through `?screen=auth`, which needs a small dev-only branch in `App.jsx`. Also delete the `index.css` and `App.css` rules used only by Layout.
- [ ] **Task 8 (Phase 2):** `dashboard` (`DashboardHome`). It gets stat tiles for Attendance %, SGPA, CGPA, then "Today's classes", upcoming exams and pending assignments as `DataCards`, then announcements.
- [ ] **Task 9 (Phase 2):** `attendance` and `attendance_calc`.
- [ ] **Task 10 (Phase 2):** `academics` and `timetable`. The timetable shows a day picker (Mon–Sat chips) with that day's lecture cards, and the full grid sits behind a "Week view" toggle inside `.scroll-x`.
- [ ] **Task 11 (Phase 3, Study):** `assignments`, `notes`, `examinations`, `gpa_calc`, `analytics`. Upload forms use `.sticky-actions`. Charts use the `--good/--warn/--bad/--info` colours and no axis label may be clipped. The QA overflow check covers that.
- [ ] **Task 12 (Phase 4, Campus + Help):** `events`, `library`, `services`, `placements`, `projects`, `doubts`, `faculty_mentor`. Split this into two commits if the diff goes over about 3k lines: Campus first, then Help.
- [ ] **Task 13 (Phase 4, Account):** `fees`, `profile`, `notifications`. Fee amounts stay in Indian format exactly as rendered today.

---

### Task 14: Remove legacy CSS and folders

**Files:**
- Delete: `src/index.css`, `src/App.css`, `src/components/Modules/`, `src/components/Dashboard/`, `src/components/Layout/` (if still present), `src/assets/react.svg`, `src/assets/vite.svg`, and the empty `src/index.ts`
- Modify: `src/main.jsx` (drop the `index.css` import)

- [ ] **Step 1:** Delete the files and folders.
- [ ] **Step 2:** Check with `grep -rnE "localhost:5000|['\`\"]/(api|uploads)" src --include=*.jsx` and `grep -rnE "style=\{\{[^}]*#[0-9a-fA-F]{3,6}" src`. Both must print nothing.
- [ ] **Step 3:** Run `npm test && npm run build && npm run lint && npm run qa`. All 19 ids plus `more` and `auth` must pass.
- [ ] **Step 4:** Commit with `refactor(student): remove legacy layout and CSS`.

---

### Task 15: Capacitor Android project and debug APK

**Files:**
- Create: `frontend/capacitor.config.json`, `frontend/.env.android`, `frontend/src/native.js`, `frontend/tests/native.test.js`, `frontend/android/` (generated), `frontend/resources/icon.png` and `splash.png` (copied from `teacher/logos/Red Book Emblem with ESTD_ 2002.png`)
- Modify: `frontend/package.json` scripts, `frontend/src/main.jsx` (call `initNative()`), `frontend/public/msec-splash.js` (return early when `window.Capacitor?.isNativePlatform?.()`), `.gitignore` (`frontend/android/app/build/`, `frontend/android/.gradle/`)

**Interfaces:**
- Consumes: `window.__msecNav.goBack(): boolean` (Task 4), `isNative()` (Task 1).
- Produces: `initNative(): Promise<void>`. On native platforms it registers `App.addListener('backButton', ...)`, which calls `goBack()` and runs `App.exitApp()` when that returns true. It also sets the status bar background to the `--surface` token value with a dark style, and hides the native splash after the first React render.

- [ ] **Step 1: Write the failing test** in `native.test.js`, with mocked `@capacitor/app`, `@capacitor/status-bar` and `@capacitor/splash-screen`:
  - When native, a back event with `goBack` returning false does not call `exitApp`. With `goBack` returning true it calls `exitApp` once.
  - When not native, no listener is registered.
- [ ] **Step 2:** Run the test and expect FAIL. **Step 3:** Implement `native.js`. **Step 4:** Run the test and expect PASS.
- [ ] **Step 5: Install the toolchain.** This needs the user's OK for system package installs. Run `sudo pacman -S jdk17-openjdk`, then download Android command-line tools to `~/Android/Sdk` and run `sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"`. Set `ANDROID_HOME=~/Android/Sdk` and `JAVA_HOME=/usr/lib/jvm/java-17-openjdk`. Check: `java -version` reports 17.
- [ ] **Step 6: Create the Capacitor project.** Install `@capacitor/cli @capacitor/android @capacitor/app @capacitor/splash-screen @capacitor/status-bar` and dev dependency `@capacitor/assets`. Write `capacitor.config.json` with the appId, appName and webDir from Global Constraints. Set `SplashScreen.launchAutoHide: false`, because `initNative` hides the splash. Then run `npx cap add android` and `npx @capacitor/assets generate --android`.
- [ ] **Step 7: Add the scripts and env file.**
  - Scripts: `"build:android": "vite build --mode android && cap sync android"` and `"apk:debug": "npm run build:android && cd android && ./gradlew assembleDebug"`.
  - `.env.android` holds `VITE_API_BASE=` set to the hosted URL. Until hosting is done, use `http://<laptop-LAN-IP>:5000`, and allow cleartext only in the debug manifest (`android/app/src/debug/AndroidManifest.xml`, `android:usesCleartextTraffic="true"`).
- [ ] **Step 8:** Run `npm run apk:debug` and check that `android/app/build/outputs/apk/debug/app-debug.apk` exists.
- [ ] **Step 9: Device smoke test.** Run `adb install -r` on the APK, with the Flask backend running on the LAN IP. Then check each item:
  - The native splash shows once.
  - Home loads with data.
  - Each tab opens.
  - More, then Library, then back returns to More. Back again returns to Home, and back once more exits the app.
  - A download opens.
  - With Wi-Fi off, the ErrorCard appears, and Retry works after Wi-Fi is back on.
  - Save `adb exec-out screencap -p` captures of Home and More to `frontend/qa/out/device-*.png`.
- [ ] **Step 10:** Commit with `feat(student): Capacitor Android project, native back/splash/status bar, debug APK build`.

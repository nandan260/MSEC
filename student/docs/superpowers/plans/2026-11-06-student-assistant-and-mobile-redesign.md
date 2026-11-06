# Student Ask AI + Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the student "Ask AI" assistant so it matches the spec, and restyle the student mobile app to the imported `MSEC Mobile.dc.html` design.

**Architecture:** The assistant lives in `teacher/backend` (Node/TS, :8000) under `/student-assistant/*`. It uses the shared `runAgent` loop in `src/agent.ts` and reads Flask (:5000) through allowlisted GET tools. The student React app adds an "Ask AI" tab, and its shell and screens are restyled to the design's pill tab bar and card system.

**Tech Stack:** Node 22 + TypeScript, `@langchain/langgraph`, `pptxgenjs`, `pdfkit`, `unpdf` (new, PDF text extraction), `node:test`; React 19 + Vite 8, Vitest, Capacitor 8; Flask + SQLite (read-only from the assistant).

**Spec:** `student/docs/superpowers/specs/2026-11-06-student-assistant-design.md`
**Design source:** Claude Design project `06ef9e21-7ff8-404b-adf9-70987d78f13f`, file `MSEC Mobile.dc.html`. A local copy is in the session scratchpad `design/`. Re-fetch it with DesignSync `get_file` if needed. The render screenshot is `.playwright-mcp/design/render.png`.

**Tool names:** keep Codex's `get_<endpoint>` names (`get_examinations`, `get_academic_performance` and so on) instead of the spec table's short names. The behaviour is the same. The spec's optional filters (`day`, `course`, `due_within_days`) are dropped: the model filters the returned rows.

**Starting point:** Codex has already implemented spec section 1 (uncommitted). Its work includes:
- `agent.ts` (`configuration`, `runAgent`, `boundedText`);
- `student-tools.ts` (`screens`, `endpoints`, `validateCard`, `toolDefinitions`, `runTool`);
- `student-assistant.ts` (`studentChat`);
- `student-exports.ts` (`studentExport`);
- the routes in `index.ts`;
- the frontend `assistant-api.js`, `AssistantScreen.jsx`, `assistant.css`, the `nav.js` assistant tab and the `vite.config.js` proxy.

Task 0 verifies this work and commits it. Later tasks close the gaps between it and the spec.

## Global Constraints

- The assistant never writes to Flask. It uses GET only, on paths in `endpoints` or `/notes/<int>/download`.
- `AI_API_KEY` exists only in `teacher/backend/.env`. Nothing model-related ships in the APK.
- The tool budget is 8 calls per turn. Each Flask call has a 10-second timeout. Each model call has a 60-second timeout.
- `read_note` text is capped at 30,000 characters.
- `attendance_plan` uses a default threshold of 75.
- Error statuses: validation 400, model not configured or unreachable 503, model or upstream failure 502. Every error is JSON `{error}`.
- The tab order is exactly `dashboard, attendance, assistant, academics, timetable, more`. The labels are `Home, Attendance, Ask AI, Academics, Timetable, More`.
- Design tokens come from the design file: background `#FAF8FC`, primary `#4E2478`, primary dark `#38195A`, accent `#F30137`, ink `#1A1523`, muted `#5C5468`, soft primary `#EDE4F5`, soft accent `#FDE2E7`, Poppins 600/700/800 for headings, Inter 400/500/600 for body text.
- Every screen must work at 390px width with no horizontal scroll.
- `dangerouslySetInnerHTML` is never used for assistant output.
- The teacher test suite (`cd teacher/backend && npm test`) must stay green after every backend task.
- Do not touch `vtu-notes-hub/`, `brag-output/` or `.playwright-mcp/`.

## Review Focus

1. **Flask down mid-conversation.** The reply should name the data it couldn't load and give no guessed numbers. Task 2 adds the test `tool error surfaces as warning not invented data`.
2. **Long multi-turn chat near the 30-message limit.** The frontend should send only the last 30 messages, never a 400. Task 5 adds the test `sends at most 30 messages`.
3. **Course name vs code.** "Compiler Design" and "cs603" should both resolve to the course in `attendance_plan`. Task 1 adds the case `matches course by title or code case-insensitively`.
4. **Model returns a malformed card.** The card should be dropped, a warning added, and the text answer kept. Task 3 adds the test `invalid card dropped with warning`.
5. **Export tapped twice or while offline.** One download at a time. The button is disabled while a download runs, and an offline message is shown. Task 5 adds the test `export button disabled while pending and when offline`.

---

### Task 0: Verify and commit Codex baseline

**Files:** all of Codex's uncommitted changes listed in "Starting point".

- [ ] **Step 1:** Run `cd teacher/backend && npm test`. Expected: all pass, teacher tests included.
- [ ] **Step 2:** Run `cd student/frontend && npm test && npm run lint && npm run build`. Expected: exit 0.
- [ ] **Step 3:** Read Codex's final report, `scratchpad/codex-last.md`. Fix any failure it lists before you commit.
- [ ] **Step 4:** Commit:
```bash
git add teacher/backend student/frontend/src student/frontend/vite.config.js student/frontend/tests
git commit -m "feat(assistant): add student assistant service and Ask AI screen (baseline)"
```

### Task 1: Calculator tools

**Files:**
- Create: `teacher/backend/src/student-calc.ts`
- Modify: `teacher/backend/src/student-tools.ts` (register the tools)
- Test: `teacher/backend/tests/student-calc.test.mjs`

**Interfaces:**
- Produces:
  - `attendancePlan(rows: Array<{course_code:string, course_title:string, attended:number, total:number}>, course: string, threshold = 75): {course_code, course_title, attended, total, percent:number, canSkip:number, mustAttend:number}`
  - `sgpaTarget(courses: Array<{course_code:string, credits:number}>, target: number): {reachable:boolean, requiredAverageGradePoint:number, maxGradePoint:10}`
  - Tools: `attendance_plan({course, threshold?})` and `sgpa_target({target})`. Each fetches its own data (`/attendance`, `/academics/performance`) and returns the result plus a `stat` card candidate.
- Field names: before you write the code, check the real field names with `curl localhost:5000/api/attendance` and `curl localhost:5000/api/academics/performance`, and map them in the tool, not in the calculator.

- [ ] **Step 1:** Write the failing tests in `student-calc.test.mjs`:
  - `33/46 needs 6 more` (CS603 data from the design): `attendancePlan([{course_code:'CS603',course_title:'Compiler Design',attended:33,total:46}],'CS603')` gives `mustAttend: 6, canSkip: 0, percent: 71.7` (rounded to 1 decimal place). The design's "next 5 classes" is placeholder copy; the math gives 6.
  - `exactly 75% can skip 0`: 30/40 gives `canSkip: 0, mustAttend: 0`.
  - `above threshold`: 46/50 gives `canSkip: 11` (46/61 ≥ 0.75, 46/62 < 0.75).
  - `zero classes held`: 0/0 gives `percent: 0, canSkip: 0, mustAttend: 0`.
  - `matches course by title or code case-insensitively`: `'compiler design'` and `'cs603'` both resolve. An unknown course throws `ApiError` 400 `Unknown course.`.
  - `sgpa target unreachable above 10`: `sgpaTarget(..., 10.5).reachable === false`.
  - `sgpa target average`: credits [4,4,3,3], target 9.5, gives `requiredAverageGradePoint: 9.5`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement. `mustAttend` is the smallest n with `(a+n)/(t+n) ≥ th/100`. `canSkip` is the largest k with `a/(t+k) ≥ th/100`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(assistant): add attendance_plan and sgpa_target tools`.

### Task 2: `read_note` + tool error handling

**Files:**
- Modify: `teacher/backend/src/student-tools.ts`, `teacher/backend/package.json` (add `unpdf`)
- Test: `teacher/backend/tests/student-assistant.test.mjs`

**Interfaces:**
- Produces: the tool `read_note({id:number})`, which returns `{id, title, text:string, truncated:boolean}` or `{id, title, text:'', note:'No extractable text in this file.'}`.
- Flask failure: every data tool returns `{error:'Could not load <tool label>.'}` instead of throwing. `runTool` pushes the same string into `output.warnings`.

- [ ] **Step 1:** Write the failing tests. The fake Flask serves `/notes/7/download` as a PDF built with pdfkit containing "Paxos uses ballots".
  - `read_note extracts text`: the result text includes `Paxos uses ballots`.
  - `read_note caps at 30000 chars`: `truncated: true`.
  - `read_note no text`: the seeded stub bytes `%PDF-1.4\nDistributed Systems Academic Notes.\n` give `text: ''` plus the note.
  - `read_note rejects non-integer id`: 400.
  - `tool error surfaces as warning not invented data`: the fake Flask returns 500 on `/attendance`. The response `warnings` contains `Could not load attendance.`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement with `unpdf` `extractText`, with `mergePages: true`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(assistant): add read_note PDF text tool and tool error warnings`.

### Task 3: Card kinds, budget and status

**Files:**
- Modify: `teacher/backend/src/student-tools.ts` (`validateCard`, `cardContract`), `student-assistant.ts`, `student-exports.ts`, `index.ts`
- Test: `teacher/backend/tests/student-assistant.test.mjs`

**Interfaces:**
- Produces the card union from the spec's "API contract": `stat`, `list`, `study` (with `source:'notes'|'general'`) and `report`. The model emits cards through a `show_card({card})` tool, which replaces `make_export`. Exports happen client-side from a card.
- `GET /student-assistant/status` returns `{configured, model}`.
- `studentExport`: `study` accepts `pptx` or `pdf`. `report` accepts `pdf` only, and `pptx` returns 400 `Reports export as PDF.`.

- [ ] **Step 1:** Write the failing tests:
  - `stat card validated`: value is clamped to 0–100 when unit is `%`.
  - `list card max 50 items`.
  - `study card requires source`.
  - `invalid card dropped with warning`: the model emits `{kind:'chart'}`. The response has `cards: []`, the warning `Dropped an invalid card.` and the message preserved.
  - `tool budget 8`: the fake model loops tool calls, the 9th call is not executed, and the warning text is in `warnings`.
  - `status reports configured false without AI_MODEL`.
  - `report pptx rejected`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Pass `toolBudget: 8` to `runAgent`. Update the system prompt per spec "Behaviour rules".
- [ ] **Step 4:** Run `npm test`. Expected: PASS, teacher tests included.
- [ ] **Step 5:** Commit: `feat(assistant): stat/list cards, show_card tool, budget 8, status route`.

### Task 4: Shell restyle: pill tab bar, tab order, icons

**Files:**
- Modify: `student/frontend/src/nav.js` (`TABS` order), `src/components/Shell/BottomTabs.jsx`, `shell.css`, `icons.jsx` (add the design's `spark` path `M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 3v4 M17 5h4 M5 17v4 M3 19h4`), `src/theme/*` (tokens)
- Test: `student/frontend/tests/nav.test.js`, `tests/shell.test.jsx`

**Interfaces:**
- Produces: `TABS = ['dashboard','attendance','assistant','academics','timetable','more']`. `SCREENS.assistant.label` is `'Ask AI'` (the existing label key).

- [ ] **Step 1:** Write the failing tests:
  - `TABS order matches design`.
  - `active tab shows label, idle tabs icon-only`: in the design, only the active pill shows text, and the other tabs carry an `aria-label`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the floating pill bar: white, radius 999, shadow, inset 16px from the screen edges. The active pill is `#4E2478` with white icon and label. The idle tabs are icon-only, colour `#5C5468`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(student): pill tab bar with Ask AI as third tab`.

### Task 5: Ask AI screen to design 03

**Files:**
- Modify: `student/frontend/src/screens/AssistantScreen.jsx`, `assistant.css`, `src/assistant-api.js`
- Create: `src/screens/assistant/Cards.jsx` (renders `stat`, `list`, `study` and `report`)
- Test: `student/frontend/tests/screens/assistant.test.jsx`

**Interfaces:**
- Consumes: the Task 3 card union and `/status`.
- `assistant-api.js`: `chat(messages, currentScreen)` sends `messages.slice(-30)`. `exportCard(card, format)` returns a Blob. `status()`.

- [ ] **Step 1:** Write the failing tests:
  - `renders five chips when empty`: the exact chip copy from the spec.
  - `stat card shows value and threshold marker`: `CS603`, `72%`, a marker at 75%.
  - `navigate action calls onNavigate with screen`.
  - `503 shows setup message and keeps input`: the text is `Assistant not set up. Start OmniRoute.`.
  - `502 shows retry`.
  - `sends at most 30 messages`.
  - `export button disabled while pending and when offline`.
  - `composer disabled offline`: simulate `navigator.onLine=false` plus an `offline` event.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement per design 03:
  - user bubbles: `#4E2478`, white text, radius 20, aligned right;
  - assistant cards: white, aligned left;
  - "TRY ASKING" label: uppercase, letter-spacing .04em;
  - composer: pinned above the tab bar, with a red `#F30137` round send button;
  - an activity line from `trace` while pending.
  - Downloads: on native, use `@capacitor/browser` with a blob URL fallback.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(student): Ask AI screen per design with cards, errors, offline`.

### Task 6: Home and Attendance to design 01 and 02

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`, `dashboard.css`, `AttendanceScreen.jsx`, `attendance.css`
- Test: `tests/screens/` (extend the existing dashboard and attendance tests)

- [ ] **Step 1:** Write the failing tests:
  - Home: `Hi, <first name>` greeting plus the date line. A purple hero with an attendance ring, an "Eligible for exams" pill, and SGPA/CGPA tiles. A horizontal "Exams" scroller of date-badge cards. A "Due soon" list with a coloured left bar and a "Submit" pill.
  - Attendance: a big ring with the overall %, the stats `Attended / Held / Can skip`, a warning banner `<course> is below 75%` for each course under 75, and per-subject rows with a bar that is green at 75 or above and red below.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement with the existing data hooks (`useTracked` and the API calls already in these screens). Take "Can skip" from the same formula as Task 1, ported as `src/attendanceMath.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(student): restyle home and attendance to mobile design`.

### Task 7: Academics, Timetable and More to design 04–06

**Files:**
- Modify: `AcademicsScreen.jsx`, `academics.css`, `TimetableScreen.jsx` (+ css), `src/components/Shell/MoreScreen.jsx`, `shell.css`
- Test: `tests/screens/`

- [ ] **Step 1:** Write the failing tests:
  - Academics: a CGPA card with a delta pill and a semester bar chart (S1…Sn, current semester bar filled `#4E2478`), and a "Semester N · SGPA x" list with grade badge, course, credits and marks.
  - Timetable: a month label, a Mon–Sat day pills strip (today selected), and time-rail cards. The card for the current period gets a filled primary style and a `Now` badge.
  - More: a profile card (avatar initials, name, USN · dept · sem) that opens `profile`, and the groups `STUDY`, `CAMPUS`, `HELP`, `ACCOUNT` from `MORE_GROUPS` as icon rows with a chevron.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. "Now" is computed from the device clock in Asia/Kolkata.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(student): restyle academics, timetable and more to mobile design`.

### Task 8: Offline and 404 states (design 07 and 08)

**Files:**
- Create: `src/components/Shell/OfflineState.jsx`, `src/screens/NotFoundScreen.jsx`
- Modify: `App.jsx` (an online/offline listener, and an unknown screen ID shows NotFound), `ErrorCard.jsx` (network errors render OfflineState)
- Test: `tests/shell.test.jsx`

- [ ] **Step 1:** Write the failing tests:
  - `offline shows "You're offline" with last-updated time and Try again`.
  - `Try again refetches`.
  - `unknown screen renders 404 with "Go to Home" and "Ask AI for help"`: the buttons navigate to `dashboard` and `assistant`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. The 404 numeral is `4` `0` `4` with the `0` in `#F30137`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(student): offline and not-found states`.

### Task 9: End-to-end check at 390px

- [ ] **Step 1:** Start Flask (`student/backend/.venv/bin/python app.py`), Node (`cd teacher/backend && npm run dev`, with `.env` `AI_BASE_URL` set to the OmniRoute `/v1` URL), OmniRoute, and Vite.
- [ ] **Step 2:** Run `cd student/frontend && npm run qa`. Expected: screenshots of all screens with no console errors. Compare each screen against `.playwright-mcp/design/render.png` by eye.
- [ ] **Step 3:** Ask each of the 5 chips in Ask AI. Each one returns a grounded answer, or the honest 503 state if no model is configured. Download one PDF report and one PPTX study card, and open both.
- [ ] **Step 4:** Run all suites: `cd teacher/backend && npm test`, `cd student/frontend && npm test && npm run lint && npm run build`. Expected: all green.
- [ ] **Step 5:** Commit any QA fixes: `fix(student): QA fixes from 390px pass`.

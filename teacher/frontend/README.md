# Teacher Desk

A responsive, standalone teacher dashboard for MSEC. All 17 requested areas have screens and browser-local workflows. Existing `/home/vinay/msec-teacher-management` backend is untouched.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:4173. Frontend development proxies `/api/` to `http://127.0.0.1:8000`. Start the backend separately for assistant chat and exports; see `../README.md`. Static-only hosting cannot execute assistant tools.

## Verify

```sh
npm test
npm run check
npm run dev  # separate terminal
npm run qa
```

Browser QA uses installed Chrome at `/usr/bin/google-chrome-stable`. Set `CHROME_PATH` for a different executable in the main QA script. Screenshots appear in `artifacts/`.

## Included

- Overview with derived counters, class chart, actual weekday schedule and to-do list.
- Classes with editable room, timetable and roster; searchable student profiles and records.
- Attendance with four statuses, whole-class marking, date selection, session updates and CSV export.
- Assignments with drafts, deadlines, instructions, attachments, seeded submissions, feedback and grade-change history.
- Tests/quizzes with question papers, local practice responses, evaluation and downloadable papers.
- Analytics and progress with support flags and subject averages.
- Connected LangGraph teaching assistant: multi-turn chat, dashboard navigation, grounded student insights, visual lessons/quizzes, supplied-text summaries, YouTube resources, PPTX and XLSX exports.
- Study materials with IndexedDB attachments, reload persistence and downloads.
- Weekly timetable, examination dates, local announcements and notification inbox.
- Doubt replies, parent communication drafts, local leave/substitution requests and CSV reports.
- Editable profile, notification preference and record backup export.

## Data and integration limits

Uses fictional sample records. Domain records save to localStorage; file binaries save to IndexedDB, limited to 25 MB per file. A JSON backup contains records and file metadata, not file binaries. Data belongs to this browser origin and does not sync between devices. Term scores/attendance are sample academic records; newly recorded attendance sessions appear separately.

No live MSEC authentication, shared database, remote exam delivery, external messaging or leave approval is included. Assistant inference uses a configured server-side model connection. Announcements, parent messages, leave requests and practice sessions clearly disclose their local status. Backend integration requires authenticated APIs, institution policies, upload storage and institution-owned records. No secrets belong in browser code.

## Structure

`dist/model.js`: domain functions and sample data. `dist/views.js`: escaped UI templates. `dist/app.js`: routing, forms and mutations. `dist/files.js`: attachment storage. `dist/icons.js`: inline SVG icons. `dist/styles.css`: responsive design.

## Blender dashboard design

The overview uses a warm ivory workspace, Blender-rendered desk illustration,
raised panels, a dimensional faculty pass and responsive teaching cards.
The sidebar retains all 17 modules; the seven-day chart reflects actual assigned
sessions, assessments and pending evaluations. Each route fits the viewport; long records scroll inside panels. The overview
groups activity, insights and workspace shortcuts into keyboard-accessible tabs. Labels support text enlargement, keyboard focus stays visible,
and reduced-motion preferences disable transitions.

Editable artwork and full dashboard Blender scenes live in `../design/blender/`.
The full scene is a static visual mockup; browser controls and records stay live.

Run `node scripts/reference-layout-qa.mjs` and `node scripts/weekly-chart-qa.mjs`
for artwork, shortcuts, sidebar naming, responsive overflow, 200% text,
keyboard focus, reduced motion, zero-value chart bars and short-screen controls.
These run in `npm run qa`. Run `npm run qa:viewport` to verify all 17 routes
at desktop, laptop, tablet, phone and short-screen sizes.

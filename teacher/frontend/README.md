# Teacher Desk

A responsive, standalone teacher dashboard for MSEC. All 17 requested areas have screens and browser-local workflows. Existing `/home/vinay/msec-teacher-management` backend is untouched.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:4173. Static deployment serves `dist/`; no build is needed.

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
- Clearly labeled local teaching templates for quizzes, question banks, lesson plans and study outlines.
- Study materials with IndexedDB attachments, reload persistence and downloads.
- Weekly timetable, examination dates, local announcements and notification inbox.
- Doubt replies, parent communication drafts, local leave/substitution requests and CSV reports.
- Editable profile, notification preference and record backup export.

## Data and integration limits

Uses fictional sample records. Domain records save to localStorage; file binaries save to IndexedDB, limited to 25 MB per file. A JSON backup contains records and file metadata, not file binaries. Data belongs to this browser origin and does not sync between devices. Term scores/attendance are sample academic records; newly recorded attendance sessions appear separately.

No live MSEC authentication, shared database, remote exam delivery, external messaging, leave approval or live AI connection is included. Announcements, parent messages, leave requests and practice sessions clearly disclose their local status. Backend integration requires authenticated APIs, institution policies, upload storage and an AI server endpoint. No secrets belong in browser code.

## Structure

`dist/model.js`: domain functions and sample data. `dist/views.js`: escaped UI templates. `dist/app.js`: routing, forms and mutations. `dist/files.js`: attachment storage. `dist/icons.js`: inline SVG icons. `dist/styles.css`: responsive design.

## Screenshot-led design

Desktop now uses a centered gray canvas, rounded compact application frame, grouped/collapsible navigation, seven-day teaching-load chart and card carousel. The overview fits standard laptop screens; smaller displays stack panels. Navigation keeps all 17 modules available. Fonts and demo portraits ship locally. The primary chart reflects assigned weekly sessions, scheduled assessments and current pending evaluations; zero counts draw no bars.

Run `node scripts/reference-layout-qa.mjs` and `node scripts/weekly-chart-qa.mjs` for geometry, sidebar naming, zero-value data bars and short-screen control checks. These run in `npm run qa`.

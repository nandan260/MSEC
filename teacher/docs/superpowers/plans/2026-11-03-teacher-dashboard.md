# Teacher Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Track steps below.

**Goal:** Deliver functional standalone teacher dashboard across 17 modules.
**Architecture:** Static browser app with render modules, reusable dialogs, pure domain functions, localStorage records and IndexedDB attachments.
**Tech Stack:** HTML, CSS, JavaScript ES modules, Node test runner.
**Spec:** docs/superpowers/specs/2026-11-03-teacher-dashboard-design.md

## Global Constraints
- Demo data only; no external message delivery or real AI claims.
- Existing MSEC backend remains unchanged.
- Persist records locally; escape user content; responsive and keyboard accessible.

## Review Focus
- Blank or invalid grades must not become zero marks.
- Repeated attendance saves must update same session.
- Missing browser storage must produce clear feedback.
- Search and empty filters must render useful empty states.
- File uploads must survive reload and remain downloadable.

### Task 1: Domain and persistence
Files: dist/model.js, tests/model.test.js, package.json.
- [x] Write failing tests for attendance upserts, grade bounds, CSV escaping and student risk.
- [x] Run node --test, verify failures; implement exports and rerun.

### Task 2: Complete dashboard
Files: dist/index.html, dist/styles.css, dist/app.js, dist/views.js, dist/icons.js, dist/files.js.
Interfaces: model exports seedData(), saveAttendance(state,classId,date,records), gradeSubmission(state,id,value), toCSV(rows), atRisk(student).
- [x] Build overview and 16 linked modules with shared forms and persistent mutations.
- [x] Add attachment persistence, reports, offline templates and demo status.
- [x] Verify navigation, saves, reload, report downloads, empty states, mobile layout and keyboard dialogs.

### Task 3: Delivery
- [x] Run full tests, syntax checks, browser QA where available.
- [x] Fresh reviewer checks functionality and scope.
- [ ] Package source with Sites workflow; deploy private; confirm returned URL.

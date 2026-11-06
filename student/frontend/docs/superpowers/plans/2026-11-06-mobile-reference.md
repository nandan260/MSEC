# MSEC Mobile implementation plan

Goal: match the eight reference screens in existing React/Vite student app.
Spec: ../specs/2026-11-06-mobile-reference-design.md.
User requested direct implementation, skipping further design questions.

- [x] Add behavioral coverage for 404 navigation and offline saved records; run red.
- [x] Update Home, Attendance, Academics, Timetable, More and shared mobile spacing.
  Retain existing API calls, role-based actions, semester/day switching and dialogs.
- [x] Add user-scoped offline read cache, invalidate on mutations/logout, and render
  real timestamps; no offline mutation replay or invented records.
- [x] Add 404 recovery; refine Ask AI layout and keep its live conversation.
- [x] Run full Vitest suite, lint, production build and browser checks at mobile,
  narrow and desktop widths. Inspect screenshots and correct visible issues.

Review focus: subject shortages despite good overall attendance; missing history;
stale day requests; inaccessible fixed controls on narrow screens; per-user cache.

Verification: 166 tests passed across 24 files; production build passed; lint
exited successfully with warnings. Browser checks passed at 320px, 390px and
1440px: all six tabs, saved weekly timetable restore, 404 recovery, AI composer
clearance, and no horizontal overflow. Screenshots: qa/out/mobile-reference/.
Live AI replies were not verified: the configured assistant backend on port 8000
was unavailable. Existing assistant integration and error handling remain intact.

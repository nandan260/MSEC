# Single-screen Dashboard Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline. Steps use checkbox syntax.

**Goal:** Fit all 17 routes inside viewport, keeping long content reachable inside panels.
**Architecture:** Add workspace layout helper after rendering, retaining existing templates and delegated events. Add final stylesheet for viewport constraints and compact overview groups.
**Tech Stack:** TypeScript, CSS, existing Playwright browser QA.
**Spec:** docs/superpowers/specs/2026-11-04-single-screen-design.md

## Global Constraints
- Preserve records, forms, all routes and existing palette.
- No whole-page scrolling; long lists use internal scrolling.
- Keep text readable and controls reachable at mobile and enlarged text sizes.

## Review Focus
- All routes at 1440x900, 1366x768 and 390x844 must fit viewport.
- Last student and table actions must remain reachable via panel scroll.
- Overview tabs support keyboard selection and retain selected group on rerender.
- Profile save and attendance save remain usable.
- Short screens and 200% text keep internal scroll access without clipping controls.

### Task 1: Bounded workspace layout
**Files:** create frontend/src/workspace.ts, frontend/dist/workspace.css, frontend/scripts/viewport-qa.mjs; modify frontend/src/app.ts, frontend/dist/index.html, frontend/package.json.
- [x] Add browser regression for page bounds, panel scrolling, overview tab keyboard behavior and profile/attendance actions.
- [x] Run before implementation and confirm overflow failure.
- [x] Implement bounded shell, compact overview with accessible tabs, scrollable content panels and sticky table headings.
- [x] Run viewport QA, model tests, type checks and existing workflow QA.
- [x] Rebuild running Docker frontend and verify served pages and backend health.

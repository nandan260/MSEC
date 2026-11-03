# Screenshot Match Correction Plan

> **For agentic workers:** Native execution using existing workflow and browser regressions.

**Goal:** Correct visual composition against user-supplied screenshot.
**Architecture:** Existing standalone app; shared framing stylesheet, revised overview and grouped navigation. Preserve domain/storage code.
**Tech Stack:** Vanilla JavaScript, CSS, local fonts/portraits, Playwright.
**Spec:** docs/superpowers/specs/2026-11-03-screenshot-match.md

## Global Constraints
- Preserve all 17 modules and browser-local records.
- Preserve owner-private Site identity.
- No fictional quantities in data charts.

## Review Focus
- Shorter desktop screens must not clip controls irrecoverably.
- Icon-only sidebar controls retain accessible names and submenu access.
- Zero quantities produce no data bars.
- Existing keyboard, storage and upload flows continue passing.
- Local typography/assets load without external runtime requests.

## Tasks
- [x] Add layout regression, observe failure for missing frame.
- [x] Rebuild application frame, sidebar, weekly chart, carousel and lower panels.
- [x] Independent review; reproduce and fix clipped short-screen controls, unnamed collapsed links and fabricated chart bars.
- [x] Bundle variable Inter and demo portraits; add asset URL versions.
- [x] Pass full domain, syntax, browser, contrast, geometry and zero-value checks.
- [ ] Package and publish existing private Site; confirm URL.

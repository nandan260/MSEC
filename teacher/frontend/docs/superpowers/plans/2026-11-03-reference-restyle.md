# Reference Restyle Implementation Plan

> **For agentic workers:** Use native implementation and existing browser regression checks.

**Goal:** Give Teacher Desk the reference's modular white/gray, lime and black dashboard treatment.
**Architecture:** Replace overview markup and chart treatment; restyle shared components through dedicated CSS. Existing event handlers and data remain.
**Tech Stack:** Existing vanilla HTML, CSS and JavaScript.
**Spec:** docs/superpowers/specs/2026-11-03-reference-restyle-design.md

## Global Constraints
- Retain all 17 routes, browser-local data and owner-private Site.
- Retain existing labels and action hooks used by working forms.
- No new backend, external messaging or AI claims.

## Review Focus
- Overview shortcuts route to correct class/student pages.
- Chart values and gauges derive from actual demo records.
- Sidebar and panels fit tablet/mobile widths.
- Dense layout still exposes readable text and keyboard focus.
- Existing browser storage regression checks continue passing.

## Tasks
- [x] Recompose overview: chart/metrics, teacher card, quick actions, goals, subject breakdown, gauge, tasks, schedule and support table.
- [x] Apply palette, typography, spacing, chart hatching and shared component styles across all routes.
- [x] Run syntax/domain/browser tests; inspect desktop/mobile screenshots.
- [ ] Package exact source; deploy existing private Site and confirm URL.

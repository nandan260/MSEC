# Blender dashboard implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the approved dimensional teacher dashboard with genuine Blender artwork.
**Architecture:** Static Blender render plus accessible HTML and CSS over existing live TypeScript views.
**Tech stack:** Blender Python, TypeScript, CSS, SVG, nginx, Docker Compose.
**Spec:** `docs/superpowers/specs/2026-11-03-blender-dashboard-design.md`

## Global constraints

- Keep routes, teaching actions, records and browser storage intact.
- Retain the Blender generator and editable scene; no WebGL dependency.
- Use warm ivory, forest, sage and lime; honor reduced motion.
- Preserve readable charts, keyboard focus and responsive layouts.

## Review focus

- Short laptop screens must scroll rather than shrink text.
- Mobile layouts must not overflow horizontally.
- Hero artwork must not obstruct controls or meaningful text.
- Existing teaching actions and task persistence must work after restyling.
- Docker and the public tunnel must serve the latest assets.

## Task 1: Blender artwork

Files: `design/blender/create_dashboard.py`, `design/blender/teacher-desk.blend`,
`frontend/dist/assets/teacher-desk-3d.png`.
Produces: transparent PNG and reproducible editable Blender scene.

- [x] Create desk, books, notebook, pencil and plant with rounded geometry and soft lighting.
- [x] Render PNG; inspect composition and check transparent image dimensions.

## Task 2: Dashboard presentation

Files: `frontend/src/views.ts`, `frontend/dist/dimensional.css`, `frontend/dist/index.html`.
Consumes: `assets/teacher-desk-3d.png`. Produces: dimensional hero, readable overview and shared shell.

- [x] Add hero with dynamic teacher name, working shortcuts and decorative artwork.
- [x] Apply sculpted cards, semantic colors, legible type and mobile/short-screen layouts.
- [x] Build and check TypeScript; run existing model, browser workflow and contrast checks.
- [x] Inspect desktop/mobile screenshots, keyboard focus, 200% text behavior and overflow.

## Task 3: Delivery

Files: README and design spec status.
Consumes: approved dashboard assets; produces: running updated Docker dashboard.

- [x] Review implementation against the spec, fix material findings, record checks.
- [x] Rebuild Docker; verify healthy services and latest content over the public tunnel.
- [x] Document render command and editable scene location.

## Execution notes

User approved implementation. Execute inline; preserve existing Docker files and running servers.
Visual changes use browser inspection and existing workflow tests rather than tests that mirror CSS.


## Completion record

- Model tests: 5/5; TypeScript build and checks pass.
- Full `npm run qa` passes: 17 routes, teaching workflows, safe rendering,
  storage persistence/retry, CSV, uploads, contrast, responsive layout, sidebar,
  keyboard focus, reduced motion and chart behavior.
- Independent review found short-screen navigation collapse at 200% text.
  Added the 1366×600 / 200% case, observed failure, then preserved navigation
  height and made the sidebar scroll. Full suite passes after the fix.
- Six default viewport sizes (320–1440 CSS pixels) and 200% text on mobile,
  desktop and short screens have no horizontal overflow.
- User requested viewing the whole dashboard in Blender during implementation.
  Added `create_dashboard_preview.py`, `teacher-dashboard.blend` and a rendered
  preview, separate from the production artwork. Both scenes are open in Blender.
- Docker images rebuilt; both services healthy. Existing Cloudflare tunnel serves
  the new stylesheet and artwork; API health returns `status: ok`.
- User explicitly prohibits GitHub push. All changes remain local on
  `feat/blender-dashboard`; no commits, merge, push or PR performed.

Implementation choices: work in the active checkout on a feature branch to keep
local preview and Docker context current. Use existing workflow QA and visual
inspection for styling; update superseded geometry assertions to test scrolling,
readability and working navigation instead.

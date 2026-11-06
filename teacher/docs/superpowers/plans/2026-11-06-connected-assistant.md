# Connected teacher assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Deliver connected, grounded teacher assistant with real tools, visual teaching and exports.
**Architecture:** Existing browser AppState supplies snapshot to stateless backend LangGraph agent. Frontend renders escaped structured cards/actions. Independent backend/frontend implementations follow shared HTTP contract.
**Tech Stack:** TypeScript, LangGraph, PptxGenJS, ExcelJS, native DOM.
**Spec:** teacher/docs/superpowers/specs/2026-11-06-connected-assistant-design.md

## Global Constraints
No API keys in browser. No invented scores/links. Preserve student work and existing dashboard routes. Backend errors are explicit. Agents do not commit or spawn agents; parent integrates.

## Review Focus
Unconfigured/unreachable model; invalid/malicious tool content; follow-up conversation and record grounding; valid Office ZIP output; narrow viewport transcript/composer fit.

### Task 1: Backend assistant
Files: backend/src/{index,assistant,tools,exports}.ts; backend/tests/assistant.test.ts; package files.
- [x] Write and run failing tests for record grounding, route allowlist, provider failure, bounded tool loop and Office ZIP output.
- [x] Implement shared contract, server-side provider, LangGraph tool loop, deterministic record tools, structured teaching tool, YouTube resources and typed exports.
- [x] Build and run tests; report commands and limitations.

### Task 2: Chat frontend
Files: frontend/src/assistant.ts, views.ts, app.ts; dist/assistant.css, index.html.
- [x] Write meaningful failing tests for escaped output, record insight calculations, route allowlisting and invalid external URLs.
- [x] Replace template UI with persistent chat, suggestions, text input/file context, tool activity, actionable student alerts, safe diagrams, resource links and downloads.
- [x] Build/check; report tests and modified integration points.

### Task 3: Deployment and integration
Files: teacher/compose.yaml, Dockerfile, frontend/scripts/dev-server.py, package.json, README.
- [x] Wire runtime dependencies, environment and development /api proxy.
- [x] Run backend/frontend suites and browser E2E using local test model boundary; verify model tool roundtrip, student dialog/navigation, lesson diagrams, download contents, failure state and mobile layout.
- [x] Review integration and fix failures. Record evidence, setup requirements and limits.

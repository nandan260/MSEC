# Connected assistant verification — 2026-11-06

## Automated evidence
- Backend: npm test — TypeScript build and 14 tests pass.
- Frontend: npm run build, npm run check, npm test — 15 tests pass.
- Frontend full npm run qa — all existing workflows, 17 routes/five viewport sizes, contrast, storage and keyboard checks pass.
- npm run qa:assistant — model/tool HTTP boundary, 26 student cards, student dialogs, global student notifications, route actions, directed diagram, YouTube fallback, PPTX/multi-sheet XLSX ZIP/readback, upstream failure draft preservation, upload rejection, mobile/desktop fit and no runtime errors pass.
- npm audit --omit=dev in backend — zero reported vulnerabilities after scoped compatible dependency overrides.

## Actual model evidence
Existing Hermes Ollama Cloud connection, model gpt-oss:120b, authenticated server-side with no copied key file.
- Saved student query returned Aditya Nair 64% score and 79% attendance, a grounded student card and student-detail action; HTTP200.
- BST teaching request returned create_lesson artifact with three diagram nodes, three slides and one quiz; HTTP200.
- The live teaching test exposed missing sections[].body in model arguments; exact schema repair guidance fixes this without accepting fake teaching content.
- Empty optional studentIds from the model no longer suppresses query matches.

## Running local service
Frontend http://localhost:4173/#ai proxies /api to backend http://127.0.0.1:8000. Backend binds loopback by default; Docker explicitly uses 0.0.0.0 within its container. Start with teacher/scripts/start-assistant.py --hermes to reuse local Hermes credentials, or configure backend/.env for another model.

## Honest limits
Academic percentages remain sample/browser-local records. Saved grades and attendance sessions stay separate and export as saved. No live school authentication/database or background external notifications added. YouTube key absent means clearly labeled search URLs; no unviewed transcript summaries. Text uploads only, 100000 bytes. Automated provider simulation is test-only; actual model calls above are separate verification.

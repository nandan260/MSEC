# Student AI assistant ("Ask AI")

## Goal

Give students an in-app assistant that answers questions about their own data (timetable, exams, assignments, notes, attendance, marks, fees, events and more). It also teaches study topics, produces PPTX and PDF files, and guides students to every feature of the app.

Success means a student can ask "what's due this week?", "how many classes can I skip in Compiler Design?", "summarise the ML notes" or "make my attendance report as a PDF". They get a correct answer that is grounded in their own records, with buttons that open the matching screen or download the file.

## Decisions

| Topic | Decision |
|---|---|
| Scope of outputs | Both study help (topic explanations, slides, quizzes) and personal reports (attendance, exams, marks, timetable, assignments). |
| Model provider | Configurable OpenAI-compatible endpoint. OmniRoute for now, set through `AI_BASE_URL`. Shares `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` with the teacher assistant. |
| Entry point | Dedicated "Ask AI" bottom tab. The bar has 6 tabs: Home, Attendance, Ask AI, Academics, Timetable, More. This order follows the `MSEC Mobile.dc.html` design. |
| Where it runs | Extends the existing teacher Node service (`teacher/backend`, port 8000). Flask stays the single source of truth. |
| Visual design | Follows the imported Claude Design project `MSEC Mobile.dc.html`, screen 03 "Ask AI". The offline state follows screen 07. |

## Known constraint

The Flask backend does not verify tokens. Routes hardcode `student_id = 1`. The assistant forwards the student's `Authorization` header on every Flask call, so it becomes per-student as soon as Flask enforces auth. Until then, the assistant sees the same data as the rest of the app.

## Architecture

```
Student app (React/Capacitor)
  └─ "Ask AI" tab ──POST {ASSISTANT_BASE}/student-assistant/chat──┐
                                                                  ▼
teacher/backend (Node, :8000)
  ├─ /assistant/*            existing teacher assistant (behaviour unchanged)
  └─ /student-assistant/*    new
       ├─ GET  status   {configured, model}
       ├─ POST chat     LangGraph model/tool loop -> AI_BASE_URL (OmniRoute)
       ├─ POST export   PPTX (pptxgenjs) and PDF (pdfkit)
       └─ tools         read-only HTTP GETs -> Flask STUDENT_API_BASE
```

- `src/agent.ts` holds the shared model/tool loop and takes `{systemPrompt, tools, runTool, toolBudget}`. The teacher and student assistants both use it.
- `src/student-tools.ts` holds the tool definitions, the allowlisted Flask endpoints, the calculators and the screen catalogue.
- `src/student-assistant.ts` holds the system prompt, request validation and response shaping.
- `src/student-exports.ts` generates the PPTX and PDF files.
- Configuration: `STUDENT_API_BASE` (default `http://127.0.0.1:5000/api`). The model variables are shared with the teacher assistant. Keys exist only in the Node `.env` file.
- Frontend: the Vite dev proxy sends `/assistant-api` to `:8000`, with the prefix stripped. The APK reads the base URL from `VITE_ASSISTANT_BASE`.

## API contract

`GET /student-assistant/status` returns `{configured: boolean, model: string}`.

`POST /student-assistant/chat` takes a body of `{messages: Array<{role: 'user'|'assistant', content: string}>, currentScreen: ScreenId}`:
- `messages` holds 1 to 30 messages, and the last one must come from the user.
- `currentScreen` must be one of the allowed screen IDs.

It returns:

```
{
  message: string,
  actions: Array<{type: 'navigate', screen: ScreenId, label: string}>,
  cards: Card[],
  trace: string[],      // tool names called, for the activity line
  warnings: string[]
}
```

Card types:

- `stat`: `{kind, title, label, value: number, unit: '%'|'', threshold?: number, note?: string}`. Renders as the inline progress card in the mockup, for example "CS603 72%" against a 75% marker.
- `list`: `{kind, title, items: Array<{primary, secondary?, meta?}>}`. Used for exams, due work and timetable rows.
- `study`: `{kind, title, summary, sections: [{title, body}], slides: [{title, bullets[], notes?}], quiz?: [{question, answer}], source: 'notes'|'general'}`.
- `report`: `{kind, title, report: 'attendance'|'exams'|'timetable'|'marks'|'assignments', columns: string[], rows: Array<Record<string, string|number>>}`.

`POST /student-assistant/export` takes `{format: 'pptx'|'pdf', card: study|report}` and returns the binary file with the correct MIME type and `Content-Disposition`. A `study` card exports to PPTX or PDF. A `report` card exports to PDF.

Every error is returned as JSON `{error}`. Validation errors return 400. A missing or unreachable model returns 503. A model or upstream failure returns 502.

## Tools

Every data tool reads exactly one allowlisted Flask GET endpoint. No tool can write.

| Tool | Flask endpoint |
|---|---|
| `get_today` | `/dashboard/summary` |
| `get_timetable(day?)` | `/timetable` |
| `get_exams` | `/examinations` |
| `get_assignments(due_within_days?)` | `/assignments` |
| `get_notes(course?)` | `/notes` |
| `read_note(id)` | `/notes/<id>/download`, then PDF text extraction capped at 30,000 characters |
| `get_attendance` | `/attendance` |
| `get_marks` | `/academics/performance` |
| `get_gpa_history` | `/gpa/history` |
| `get_events` | `/events/my-registrations` |
| `get_library` | `/library/my-books` |
| `get_fees` | `/fees/student-details` |
| `get_notifications` | `/notifications` |
| `get_mentor` | `/mentor/my-mentor` |

The calculators are deterministic code, so the model never does the arithmetic itself:

- `attendance_plan(course, threshold = 75)` uses attended and held counts to return either the number of classes the student can skip and stay at or above the threshold, or the number of consecutive classes needed to reach it.
- `sgpa_target(target)` uses the current semester courses and credits to return the average grade point needed and the achievable combinations, or reports that the target is not reachable.

Navigation:

- `navigate(screen)` returns a navigate action for one of the allowed screens.
- The system prompt holds a one-line description of every screen in `nav.js` except `more`, so "where do I pay fees?" gets an answer plus an "Open Fees Management" button.

Each Flask call has a 10-second timeout. Large arrays are trimmed before they go to the model. The tool budget is 8 calls per turn. When the budget runs out, the reply holds a partial answer plus a warning.

## Behaviour rules (system prompt)

- Personal facts (timetable, marks, attendance, exams, fees) come only from tool results. The assistant never invents them.
- When the assistant teaches a general topic from model knowledge, the `study` card has `source: 'general'` and the reply says so.
- When the assistant summarises notes, the `study` card has `source: 'notes'`. If `read_note` returns no text, the assistant says that and does not summarise.
- The assistant never submits, registers, pays or edits anything. It points to the screen where the student can do it.
- Replies are short. The assistant includes a navigate action whenever a screen is relevant.

## Ask AI screen

This screen follows design screen 03.

- The header holds the spark icon and the title "Ask AI".
- The transcript scrolls. User messages are purple bubbles on the right. Assistant messages are white cards on the left.
- Cards render inside the assistant message.
- Navigate actions are shown as buttons.
- `study` and `report` cards have "Download PPTX" and "Download PDF" buttons. The downloads use Capacitor Browser or a blob download.
- A "Try asking" chip group is shown when the transcript is empty. The chips are:
  - "What's due this week?"
  - "SGPA needed for 9.5"
  - "Summarise ML notes"
  - "Today's timetable"
  - "Make attendance report PDF"
- The composer is pinned above the tab bar. It has the placeholder "Ask anything…" and a red round send button.
- While a request runs, the screen shows a typing indicator plus the activity line from `trace`, for example "Checking attendance…".
- Text is rendered as plain text with simple bullet lists. The screen never uses `dangerouslySetInnerHTML`.
- Layout is checked at 390px width.

## Errors and offline

| Case | Status | UI |
|---|---|---|
| Model not configured, or OmniRoute unreachable | 503 | "Assistant not set up. Start OmniRoute." The typed input is kept, and the chips still navigate. |
| Model failure or 60-second timeout | 502 | "AI didn't respond" with a Retry button. The input is kept. |
| Flask down during a tool call | tool `{error}` | The assistant says which data could not be loaded. |
| Invalid request | 400 | Generic error message. |
| Tool budget exhausted | 200 | Partial answer plus an entry in `warnings`. |
| Device offline | n/a | Design screen 07, "You're offline" with "Try again". The composer is disabled, and the transcript stays readable. |

## Safety

- The API key stays on the server and is never sent to the APK.
- The tool layer cannot reach any Flask path outside the allowlist, and it uses only the GET method.
- Exports are built from validated, length-bounded card fields, never from raw model text.
- Model output is never rendered as HTML.

## Testing

Backend tests use `node:test` in `teacher/backend/tests/student-assistant.test.mjs`, with a fake OpenAI-compatible server and a fake Flask server. They cover:
- request validation;
- the allowlist, so that no unlisted path can be reached;
- forwarding of the `Authorization` header;
- table tests for `attendance_plan`, including exactly 75% and 0 classes held;
- table tests for `sgpa_target`, including an unreachable target;
- `read_note` with a PDF that has no text;
- navigate actions;
- PPTX and PDF output that opens as valid files;
- the 503 and 502 paths.

The existing teacher test suite must stay green.

Frontend tests use Vitest. They cover the 6-tab order, plus the Ask AI screen rendering chips, cards, actions and the error state.

The manual check is a Playwright run at 390px against the real Flask backend and OmniRoute, when a model is configured.

## Out of scope

- Write actions such as submitting, registering or paying.
- Voice input.
- Chat history that persists across app restarts.
- Notes in formats other than PDF.
- Authentication fixes in Flask. Those are tracked separately.

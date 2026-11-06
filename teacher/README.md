# Teacher Service

Teacher service aligned with the MSEC multi-project architecture.

## Docker

```sh
docker compose up -d --build
```

Open http://localhost:4180. The frontend serves the dashboard and proxies
`/api/` to the Node TypeScript backend; check `/api/health` for API health.
Set `FRONTEND_PORT` to change the host port. Stop with `docker compose down`.
Dashboard records remain browser-local; each new origin has separate data.

To share the running dashboard through a temporary public Cloudflare tunnel:

```sh
cloudflared tunnel --url http://127.0.0.1:4180
```

Keep the tunnel process running to keep its generated URL available.

## Blender design

Open `design/blender/teacher-dashboard.blend` for the full editable 3D dashboard
presentation. Cards, text, chart columns and desk objects are separate objects.
Use Numpad 0 for the presentation camera, or orbit to inspect depth. This scene
is a visual mockup with sample values; working controls and live records belong
to the browser app.

`design/blender/teacher-desk.blend` contains the production hero artwork.
Regenerate the artwork and full dashboard preview with:

```sh
blender -b --python design/blender/create_dashboard.py
blender -b --python design/blender/create_dashboard_preview.py
```

The first command writes `frontend/dist/assets/teacher-desk-3d.png`.
The second writes `design/blender/dashboard-preview.png`.

## Structure

```
├── frontend/         # Teacher Dashboard web application
└── backend/          # Node TypeScript service (Docker default); legacy FastAPI entry point
```

## Getting Started

### Frontend

```sh
cd frontend
npm install
npm run dev
```

For more details, see [`frontend/README.md`](file:///home/vinay/teacher-dashboard/frontend/README.md).

### Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```


## Connected teaching assistant

The assistant uses a real server-side model/tool loop (LangGraph), not a template generator. It can search dashboard features and records, offer navigation/student-profile actions, explain topics with diagrams and quizzes, summarize supplied text, find YouTube resources, and create actual PowerPoint/Excel downloads. Student support cards derive from current browser records. XLSX exports preserve numeric values; generated teaching content stays editable.

For a regular provider or local model:

```sh
cd backend
npm install
cp .env.example .env
# Set AI_BASE_URL, AI_MODEL, AI_API_KEY in .env, then:
npm run dev
```

Use a tool-capable model. The default output/reasoning budget is 8000 tokens; set `AI_MAX_TOKENS` for a different budget (1000–32000). A local compatible endpoint can run without a key. Keep keys server-side; never put them in frontend files. Start frontend separately with `cd teacher/frontend && npm run dev` from repository root. Its `/api/` proxy targets backend port 8000; set `TEACHER_BACKEND_URL` to change it.

To reuse an existing Hermes Ollama Cloud connection without copying credentials, from repository root:

```sh
cd teacher/backend && npm install && npm run build
cd ../..
python3 teacher/scripts/start-assistant.py --hermes
```

The launcher reads only the existing Hermes Ollama key into child-process environment, and defaults to `gpt-oss:120b`. Choose another compatible cloud model with `--model MODEL`. It does not write keys to disk. Ordinary server startup uses only its explicitly configured environment.

For Docker, copy `backend/.env.example` to `teacher/.env`, fill settings, and run `docker compose up -d --build` from `teacher/`. Docker uses the environment declared in compose; it does not read Hermes credentials automatically.

YouTube searches use `YOUTUBE_API_KEY` when set. Without it, results are clearly labeled YouTube search links rather than invented video URLs. The assistant summarizes pasted/uploaded text, not unseen video transcripts. Supported uploads: TXT, MD, CSV, JSON up to 100,000 UTF-8 bytes. PDF/image parsing and background push notifications are not included. Student alerts appear in-app; existing student academic percentages are sample records, while saved submissions/marks are queried as saved. No AI tool changes marks or sends messages.

Verification:

```sh
cd teacher/backend && npm test
cd ../frontend && npm run build && npm run check && npm test
npm run qa:assistant
```

Assistant browser QA starts isolated local test servers and a test-only model boundary, verifies tool roundtrips and Office ZIP contents, then stops them. Real model availability and credentials are separate from these automated tests.

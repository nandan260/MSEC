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


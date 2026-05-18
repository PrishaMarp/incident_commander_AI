"""FastAPI app: health check + WebSocket incident trace stream."""

import asyncio
import json
import sys
from collections.abc import AsyncIterator, Callable
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.gemini_util import format_api_error  # noqa: E402
from backend.orchestrator import SCENARIOS, run_incident  # noqa: E402
from backend.scenarios import list_scenario_catalog  # noqa: E402
from backend.trace import TraceEvent  # noqa: E402

app = FastAPI(title="Incident Commander AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_DIST = _ROOT / "frontend" / "dist"
_INDEX = _DIST / "index.html"
_ASSETS = _DIST / "assets"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/scenarios")
async def list_scenarios() -> dict[str, list]:
    """Return scenario metadata for the UI; only ids present in SCENARIOS are listed."""
    known = set(SCENARIOS)
    return {"scenarios": [s for s in list_scenario_catalog() if s["id"] in known]}


@app.get("/sse/incident")
async def incident_sse(scenario: str = Query(default="db_failure")) -> StreamingResponse:
    """Same trace events as WebSocket, over SSE — use on Vercel (no WebSocket on serverless)."""

    async def event_stream() -> AsyncIterator[bytes]:
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[TraceEvent | None] = asyncio.Queue()
        emit = _threadsafe_emit(loop, queue)

        async def run_pipeline() -> None:
            try:
                await asyncio.to_thread(run_incident, scenario, emit)
            except ValueError as exc:
                await queue.put({"type": "agent_error", "agent": "orchestrator", "message": str(exc)})
            except Exception as exc:
                await queue.put(
                    {
                        "type": "agent_error",
                        "agent": "orchestrator",
                        "message": format_api_error(exc),
                    }
                )
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_pipeline())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                line = "data: " + json.dumps(event, separators=(",", ":")) + "\n\n"
                yield line.encode("utf-8")
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _threadsafe_emit(
    loop: asyncio.AbstractEventLoop, queue: asyncio.Queue
) -> Callable[[TraceEvent], None]:
    def emit(event: TraceEvent) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, event)

    return emit


@app.websocket("/ws/incident")
async def incident_ws(
    websocket: WebSocket,
    scenario: str = Query(default="db_failure"),
) -> None:
    await websocket.accept()
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[TraceEvent | None] = asyncio.Queue()
    emit = _threadsafe_emit(loop, queue)

    async def run_pipeline() -> None:
        try:
            await asyncio.to_thread(run_incident, scenario, emit)
        except ValueError as exc:
            await queue.put({"type": "agent_error", "agent": "orchestrator", "message": str(exc)})
        except Exception as exc:
            await queue.put(
                {
                    "type": "agent_error",
                    "agent": "orchestrator",
                    "message": format_api_error(exc),
                }
            )
        finally:
            await queue.put(None)

    task = asyncio.create_task(run_pipeline())
    try:
        while True:
            event = await queue.get()
            if event is None:
                break
            await websocket.send_json(event)
    except WebSocketDisconnect:
        task.cancel()
    finally:
        if not task.done():
            task.cancel()


if _INDEX.is_file() and _ASSETS.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_ASSETS)), name="vite-assets")


_DEMO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Incident Commander — trace demo</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; background: #0f1419; color: #e7ecf3; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #9aa5b1; font-size: 0.9rem; }
    button { margin: 0.75rem 0.5rem 0.75rem 0; padding: 0.5rem 1rem; cursor: pointer; }
    #status { font-size: 0.85rem; margin-bottom: 0.5rem; }
    pre {
      background: #1a2332; border: 1px solid #2d3a4d; border-radius: 8px;
      padding: 1rem; max-height: 70vh; overflow: auto; font-size: 12px; line-height: 1.4;
      white-space: pre-wrap; word-break: break-word;
    }
    .log { color: #7dd3fc; }
    .agent { color: #c4b5fd; }
    .err { color: #fca5a5; }
  </style>
</head>
<body>
  <h1>Incident Commander — live trace</h1>
  <p>
    <code>/ws/incident</code> is WebSocket-only — opening it in the address bar sends HTTP GET and returns 404.
    Use this page or a WebSocket client.
  </p>
  <label>Scenario
    <select id="scenario">
      <option value="db_failure" selected>db_failure</option>
    </select>
  </label>
  <button id="start">Start incident</button>
  <button id="clear" type="button">Clear</button>
  <div id="status">Idle</div>
  <pre id="out"></pre>
  <script>
    const out = document.getElementById("out");
    const status = document.getElementById("status");
    let ws = null;

    function line(text, cls) {
      const span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = text + "\\n";
      out.appendChild(span);
      out.scrollTop = out.scrollHeight;
    }

    document.getElementById("clear").onclick = () => { out.textContent = ""; };

    document.getElementById("start").onclick = () => {
      if (ws) { ws.close(); ws = null; }
      out.textContent = "";
      const scenario = document.getElementById("scenario").value;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${location.host}/ws/incident?scenario=${encodeURIComponent(scenario)}`;
      status.textContent = "Connecting…";
      ws = new WebSocket(url);
      ws.onopen = () => { status.textContent = "Connected — streaming trace"; };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "log_line":
            line(msg.line, "log"); break;
          case "agent_start":
            line(`▶ ${msg.agent}${msg.model ? " (" + msg.model + ")" : ""}`, "agent"); break;
          case "agent_delta":
            line(msg.text, ""); break;
          case "agent_result":
            line(JSON.stringify(msg.payload, null, 2), "agent"); break;
          case "agent_complete":
            line(`✓ ${msg.agent} complete`, "agent"); break;
          case "agent_error":
            line(`✗ ${msg.agent}: ${msg.message}`, "err"); break;
          case "incident_complete":
            line("— incident complete —", "agent");
            status.textContent = "Complete";
            break;
          default:
            line(JSON.stringify(msg));
        }
      };
      ws.onerror = () => { status.textContent = "WebSocket error"; };
      ws.onclose = () => { if (status.textContent === "Connected — streaming trace") status.textContent = "Closed"; };
    };
  </script>
</body>
</html>
"""


@app.get("/", response_model=None)
async def root_page() -> FileResponse | HTMLResponse:
    """React dashboard when `frontend/dist` exists (e.g. Vercel); else minimal WebSocket demo."""
    if _INDEX.is_file():
        return FileResponse(_INDEX)
    return HTMLResponse(_DEMO_HTML)


@app.get("/{full_path:path}", response_model=None)
async def spa_or_static(full_path: str) -> FileResponse:
    """Serve Vite-built files; client routes → index.html."""
    if not _INDEX.is_file():
        raise HTTPException(status_code=404, detail="Build frontend: cd frontend && npm run build")
    candidate = _DIST / full_path
    if candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(_INDEX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)

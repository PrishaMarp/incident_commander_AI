# Triagix

**Triagix** is a multi-agent incident response system mimicing a System Reliability Engineer(SRE). Simulated production logs stream into four Gemini-powered specialists—**triage**, **root cause**, **remediation**, and **comms**—while a React dashboard shows logs, agent reasoning, and an executive summary with a Slack draft.

## What it does

1. **Triage** — Classifies severity, incident type, affected services, and a plain-language summary.
2. **Root cause** — Step-by-step analysis streamed in the agent trace panel.
3. **Remediation** — Immediate actions, stabilization, and verification steps.
4. **Comms** — Drafts a Slack update for `#incidents` (copy to clipboard or export a full markdown report).

Three built-in scenarios:

| Scenario | Label | What you see in the logs |
| --- | --- | --- |
| `db_failure` | Database failure | Postgres pool exhausted, `max_connections`, gateway 503s |
| `api_outage` | API outage | Payments pool saturated, circuit breakers, checkout 5xx |
| `memory_leak` | Memory leak | JVM heap growth, GC pressure, OOMKilled worker pods |

## Architecture

```
Simulated logs → Orchestrator → Triage (Flash)
                              → Root cause (Pro, streamed)
                              → Remediation (streamed)
                              → Comms (Slack draft)
                    ↓
         WebSocket (local) or SSE (Vercel)
                    ↓
              React dashboard (3 panels)
```

- **Backend:** FastAPI (`backend/api.py`), orchestrator (`backend/orchestrator.py`), agents under `backend/agents/`.
- **Frontend:** Vite + React + TypeScript + Tailwind (`frontend/`).
- **Deploy:** `app.py` re-exports the FastAPI app for Vercel; production UI uses **SSE** because serverless has no WebSocket.


## Setup

From the **repo root**:

```bash
python3.11 -m venv venv
source venv/bin/activate   
pip install -r requirements.txt
cp .env.example .env       # add GEMINI_API_KEY
cd frontend && npm ci && cd ..
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for all agents |
| `TRIAGE_MODEL` | Flash model for triage (default `gemini-2.0-flash`) |
| `TRIAGE_FALLBACK_MODEL` | Used when triage hits 429 |
| `ROOT_CAUSE_MODEL` | Pro model for root cause (default `gemini-2.5-pro`) |
| `REMEDIATION_MODEL` | Remediation agent (defaults to triage model) |
| `COMMS_MODEL` | Comms agent (defaults to triage model) |


If you hit **429** rate limits, wait or switch model IDs — [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [models](https://ai.google.dev/gemini-api/docs/models). Root cause and remediation automatically try fallback Flash models when Pro is unavailable.


**Terminal 1 — API:**

```bash
source venv/bin/activate
cd frontend && npm run build && cd ..
python -m backend.api
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). 

**Terminal 2 — UI:**

```bash
cd frontend && npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/ws`, `/sse`, `/scenarios`, and `/health` to port 8000.

Pick a scenario, click **Start incident**, and watch the three panels fill in.


## Project layout

```
app.py                      # Vercel entry → backend.api:app
backend/
  api.py                    # FastAPI, static files, WS + SSE
  orchestrator.py           # Pipeline + scenario registry
  scenarios.py              # Labels for the UI
  agents/                   # triage, root_cause, remediation, comms
  simulation/               # db_failure, api_outage, memory_leak
frontend/
  src/                      # React dashboard (Triagix UI)
requirements.txt
vercel.json
```

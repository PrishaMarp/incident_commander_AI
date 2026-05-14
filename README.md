# incident_commander_AI

Minimal **Incident Commander** flow: simulated DB logs → **Gemini Flash triage** → **Gemini Pro root cause** (streamed to the terminal).

## Layout

- `backend/config.py` — repo-root `.env`; `TRIAGE_MODEL`, `ROOT_CAUSE_MODEL`
- `backend/models.py` — `TriageResult`
- `backend/simulation/db_failure.py` — fake logs + `print_feed()`
- `backend/agents/triage.py` — `run_triage(log_lines)`
- `backend/agents/root_cause.py` — `run_root_cause_streaming(log_lines, triage)`

## Setup

```bash
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY
```

## Run

From the **repo root**:

```bash
python run_demo.py
```

**Logs only** (no API):

```bash
python -m backend.simulation.db_failure
```

## Models / quotas

Set in `.env` as needed: `GEMINI_MODEL`, `TRIAGE_MODEL`, `ROOT_CAUSE_MODEL` (or `PRO_MODEL`). If you hit **429**, wait or switch model ids — [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [models](https://ai.google.dev/gemini-api/docs/models).

If **Pro** returns **429** on root cause, the app **retries once** with your **Flash** triage model (same key, often a separate quota bucket).

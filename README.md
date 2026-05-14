# incident_commander_AI

Minimal **Incident Commander** scaffold: simulated DB logs + **Gemini Flash triage** (JSON → summary line).

## Layout

- `backend/config.py` — loads `.env` from repo root  
- `backend/models.py` — `TriageResult` (Pydantic)  
- `backend/simulation/db_failure.py` — fake log lines + `print_feed()`  
- `backend/agents/triage.py` — `run_triage(log_lines)`  

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

Logs print with a 0.5s delay, then triage runs and prints  
`Severity: … | Type: … | Services: …` plus a short summary.

**Logs only** (no API):

```bash
python -m backend.simulation.db_failure
```

## Quotas / models

If you see **429**, wait or set `GEMINI_MODEL` / `TRIAGE_MODEL` in `.env`. See [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

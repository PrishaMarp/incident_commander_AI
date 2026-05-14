# incident_commander_AI
A Gemini-powered AI incident response platform that monitors system failures, analyzes logs, and coordinates real-time operational workflows for enterprise teams.

## Setup

1. `python3.11 -m venv venv` then `source venv/bin/activate`
2. `pip install -r requirements.txt`
3. Update `GEMINI_API_KEY` in `.env`

## Simulate incident (local log feed)

```bash
python simulate_incident.py
```

## Triage (Gemini Flash → JSON)

```bash
python triage_agent.py
```

Uses `TRIAGE_MODEL` if set, else `GEMINI_MODEL`, else `gemini-1.5-flash`. If `1.5-flash` is not available for your key, set `TRIAGE_MODEL=gemini-2.5-flash` in `.env`.

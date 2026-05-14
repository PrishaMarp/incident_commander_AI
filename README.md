# incident_commander_AI
A Gemini-powered AI incident response platform that monitors system failures, analyzes logs, and coordinates real-time operational workflows for enterprise teams.

## Setup

1. `python3.11 -m venv venv` then `source venv/bin/activate`
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)

If you hit **429 quota** on a model, wait or change `GEMINI_MODEL` in `.env` — see [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and [models](https://ai.google.dev/gemini-api/docs/models).

## Simulate incident (local log feed)

```bash
python simulate_incident.py
```

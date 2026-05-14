"""
Triage agent: send simulated DB failure logs to Gemini Flash, get JSON classification.

Run from repo root:  python triage_agent.py

"""

import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

from dotenv import dotenv_values

from simulate_incident import DB_FAILURE_LOGS

_env = Path(__file__).resolve().parent / ".env"
_cfg = dotenv_values(_env) if _env.is_file() else {}

API_KEY = (_cfg.get("GEMINI_API_KEY") or "").strip()
# Tip: Flash for triage; override if your API returns 404 for 1.5.
MODEL = (
    (_cfg.get("TRIAGE_MODEL") or "").strip()
    or (_cfg.get("GEMINI_MODEL") or "").strip()
    or "gemini-1.5-flash"
)

TRIAGE_PROMPT = """You are a production incident triage agent.

Read the log lines and respond with ONLY valid JSON (no markdown, no prose) using exactly this shape:
{{
  "incident_type": "db_failure|api_outage|memory_leak|unknown",
  "severity": "P1|P2|P3|P4",
  "affected_services": ["service-name", "..."],
  "summary": "one short sentence"
}}

Severity guide:
- P1: Complete outage, revenue impact, or data loss risk
- P2: Major degradation (e.g. very high error rate)
- P3: Minor degradation
- P4: Warning-level only

Log lines:
{logs}
"""


def _strip_json_fences(text: str) -> str:
    """Strip ```json ... ``` fences. Prefer the guide's removeprefix/removesuffix when it applies."""
    text = text.strip()
    if text.startswith("```json"):
        return text.removeprefix("```json").strip().removesuffix("```").strip()
    if text.lower().startswith("```json"):
        return text[7:].strip().removesuffix("```").strip()
    if text.startswith("```"):
        text = text[3:].strip()
    return text.removesuffix("```").strip()


def main() -> None:
    if not API_KEY:
        print("Missing GEMINI_API_KEY in .env", file=sys.stderr)
        sys.exit(1)

    ts = datetime.now(timezone.utc).isoformat()
    lines = [template.format(ts=ts) for template in DB_FAILURE_LOGS]
    logs_blob = "\n".join(lines)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        import google.generativeai as genai

    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel(MODEL)
    prompt = TRIAGE_PROMPT.format(logs=logs_blob)

    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    print("--- Raw model response ---")
    print(raw)

    cleaned = _strip_json_fences(raw)
    try:
        data = json.loads(cleaned)
        severity = data.get("severity", "?")
        incident_type = data.get("incident_type", "?")
        services = data.get("affected_services") or []
        if isinstance(services, str):
            services = [services]
        services_str = ", ".join(str(s).strip() for s in services if s) or "(none)"
        print(
            f"\nSeverity: {severity} | Type: {incident_type} | Services: {services_str}"
        )
    except json.JSONDecodeError as e:
        print("\n(Could not parse as JSON:", e, ")", file=sys.stderr)
        print("Cleaned text was:\n", cleaned[:800], file=sys.stderr)


if __name__ == "__main__":
    main()

"""Gemini Flash triage → structured JSON via the new Google GenAI SDK."""

from google import genai
from google.genai import types

from backend.config import GEMINI_API_KEY, TRIAGE_MODEL
from backend.models import TriageResult

# SDK handles enforcing the structure
TRIAGE_PROMPT = """You are a production incident triage agent.
Read the log lines and accurately extract the incident details based on the provided schema definitions.

Severity guide:
- P1: Complete outage, revenue impact, or data loss risk
- P2: Major degradation (e.g. very high error rate)
- P3: Minor degradation
- P4: Warning-level only

Log lines:
{logs}
"""


def run_triage(log_lines: list[str]) -> TriageResult:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")

    logs_blob = "\n".join(log_lines[-50:])
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    response = client.models.generate_content(
        model=TRIAGE_MODEL,
        contents=TRIAGE_PROMPT.format(logs=logs_blob),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TriageResult,
        ),
    )

    if response.parsed:
        return response.parsed
        
    raise ValueError("Failed to retrieve a structured triage schema from the model.")


def format_summary_line(result: TriageResult) -> str:
    services = result.affected_services
    services_str = ", ".join(services) if services else "(none)"
    return (
        f"Severity: {result.severity} | Type: {result.incident_type} | "
        f"Services: {services_str}"
    )
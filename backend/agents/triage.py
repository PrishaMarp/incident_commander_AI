"""Gemini Flash triage → structured JSON via the new Google GenAI SDK."""

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from backend.config import GEMINI_API_KEY, TRIAGE_FALLBACK_MODEL, TRIAGE_MODEL
from backend.gemini_util import _EXTRA_TRIAGE_MODELS, should_try_next_model, unique_models
from backend.models import TriageResult

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


def _triage_with_model(client: genai.Client, model: str, logs_blob: str) -> TriageResult:
    response = client.models.generate_content(
        model=model,
        contents=TRIAGE_PROMPT.format(logs=logs_blob),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TriageResult,
        ),
    )
    if response.parsed:
        return response.parsed
    raise ValueError("Failed to retrieve a structured triage schema from the model.")


def run_triage(log_lines: list[str]) -> TriageResult:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")

    logs_blob = "\n".join(log_lines[-50:])
    client = genai.Client(api_key=GEMINI_API_KEY)
    models = unique_models(TRIAGE_MODEL, TRIAGE_FALLBACK_MODEL, *_EXTRA_TRIAGE_MODELS)

    last_exc: BaseException | None = None
    for i, model in enumerate(models):
        try:
            return _triage_with_model(client, model, logs_blob)
        except genai_errors.APIError as e:
            last_exc = e
            if should_try_next_model(e, i, len(models)):
                continue
            raise

    if last_exc:
        raise last_exc
    raise ValueError("No triage model configured.")


def format_summary_line(result: TriageResult) -> str:
    services = result.affected_services
    services_str = ", ".join(services) if services else "(none)"
    return (
        f"Severity: {result.severity} | Type: {result.incident_type} | "
        f"Services: {services_str}"
    )

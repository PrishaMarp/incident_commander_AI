"""Gemini Flash triage → structured JSON (Flash)."""

import json
import warnings

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, TRIAGE_MODEL
from backend.models import TriageResult

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
    text = text.strip()
    if text.startswith("```json"):
        return text.removeprefix("```json").strip().removesuffix("```").strip()
    if text.lower().startswith("```json"):
        return text[7:].strip().removesuffix("```").strip()
    if text.startswith("```"):
        text = text[3:].strip()
    return text.removesuffix("```").strip()


def run_triage(log_lines: list[str]) -> TriageResult:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")

    logs_blob = "\n".join(log_lines[-50:])
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(TRIAGE_MODEL)
        response = model.generate_content(TRIAGE_PROMPT.format(logs=logs_blob))

    raw = (response.text or "").strip()
    cleaned = _strip_json_fences(raw)
    data = json.loads(cleaned)
    return TriageResult.model_validate(data)


def format_summary_line(result: TriageResult) -> str:
    services = result.affected_services
    services_str = ", ".join(services) if services else "(none)"
    return (
        f"Severity: {result.severity} | Type: {result.incident_type} | "
        f"Services: {services_str}"
    )

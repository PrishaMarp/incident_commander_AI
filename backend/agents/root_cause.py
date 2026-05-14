"""Gemini Pro root-cause analysis — streams markdown to stdout."""

import sys
import warnings

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

from backend.config import GEMINI_API_KEY, ROOT_CAUSE_MODEL, TRIAGE_MODEL
from backend.models import TriageResult

ROOT_CAUSE_PROMPT = """You are a senior SRE performing root cause analysis. Think step by step.

Incident summary: {summary}
Severity: {severity}
Affected services: {services}

Log evidence:
{logs}

Work through:
1. Immediate symptom
2. 3–5 hypotheses and what in the logs supports or refutes each
3. Most likely root cause
4. Causal chain (short)

Use clear markdown headers. End with a **CONCLUSION** section: one sentence root cause and confidence 0–100%.
"""


def _stream(model_name: str, prompt: str) -> str:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(model_name)
    full = ""
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        piece = getattr(chunk, "text", None) or ""
        if piece:
            full += piece
            print(piece, end="", flush=True)
    print()
    return full


def run_root_cause_streaming(log_lines: list[str], triage: TriageResult) -> str:
    """Stream response to stdout. If Pro hits 429, retry once with Flash (triage model)."""
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")

    logs_blob = "\n".join(log_lines[-100:])
    prompt = ROOT_CAUSE_PROMPT.format(
        summary=triage.summary or "(no summary)",
        severity=triage.severity,
        services=", ".join(triage.affected_services) or "(none)",
        logs=logs_blob,
    )

    primary = ROOT_CAUSE_MODEL
    fallback = TRIAGE_MODEL if TRIAGE_MODEL != primary else None

    try:
        return _stream(primary, prompt)
    except google_exceptions.ResourceExhausted:
        if not fallback:
            raise
        print(
            f"\n[{primary}] quota exhausted — retrying root cause with {fallback}.\n",
            file=sys.stderr,
        )
        return _stream(fallback, prompt)

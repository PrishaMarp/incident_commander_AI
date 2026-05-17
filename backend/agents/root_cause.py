"""Gemini Pro root-cause analysis — streams markdown to stdout or a callback."""

import sys
from collections.abc import Callable

from google import genai
from google.genai import errors as genai_errors

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


def _stream(
    model_name: str,
    prompt: str,
    *,
    on_chunk: Callable[[str], None] | None = None,
) -> str:
    client = genai.Client(api_key=GEMINI_API_KEY)
    full = ""
    response = client.models.generate_content_stream(
        model=model_name,
        contents=prompt,
    )

    for chunk in response:
        piece = chunk.text or ""
        if piece:
            full += piece
            if on_chunk:
                on_chunk(piece)
            else:
                print(piece, end="", flush=True)
    if not on_chunk:
        print()
    return full


def run_root_cause_streaming(
    log_lines: list[str],
    triage: TriageResult,
    *,
    on_chunk: Callable[[str], None] | None = None,
    on_notice: Callable[[str], None] | None = None,
) -> str:
    """Stream response via on_chunk or stdout. If Pro hits 429, retry once with Flash."""
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
        return _stream(primary, prompt, on_chunk=on_chunk)
    except genai_errors.APIError as e:
        if e.code == 429 and fallback:
            notice = f"[{primary}] quota exhausted — retrying root cause with {fallback}."
            if on_notice:
                on_notice(notice)
            else:
                print(f"\n{notice}\n", file=sys.stderr)
            return _stream(fallback, prompt, on_chunk=on_chunk)
        raise

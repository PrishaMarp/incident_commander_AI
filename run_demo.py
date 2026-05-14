#!/usr/bin/env python3
"""Minimal demo: simulated DB logs → Flash triage → Pro root cause (streamed)."""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from google.api_core import exceptions as google_exceptions

from backend.agents.root_cause import run_root_cause_streaming
from backend.agents.triage import format_summary_line, run_triage
from backend.simulation.db_failure import print_feed


def main() -> None:
    print("--- Simulated incident feed ---\n")
    lines = print_feed(0.5)
    print("\n--- Triage (Gemini Flash) ---\n")
    try:
        triage = run_triage(lines)
    except google_exceptions.ResourceExhausted:
        print(
            "429 quota — wait and retry, or set TRIAGE_MODEL / GEMINI_MODEL in .env.\n"
            "https://ai.google.dev/gemini-api/docs/rate-limits"
        )
        raise SystemExit(2) from None
    except ValueError as e:
        print(e, file=sys.stderr)
        raise SystemExit(1) from e

    print(format_summary_line(triage))
    if triage.summary:
        print(f"Summary: {triage.summary}")

    print("\n--- Root cause (Gemini Pro, streamed) ---\n")
    try:
        run_root_cause_streaming(lines, triage)
    except google_exceptions.ResourceExhausted:
        print(
            "\n429 on both Pro and fallback Flash — wait or change models in .env.\n"
            "https://ai.google.dev/gemini-api/docs/rate-limits"
        )
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()

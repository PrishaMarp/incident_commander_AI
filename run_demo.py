#!/usr/bin/env python3
"""Minimal demo: simulated DB logs → Flash triage → Pro root cause (streamed)."""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from google.genai import errors as genai_errors

from backend.gemini_util import format_api_error
from backend.orchestrator import format_triage_for_terminal, run_incident
from backend.trace import TraceEvent


def _terminal_emit(event: TraceEvent) -> None:
    kind = event.get("type")
    if kind == "log_line":
        print(event.get("line", ""))
    elif kind == "scenario_start":
        print(f"--- Scenario: {event.get('scenario')} ---\n")
    elif kind == "agent_start":
        agent = event.get("agent", "")
        model = event.get("model", "")
        label = f" ({model})" if model else ""
        print(f"\n--- {agent}{label} ---\n")
    elif kind == "agent_delta":
        print(event.get("text", ""), end="", flush=True)
    elif kind == "agent_result":
        agent = event.get("agent", "")
        payload = event.get("payload") or {}
        if agent == "triage":
            print(format_triage_for_terminal(payload))
            if payload.get("summary"):
                print(f"Summary: {payload['summary']}")
        elif agent == "comms":
            channel = payload.get("channel", "#incidents")
            print(f"\n--- Slack draft ({channel}) ---\n")
            print(payload.get("message", ""))
    elif kind == "agent_complete" and event.get("agent") in ("root_cause", "remediation"):
        print()
    elif kind == "agent_error":
        print(f"\nError [{event.get('agent')}]: {event.get('message')}", file=sys.stderr)
    elif kind == "incident_complete":
        print("\n--- Incident complete ---\n")


def main() -> None:
    print("--- Simulated incident feed ---\n")
    try:
        run_incident("db_failure", _terminal_emit, log_delay_s=0.5)
    except genai_errors.APIError as e:
        if e.code == 429:
            print(f"\n{format_api_error(e)}\n", file=sys.stderr)
            raise SystemExit(2) from None
        raise
    except ValueError as e:
        print(e, file=sys.stderr)
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()

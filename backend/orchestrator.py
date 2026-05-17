"""Run an incident simulation and emit trace events for live demo clients."""

from collections.abc import Callable
from typing import Any

from backend.agents.root_cause import run_root_cause_streaming
from backend.agents.triage import format_summary_line, run_triage
from backend.config import ROOT_CAUSE_MODEL, TRIAGE_MODEL
from backend.simulation import db_failure
from backend.trace import (
    TraceEvent,
    agent_complete,
    agent_delta,
    agent_error,
    agent_result,
    agent_start,
    incident_complete,
    log_line,
    scenario_start,
)

LogFeed = Callable[[float, Callable[[str], None] | None], list[str]]

SCENARIOS: dict[str, LogFeed] = {
    "db_failure": db_failure.stream_feed,
}


def run_incident(
    scenario: str,
    emit: Callable[[TraceEvent], None],
    *,
    log_delay_s: float = 0.5,
) -> None:
    feed = SCENARIOS.get(scenario)
    if feed is None:
        raise ValueError(f"Unknown scenario: {scenario!r}. Choose from: {list(SCENARIOS)}")

    emit(scenario_start(scenario))

    lines: list[str] = []

    def on_log(line: str) -> None:
        lines.append(line)
        emit(log_line(line))

    feed(log_delay_s, on_line=on_log)

    emit(agent_start("triage", TRIAGE_MODEL))
    try:
        triage = run_triage(lines)
    except Exception as exc:
        emit(agent_error("triage", str(exc)))
        raise
    emit(agent_result("triage", triage.model_dump()))
    emit(agent_complete("triage"))

    emit(agent_start("root_cause", ROOT_CAUSE_MODEL))
    try:
        run_root_cause_streaming(
            lines,
            triage,
            on_chunk=lambda text: emit(agent_delta("root_cause", text)),
            on_notice=lambda msg: emit(agent_delta("root_cause", f"\n{msg}\n")),
        )
    except Exception as exc:
        emit(agent_error("root_cause", str(exc)))
        raise
    emit(agent_complete("root_cause"))

    emit(incident_complete())


def format_triage_for_terminal(payload: dict[str, Any]) -> str:
    from backend.models import TriageResult

    return format_summary_line(TriageResult.model_validate(payload))

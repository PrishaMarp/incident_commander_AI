"""Run an incident simulation and emit trace events for live demo clients."""

from collections.abc import Callable
from typing import Any

from backend.agents.comms import run_comms
from backend.agents.remediation import run_remediation_streaming
from backend.agents.root_cause import run_root_cause_streaming
from backend.agents.triage import format_summary_line, run_triage
from backend.config import COMMS_MODEL, REMEDIATION_MODEL, ROOT_CAUSE_MODEL, TRIAGE_MODEL
from backend.gemini_util import format_api_error
from backend.simulation import api_outage, db_failure, memory_leak
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
    "api_outage": api_outage.stream_feed,
    "memory_leak": memory_leak.stream_feed,
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
        emit(agent_error("triage", format_api_error(exc)))
        raise
    emit(agent_result("triage", triage.model_dump()))
    emit(agent_complete("triage"))

    root_cause_parts: list[str] = []

    def on_root_cause_chunk(text: str) -> None:
        root_cause_parts.append(text)
        emit(agent_delta("root_cause", text))

    emit(agent_start("root_cause", ROOT_CAUSE_MODEL))
    try:
        run_root_cause_streaming(
            lines,
            triage,
            on_chunk=on_root_cause_chunk,
        )
    except Exception as exc:
        emit(agent_error("root_cause", format_api_error(exc)))
        raise
    emit(agent_complete("root_cause"))

    root_cause_text = "".join(root_cause_parts)

    remediation_parts: list[str] = []

    def on_remediation_chunk(text: str) -> None:
        remediation_parts.append(text)
        emit(agent_delta("remediation", text))

    emit(agent_start("remediation", REMEDIATION_MODEL))
    try:
        run_remediation_streaming(
            triage,
            root_cause_text,
            on_chunk=on_remediation_chunk,
        )
    except Exception as exc:
        emit(agent_error("remediation", format_api_error(exc)))
        raise
    emit(agent_complete("remediation"))

    remediation_text = "".join(remediation_parts)

    emit(agent_start("comms", COMMS_MODEL))
    try:
        comms = run_comms(triage, root_cause_text, remediation_text)
    except Exception as exc:
        emit(agent_error("comms", format_api_error(exc)))
        raise
    emit(agent_result("comms", comms.model_dump()))
    emit(agent_complete("comms"))

    emit(incident_complete())


def format_triage_for_terminal(payload: dict[str, Any]) -> str:
    from backend.models import TriageResult

    return format_summary_line(TriageResult.model_validate(payload))

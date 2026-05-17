"""Trace events broadcast over WebSocket to the demo UI."""

from typing import Any, Literal, TypedDict


TraceType = Literal[
    "scenario_start",
    "log_line",
    "agent_start",
    "agent_delta",
    "agent_result",
    "agent_complete",
    "agent_error",
    "incident_complete",
]


class TraceEvent(TypedDict, total=False):
    type: TraceType
    scenario: str
    line: str
    agent: str
    model: str
    text: str
    payload: dict[str, Any]
    message: str


def scenario_start(scenario: str) -> TraceEvent:
    return {"type": "scenario_start", "scenario": scenario}


def log_line(line: str) -> TraceEvent:
    return {"type": "log_line", "line": line}


def agent_start(agent: str, model: str | None = None) -> TraceEvent:
    event: TraceEvent = {"type": "agent_start", "agent": agent}
    if model:
        event["model"] = model
    return event


def agent_delta(agent: str, text: str) -> TraceEvent:
    return {"type": "agent_delta", "agent": agent, "text": text}


def agent_result(agent: str, payload: dict[str, Any]) -> TraceEvent:
    return {"type": "agent_result", "agent": agent, "payload": payload}


def agent_complete(agent: str) -> TraceEvent:
    return {"type": "agent_complete", "agent": agent}


def agent_error(agent: str, message: str) -> TraceEvent:
    return {"type": "agent_error", "agent": agent, "message": message}


def incident_complete() -> TraceEvent:
    return {"type": "incident_complete"}

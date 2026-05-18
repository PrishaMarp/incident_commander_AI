"""Scenario catalog — ids, labels, and short descriptions for the UI."""

from typing import TypedDict


class ScenarioInfo(TypedDict):
    id: str
    label: str
    description: str


SCENARIO_CATALOG: list[ScenarioInfo] = [
    {
        "id": "db_failure",
        "label": "Database failure",
        "description": "Postgres connection pool exhausted; 503s and max_connections errors.",
    },
    {
        "id": "api_outage",
        "label": "API outage",
        "description": "Payments service pool saturated; gateway 503s and circuit breakers open.",
    },
    {
        "id": "memory_leak",
        "label": "Memory leak",
        "description": "Worker heap growth and OOM; batch jobs fail after pod restart.",
    },
]

SCENARIO_BY_ID: dict[str, ScenarioInfo] = {s["id"]: s for s in SCENARIO_CATALOG}


def list_scenario_catalog() -> list[ScenarioInfo]:
    return list(SCENARIO_CATALOG)

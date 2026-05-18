"""Remediation agent — concrete fix steps from triage + root cause."""

from collections.abc import Callable

from backend.agents.gemini_stream import stream_prompt
from backend.config import REMEDIATION_MODEL, TRIAGE_FALLBACK_MODEL, TRIAGE_MODEL
from backend.gemini_util import _EXTRA_TRIAGE_MODELS, unique_models
from backend.models import TriageResult

REMEDIATION_PROMPT = """You are an SRE writing an immediate remediation plan during an active incident.

Incident: {summary}
Severity: {severity}
Type: {incident_type}
Affected services: {services}

Root cause analysis:
{root_cause}

Write markdown with:
## Immediate actions (next 15 minutes)
Numbered steps an on-call engineer can run now (commands, dashboards, rollbacks).

## Stabilization
Short-term changes to stop the bleeding.

## Verification
How to confirm the fix worked (metrics, probes, log patterns).

Be specific and actionable. No preamble.
"""


def run_remediation_streaming(
    triage: TriageResult,
    root_cause: str,
    *,
    on_chunk: Callable[[str], None] | None = None,
    on_notice: Callable[[str], None] | None = None,
) -> str:
    prompt = REMEDIATION_PROMPT.format(
        summary=triage.summary or "(no summary)",
        severity=triage.severity,
        incident_type=triage.incident_type,
        services=", ".join(triage.affected_services) or "(none)",
        root_cause=root_cause or "(pending)",
    )
    models = unique_models(REMEDIATION_MODEL, TRIAGE_MODEL, TRIAGE_FALLBACK_MODEL, *_EXTRA_TRIAGE_MODELS)
    return stream_prompt(prompt, models, on_chunk=on_chunk, on_notice=on_notice)

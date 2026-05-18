"""Comms agent — draft incident Slack alert."""

import re

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from backend.config import COMMS_MODEL, GEMINI_API_KEY, TRIAGE_FALLBACK_MODEL, TRIAGE_MODEL
from backend.gemini_util import _EXTRA_TRIAGE_MODELS, should_try_next_model, unique_models
from backend.models import CommsResult, TriageResult

COMMS_PROMPT = """You are the incident commander posting a live update in Slack #incidents.

Context:
- Headline for the post (short, max 12 words): {headline}
- Severity: {severity}
- Incident type: {incident_type}
- Services: {services}

Root cause (excerpt):
{root_cause_excerpt}

Remediation in progress (excerpt):
{remediation_excerpt}

Write JSON with:
- channel: "#incidents" (or "#incidents-war-room" for sev1/critical)
- status: one of Investigating | Identified | Mitigating | Monitoring
- message: the Slack post BODY ONLY — do NOT include line 1 (headline/emoji are added automatically)

Body format (start at line 1 with *Status:*):
*Status:* <status> · *Severity:* {severity}
*Impact:* one short sentence (who is affected)
*Affected:* `service-a`, `service-b`
(blank line)
*Current actions:*
• action one
• action two

Rules:
- Use Slack mrkdwn: *bold* with single asterisks, _italic_, `backticks` for service names
- No :emoji: codes, no 🔴, no <!here>, no @here, no ## headers, no **double asterisks**
- Do not include "Next update" or ETA lines
- Do not repeat the headline in the body
- Keep under 12 lines. Terse, factual.
"""


def _dedupe_first_words(text: str) -> str:
    words = text.split()
    while len(words) >= 2 and words[0].lower().rstrip(".,:;") == words[1].lower().rstrip(".,:;"):
        words.pop(0)
    return " ".join(words)


def _suggested_headline(triage: TriageResult) -> str:
    summary = (triage.summary or "").strip()
    if not summary:
        return triage.incident_type.replace("_", " ")
    # First sentence only, capped — headline is not the full impact paragraph
    first = re.split(r"(?<=[.!?])\s+", summary, maxsplit=1)[0].strip()
    words = _dedupe_first_words(first).split()
    return " ".join(words[:14])


def _severity_emoji(severity: str) -> str:
    s = severity.lower()
    if any(x in s for x in ("p1", "sev1", "critical")):
        return "🔴"
    if any(x in s for x in ("p2", "sev2", "high")):
        return "🟠"
    if any(x in s for x in ("p3", "sev3", "medium")):
        return "🟡"
    return "🔵"


def _needs_here(severity: str) -> bool:
    s = severity.lower()
    return any(x in s for x in ("p1", "sev1", "critical"))


def _strip_slack_codes(text: str) -> str:
    text = re.sub(r"^_?Next update:_[^\n]*\n?", "", text, flags=re.I | re.MULTILINE)
    text = re.sub(r":(?:red|large_red|large_orange|large_yellow|large_blue)_circle:\s*", "", text, flags=re.I)
    text = re.sub(r"\*circle:\s*\*", "", text, flags=re.I)
    text = re.sub(r"<!here>\s*@here|@here\s*<!here>", "", text, flags=re.I)
    text = re.sub(r"\s*<!here>\s*", " ", text)
    text = re.sub(r"@here\b", "", text, flags=re.I)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _trim_body(body: str) -> str:
    """Keep structured body from *Status:* onward; drop model headline duplicates."""
    lines = [ln for ln in body.splitlines() if ln.strip()]
    for i, ln in enumerate(lines):
        if re.match(r"^\*Status:\*", ln.strip(), re.I):
            return "\n".join(lines[i:]).strip()
    # No status line — drop emoji headline lines and long orphan bold paragraphs
    kept: list[str] = []
    for ln in lines:
        s = ln.strip()
        if s[0] in "🔴🟠🟡🔵":
            continue
        if s.startswith("*") and s.endswith("*") and len(s) > 80 and ":" not in s[:20]:
            continue
        kept.append(ln)
    return "\n".join(kept).strip()


def _assemble_slack_message(triage: TriageResult, body: str, headline: str) -> str:
    body = _trim_body(_strip_slack_codes(body))

    h = _dedupe_first_words(headline.strip())[:140]
    line1 = f"{_severity_emoji(triage.severity)} *{h}*"
    if _needs_here(triage.severity):
        line1 += " <!here>"

    if not body:
        return line1
    return f"{line1}\n\n{body}"


def _comms_with_model(client: genai.Client, model: str, prompt: str, headline: str, triage: TriageResult) -> CommsResult:
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CommsResult,
        ),
    )
    if response.parsed:
        result = response.parsed
        result.message = _assemble_slack_message(triage, result.message, headline)
        return result
    raise ValueError("Failed to retrieve comms schema from the model.")


def run_comms(
    triage: TriageResult,
    root_cause: str,
    remediation: str = "",
) -> CommsResult:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")

    headline = _suggested_headline(triage)
    root_excerpt = (root_cause or "")[:600]
    remediation_excerpt = (remediation or "")[:600]
    prompt = COMMS_PROMPT.format(
        headline=headline,
        severity=triage.severity,
        incident_type=triage.incident_type,
        services=", ".join(triage.affected_services) or "(none)",
        root_cause_excerpt=root_excerpt or "(in progress)",
        remediation_excerpt=remediation_excerpt or "(in progress)",
    )
    client = genai.Client(api_key=GEMINI_API_KEY)
    models = unique_models(COMMS_MODEL, TRIAGE_MODEL, TRIAGE_FALLBACK_MODEL, *_EXTRA_TRIAGE_MODELS)

    last_exc: BaseException | None = None
    for i, model in enumerate(models):
        try:
            return _comms_with_model(client, model, prompt, headline, triage)
        except genai_errors.APIError as e:
            last_exc = e
            if should_try_next_model(e, i, len(models)):
                continue
            raise

    if last_exc:
        raise last_exc
    raise ValueError("No comms model configured.")

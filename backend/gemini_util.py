"""Shared Gemini API helpers (quota errors, model fallback chains)."""

from google.genai import errors as genai_errors

# Known-good generateContent models (no deprecated 1.5 ids)
_EXTRA_TRIAGE_MODELS = (
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
)

_RETRYABLE_API_CODES = (429, 404)


def is_quota_exhausted(exc: BaseException) -> bool:
    return isinstance(exc, genai_errors.APIError) and exc.code == 429


def should_try_next_model(exc: BaseException, model_index: int, model_count: int) -> bool:
    if model_index >= model_count - 1:
        return False
    return isinstance(exc, genai_errors.APIError) and exc.code in _RETRYABLE_API_CODES


def format_api_error(exc: BaseException) -> str:
    """Short user-facing message; avoids dumping full API JSON in the UI."""
    if isinstance(exc, genai_errors.APIError):
        if exc.code == 429:
            return (
                "429 quota exceeded for this model. Wait ~1 minute and retry, or set "
                "TRIAGE_MODEL / ROOT_CAUSE_MODEL in .env "
                "(e.g. gemini-2.0-flash, gemini-2.5-flash). "
                "https://ai.google.dev/gemini-api/docs/rate-limits"
            )
        if exc.code == 404:
            return (
                f"Model not found ({exc}). Set TRIAGE_MODEL / ROOT_CAUSE_MODEL to a current id "
                "(e.g. gemini-2.0-flash, gemini-2.5-flash)."
            )
        detail = getattr(exc, "message", None) or str(exc)
        return f"Gemini API error {exc.code}: {detail}"
    return str(exc)


def unique_models(*names: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for name in names:
        n = (name or "").strip()
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out

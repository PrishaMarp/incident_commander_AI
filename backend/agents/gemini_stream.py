"""Shared Gemini streaming with model fallback."""

import sys
from collections.abc import Callable

from google import genai
from google.genai import errors as genai_errors

from backend.config import GEMINI_API_KEY
from backend.gemini_util import should_try_next_model


def stream_prompt(
    prompt: str,
    models: list[str],
    *,
    on_chunk: Callable[[str], None] | None = None,
    on_notice: Callable[[str], None] | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in .env (repo root).")
    if not models:
        raise RuntimeError("No models configured for streaming.")

    client = genai.Client(api_key=GEMINI_API_KEY)
    last_exc: genai_errors.APIError | None = None

    for i, model in enumerate(models):
        full = ""
        try:
            response = client.models.generate_content_stream(
                model=model,
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
        except genai_errors.APIError as e:
            last_exc = e
            if should_try_next_model(e, i, len(models)):
                notice = f"[{model}] unavailable — retrying with {models[i + 1]}."
                if on_notice:
                    on_notice(notice)
                else:
                    print(f"\n{notice}\n", file=sys.stderr)
                continue
            raise

    if last_exc:
        raise last_exc
    raise RuntimeError("Streaming failed.")

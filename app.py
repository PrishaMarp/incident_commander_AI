"""
Vercel FastAPI entrypoint.

Vercel expects `app` in `app.py` at the project root (or `tool.vercel.entrypoint`
in pyproject.toml). The application is defined in `backend.api`.
"""

from backend.api import app

__all__ = ["app"]

import os
from pathlib import Path

from dotenv import dotenv_values

# Repository root (parent of this `backend/` folder)
REPO_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILE = REPO_ROOT / ".env"
_cfg = dotenv_values(_ENV_FILE) if _ENV_FILE.is_file() else {}


def _pick(*keys: str, default: str = "") -> str:
    for k in keys:
        v = (_cfg.get(k) or os.getenv(k) or "").strip()
        if v:
            return v
    return default


GEMINI_API_KEY = _pick("GEMINI_API_KEY")
# Flash model for triage (2.5+ ids work on current API; override in .env)
TRIAGE_MODEL = _pick("TRIAGE_MODEL", "GEMINI_MODEL", "FLASH_MODEL", default="gemini-2.5-flash")
# Pro model for root-cause reasoning (override if 404 / quota)
ROOT_CAUSE_MODEL = _pick("ROOT_CAUSE_MODEL", "PRO_MODEL", default="gemini-2.5-pro")

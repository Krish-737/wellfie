"""Temporary dev helper — writes raw SDK vitals to my-welfie-backend/logs/."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# my-welfie-backend/logs (gitignored)
LOGS_DIR = Path(__file__).resolve().parents[2] / "logs"


def _filesystem_timestamp(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def write_scan_payload_log(
    scan_id: str,
    scanned_at: datetime,
    user_id: str,
    vitals: dict[str, Any],
) -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{scan_id}-{_filesystem_timestamp(scanned_at)}.json"
    path = LOGS_DIR / filename

    document = {
        "scanId": scan_id,
        "timestamp": scanned_at.isoformat(),
        "userId": user_id,
        "vitals": vitals,
    }
    path.write_text(
        json.dumps(document, indent=2, default=str),
        encoding="utf-8",
    )
    return path

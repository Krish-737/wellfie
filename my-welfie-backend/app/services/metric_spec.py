"""
Shared metric specification loader (P2).
Source of truth: shared/metricSpec.json at repo root.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

_SPEC_PATH = Path(__file__).resolve().parents[3] / "shared" / "metricSpec.json"

CONFIDENCE_LABELS = {0: "Unknown", 1: "Low", 2: "Medium", 3: "High"}


@lru_cache(maxsize=1)
def load_metric_spec() -> Dict[str, Any]:
    with open(_SPEC_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_disclaimers() -> Dict[str, str]:
    return load_metric_spec().get("disclaimers", {})


def get_metric_by_id(metric_id: str) -> Optional[Dict[str, Any]]:
    for m in load_metric_spec().get("metrics", []):
        if m.get("id") == metric_id:
            return m
    return None


def get_core_confidence_keys() -> List[Dict[str, str]]:
    return load_metric_spec().get("coreConfidenceKeys", [])


def confidence_label(level: Optional[int]) -> str:
    if level is None:
        return ""
    return CONFIDENCE_LABELS.get(int(level), "")


def scan_platform(scan: Any) -> str:
    return str(getattr(scan, "scan_platform", None) or "web").lower()


def vitals_confidence(scan: Any) -> Dict[str, int]:
    raw = getattr(scan, "vitals_confidence", None) or {}
    return raw if isinstance(raw, dict) else {}


def vitals_enabled(scan: Any) -> Dict[str, bool]:
    raw = getattr(scan, "vitals_enabled", None) or {}
    return raw if isinstance(raw, dict) else {}


def pdf_confidence_for_key(scan: Any, confidence_key: Optional[str]) -> str:
    if not confidence_key:
        return ""
    level = vitals_confidence(scan).get(confidence_key)
    if level is None:
        return ""
    return confidence_label(level)


def pdf_missing_reason(scan: Any, metric_id: str, has_value: bool) -> str:
    """Reason suffix for PDF when value is missing."""
    if has_value:
        return ""

    spec = get_metric_by_id(metric_id)
    if not spec:
        return "Not captured"

    enabled = vitals_enabled(scan)
    enabled_key = spec.get("enabledKey")
    if enabled_key and enabled.get(enabled_key) is False:
        return "Not in license"

    if not spec.get("webSupported", True) and scan_platform(scan) == "web":
        return "Unavailable on web"

    duration = getattr(scan, "measurement_duration_sec", None)
    min_sec = spec.get("minDurationSec")
    if duration is not None and min_sec is not None and duration < min_sec:
        return f"Needs ≥{int(min_sec)}s scan"

    return "Not captured"


def pdf_metric_label(metric_id: str, scan: Any) -> str:
    """Display name with research asterisk when applicable."""
    spec = get_metric_by_id(metric_id)
    if not spec:
        return metric_id
    label = spec.get("label", metric_id)
    if spec.get("researchFlag"):
        return f"{label} *"
    return label


def metrics_for_pdf_section(section_key: str) -> List[Dict[str, Any]]:
    """Metrics ordered as defined in metricSpec.json for a PDF section."""
    return [m for m in load_metric_spec().get("metrics", []) if m.get("pdfSection") == section_key]


def structured_disclaimer_notes(scan: Any) -> List[tuple[str, str]]:
    """Notes for PDF compliance box."""
    d = get_disclaimers()
    platform = scan_platform(scan)
    notes: List[tuple[str, str]] = [
        ("1. General wellness disclaimer", d.get("wellness", "")),
        ("2. SDK confidence policy", d.get("sdkConfidence", "")),
        ("3. Missing values (—)", d.get("missingValues", "")),
    ]
    if platform == "web":
        notes.append(("4. Web platform limits", d.get("webPlatform", "")))
    notes.append(("5. Research indicators (*)", d.get("research", "")))
    notes.append(("6. Risk scores & ASCVD", d.get("ascvdProfile", "")))
    return notes

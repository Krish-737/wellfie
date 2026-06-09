"""
Extract SDK metadata (confidence levels) from BioSense vitals payloads.

confidenceLevel: 0=Unknown, 1=Low, 2=Medium, 3=High (see Important-Vital-Guide.md)
"""

from __future__ import annotations

from typing import Any, Dict, Optional

# SDK camelCase keys that may carry confidenceLevel on the parent object
_CONFIDENCE_VITAL_KEYS = (
    "pulseRate",
    "respirationRate",
    "oxygenSaturation",
    "bloodPressure",
    "cardiacWorkload",
    "heartAge",
    "meanArterialPressure",
    "pulsePressure",
    "sdnn",
    "rmssd",
    "meanRri",
    "prq",
    "rri",
)


def _confidence_from_node(node: Any) -> Optional[int]:
    if not isinstance(node, dict):
        return None
    level = node.get("confidenceLevel")
    if level is None:
        return None
    try:
        return int(level)
    except (TypeError, ValueError):
        return None


def extract_vitals_confidence(vitals: dict) -> Dict[str, int]:
    """Map SDK vital keys → confidenceLevel int (only present levels)."""
    out: Dict[str, int] = {}
    for key in _CONFIDENCE_VITAL_KEYS:
        level = _confidence_from_node(vitals.get(key))
        if level is not None:
            out[key] = level
    return out

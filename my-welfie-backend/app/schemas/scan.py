"""
Pydantic schemas for scan-related request/response bodies.
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


# ── Request schemas ────────────────────────────────────────────────────────────

class ScanMetadataIn(BaseModel):
    """Optional session metadata from the client (P0 SDK fidelity)."""
    measurement_duration_sec: Optional[int] = None
    platform: Optional[str] = None
    enabled_vitals: Optional[Dict[str, Any]] = None


class ScanResultCreate(BaseModel):
    """
    Body for POST /api/results.

    user_id is accepted from the request body for backward compatibility with
    the current frontend (which has no auth yet). When a valid JWT is present,
    the authenticated user's ID takes precedence over this field.
    """
    user_id: str
    vitals: Dict[str, Any]
    metadata: Optional[ScanMetadataIn] = None


# ── Response schemas ───────────────────────────────────────────────────────────

class ScanSaveResponse(BaseModel):
    """Returned after a successful scan save."""
    status: str
    id: str
    scans_remaining: int        # how many scans the user has left after this one
    authenticated: bool         # whether the request was made with a valid JWT


class ScanResultOut(BaseModel):
    """Full scan result returned from GET /api/results/{user_id}."""
    id: str
    user_id: str
    scanned_at: datetime

    # Cardiovascular
    pulse_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    pulse_pressure: Optional[float] = None
    mean_arterial_pressure: Optional[float] = None
    cardiac_workload: Optional[float] = None
    heart_age: Optional[float] = None

    # Respiratory
    respiration_rate: Optional[float] = None
    oxygen_saturation: Optional[float] = None

    # HRV
    sdnn: Optional[float] = None
    rmssd: Optional[float] = None
    mean_rri: Optional[float] = None
    sd1: Optional[float] = None
    sd2: Optional[float] = None
    prq: Optional[float] = None
    lfhf: Optional[float] = None
    pns_index: Optional[float] = None
    pns_zone: Optional[int] = None
    sns_index: Optional[float] = None
    sns_zone: Optional[int] = None

    # Stress & Wellness
    stress_level: Optional[int] = None
    stress_index: Optional[float] = None
    normalized_stress_index: Optional[float] = None
    wellness_level: Optional[int] = None
    wellness_index: Optional[float] = None

    # Metabolic
    hemoglobin: Optional[float] = None
    hemoglobin_a1c: Optional[float] = None

    # Risk scores
    high_hemoglobin_a1c_risk: Optional[int] = None
    high_blood_pressure_risk: Optional[int] = None
    high_fasting_glucose_risk: Optional[int] = None
    high_total_cholesterol_risk: Optional[int] = None
    low_hemoglobin_risk: Optional[int] = None
    ascvd_risk: Optional[float] = None
    ascvd_risk_level: Optional[int] = None

    measurement_duration_sec: Optional[int] = None
    scan_platform: Optional[str] = None
    vitals_confidence: Optional[Dict[str, Any]] = None
    vitals_enabled: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

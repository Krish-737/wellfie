from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr


# ── Request Bodies ────────────────────────────────────────────────────────────

class KioskSessionCreate(BaseModel):
    kiosk_id: str                          # e.g. "clinic-a"


class KioskProfileUpdate(BaseModel):
    guest_name:     Optional[str]   = None
    email:          Optional[str]   = None
    sex:            Optional[str]   = None
    date_of_birth:  Optional[str]   = None   # "YYYY-MM-DD"
    age:            Optional[int]   = None
    height_cm:      Optional[float] = None
    weight_kg:      Optional[float] = None
    smoking_status: Optional[str]   = None
    scan_result_id: Optional[str]   = None


class KioskScanPayload(BaseModel):
    """
    Mirrors the existing scan-result body the frontend already sends to
    POST /api/results — same field names so BiosenseSignalMonitor needs
    zero changes; the kiosk page just hits a different URL.
    """
    heart_rate:              Optional[float] = None
    hrv_sdnn:                Optional[float] = None
    spo2:                    Optional[float] = None
    respiratory_rate:        Optional[float] = None
    systolic_bp:             Optional[float] = None
    diastolic_bp:            Optional[float] = None
    map_value:               Optional[float] = None
    pulse_pressure:          Optional[float] = None
    cardiac_output:          Optional[float] = None
    stroke_volume:           Optional[float] = None
    svr:                     Optional[float] = None
    lvet:                    Optional[float] = None
    ptt:                     Optional[float] = None
    rmssd:                   Optional[float] = None
    pnn50:                   Optional[float] = None
    sd1:                     Optional[float] = None
    sd2:                     Optional[float] = None
    lfhf_ratio:              Optional[float] = None
    stress_index:            Optional[float] = None
    autonomic_balance:       Optional[float] = None
    recovery_capacity:       Optional[float] = None
    bmi:                     Optional[float] = None
    body_fat_percentage:     Optional[float] = None
    visceral_fat_index:      Optional[float] = None
    metabolic_rate:          Optional[float] = None
    insulin_resistance_risk: Optional[float] = None
    vascular_age:            Optional[float] = None
    heart_age:               Optional[float] = None
    ascvd_risk:              Optional[float] = None
    biological_age:          Optional[float] = None
    wellness_score:          Optional[float] = None
    vitality_index:          Optional[float] = None
    overall_health_score:    Optional[float] = None
    vitals_confidence:       Optional[dict]  = None
    vitals_enabled:          Optional[dict]  = None
    scan_platform:            Optional[str]    = None
    measurement_duration_sec: Optional[int]    = None
    vitals:                   Dict[str, Any]   = {}
    
class KioskEmailRequest(BaseModel):
    email: Optional[str] = None


# ── Response Bodies ───────────────────────────────────────────────────────────

class KioskSessionOut(BaseModel):
    id:             str
    kiosk_id:       str
    status:         str
    email:          Optional[str]
    guest_name:     Optional[str]
    sex:            Optional[str]
    date_of_birth:  Optional[str]
    age:            Optional[int]
    height_cm:      Optional[float]
    weight_kg:      Optional[float]
    smoking_status: Optional[str]
    scan_result_id: Optional[str]
    expires_at:     str
    is_expired:     bool

    class Config:
        from_attributes = True


class KioskCheckoutOut(BaseModel):
    checkout_url: str


class KioskScanOut(BaseModel):
    scan_result_id: str
    status:         str
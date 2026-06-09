from __future__ import annotations
import logging, os
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scan_result import ScanResult
from app.utils.auth import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/diff", tags=["Health Diff"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

METRICS: list[tuple[str, str, str, Optional[bool]]] = [
    ("pulse_rate",              "Pulse Rate",              "bpm",   None),
    ("blood_pressure_systolic", "BP Systolic",             "mmHg",  False),
    ("blood_pressure_diastolic","BP Diastolic",            "mmHg",  False),
    ("pulse_pressure",          "Pulse Pressure",          "mmHg",  None),
    ("mean_arterial_pressure",  "Mean Arterial Pressure",  "mmHg",  None),
    ("cardiac_workload",        "Cardiac Workload",        "",      None),
    ("heart_age",               "Heart Age",               "yrs",   False),
    ("respiration_rate",        "Respiration Rate",        "brpm",  None),
    ("oxygen_saturation",       "Oxygen Saturation",       "%",     True),
    ("sdnn",                    "SDNN",                    "ms",    True),
    ("rmssd",                   "RMSSD",                   "ms",    True),
    ("mean_rri",                "Mean RRI",                "ms",    None),
    ("sd1",                     "SD1",                     "ms",    True),
    ("sd2",                     "SD2",                     "ms",    True),
    ("prq",                     "PRQ",                     "",      None),
    ("lfhf",                    "LF/HF Ratio",             "",      None),
    ("pns_index",               "PNS Index",               "",      True),
    ("sns_index",               "SNS Index",               "",      None),
    ("stress_index",            "Stress Index",            "",      False),
    ("normalized_stress_index", "Normalized Stress Index", "",      False),
    ("wellness_index",          "Wellness Index",          "",      True),
    ("hemoglobin",              "Hemoglobin",              "g/dL",  True),
    ("hemoglobin_a1c",          "Hemoglobin A1c",          "%",     False),
    ("ascvd_risk",              "ASCVD Risk",              "%",     False),
]

ENUM_METRICS: list[tuple[str, str, dict]] = [
    ("stress_level",               "Stress Level",         {0:"Unknown",1:"Very Low",2:"Low",3:"Normal",4:"High",5:"Extreme"}),
    ("wellness_level",             "Wellness Level",       {0:"Unknown",1:"Low",2:"Normal",3:"High"}),
    ("pns_zone",                   "PNS Zone",             {0:"Unknown",1:"Low",2:"Normal",3:"High"}),
    ("sns_zone",                   "SNS Zone",             {0:"Unknown",1:"Low",2:"Normal",3:"High"}),
    ("high_blood_pressure_risk",   "BP Risk",              {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
    ("high_hemoglobin_a1c_risk",   "HbA1c Risk",          {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
    ("high_fasting_glucose_risk",  "Fasting Glucose Risk", {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
    ("high_total_cholesterol_risk","Cholesterol Risk",     {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
    ("low_hemoglobin_risk",        "Low Hemoglobin Risk",  {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
    ("ascvd_risk_level",           "ASCVD Risk Level",     {0:"Unknown",1:"Low",2:"Medium",3:"High"}),
]

NORMAL_RANGES: dict[str, tuple[Optional[float], Optional[float]]] = {
    "pulse_rate":               (60,  100),
    "blood_pressure_systolic":  (90,  129),
    "blood_pressure_diastolic": (60,  84),
    "respiration_rate":         (12,  20),
    "oxygen_saturation":        (95,  None),
    "sdnn":                     (50,  None),
    "rmssd":                    (20,  None),
    "stress_index":             (None, 4),
    "wellness_index":           (6,   None),
    "hemoglobin":               (12,  18),
    "hemoglobin_a1c":           (None, 5.7),
}

DELTA_THRESHOLDS: dict[str, float] = {
    "pulse_rate": 5, "blood_pressure_systolic": 5, "blood_pressure_diastolic": 4,
    "respiration_rate": 2, "oxygen_saturation": 1, "sdnn": 5, "rmssd": 5,
    "stress_index": 0.3, "wellness_index": 0.5, "hemoglobin": 0.5,
}

def _is_concerning(key: str, value: Optional[float]) -> bool:
    if value is None: return False
    r = NORMAL_RANGES.get(key)
    if not r: return False
    lo, hi = r
    if lo is not None and value < lo: return True
    if hi is not None and value > hi: return True
    return False

def _is_meaningful(key: str, delta: Optional[float]) -> bool:
    if delta is None: return False
    return abs(delta) >= DELTA_THRESHOLDS.get(key, 0)


class MetricDiff(BaseModel):
    key: str; label: str; unit: str
    previous: Optional[float]; current: Optional[float]
    delta: Optional[float]; delta_pct: Optional[float]
    trend: str
    higher_is_better: Optional[bool]
    is_concerning: bool
    is_meaningful_change: bool

class EnumDiff(BaseModel):
    key: str; label: str
    previous_value: Optional[int]; previous_label: str
    current_value: Optional[int]; current_label: str
    changed: bool

class HealthDiffResponse(BaseModel):
    previous_scan_id: str; current_scan_id: str
    previous_scanned_at: str; current_scanned_at: str
    metrics: list[MetricDiff]
    enums: list[EnumDiff]
    summary: str
    summary_source: str


def _compute_diff(prev: ScanResult, curr: ScanResult):
    metrics = []
    for field, label, unit, hib in METRICS:
        p = getattr(prev, field, None)
        c = getattr(curr, field, None)
        if p is None and c is None: continue
        delta = (c - p) if (c is not None and p is not None) else None
        delta_pct = (delta / abs(p) * 100) if (delta is not None and p and p != 0) else None
        if delta is None or abs(delta) < 1e-6: trend = "stable"
        elif hib is True:  trend = "improved" if delta > 0 else "declined"
        elif hib is False: trend = "improved" if delta < 0 else "declined"
        else: trend = "n/a"
        metrics.append(MetricDiff(
            key=field, label=label, unit=unit,
            previous=round(p, 2) if p is not None else None,
            current=round(c, 2)  if c is not None else None,
            delta=round(delta, 2) if delta is not None else None,
            delta_pct=round(delta_pct, 1) if delta_pct is not None else None,
            trend=trend, higher_is_better=hib,
            is_concerning=_is_concerning(field, c),
            is_meaningful_change=_is_meaningful(field, delta),
        ))
    enums = []
    for field, label, lmap in ENUM_METRICS:
        p = getattr(prev, field, None)
        c = getattr(curr, field, None)
        enums.append(EnumDiff(
            key=field, label=label,
            previous_value=p, previous_label=lmap.get(p, "Unknown") if p is not None else "—",
            current_value=c,  current_label=lmap.get(c, "Unknown")  if c is not None else "—",
            changed=(p != c),
        ))
    return metrics, enums


def _python_summary(metrics, enums):
    concerning = [m.label for m in metrics if m.is_concerning]
    improved   = [m.label for m in metrics if m.trend == "improved" and m.is_meaningful_change]
    declined   = [m.label for m in metrics if m.trend == "declined" and m.is_meaningful_change]
    parts = []
    if concerning:
        parts.append(f"Values outside normal range: {', '.join(concerning[:4])}.")
    if improved:
        parts.append(f"Meaningfully improved: {', '.join(improved[:4])}.")
    if declined:
        parts.append(f"Meaningfully declined: {', '.join(declined[:4])}.")
    if not parts:
        parts.append("All values remain within normal clinical ranges. Small fluctuations are normal.")
    return " ".join(parts)


async def _groq_summary(metrics, enums):
    concerning = [f"{m.label} ({m.current}{m.unit})" for m in metrics if m.is_concerning]
    meaningful = [f"{m.label} {'+' if (m.delta or 0)>0 else ''}{m.delta}{m.unit}" for m in metrics if m.is_meaningful_change]
    changed_enums = [f"{e.label}: {e.previous_label}→{e.current_label}" for e in enums if e.changed]

    prompt = (
        "You are Dr. Welfie, a friendly cardiologist. In 2-3 warm sentences directly to the patient, "
        "summarise what changed in their health scans and whether it matters clinically. "
        "Only flag concern if values are outside normal range or changes are clinically meaningful.\n\n"
        f"Outside normal range: {', '.join(concerning) or 'none'}.\n"
        f"Meaningful changes: {', '.join(meaningful) or 'none'}.\n"
        f"Status changes: {', '.join(changed_enums) or 'none'}.\n"
        "Reply with plain text only, no JSON, no bullet points."
    )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 200, "temperature": 0.7},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()


def _auth_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user_id

def _owned_scan(scan_id: str, user_id: str, db: Session) -> ScanResult:
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan or scan.user_id != user_id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/latest", response_model=HealthDiffResponse)
async def diff_latest(
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer()),
    db: Session = Depends(get_db),
):
    user_id = _auth_user_id(credentials)
    scans = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == user_id)
        .order_by(ScanResult.scanned_at.desc())
        .limit(2).all()
    )
    if len(scans) < 2:
        raise HTTPException(status_code=404, detail="At least two scans required.")
    curr, prev = scans[0], scans[1]
    return await _build_response(prev, curr)


@router.get("/{scan_a_id}/{scan_b_id}", response_model=HealthDiffResponse)
async def diff_specific(
    scan_a_id: str, scan_b_id: str,
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer()),
    db: Session = Depends(get_db),
):
    user_id = _auth_user_id(credentials)
    prev = _owned_scan(scan_a_id, user_id, db)
    curr = _owned_scan(scan_b_id, user_id, db)
    return await _build_response(prev, curr)


async def _build_response(prev: ScanResult, curr: ScanResult) -> HealthDiffResponse:
    metrics, enums = _compute_diff(prev, curr)
    summary_source = "python"
    summary = _python_summary(metrics, enums)
    if GROQ_API_KEY:
        try:
            summary = await _groq_summary(metrics, enums)
            summary_source = "groq"
        except Exception as e:
            logger.warning("Groq failed: %s", e)
    return HealthDiffResponse(
        previous_scan_id=prev.id, current_scan_id=curr.id,
        previous_scanned_at=prev.scanned_at.isoformat(),
        current_scanned_at=curr.scanned_at.isoformat(),
        metrics=metrics, enums=enums,
        summary=summary, summary_source=summary_source,
    )
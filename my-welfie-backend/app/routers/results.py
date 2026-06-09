"""
Scan results router — stores scan output and enforces entitlement rules.

Endpoints:
  POST /api/results           — save a completed scan (auth optional, entitlement enforced when auth present)
  GET  /api/results/me        — list scans for the authenticated user (requires JWT)
  GET  /api/results/{user_id} — list scans by user_id (legacy / dev endpoint, no auth required)

── Backward Compatibility ─────────────────────────────────────────────────────
The frontend currently POSTs without an Authorization header and sends a
hardcoded user_id in the body. To avoid breaking the UI while auth is being
wired up, this endpoint operates in two modes:

  Authenticated mode  — JWT present + valid
    • user_id is taken from the token (body user_id is ignored)
    • Entitlement check runs: user must have scans_remaining > 0
    • scans_remaining is decremented by 1 after a successful save

  Unauthenticated mode — no JWT (dev / pre-auth frontend)
    • user_id is taken from the request body as-is
    • Entitlement check is SKIPPED
    • A warning is logged to the console
    • scans_remaining is returned as -1 (sentinel meaning "unknown")

This fallback will be removed once the frontend sends a real JWT.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.scan_result import ScanResult
from app.models.scan_session import ScanSession
from app.models.user import User
from app.schemas.scan import ScanResultCreate, ScanResultOut, ScanSaveResponse
from app.services.scan_payload_logger import write_scan_payload_log
from app.services.vitals_metadata import extract_vitals_confidence
from app.utils.auth import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/results", tags=["Results"])

# auto_error=False — if Authorization header is absent, credentials will be None
# instead of raising a 403. We handle the unauthenticated fallback ourselves.
http_bearer_optional = HTTPBearer(auto_error=False)


# ── Helper: map the full BioSense SDK payload to ScanResult kwargs ──────────────

def _map_vitals(v: dict) -> dict:
    """
    Extract all 34 SDK indicators from the raw vitals payload.

    SDK convention:
      - Most indicators: v["camelCaseKey"]["value"]  →  a float or int
      - Blood pressure:  v["bloodPressure"]["value"]["systolic"] / ["diastolic"]
      - Zone/risk fields return integer enums (0=Unknown, 1=Low, 2=Normal/Medium, 3=High)

    Using .get() with empty-dict fallback on every access means any missing or
    null field from the SDK is stored as None rather than raising a KeyError.
    """
    bp = v.get("bloodPressure", {}).get("value") or {}

    return dict(
        # ── Cardiovascular ──────────────────────────────────────────────────
        pulse_rate=v.get("pulseRate", {}).get("value"),
        blood_pressure_systolic=bp.get("systolic"),
        blood_pressure_diastolic=bp.get("diastolic"),
        pulse_pressure=v.get("pulsePressure", {}).get("value"),
        mean_arterial_pressure=v.get("meanArterialPressure", {}).get("value"),
        cardiac_workload=v.get("cardiacWorkload", {}).get("value"),
        heart_age=v.get("heartAge", {}).get("value"),

        # ── Respiratory ─────────────────────────────────────────────────────
        respiration_rate=v.get("respirationRate", {}).get("value"),
        oxygen_saturation=v.get("oxygenSaturation", {}).get("value"),

        # ── HRV / Autonomic Nervous System ──────────────────────────────────
        sdnn=v.get("sdnn", {}).get("value"),
        rmssd=v.get("rmssd", {}).get("value"),
        mean_rri=v.get("meanRri", {}).get("value"),
        sd1=v.get("sd1", {}).get("value"),
        sd2=v.get("sd2", {}).get("value"),
        prq=v.get("prq", {}).get("value"),
        lfhf=v.get("lfhf", {}).get("value"),
        pns_index=v.get("pnsIndex", {}).get("value"),
        pns_zone=v.get("pnsZone", {}).get("value"),
        sns_index=v.get("snsIndex", {}).get("value"),
        sns_zone=v.get("snsZone", {}).get("value"),

        # ── Stress & Wellness ────────────────────────────────────────────────
        stress_level=v.get("stressLevel", {}).get("value"),
        stress_index=v.get("stressIndex", {}).get("value"),
        normalized_stress_index=v.get("normalizedStressIndex", {}).get("value"),
        wellness_level=v.get("wellnessLevel", {}).get("value"),
        wellness_index=v.get("wellnessIndex", {}).get("value"),

        # ── Metabolic / Blood ────────────────────────────────────────────────
        hemoglobin=v.get("hemoglobin", {}).get("value"),
        hemoglobin_a1c=v.get("hemoglobinA1c", {}).get("value"),

        # ── Risk Scores ──────────────────────────────────────────────────────
        high_hemoglobin_a1c_risk=v.get("highHemoglobinA1cRisk", {}).get("value"),
        high_blood_pressure_risk=v.get("highBloodPressureRisk", {}).get("value"),
        high_fasting_glucose_risk=v.get("highFastingGlucoseRisk", {}).get("value"),
        high_total_cholesterol_risk=v.get("highTotalCholesterolRisk", {}).get("value"),
        low_hemoglobin_risk=v.get("lowHemoglobinRisk", {}).get("value"),
        ascvd_risk=v.get("ascvdRisk", {}).get("value"),
        ascvd_risk_level=v.get("ascvdRiskLevel", {}).get("value"),
    )


# ── Helper: entitlement check + decrement ──────────────────────────────────────

def _get_remaining_scans(user_id: str, db: Session) -> int:
    """Sum scans_remaining across all active packs for this user."""
    total = db.query(func.sum(ScanSession.scans_remaining)).filter(
        ScanSession.user_id == user_id,
        ScanSession.scans_remaining > 0,
    ).scalar()
    return total or 0


def _decrement_scan(user_id: str, db: Session) -> int:
    """
    Deduct 1 scan from the user's oldest active pack.
    Returns the new total scans_remaining across all packs.
    """
    oldest_active = db.query(ScanSession).filter(
        ScanSession.user_id == user_id,
        ScanSession.scans_remaining > 0,
    ).order_by(ScanSession.created_at.asc()).first()

    if oldest_active:
        oldest_active.scans_remaining -= 1

    # Return updated total
    return _get_remaining_scans(user_id, db)


# ── POST /api/results ──────────────────────────────────────────────────────────

@router.post("", response_model=ScanSaveResponse)
def store_scan_result(
    data: ScanResultCreate,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(http_bearer_optional),
    db: Session = Depends(get_db),
):
    """
    Save a completed scan result from the BioSense SDK.

    Authenticated mode (JWT present):
      - Uses the token's user_id — body user_id is ignored
      - Checks and decrements scan entitlement

    Unauthenticated mode (no JWT — dev / legacy frontend):
      - Uses user_id from the request body
      - Skips entitlement check
      - Returns scans_remaining = -1
    """
    authenticated = False
    scans_remaining = -1  # -1 = sentinel for "unauthenticated / unknown"

    # Extract raw token string from HTTPAuthorizationCredentials (or None if absent)
    token = credentials.credentials if credentials else None

    if token:
        # ── Authenticated path ───────────────────────────────────────────────
        user_id = decode_access_token(token)

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Confirm the user actually exists and is active
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )

        # Entitlement gate — block the scan if the user has no scans remaining
        remaining = _get_remaining_scans(user_id, db)
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No scans remaining. Please purchase a scan pack to continue.",
            )

        authenticated = True

    else:
        # ── Unauthenticated fallback (dev / pre-auth frontend) ───────────────
        user_id = data.user_id
        logger.warning(
            "Scan saved without authentication (user_id from body: %s). "
            "This fallback will be removed once the frontend sends a JWT.",
            user_id,
        )

    # Build and save the ScanResult with all 34 vitals + SDK metadata
    meta = data.metadata
    result = ScanResult(
        user_id=user_id,
        vitals_confidence=extract_vitals_confidence(data.vitals),
        measurement_duration_sec=meta.measurement_duration_sec if meta else None,
        scan_platform=meta.platform if meta else None,
        vitals_enabled=meta.enabled_vitals if meta else None,
        **_map_vitals(data.vitals),
    )
    db.add(result)

    if authenticated:
        # Decrement inside the same transaction so it rolls back on error
        scans_remaining = _decrement_scan(user_id, db)

    db.commit()
    db.refresh(result)

    # Temporary: persist raw SDK payload for structure inspection (see logs/)
    try:
        log_path = write_scan_payload_log(
            scan_id=result.id,
            scanned_at=result.scanned_at,
            user_id=user_id,
            vitals=data.vitals,
        )
        logger.info("Scan payload logged: %s", log_path.name)
    except Exception:
        logger.exception("Failed to write scan payload log for scan %s", result.id)

    return ScanSaveResponse(
        status="success",
        id=result.id,
        scans_remaining=scans_remaining,
        authenticated=authenticated,
    )


# ── GET /api/results/me ────────────────────────────────────────────────────────

@router.get("/me", response_model=List[ScanResultOut])
def get_my_results(
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer()),
    db: Session = Depends(get_db),
):
    """
    Return all scan results for the currently authenticated user.
    Requires a valid JWT in the Authorization header.
    """
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    results = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == user_id)
        .order_by(ScanResult.scanned_at.desc())
        .all()
    )
    return results


# ── GET /api/results/{user_id} — legacy dev endpoint ──────────────────────────

@router.get("/{user_id}", response_model=List[ScanResultOut])
def get_user_results(user_id: str, db: Session = Depends(get_db)):
    """
    Return all scan results for the given user_id.
    No auth required — kept for backward compatibility and dev tooling.
    Will be deprecated once the frontend fully migrates to /api/results/me.
    """
    results = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == user_id)
        .order_by(ScanResult.scanned_at.desc())
        .all()
    )
    return results

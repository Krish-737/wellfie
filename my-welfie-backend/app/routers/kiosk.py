"""
Kiosk Router — QR-code-initiated guest scan workflow.

/kiosk/session          POST  — create session
/kiosk/session/:id      GET   — fetch session state
/kiosk/session/:id/profile  PATCH — save optional health profile
/kiosk/session/:id/checkout POST  — create Stripe Checkout
/kiosk/webhook          POST  — Stripe webhook (kiosk payments only)
/kiosk/session/:id/scan POST  — save BioSense scan result
/kiosk/session/:id/email POST — send PDF report; prompts for email if missing
/kiosk/session/:id/pdf  GET   — download PDF directly
/kiosk/session/:id/scan-result GET — return scan result JSON for report page
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.kiosk_session import KioskSession
from app.models.kiosk_user import KioskUser
from app.models.scan_result import ScanResult
from app.schemas.kiosk import (
    KioskCheckoutOut,
    KioskEmailRequest,
    KioskProfileUpdate,
    KioskScanOut,
    KioskScanPayload,
    KioskSessionCreate,
    KioskSessionOut,
)
from app.services.mailer import send_report_email
from app.services.report_pdf import build_scan_pdf

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:3000")
# KIOSK_PRICE_ID = os.getenv("STRIPE_KIOSK_PRICE_ID", "")

router = APIRouter(prefix="/kiosk", tags=["kiosk"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: str, db: Session) -> KioskSession:
    ks = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not ks:
        raise HTTPException(status_code=404, detail="Kiosk session not found")
    return ks


def _session_out(ks: KioskSession) -> KioskSessionOut:
    return KioskSessionOut(
        id=ks.id,
        kiosk_id=ks.kiosk_id,
        status=ks.status,
        kiosk_user_id=ks.kiosk_user_id,
        email=ks.email,
        guest_name=ks.guest_name,
        sex=ks.sex,
        date_of_birth=ks.date_of_birth,
        age=ks.age,
        height_cm=ks.height_cm,
        weight_kg=ks.weight_kg,
        smoking_status=ks.smoking_status,
        scan_result_id=ks.scan_result_id,
        expires_at=ks.expires_at.isoformat(),
        is_expired=datetime.utcnow() > ks.expires_at,
    )


def _vitals_to_scan_result(vitals: dict) -> dict:
    """
    Map the BioSense SDK vitals payload (nested dicts with .value)
    to the flat ScanResult column names.

    The SDK sends: { "pulseRate": { "value": 72, "confidence": 3 }, ... }
    ScanResult expects flat fields: pulse_rate, oxygen_saturation, etc.
    """
    def v(key):
        """Extract .value from a nested SDK key, return None if missing."""
        node = vitals.get(key)
        if node is None:
            return None
        if isinstance(node, dict):
            return node.get("value")
        # Already a flat value (e.g. from placeholder scanner)
        return node

    return dict(
        pulse_rate                  = v("pulseRate")                or v("heart_rate"),
        blood_pressure_systolic     = v("bloodPressureSystolic")    or v("systolic_bp"),
        blood_pressure_diastolic    = v("bloodPressureDiastolic")   or v("diastolic_bp"),
        pulse_pressure              = v("pulsePressure")            or v("pulse_pressure"),
        mean_arterial_pressure      = v("meanArterialPressure")     or v("map_value"),
        cardiac_workload            = v("cardiacWorkload"),
        heart_age                   = v("heartAge")                 or v("heart_age"),
        respiration_rate            = v("respirationRate")          or v("respiratory_rate"),
        oxygen_saturation           = v("oxygenSaturation")         or v("spo2"),
        sdnn                        = v("sdnn")                     or v("hrv_sdnn"),
        rmssd                       = v("rmssd"),
        mean_rri                    = v("meanRri"),
        sd1                         = v("sd1"),
        sd2                         = v("sd2"),
        prq                         = v("prq"),
        lfhf                        = v("lfhf")                     or v("lfhf_ratio"),
        pns_index                   = v("pnsIndex"),
        pns_zone                    = v("pnsZone"),
        sns_index                   = v("snsIndex"),
        sns_zone                    = v("snsZone"),
        stress_level                = v("stressLevel"),
        stress_index                = v("stressIndex")              or v("stress_index"),
        normalized_stress_index     = v("normalizedStressIndex"),
        wellness_level              = v("wellnessLevel"),
        wellness_index              = v("wellnessIndex")            or v("wellness_score"),
        hemoglobin                  = v("hemoglobin"),
        hemoglobin_a1c              = v("hemoglobinA1c"),
        high_hemoglobin_a1c_risk    = v("highHemoglobinA1cRisk"),
        high_blood_pressure_risk    = v("highBloodPressureRisk"),
        high_fasting_glucose_risk   = v("highFastingGlucoseRisk"),
        high_total_cholesterol_risk = v("highTotalCholesterolRisk"),
        low_hemoglobin_risk         = v("lowHemoglobinRisk"),
        ascvd_risk                  = v("ascvdRisk")                or v("ascvd_risk"),
        ascvd_risk_level            = v("ascvdRiskLevel"),
    )


# ── 1. Create session ─────────────────────────────────────────────────────────

@router.post("/session", response_model=KioskSessionOut, status_code=201)
def create_session(body: KioskSessionCreate, db: Session = Depends(get_db)):
    ks = KioskSession(kiosk_id=body.kiosk_id)
    db.add(ks)
    db.commit()
    db.refresh(ks)
    return _session_out(ks)


# ── 1b. Direct Checkout (creates session + Stripe checkout in one call) ──────

@router.post("/direct-checkout")
def direct_checkout(body: KioskSessionCreate, db: Session = Depends(get_db)):
    """Creates a kiosk session and Stripe checkout for the $1 direct flow."""
    ks = KioskSession(kiosk_id=body.kiosk_id)
    db.add(ks)
    db.commit()
    db.refresh(ks)

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if not stripe.api_key or stripe.api_key.startswith("sk_test_your"):
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    checkout = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "sgd",
                "unit_amount": 100,   # $1.00 SGD
                "product_data": {
                    "name": "MyWellfie Health Scan",
                    "description": "One comprehensive facial health scan — 34 vital metrics",
                },
            },
            "quantity": 1,
        }],
        mode="payment",
        metadata={
            "source": "kiosk",
            "kiosk_session_id": ks.id,
        },
        success_url=f"{FRONTEND_URL}/kiosk/flow?session_id={ks.id}",
        cancel_url=f"{FRONTEND_URL}/kiosk/flow?session_id={ks.id}&cancelled=true",
    )

    ks.stripe_session_id = checkout.id
    db.commit()

    return {"session_id": ks.id, "checkout_url": checkout.url}


# ── 2. Get session state ──────────────────────────────────────────────────────

@router.get("/session/{session_id}", response_model=KioskSessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    ks = _get_session_or_404(session_id, db)
    return _session_out(ks)


# ── 3. Save optional health profile ──────────────────────────────────────────

@router.patch("/session/{session_id}/profile", response_model=KioskSessionOut)
def update_profile(
    session_id: str,
    body: KioskProfileUpdate,
    db: Session = Depends(get_db),
):
    ks = _get_session_or_404(session_id, db)

    if datetime.utcnow() > ks.expires_at:
        raise HTTPException(status_code=410, detail="Session has expired")
    if ks.status not in ("pending_payment", "paid"):
        raise HTTPException(status_code=409, detail="Profile can only be updated before scan starts")

    for field, value in body.dict(exclude_none=True).items():
        if hasattr(ks, field):
            setattr(ks, field, value)

    # Auto-compute age from date_of_birth if not explicitly given
    if body.date_of_birth and not body.age:
        try:
            dob = datetime.strptime(body.date_of_birth, "%Y-%m-%d")
            today = datetime.utcnow()
            ks.age = (today - dob).days // 365
        except ValueError:
            pass

    # Create or link KioskUser by email
    if body.email:
        user = db.query(KioskUser).filter(KioskUser.email == body.email).first()
        if not user:
            user = KioskUser(email=body.email, guest_name=body.guest_name)
            db.add(user)
            db.flush()
        elif body.guest_name and not user.guest_name:
            user.guest_name = body.guest_name
        ks.kiosk_user_id = user.id

    db.commit()
    db.refresh(ks)
    return _session_out(ks)


# ── 4. Create Stripe Checkout ─────────────────────────────────────────────────

# @router.post("/session/{session_id}/checkout", response_model=KioskCheckoutOut)
# def create_checkout(session_id: str, db: Session = Depends(get_db)):
#     ks = _get_session_or_404(session_id, db)

#     if datetime.utcnow() > ks.expires_at:
#         raise HTTPException(status_code=410, detail="Session has expired")

#     if ks.status != "pending_payment":
#         # Already paid — send straight to scan
#         return KioskCheckoutOut(
#             checkout_url=f"{FRONTEND_URL}/kiosk/{session_id}/scan"
#         )

#     if not KIOSK_PRICE_ID:
#         raise HTTPException(status_code=500, detail="STRIPE_KIOSK_PRICE_ID not configured")

#     checkout = stripe.checkout.Session.create(
#         mode="payment",
#         line_items=[{"price": KIOSK_PRICE_ID, "quantity": 1}],
#         metadata={
#             "source": "kiosk",
#             "kiosk_session_id": session_id,
#         },
#         success_url=f"{FRONTEND_URL}/kiosk/{session_id}/scan?payment=success",
#         cancel_url=f"{FRONTEND_URL}/kiosk/{session_id}?payment=cancelled",
#     )

#     ks.stripe_session_id = checkout.id
#     db.commit()

#     return KioskCheckoutOut(checkout_url=checkout.url)

# ── 4. Create Stripe Checkout ─────────────────────────────────────────────────

@router.post("/session/{session_id}/checkout", response_model=KioskCheckoutOut)
def create_checkout(session_id: str, db: Session = Depends(get_db)):
    ks = _get_session_or_404(session_id, db)

    if datetime.utcnow() > ks.expires_at:
        raise HTTPException(status_code=410, detail="Session has expired")

    if ks.status != "pending_payment":
        # Already paid — DO NOT send phone to scanner.
        # Just show the thank-you page. The kiosk display handles scanning.
        return KioskCheckoutOut(
            checkout_url=f"{FRONTEND_URL}/kiosk/payment-done"  # ← was /kiosk/{session_id}/scan
        )

    # ... rest unchanged

    if not stripe.api_key or stripe.api_key.startswith("sk_test_your"):
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    checkout = stripe.checkout.Session.create(
        payment_method_types=["card", "paynow"],
        line_items=[
            {
                "price_data": {
                    "currency": "sgd",
                    "unit_amount": 500,   # S$5.00 — change here to adjust kiosk price
                    "product_data": {
                        "name": "MyWellfie Health Scan",
                        "description": "One comprehensive facial health scan — 34 vital metrics",
                    },
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        metadata={
            "source": "kiosk",
            "kiosk_session_id": session_id,
        },
        # success_url=f"{FRONTEND_URL}/kiosk/{session_id}/scan?payment=success",
        # cancel_url=f"{FRONTEND_URL}/kiosk/{session_id}?payment=cancelled",

        success_url=f"{FRONTEND_URL}/kiosk/payment-done",   # phone sees a simple "thank you"
        cancel_url=f"{FRONTEND_URL}/kiosk/payment-cancelled"
    )

    ks.stripe_session_id = checkout.id
    db.commit()

    return KioskCheckoutOut(checkout_url=checkout.url)

# ── 5. Simulate Payment (dev/test only) ────────────────────────────────────────

@router.post("/session/{session_id}/simulate-payment", response_model=KioskSessionOut)
def simulate_payment(session_id: str, db: Session = Depends(get_db)):
    ks = _get_session_or_404(session_id, db)

    if datetime.utcnow() > ks.expires_at:
        raise HTTPException(status_code=410, detail="Session has expired")
    if ks.status != "pending_payment":
        raise HTTPException(status_code=409, detail="Session is not pending payment")

    ks.status = "paid"
    db.commit()
    db.refresh(ks)
    return _session_out(ks)


# ── 6. Stripe Webhook ─────────────────────────────────────────────────────────

@router.post("/webhook")
async def kiosk_webhook(request: Request, db: Session = Depends(get_db)):
    print(f"\n>>> KIOSK WEBHOOK RECEIVED: {request.method} {request.url} <<<", flush=True)
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    webhook_secret = (
        os.getenv("STRIPE_KIOSK_WEBHOOK_SECRET")
        or os.getenv("STRIPE_WEBHOOK_SECRET", "")
    )

    if not webhook_secret or webhook_secret.startswith("whsec_your"):
        try:
            import json
            event = stripe.Event.construct_from(
                stripe.util.convert_to_stripe_object(json.loads(payload)),
                stripe.api_key,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook parse error: {e}")
    else:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid Stripe signature")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    if event.type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        stripe_session = event.data.object
        
        # Check payment_status — for async methods, we only fulfill if it's 'paid'
        if stripe_session.payment_status != "paid":
            print(f"Checkout {stripe_session.id} not paid yet (status: {stripe_session.payment_status})", flush=True)
            return Response(status_code=200)

        # Stripe SDK v5+ returns typed objects — use .to_dict(), NOT .get()
        metadata = stripe_session.metadata.to_dict() if stripe_session.metadata else {}
        print(f"------------ WEBHOOK METADATA ------------\n{metadata}\n----------------------------------------", flush=True)

        if metadata.get("source") != "kiosk":
            print("Ignoring webhook because source is not 'kiosk'", flush=True)
            return Response(status_code=200)

        kiosk_session_id = metadata.get("kiosk_session_id")
        if not kiosk_session_id:
            print("Ignoring webhook because kiosk_session_id is missing", flush=True)
            return Response(status_code=200)

        ks = db.query(KioskSession).filter(KioskSession.id == kiosk_session_id).first()
        if ks:
            print(f"Found session {ks.id} with status {ks.status}", flush=True)
            if ks.status == "pending_payment":
                ks.status = "paid"
                db.commit()
                print(f"Successfully marked session {ks.id} as paid!", flush=True)
            else:
                print(f"Session {ks.id} status is {ks.status}, skipping update.", flush=True)
        else:
            print(f"Could NOT find KioskSession with ID {kiosk_session_id} in database!", flush=True)

    return Response(status_code=200)

# ── 6. Save scan result ───────────────────────────────────────────────────────

@router.post("/session/{session_id}/scan", response_model=KioskScanOut)
def save_scan(
    session_id: str,
    body: KioskScanPayload,
    db: Session = Depends(get_db),
):
    ks = _get_session_or_404(session_id, db)

    if datetime.utcnow() > ks.expires_at:
        raise HTTPException(status_code=410, detail="Session has expired")

    # Idempotent — already saved, return existing
    if ks.status == "scanned":
        return KioskScanOut(scan_result_id=ks.scan_result_id, status=ks.status)

    if ks.status != "paid":
        raise HTTPException(
            status_code=402,
            detail="Payment required before scanning",
        )

    # Map SDK vitals payload → ScanResult column names
    mapped = _vitals_to_scan_result(body.vitals)

    result = ScanResult(
        id=str(uuid.uuid4()),
        user_id=None,                   # kiosk scan — no registered user
        kiosk_session_id=session_id,
        vitals_confidence=body.vitals_confidence or {},
        vitals_enabled=body.vitals_enabled or {},
        scan_platform=body.scan_platform or "kiosk",
        measurement_duration_sec=body.measurement_duration_sec,
        **mapped,
    )
    db.add(result)

    ks.scan_result_id = result.id
    ks.status = "scanned"
    db.commit()
    db.refresh(result)

    return KioskScanOut(scan_result_id=result.id, status=ks.status)


# ── 7. Get scan result (for report page display) ──────────────────────────────

@router.get("/session/{session_id}/scan-result")
def get_scan_result(session_id: str, db: Session = Depends(get_db)):
    ks = _get_session_or_404(session_id, db)

    if ks.status not in ("scanned", "report_sent"):
        raise HTTPException(status_code=409, detail="Scan not yet completed")

    result = db.query(ScanResult).filter(ScanResult.id == ks.scan_result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found")

    # Return as dict — serialise all columns
    return {
        c.name: getattr(result, c.name)
        for c in result.__table__.columns
    }


# ── 8. Send report via email ──────────────────────────────────────────────────

@router.post("/session/{session_id}/email")
def send_email_report(
    session_id: str,
    body: KioskEmailRequest,
    db: Session = Depends(get_db),
):
    ks = _get_session_or_404(session_id, db)

    if ks.status not in ("scanned", "report_sent"):
        raise HTTPException(status_code=409, detail="Scan must be completed before sending report")

    email = body.email or ks.email
    if not email:
        raise HTTPException(
            status_code=422,
            detail={"needs_email": True, "message": "Please provide an email address"},
        )

    if not ks.email:
        ks.email = email

    scan_result = db.query(ScanResult).filter(ScanResult.id == ks.scan_result_id).first()
    if not scan_result:
        raise HTTPException(status_code=404, detail="Scan result not found")

    pdf_bytes = build_scan_pdf(
        scan=scan_result,
        user_name=ks.guest_name or "Guest",
        user_email=email,
        user_age=ks.age,
    )
    send_report_email(
        to_address=email,
        user_name=ks.guest_name or "Guest",
        pdf_bytes=pdf_bytes,
        scan_id=scan_result.id,
        scanned_at=scan_result.scanned_at,
    )

    ks.status = "report_sent"
    db.commit()

    return {"message": f"Report sent to {email}"}


# ── 9. Download PDF ───────────────────────────────────────────────────────────

@router.get("/session/{session_id}/pdf")
def download_pdf(session_id: str, db: Session = Depends(get_db)):
    ks = _get_session_or_404(session_id, db)

    if ks.status not in ("scanned", "report_sent"):
        raise HTTPException(status_code=409, detail="Scan must be completed before downloading")

    scan_result = db.query(ScanResult).filter(ScanResult.id == ks.scan_result_id).first()
    if not scan_result:
        raise HTTPException(status_code=404, detail="Scan result not found")

    pdf_bytes = build_scan_pdf(
        scan=scan_result,
        user_name=ks.guest_name or "Guest",
        user_email=ks.email or "guest@mywellfie.com",
        user_age=ks.age,
    )

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="mywellfie-report-{session_id[:8]}.pdf"'},
    )
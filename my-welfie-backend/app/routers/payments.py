"""
Payments router — Stripe Checkout integration.

Endpoints:
  GET  /payments/packs                        — list available scan packs (no auth)
  POST /payments/create-checkout-session      — create a Stripe Checkout session (auth required)
  POST /payments/webhook                      — receive Stripe webhook events (no auth — Stripe signs requests)
  GET  /payments/entitlement                  — get user's current scan balance (auth required)

── How Stripe Checkout Works ─────────────────────────────────────────────────
  1. Frontend calls POST /payments/create-checkout-session with the chosen pack_id
  2. Backend creates a Stripe Checkout Session and returns a checkout_url
  3. Frontend redirects the browser to checkout_url (Stripe-hosted payment page)
  4. User completes payment on Stripe
  5. Stripe sends a POST to /payments/webhook with event type "checkout.session.completed"
  6. Backend verifies the webhook signature, creates a ScanSession row with the purchased scans
  7. Stripe redirects the browser to STRIPE_SUCCESS_URL

── Why Webhooks Instead of Redirect Verification ─────────────────────────────
  The success redirect URL cannot be trusted for fulfillment — a user could
  manually navigate to it without paying. Stripe webhooks are signed with
  STRIPE_WEBHOOK_SECRET and are the only reliable source of truth for payment
  confirmation.
"""

import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.config import (
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    STRIPE_SUCCESS_URL,
    STRIPE_CANCEL_URL,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models.scan_session import ScanSession
from app.models.user import User
from app.models.kiosk_session import KioskSession
from app.schemas.payment import (
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    EntitlementSummary,
    ScanSessionOut,
    ScanPack,
)

logger = logging.getLogger(__name__)

stripe.api_key = STRIPE_SECRET_KEY

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Scan pack catalogue ────────────────────────────────────────────────────────
# Prices are in Singapore cents (S$1 = 100 cents).
# Update these when pricing changes — no DB or Stripe Dashboard changes needed
# unless you switch to Stripe Price objects.

SCAN_PACKS: dict[str, ScanPack] = {
    "single": ScanPack(
        pack_id="single",
        name="Single Scan",
        scans=1,
        price_sgd=500,          # S$5.00
        description="One additional health scan",
    ),
    "basic": ScanPack(
        pack_id="basic",
        name="Basic Pack",
        scans=4,
        price_sgd=1600,         # S$16.00
        description="4 health scans — great for monthly check-ins",
    ),
    "standard": ScanPack(
        pack_id="standard",
        name="Standard Pack",
        scans=12,
        price_sgd=2400,         # S$24.00
        description="12 health scans — weekly monitoring for a quarter",
    ),
    "premium": ScanPack(
        pack_id="premium",
        name="Premium Pack",
        scans=52,
        price_sgd=3600,         # S$36.00
        description="52 health scans — scan every week for a full year",
    ),
}


# ── GET /payments/packs ────────────────────────────────────────────────────────

@router.get("/packs", response_model=List[ScanPack])
def list_packs():
    """
    Return the available scan packs.
    No auth required — used to render the pricing page.
    """
    return list(SCAN_PACKS.values())


# ── GET /payments/entitlement ──────────────────────────────────────────────────

@router.get("/entitlement", response_model=EntitlementSummary)
def get_entitlement(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the authenticated user's current scan balance across all active packs.
    The frontend uses this to decide whether to show the "Buy scans" prompt.
    """
    packs = (
        db.query(ScanSession)
        .filter(ScanSession.user_id == current_user.id)
        .order_by(ScanSession.created_at.desc())
        .all()
    )
    total = sum(p.scans_remaining for p in packs)
    return EntitlementSummary(total_scans_remaining=total, packs=packs)


# ── POST /payments/create-checkout-session ─────────────────────────────────────

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    body: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout Session for the chosen scan pack.

    Steps:
      1. Validate the chosen pack_id exists in the catalogue.
      2. Create a Stripe Checkout Session with:
           - One line item (pack name, price, quantity 1)
           - Metadata: user_id and pack_id so the webhook can fulfil the order
           - Success/cancel redirect URLs
      3. Return the checkout_url — the frontend redirects the browser here.

    The actual scan credit happens in the webhook, NOT here.
    """
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith("sk_test_your"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Add STRIPE_SECRET_KEY to your .env file.",
        )

    pack = SCAN_PACKS.get(body.pack_id)
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown pack_id '{body.pack_id}'. Valid options: {list(SCAN_PACKS.keys())}",
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card", "paynow"],
            line_items=[
                {
                    "price_data": {
                        "currency": "sgd",
                        "unit_amount": pack.price_sgd,  # in cents
                        "product_data": {
                            "name": pack.name,
                            "description": pack.description,
                        },
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            # Metadata is passed through to the webhook — this is how we know
            # which user to credit and how many scans to add.
            metadata={
                "user_id": current_user.id,
                "pack_id": pack.pack_id,
                "scans": str(pack.scans),
            },
            success_url=STRIPE_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=STRIPE_CANCEL_URL,
        )
    except stripe.StripeError as e:
        logger.error("Stripe error creating checkout session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {e.user_message or str(e)}",
        )

    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)


# ── POST /payments/webhook ─────────────────────────────────────────────────────

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receive and process Stripe webhook events.
    """
    print(f"\n>>> WEBHOOK RECEIVED: {request.method} {request.url} <<<", flush=True)
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET.startswith("whsec_your"):
        # In dev without a webhook secret, log and skip verification.
        # NEVER skip verification in production.
        logger.warning("STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)")
        try:
            event = stripe.Event.construct_from(
                stripe.util.convert_to_stripe_object(
                    stripe.util.json.loads(payload)
                ),
                stripe.api_key,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook parse error: {e}")
    else:
        # Production path — always verify the signature
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    # ── Handle checkout.session.completed ─────────────────────────────────────
    # Stripe SDK v5+ returns typed objects — use attribute access, not .get()
    if event.type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        session = event.data.object

        # Check payment_status — for async methods, we only fulfill if it's 'paid'
        if session.payment_status != "paid":
            logger.info("Checkout %s not paid yet (status: %s)", session.id, session.payment_status)
            return {"received": True}

        # session.metadata is a Metadata object (dict-like) — convert to plain dict
        # metadata = dict(session.metadata) if session.metadata else {}
        metadata = session.metadata.to_dict() if session.metadata else {}

        # ── Handle Kiosk Payments (If they land here) ────────────────────────
        if metadata.get("source") == "kiosk":
            kiosk_session_id = metadata.get("kiosk_session_id")
            if kiosk_session_id:
                ks = db.query(KioskSession).filter(KioskSession.id == kiosk_session_id).first()
                if ks and ks.status == "pending_payment":
                    ks.status = "paid"
                    db.commit()
                    logger.info("Kiosk payment fulfilled via main webhook: session=%s", kiosk_session_id)
                return {"received": True}

        user_id = metadata.get("user_id")
        pack_id = metadata.get("pack_id")
        scans = int(metadata.get("scans", 0))

        if not user_id or not pack_id or scans <= 0:
            logger.error("Webhook missing metadata: %s", metadata)
            # Return 200 anyway — Stripe will not retry on 200
            return {"received": True}

        pack = SCAN_PACKS.get(pack_id)
        pack_name = pack.name if pack else pack_id

        # Credit the user's account with the purchased scans
        scan_session = ScanSession(
            user_id=user_id,
            pack_name=pack_name,
            scans_purchased=scans,
            scans_remaining=scans,
            payment_reference=session.payment_intent or session.id,
        )
        db.add(scan_session)
        db.commit()

        logger.info(
            "Payment fulfilled: user=%s pack=%s scans=%d session=%s",
            user_id, pack_id, scans, session.id,
        )

    # Return 200 for all event types — Stripe retries on non-200 responses
    return {"received": True}

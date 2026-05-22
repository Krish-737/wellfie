"""
Pydantic schemas for payment-related request/response bodies.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Scan packs available for purchase ─────────────────────────────────────────

class ScanPack(BaseModel):
    """Describes a purchasable scan pack shown to the user."""
    pack_id: str            # e.g. "basic", "standard", "premium"
    name: str               # e.g. "Basic Pack"
    scans: int              # number of scans included
    price_sgd: int          # price in cents (S$1 = 100 cents) — used by Stripe
    description: str


# ── Request schemas ────────────────────────────────────────────────────────────

class CreateCheckoutSessionRequest(BaseModel):
    """Body for POST /payments/create-checkout-session."""
    pack_id: str            # which pack the user wants to buy


# ── Response schemas ───────────────────────────────────────────────────────────

class CheckoutSessionResponse(BaseModel):
    """Returned after a Stripe Checkout Session is created."""
    checkout_url: str       # redirect the browser here to open Stripe Checkout
    session_id: str         # Stripe session ID (for reference / tracking)


class ScanSessionOut(BaseModel):
    """Public view of a user's scan entitlement pack."""
    id: str
    pack_name: str
    scans_purchased: int
    scans_remaining: int
    payment_reference: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EntitlementSummary(BaseModel):
    """Total scans remaining across all packs — for the frontend to display."""
    total_scans_remaining: int
    packs: list[ScanSessionOut]

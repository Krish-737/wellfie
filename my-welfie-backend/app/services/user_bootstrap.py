"""Shared user onboarding helpers (free scan, etc.)."""

from sqlalchemy.orm import Session

from app.models.scan_session import ScanSession


def seed_free_scan(db: Session, user_id: str) -> None:
    """Grant one free scan pack — same rule as email signup."""
    db.add(
        ScanSession(
            user_id=user_id,
            pack_name="Free Scan",
            scans_purchased=1,
            scans_remaining=1,
            payment_reference=None,
        )
    )

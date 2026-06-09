import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ScanSession(Base):
    """
    Tracks how many scans a user has purchased and how many remain.
    One row per purchase/pack — total remaining = sum of scans_remaining across all active sessions.
    """
    __tablename__ = "scan_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Pack details
    pack_name = Column(String, nullable=False)          # e.g. "Basic Pack", "Single Scan"
    scans_purchased = Column(Integer, nullable=False)   # e.g. 4
    scans_remaining = Column(Integer, nullable=False)   # decrements on each scan

    # Payment reference (for future Stripe integration)
    payment_reference = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="scan_sessions")

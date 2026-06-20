import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def _new_uuid():
    return str(uuid.uuid4())


def _expires_at():
    return datetime.utcnow() + timedelta(hours=24)


class KioskSession(Base):
    __tablename__ = "kiosk_sessions"

    id                = Column(String, primary_key=True, default=_new_uuid)
    kiosk_id          = Column(String, nullable=False, index=True)   # e.g. "clinic-a"

    # lifecycle
    status            = Column(String, nullable=False, default="pending_payment")

    # stripe
    stripe_session_id = Column(String, nullable=True, unique=True)

    # optional health profile (collected on landing page)
    guest_name        = Column(String,  nullable=True)
    email             = Column(String,  nullable=True)
    sex               = Column(String,  nullable=True)
    date_of_birth     = Column(String,  nullable=True)   # ISO date string "YYYY-MM-DD"
    age               = Column(Integer, nullable=True)
    height_cm         = Column(Float,   nullable=True)
    weight_kg         = Column(Float,   nullable=True)
    smoking_status    = Column(String,  nullable=True)

    # linked kiosk user (created/looked up by email during profile save)
    kiosk_user_id     = Column(String, ForeignKey("kiosk_users.id"), nullable=True)

    # linked scan result (set after face scan)
    scan_result_id    = Column(String, ForeignKey("scan_results.id"), nullable=True)

    expires_at        = Column(DateTime, nullable=False, default=_expires_at)
    created_at        = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at        = Column(DateTime, nullable=False, default=datetime.utcnow,
                               onupdate=datetime.utcnow)

    scan_result       = relationship("ScanResult", foreign_keys=[scan_result_id])
    kiosk_user        = relationship("KioskUser", back_populates="sessions")

    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
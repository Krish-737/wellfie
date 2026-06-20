import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


def _new_uuid():
    return str(uuid.uuid4())


class KioskUser(Base):
    __tablename__ = "kiosk_users"

    id         = Column(String, primary_key=True, default=_new_uuid)
    email      = Column(String, unique=True, index=True, nullable=False)
    guest_name = Column(String, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    sessions = relationship("KioskSession", back_populates="kiosk_user")

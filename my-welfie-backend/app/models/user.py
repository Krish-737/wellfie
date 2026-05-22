import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Float
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # NULL or placeholder for OAuth-only users
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # OAuth / SSO
    auth_provider = Column(String, default="email", nullable=False)  # email | google | microsoft | facebook
    provider_subject = Column(String, nullable=True, index=True)
    avatar_url = Column(String, nullable=True)

    # Health profile — used by BioSense SDK for Heart Age / ASCVD (stored server-side for convenience)
    sex = Column(String, nullable=True)              # male | female | unspecified
    date_of_birth = Column(Date, nullable=True)      # stored canonical date; age derived on save
    age = Column(Integer, nullable=True)             # years (computed from date_of_birth on profile save)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    smoking_status = Column(String, nullable=True)   # smoker | non_smoker | unspecified

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scan_sessions = relationship("ScanSession", back_populates="user", cascade="all, delete-orphan")
    scan_results = relationship("ScanResult", back_populates="user", cascade="all, delete-orphan")

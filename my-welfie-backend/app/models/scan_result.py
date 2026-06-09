import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class ScanResult(Base):
    """
    Stores the complete output of one scan session — all 34 SDK indicators.
    Each field stores None if the indicator was not enabled/available for the scan.
    """
    __tablename__ = "scan_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    scan_session_id = Column(String, ForeignKey("scan_sessions.id"), nullable=True)
    kiosk_session_id = Column(String, ForeignKey("kiosk_sessions.id"), nullable=True, index=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Cardiovascular ─────────────────────────────────────────────────────────
    pulse_rate = Column(Float, nullable=True)               # bpm
    blood_pressure_systolic = Column(Float, nullable=True)  # mmHg
    blood_pressure_diastolic = Column(Float, nullable=True) # mmHg
    pulse_pressure = Column(Float, nullable=True)           # mmHg
    mean_arterial_pressure = Column(Float, nullable=True)   # mmHg
    cardiac_workload = Column(Float, nullable=True)
    heart_age = Column(Float, nullable=True)                # years

    # ── Respiratory ────────────────────────────────────────────────────────────
    respiration_rate = Column(Float, nullable=True)         # brpm
    oxygen_saturation = Column(Float, nullable=True)        # % SpO2

    # ── HRV / Autonomic Nervous System ─────────────────────────────────────────
    sdnn = Column(Float, nullable=True)                     # ms
    rmssd = Column(Float, nullable=True)                    # ms
    mean_rri = Column(Float, nullable=True)                 # ms
    sd1 = Column(Float, nullable=True)                      # ms
    sd2 = Column(Float, nullable=True)                      # ms
    prq = Column(Float, nullable=True)
    lfhf = Column(Float, nullable=True)
    pns_index = Column(Float, nullable=True)
    pns_zone = Column(Integer, nullable=True)               # 0=Unknown,1=Low,2=Normal,3=High
    sns_index = Column(Float, nullable=True)
    sns_zone = Column(Integer, nullable=True)               # 0=Unknown,1=Low,2=Normal,3=High

    # ── Stress & Wellness ──────────────────────────────────────────────────────
    stress_level = Column(Integer, nullable=True)           # 0=Unknown…5=Extreme
    stress_index = Column(Float, nullable=True)
    normalized_stress_index = Column(Float, nullable=True)
    wellness_level = Column(Integer, nullable=True)         # 0=Unknown,1=Low,2=Normal,3=High
    wellness_index = Column(Float, nullable=True)

    # ── Metabolic / Blood ──────────────────────────────────────────────────────
    hemoglobin = Column(Float, nullable=True)               # g/dL
    hemoglobin_a1c = Column(Float, nullable=True)           # % HbA1c

    # ── Risk Scores (Enums: 0=Unknown, 1=Low, 2=Medium, 3=High) ───────────────
    high_hemoglobin_a1c_risk = Column(Integer, nullable=True)
    high_blood_pressure_risk = Column(Integer, nullable=True)
    high_fasting_glucose_risk = Column(Integer, nullable=True)
    high_total_cholesterol_risk = Column(Integer, nullable=True)
    low_hemoglobin_risk = Column(Integer, nullable=True)
    ascvd_risk = Column(Float, nullable=True)               # % score
    ascvd_risk_level = Column(Integer, nullable=True)       # 0=Unknown,1=Low,2=Medium,3=High

    # ── Scan session metadata (P0 — SDK fidelity) ─────────────────────────────
    measurement_duration_sec = Column(Integer, nullable=True)
    scan_platform = Column(String, nullable=True)
    vitals_confidence = Column(JSON, nullable=True)   # { "pulseRate": 3, ... }
    vitals_enabled = Column(JSON, nullable=True)      # { "isEnabledPulseRate": true, ... }

    # Relationships
    user = relationship("User", back_populates="scan_results")

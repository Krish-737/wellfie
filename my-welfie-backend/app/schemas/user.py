"""
Pydantic schemas for user-related request/response bodies.

Schemas are intentionally separate from SQLAlchemy models so that we never
accidentally expose internal fields (e.g. hashed_password) in API responses.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime, date

from app.utils.profile import is_profile_complete, format_date_of_birth


SexValue = Literal["male", "female", "unspecified"]
SmokingValue = Literal["smoker", "non_smoker", "unspecified"]


# ── Request schemas (what the client sends) ────────────────────────────────────

class UserCreate(BaseModel):
    """Body for POST /auth/signup."""
    email: EmailStr
    password: str           # plain-text; hashed before touching the DB
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Body for POST /auth/login."""
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    """Body for PATCH /auth/me/profile — all fields optional (partial update)."""
    sex: Optional[SexValue] = None
    date_of_birth: Optional[str] = None   # DD/MM/YYYY — age is computed server-side
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    smoking_status: Optional[SmokingValue] = None


# ── Response schemas (what the API returns) ────────────────────────────────────

class UserOut(BaseModel):
    """Safe public representation of a user — never includes the password."""
    id: str
    email: str
    full_name: Optional[str]
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    sex: Optional[str] = None
    date_of_birth: Optional[str] = None   # DD/MM/YYYY for display
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    smoking_status: Optional[str] = None
    profile_complete: bool = False

    class Config:
        from_attributes = True


def user_to_out(user) -> UserOut:
    """Build UserOut with computed profile_complete and formatted DOB."""
    dob_display = (
        format_date_of_birth(user.date_of_birth) if user.date_of_birth else None
    )
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at or user.created_at,
        sex=user.sex,
        date_of_birth=dob_display,
        age=user.age,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        smoking_status=user.smoking_status,
        profile_complete=is_profile_complete(
            user.sex, user.age, user.height_cm, user.weight_kg
        ),
    )


# ── JWT token schemas ──────────────────────────────────────────────────────────

class Token(BaseModel):
    """Returned to the client after a successful login."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """
    Decoded payload stored inside the JWT.
    Only the user's ID is stored — we look up the full user from the DB on each
    protected request rather than trusting stale data in the token.
    """
    user_id: Optional[str] = None

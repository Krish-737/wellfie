"""
Auth router — handles user registration and login.

Endpoints:
  POST /auth/signup   — create a new account + seed 1 free scan
  POST /auth/login    — verify credentials and return a JWT
  GET  /auth/me       — return the currently authenticated user's profile
  PATCH /auth/me/profile — update health profile (DOB → stored age)
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, UserProfileUpdate, user_to_out
from app.services.user_bootstrap import seed_free_scan
from app.utils.auth import hash_password, verify_password, create_access_token, is_oauth_only_password
from app.utils.profile import (
    validate_profile_fields,
    parse_date_of_birth,
    age_from_dob,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── POST /auth/signup ──────────────────────────────────────────────────────────

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Steps:
      1. Check that the email is not already registered.
      2. Hash the plain-text password with bcrypt.
      3. Insert a new User row.
      4. Seed 1 free ScanSession so the user can take their first scan immediately.

    Returns the newly created user (without the password).
    """

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.auth_provider != "email" or is_oauth_only_password(existing.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Sign in with your social provider.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    hashed = hash_password(payload.password)

    user = User(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        auth_provider="email",
    )
    db.add(user)
    db.flush()
    seed_free_scan(db, user.id)

    db.commit()
    db.refresh(user)

    return user_to_out(user)


# ── POST /auth/login ───────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise auth_error

    if user.auth_provider != "email" or is_oauth_only_password(user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses social sign-in. Continue with Google, Microsoft, or Facebook.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user.hashed_password):
        raise auth_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    token = create_access_token(user_id=user.id)

    return Token(access_token=token, token_type="bearer")


# ── GET /auth/me ───────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return user_to_out(current_user)


# ── PATCH /auth/me/profile ─────────────────────────────────────────────────────

@router.patch("/me/profile", response_model=UserOut)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated user's health profile (partial update supported).

    When date_of_birth is provided (DD/MM/YYYY), age is computed once and stored.
    """
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return user_to_out(current_user)

    # Parse DOB and compute age before merging validation
    parsed_dob = current_user.date_of_birth
    if "date_of_birth" in updates:
        dob_raw = updates.pop("date_of_birth")
        if dob_raw is None or (isinstance(dob_raw, str) and not dob_raw.strip()):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_of_birth is required (DD/MM/YYYY)",
            )
        try:
            parsed_dob = parse_date_of_birth(dob_raw)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            )
        current_user.date_of_birth = parsed_dob
        current_user.age = age_from_dob(parsed_dob)

    merged = {
        "sex": updates.get("sex", current_user.sex),
        "age": current_user.age,
        "height_cm": updates.get("height_cm", current_user.height_cm),
        "weight_kg": updates.get("weight_kg", current_user.weight_kg),
        "smoking_status": updates.get("smoking_status", current_user.smoking_status),
        "date_of_birth": parsed_dob,
    }

    try:
        validate_profile_fields(**merged)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    for field, value in updates.items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)

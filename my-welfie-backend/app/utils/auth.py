"""
Auth utility functions — password hashing and JWT management.

These are pure functions with no FastAPI or DB dependencies so they are easy
to unit-test in isolation.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# ── Password hashing ──────────────────────────────────────────────────────────
# Using bcrypt directly (not via passlib) for Python 3.13 compatibility.
# passlib 1.7.4 crashes on Python 3.13 + bcrypt 4.x due to an internal
# 200-byte test password that bcrypt 4.x now strictly rejects.


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Return True if plain_password matches the stored hash.
    bcrypt.checkpw uses constant-time comparison internally to prevent timing attacks.
    """
    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


_OAUTH_PLACEHOLDER_HASH: Optional[str] = None


def oauth_placeholder_password() -> str:
    """Sentinel hash for OAuth-only users when DB column cannot be NULL (legacy SQLite)."""
    global _OAUTH_PLACEHOLDER_HASH
    if _OAUTH_PLACEHOLDER_HASH is None:
        _OAUTH_PLACEHOLDER_HASH = hash_password("__mywellfie_oauth_no_login__")
    return _OAUTH_PLACEHOLDER_HASH


def is_oauth_only_password(stored: Optional[str]) -> bool:
    if not stored:
        return True
    return verify_password("__mywellfie_oauth_no_login__", stored)


# ── JWT creation & decoding ───────────────────────────────────────────────────

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT containing the user's ID.

    The token encodes:
      - sub  : user_id (standard JWT 'subject' claim)
      - exp  : expiry timestamp (defaults to ACCESS_TOKEN_EXPIRE_MINUTES from config)
      - iat  : issued-at timestamp

    The token is signed with SECRET_KEY using the ALGORITHM from config (HS256).
    Anyone who tampers with the payload will fail the signature check on decode.
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode a JWT and return the user_id (sub claim).

    Returns None if:
      - The signature is invalid (tampered token)
      - The token has expired
      - The token is malformed
      - The 'sub' claim is missing

    Callers should treat a None return as an authentication failure.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        return user_id
    except JWTError:
        return None

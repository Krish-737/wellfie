"""Signed OAuth state parameter (CSRF + post-login redirect path)."""

import secrets
from typing import Any, Optional

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import SECRET_KEY

_STATE_MAX_AGE_SECONDS = 600  # 10 minutes
_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="oauth-state")


def create_oauth_state(next_path: str = "/dashboard") -> str:
    payload = {
        "next": next_path if next_path.startswith("/") else "/dashboard",
        "nonce": secrets.token_hex(16),
    }
    return _serializer.dumps(payload)


def parse_oauth_state(state: str) -> Optional[dict[str, Any]]:
    try:
        return _serializer.loads(state, max_age=_STATE_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None

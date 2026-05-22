"""
FastAPI shared dependencies.

Any route that needs an authenticated user should declare:
    current_user: User = Depends(get_current_user)

FastAPI will automatically:
  1. Extract the Bearer token from the Authorization header
  2. Decode and validate the JWT
  3. Load the User from the DB
  4. Inject the User object into the route handler
  5. Return 401 automatically if any step fails

── Why HTTPBearer instead of OAuth2PasswordBearer ────────────────────────────
OAuth2PasswordBearer renders a username/password/client_id form in Swagger UI
which is incompatible with our JSON-based /auth/login endpoint. HTTPBearer
renders a simple single-field token input in Swagger, which is the correct UX
for a JWT-based API.

When social login (Google / Apple / Microsoft) is added later, it will issue
the same JWT after the OAuth2 handshake — so the rest of the system is
completely unaffected. See dev-docs/auth.md for the social login plan.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.auth import decode_access_token

# HTTPBearer extracts the token from "Authorization: Bearer <token>" header.
# auto_error=True means FastAPI returns 403 automatically if the header is missing.
http_bearer = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT from the Authorization header and return the matching User.

    Flow:
      1. HTTPBearer extracts the raw token string from the Bearer header.
      2. decode_access_token() verifies the signature and expiry.
      3. We look up the user by the ID stored in the token's 'sub' claim.
      4. We confirm the user account is still active (not soft-deleted).

    Raises 401 if the token is invalid, expired, or the user no longer exists.
    Raises 403 if the user account has been deactivated.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # credentials.credentials is the raw token string (no "Bearer " prefix)
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return user

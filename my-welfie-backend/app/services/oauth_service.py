"""
OAuth user upsert — find, link, or create users from identity provider profiles.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.services.user_bootstrap import seed_free_scan


class OAuthProfile:
    def __init__(
        self,
        *,
        provider: str,
        subject: str,
        email: str,
        full_name: Optional[str],
        email_verified: bool,
        avatar_url: Optional[str] = None,
    ):
        self.provider = provider
        self.subject = subject
        self.email = email.lower().strip()
        self.full_name = full_name
        self.email_verified = email_verified
        self.avatar_url = avatar_url


def upsert_user_from_oauth(db: Session, profile: OAuthProfile) -> tuple[User, bool]:
    """
    Returns (user, is_new_user).
    Links to existing email account when email matches and IdP verified email.
    """
    if not profile.email:
        raise ValueError("Email is required from the identity provider")

    from app.utils.auth import oauth_placeholder_password

    # 1) Returning user — match stable IdP subject
    user = db.query(User).filter(User.provider_subject == profile.subject).first()
    if user:
        _apply_profile_fields(user, profile)
        return user, False

    # 2) Existing account with same email — link if verified
    by_email = db.query(User).filter(User.email == profile.email).first()
    if by_email:
        if not profile.email_verified:
            raise ValueError(
                "This email is already registered. Sign in with email and password, "
                f"or use {profile.provider.title()} with the same verified email."
            )
        by_email.provider_subject = profile.subject
        if profile.full_name and not by_email.full_name:
            by_email.full_name = profile.full_name
        if profile.avatar_url:
            by_email.avatar_url = profile.avatar_url
        if profile.email_verified:
            by_email.is_verified = True
        db.flush()
        return by_email, False

    # 3) New OAuth user
    user = User(
        email=profile.email,
        hashed_password=oauth_placeholder_password(),
        full_name=profile.full_name,
        auth_provider=profile.provider,
        provider_subject=profile.subject,
        avatar_url=profile.avatar_url,
        is_verified=profile.email_verified,
    )
    db.add(user)
    db.flush()
    seed_free_scan(db, user.id)
    return user, True


def _apply_profile_fields(user: User, profile: OAuthProfile) -> None:
    if profile.full_name and not user.full_name:
        user.full_name = profile.full_name
    if profile.avatar_url:
        user.avatar_url = profile.avatar_url
    if profile.email_verified:
        user.is_verified = True

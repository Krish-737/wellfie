"""
OAuth 2.0 routes — Google, Microsoft, Facebook.

Flow:
  GET /auth/oauth/{provider}/start?next=/dashboard
  → IdP consent → GET /auth/oauth/{provider}/callback
  → redirect to FRONTEND_URL/auth/callback?token=...&next=...
"""

from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import (
    APP_ENV,
    FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET,
    FACEBOOK_REDIRECT_URI,
    FRONTEND_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET,
    MICROSOFT_REDIRECT_URI,
    MICROSOFT_TENANT_ID,
    OAUTH_FRONTEND_CALLBACK_PATH,
)
from app.database import SessionLocal
from app.services.oauth_service import OAuthProfile, upsert_user_from_oauth
from app.utils.auth import create_access_token
from app.utils.oauth_state import create_oauth_state, parse_oauth_state

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

oauth = OAuth()

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET:
    oauth.register(
        name="microsoft",
        client_id=MICROSOFT_CLIENT_ID,
        client_secret=MICROSOFT_CLIENT_SECRET,
        server_metadata_url=(
            f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration"
        ),
        client_kwargs={"scope": "openid profile email"},
    )

if FACEBOOK_APP_ID and FACEBOOK_APP_SECRET:
    oauth.register(
        name="facebook",
        client_id=FACEBOOK_APP_ID,
        client_secret=FACEBOOK_APP_SECRET,
        access_token_url="https://graph.facebook.com/oauth/access_token",
        authorize_url="https://www.facebook.com/v21.0/dialog/oauth",
        api_base_url="https://graph.facebook.com/v21.0/",
        client_kwargs={
            "scope": "email public_profile",
            "token_endpoint_auth_method": "client_secret_post",
        },
    )

PROVIDER_REDIRECTS = {
    "google": GOOGLE_REDIRECT_URI,
    "microsoft": MICROSOFT_REDIRECT_URI,
    "facebook": FACEBOOK_REDIRECT_URI,
}


def _configured_providers() -> list[str]:
    out: list[str] = []
    if GOOGLE_CLIENT_ID:
        out.append("google")
    if MICROSOFT_CLIENT_ID:
        out.append("microsoft")
    if FACEBOOK_APP_ID:
        out.append("facebook")
    return out


@router.get("/providers")
def list_providers():
    """Which social providers are configured (for hiding buttons in the UI)."""
    return {"providers": _configured_providers()}


def _frontend_callback_url(token: str, next_path: str, is_new: bool) -> str:
    base = FRONTEND_URL.rstrip("/") + OAUTH_FRONTEND_CALLBACK_PATH
    params = {"token": token, "next": next_path}
    if is_new:
        params["new"] = "1"
    return f"{base}?{urlencode(params)}"


def _error_redirect(message: str) -> RedirectResponse:
    base = FRONTEND_URL.rstrip("/") + OAUTH_FRONTEND_CALLBACK_PATH
    return RedirectResponse(f"{base}?{urlencode({'error': message})}")


def _microsoft_iss_validator(iss, _claims) -> bool:
    """Accept tenant-specific issuers when using MICROSOFT_TENANT_ID=common."""
    return (
        isinstance(iss, str)
        and iss.startswith("https://login.microsoftonline.com/")
        and iss.endswith("/v2.0")
    )


@router.get("/{provider}/start")
async def oauth_start(provider: str, request: Request, next: str = "/dashboard"):
    if provider not in ("google", "microsoft", "facebook"):
        raise HTTPException(status_code=404, detail="Unknown provider")
    if provider not in _configured_providers():
        raise HTTPException(status_code=503, detail=f"{provider.title()} sign-in is not configured")

    state = create_oauth_state(next)
    redirect_uri = PROVIDER_REDIRECTS[provider]
    client = oauth.create_client(provider)
    return await client.authorize_redirect(request, redirect_uri, state=state)


async def _profile_from_token(provider: str, request: Request) -> OAuthProfile:
    client = oauth.create_client(provider)

    if provider == "facebook":
        token = await client.authorize_access_token(request)
        resp = await client.get(
            "me?fields=id,name,email,picture.type(large)",
            token=token,
        )
        data = resp.json()
        if "error" in data:
            err = data["error"]
            raise ValueError(err.get("message", "Facebook profile request failed"))
        email = data.get("email") or ""
        return OAuthProfile(
            provider="facebook",
            subject=str(data["id"]),
            email=email,
            full_name=data.get("name"),
            email_verified=bool(email),
            avatar_url=(data.get("picture") or {}).get("data", {}).get("url"),
        )

    if provider == "microsoft":
        token = await client.authorize_access_token(
            request,
            claims_options={"iss": {"validate": _microsoft_iss_validator}},
        )
    else:
        token = await client.authorize_access_token(request)

    userinfo = token.get("userinfo")
    if not userinfo:
        parse_claims = (
            {"iss": {"validate": _microsoft_iss_validator}}
            if provider == "microsoft"
            else None
        )
        userinfo = await client.parse_id_token(request, token, claims_options=parse_claims)

    email = userinfo.get("email") or userinfo.get("preferred_username") or userinfo.get("upn") or ""
    email_verified = bool(userinfo.get("email_verified", False))
    if provider == "microsoft" and email:
        email_verified = True

    return OAuthProfile(
        provider=provider,
        subject=str(userinfo.get("sub") or userinfo.get("oid") or userinfo.get("id")),
        email=email,
        full_name=userinfo.get("name"),
        email_verified=email_verified,
        avatar_url=userinfo.get("picture"),
    )


@router.get("/{provider}/callback")
async def oauth_callback(provider: str, request: Request):
    if provider not in ("google", "microsoft", "facebook"):
        raise HTTPException(status_code=404, detail="Unknown provider")
    if provider not in _configured_providers():
        return _error_redirect(f"{provider.title()} sign-in is not configured")

    state_raw = request.query_params.get("state", "")
    state_data = parse_oauth_state(state_raw)
    if not state_data:
        return _error_redirect("Sign-in expired. Please try again.")
    next_path = state_data.get("next", "/dashboard")

    try:
        profile = await _profile_from_token(provider, request)
    except Exception as exc:
        if APP_ENV == "development":
            return _error_redirect(f"OAuth failed: {exc}")
        return _error_redirect("Sign-in was cancelled or failed. Please try again.")

    if not profile.email:
        return _error_redirect(
            "We could not get your email from the provider. "
            "Allow email access or use email sign-up."
        )

    db: Session = SessionLocal()
    try:
        try:
            user, is_new = upsert_user_from_oauth(db, profile)
        except ValueError as exc:
            return _error_redirect(str(exc))

        if not user.is_active:
            return _error_redirect("This account has been deactivated.")

        jwt = create_access_token(user_id=user.id)
        db.commit()
        return RedirectResponse(_frontend_callback_url(jwt, next_path, is_new))
    except Exception:
        db.rollback()
        return _error_redirect("Something went wrong. Please try again.")
    finally:
        db.close()

from dotenv import load_dotenv
import os

load_dotenv()

# Default to SQLite for easy local development. Railway will override this with PostgreSQL.
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

BIOSENSE_LICENSE_KEY: str = os.getenv("BIOSENSE_LICENSE_KEY", "")

# ── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_SUCCESS_URL: str = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:8000/payment-success")
STRIPE_CANCEL_URL: str = os.getenv("STRIPE_CANCEL_URL", "http://localhost:8000/payment-cancelled")

SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@mywellfie.com")

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://localhost:8000")
APP_ENV: str = os.getenv("APP_ENV", "development")
OAUTH_FRONTEND_CALLBACK_PATH: str = os.getenv("OAUTH_FRONTEND_CALLBACK_PATH", "/auth/callback")

# ── OAuth providers (optional — endpoints hidden when client id missing) ───────
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI: str = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/oauth/google/callback"
)

MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "common")
MICROSOFT_REDIRECT_URI: str = os.getenv(
    "MICROSOFT_REDIRECT_URI", "http://localhost:8001/auth/oauth/microsoft/callback"
)

FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "")
FACEBOOK_REDIRECT_URI: str = os.getenv(
    "FACEBOOK_REDIRECT_URI", "http://localhost:8001/auth/oauth/facebook/callback"
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL, APP_ENV
from app.database import engine
from app import models  # noqa: F401 — ensures models are registered with SQLAlchemy
from starlette.middleware.sessions import SessionMiddleware
from app.config import SECRET_KEY
from app.routers import results, auth, payments, reports, oauth

# Create all tables (development convenience — use Alembic migrations in production)
from app.database import Base
from app.db_migrate import migrate_profile_columns

Base.metadata.create_all(bind=engine)
migrate_profile_columns()

app = FastAPI(
    title="My Wellfie API",
    description="Backend API for My Wellfie — health scan entitlement, results storage, and PDF reports.",
    version="1.0.0",
    docs_url="/docs" if APP_ENV == "development" else None,  # hide docs in production
    redoc_url="/redoc" if APP_ENV == "development" else None,
)

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(results.router)
app.include_router(payments.router)
app.include_router(reports.router)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow the React frontend to call this API (Allow all in dev for mobile testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "My Wellfie API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

# My Wellfie Backend

FastAPI backend for My Wellfie — handles user auth, scan entitlement, result storage, and PDF reports.

## Setup

### 1. Create and activate virtual environment
```bash
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
copy .env.example .env
# Edit .env with your database URL, secret key, etc.
```

### 4. Run the server
```bash
uvicorn app.main:app --reload --port 8001 --host 0.0.0.0
```




### 5. Open API docs
Visit http://localhost:8001/docs

### Developer docs
- [dev-docs/auth.md](dev-docs/auth.md) — email/password auth (current)
- [dev-docs/oauth-sso-architecture.md](dev-docs/oauth-sso-architecture.md) — Google / Microsoft / Facebook SSO (set client IDs in `.env`)

## Project Structure
```
app/
├── main.py          ← FastAPI app, CORS, startup
├── config.py        ← All env vars
├── database.py      ← SQLAlchemy engine & session
├── models/
│   ├── user.py          ← Users table
│   ├── scan_session.py  ← Scan packs / entitlement
│   └── scan_result.py   ← All 34 health indicators
├── routers/         ← API route handlers (Phase 2+)
├── services/        ← Business logic (Phase 2+)
└── schemas/         ← Pydantic request/response models (Phase 2+)
```

```
stripe listen --forward-to http://localhost:8001/payments/webhook
```
stripe listen --forward-to https://988f-60-243-88-165.ngrok-free.app/payments/webhook

## Deploying to Railway
1. Push to GitHub
2. Create new project on railway.app → Deploy from GitHub
3. Add PostgreSQL plugin → copy DATABASE_URL to env vars
4. Set all other env vars in Railway dashboard
5. Railway auto-deploys on every push

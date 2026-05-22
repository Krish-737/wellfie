# Auth Module — Logic, Testing & Expected Behaviour

## Overview

The auth module handles user registration, login, and identity verification for all protected API routes. It is built on three principles:

- **Passwords never touch the DB in plain text** — bcrypt hashing with automatic salting.
- **Stateless authentication** — JWT tokens; the server holds no session state.
- **User enumeration prevention** — login always returns the same error for bad email or bad password.

---

## Files

| File | Purpose |
|------|---------|
| `app/schemas/user.py` | Pydantic request/response shapes — `UserCreate`, `UserLogin`, `UserOut`, `Token`, `TokenData` |
| `app/utils/auth.py` | Pure functions — `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` |
| `app/dependencies.py` | FastAPI dependency — `get_current_user` — injected into every protected route |
| `app/routers/auth.py` | Route handlers — `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` |

---

## Logic

### Signup — `POST /auth/signup`

```
Client sends: { email, password, full_name? }
       ↓
1. Query DB: does a user with this email exist?
   → Yes  →  409 Conflict "An account with this email already exists"
   → No   →  continue
       ↓
2. bcrypt.hash(password) → hashed_password
       ↓
3. INSERT INTO users (email, hashed_password, full_name)
       ↓
4. INSERT INTO scan_sessions (user_id, pack_name="Free Scan", scans_purchased=1, scans_remaining=1)
   ← Business rule: every new account gets 1 free scan immediately
       ↓
5. Return 201 + UserOut (id, email, full_name, is_verified, created_at)
```

**Why `db.flush()` before the ScanSession insert?**
`flush()` sends the INSERT to the DB transaction without committing, so the ORM generates `user.id` (UUID). We need that ID as the foreign key for `ScanSession` before calling `commit()`.

---

### Login — `POST /auth/login`

```
Client sends: { email, password }
       ↓
1. Query DB for user by email
   → Not found  →  401 "Incorrect email or password"
       ↓
2. bcrypt.verify(password, user.hashed_password)
   → Mismatch   →  401 "Incorrect email or password"
       ↓
3. Check user.is_active
   → False      →  403 "This account has been deactivated"
       ↓
4. create_access_token(user_id=user.id)
   → JWT signed with SECRET_KEY, expires in ACCESS_TOKEN_EXPIRE_MINUTES (default 7 days)
       ↓
5. Return 200 + { access_token, token_type: "bearer" }
```

**Why the same error message for bad email and bad password?**
Different messages would let an attacker probe which emails are registered (user enumeration attack).

---

### Protected Route Access — `GET /auth/me` (and all future protected routes)

```
Client sends: Authorization: Bearer <token>
       ↓
1. FastAPI extracts the token via OAuth2PasswordBearer
       ↓
2. decode_access_token(token)
   → Invalid signature / expired / malformed  →  401
       ↓
3. DB lookup: User where id = token.sub
   → Not found  →  401
       ↓
4. Check user.is_active
   → False  →  403
       ↓
5. Inject User object into route handler
```

---

### JWT Structure

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1746000000,
  "iat": 1745395200
}
```

- `sub` — user UUID (looked up from DB on each request)
- `exp` — expiry Unix timestamp
- `iat` — issued-at Unix timestamp
- Signed with `HS256` + `SECRET_KEY` from `.env`

---

## Environment Variables Required

Add these to your `.env` file:

```env
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL=sqlite:///./sql_app.db
```

> **Production note:** `SECRET_KEY` must be a long, random string. Generate one with:
> ```bash
> openssl rand -hex 32
> ```

---

## How to Run Locally

```bash
cd my-welfie-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Interactive docs available at: `http://localhost:8001/docs`

---

## How to Test

### Option A — Swagger UI (easiest)

1. Open `http://localhost:8001/docs`
2. Use the **Auth** section to call each endpoint directly from the browser.

---

### Option B — curl

**Signup:**
```bash
curl -X POST http://localhost:8001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123", "full_name": "Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123"}'
```

**Get current user (replace TOKEN with the access_token from login):**
```bash
curl http://localhost:8001/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

### Option C — Python script

```python
import requests

BASE = "http://localhost:8001"

# 1. Signup
r = requests.post(f"{BASE}/auth/signup", json={
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "Test User"
})
print("Signup:", r.status_code, r.json())

# 2. Login
r = requests.post(f"{BASE}/auth/login", json={
    "email": "test@example.com",
    "password": "Password123"
})
token = r.json()["access_token"]
print("Login token:", token[:40], "...")

# 3. Get profile
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
print("Me:", r.json())
```

---

## Expected Behaviour

### Signup

| Scenario | Status | Response |
|----------|--------|----------|
| Valid new email + strong password | 201 | `UserOut` object |
| Email already registered | 409 | `"An account with this email already exists"` |
| Missing email field | 422 | Pydantic validation error |
| Invalid email format | 422 | Pydantic validation error |

### Login

| Scenario | Status | Response |
|----------|--------|----------|
| Correct email + correct password | 200 | `{ access_token, token_type }` |
| Correct email + wrong password | 401 | `"Incorrect email or password"` |
| Email not registered | 401 | `"Incorrect email or password"` |
| Account deactivated (`is_active=False`) | 403 | `"This account has been deactivated"` |

### GET /auth/me

| Scenario | Status | Response |
|----------|--------|----------|
| Valid unexpired token | 200 | `UserOut` object |
| Expired token | 401 | `"Could not validate credentials"` |
| Tampered / invalid token | 401 | `"Could not validate credentials"` |
| No Authorization header | 401 | `"Not authenticated"` |
| Deactivated account | 403 | `"This account has been deactivated"` |

---

## Side Effects on Signup

When a user signs up, a row is automatically inserted into `scan_sessions`:

```sql
INSERT INTO scan_sessions (user_id, pack_name, scans_purchased, scans_remaining)
VALUES ('<new-user-uuid>', 'Free Scan', 1, 1);
```

This means every new user can immediately run one scan without making a payment. The scan entitlement check (Step 2 of the build plan) will read from this table before allowing a scan to be saved.

---

## What Is NOT Yet Implemented

- **Email verification** — `is_verified` column exists on the User model but the verification email flow (send email → click link → mark verified) is not built yet. Currently all accounts are created with `is_verified=False`.
- **Password reset / forgot password** — not yet implemented.
- **Refresh tokens** — the current token is long-lived (7 days). Refresh token rotation is a future improvement.

---

## Auth Scheme — HTTPBearer

The API uses `HTTPBearer` (not `OAuth2PasswordBearer`). In Swagger UI this renders a simple **single token input field** instead of the full OAuth2 username/password/client form.

**How to test in Swagger:**
1. Call `POST /auth/login` via **Try it out** with your JSON body → copy the `access_token`
2. Click **Authorize 🔒** (top right) → paste just the token (no `Bearer ` prefix — Swagger adds it)
3. Click **Authorize** → **Close** — all protected endpoints now work

---

## Social Login — Future Plan

Social login (Google / Apple / Microsoft) can be added later without changing anything in the existing auth, scan, or payment code. The pattern is:

```
User clicks "Login with Google"
        ↓
Google OAuth2 handshake (handled by authlib)
        ↓
Your backend creates/finds User in DB
        ↓
Your backend issues YOUR JWT (same as email/password login)
        ↓
Frontend stores token — works identically from here
```

### DB Changes Required (when adding social login)

```python
# Additional columns needed on the users table
google_id     = Column(String, nullable=True, unique=True)
apple_id      = Column(String, nullable=True, unique=True)
auth_provider = Column(String, default="email")  # "email" | "google" | "apple" | "microsoft"
# hashed_password becomes nullable (social users have no password)
```

### New Routes Required

| Route | Purpose |
|-------|---------|
| `GET /auth/google` | Redirect to Google consent screen |
| `GET /auth/google/callback` | Handle Google redirect, issue JWT |
| `GET /auth/apple` | Redirect to Apple consent screen |
| `GET /auth/apple/callback` | Handle Apple redirect, issue JWT |

### Library

```
pip install authlib httpx
```

`authlib` supports Google (OpenID Connect), Apple (custom JWT flow), and Microsoft (Azure AD) out of the box.

---

*Last updated: May 2026*

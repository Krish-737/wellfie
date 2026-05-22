# My Wellfie — Backend Development Plan

## Table of Contents

1. [How the Scan Works](#1-how-the-scan-works)
2. [What the SDK Returns](#2-what-the-sdk-returns)
3. [Current Backend Status](#3-current-backend-status)
4. [What Needs to Be Built](#4-what-needs-to-be-built)
5. [Key Gaps to Fix](#5-key-gaps-to-fix)
6. [Recommended Build Order](#6-recommended-build-order)

---

## 1. How the Scan Works

The scan is a **browser-based, camera-driven vital signs measurement** powered by the **BioSense Signal Web SDK** (`@biosensesignal/web-sdk`).

### Entry Points

- Landing page (`/`) — Hero, CTA, and Pricing sections all call `navigate('/camera')`.
- `/camera` route renders `CameraApp` → `BiosenseSignalMonitor`.

### Scan Flow (Step-by-Step)

```
User clicks "Start Scan" → /camera → BiosenseSignalMonitor mounts
        ↓
useMonitor.ts: monitor.initialize(licenseKey)   ← SDK license check
        ↓
monitor.createFaceSession({ video, processingTime, callbacks })
        ↓
User clicks Start → session.start()
        ↓
SDK reads webcam frames → onVitalSign() fires repeatedly with partial vitals
        → Stats.tsx shows live: PR, RR, Stress, SDNN, BP
        ↓
Session completes (processingTime elapsed) → onFinalResults() fires
        ↓
┌─── setRawResults(vitalSignsResults.results)
├─── POST https://localhost:8001/api/results  ← backend save (hardcoded user_id)
├─── setFinalReport(mapToReportVitalSigns(...))
└─── setReportGeneratedAt(new Date().toISOString())
        ↓
BiosenseSignalMonitor detects finalReport → opens ReportModal
        ↓
User sees vitals table + can download PDF (jsPDF)
```

### Key Frontend Files

| File | Role |
|------|------|
| `src/hooks/useMonitor.ts` | SDK init, session creation, `onFinalResults` → backend POST |
| `src/components/BiosenseSignalMonitor.tsx` | Video feed, timer, Start/Stop, opens ReportModal |
| `src/components/Stats.tsx` | Live vitals overlay during measurement |
| `src/components/ReportModal.tsx` | Final report table + PDF download |
| `src/types.ts` | `ReportVitalSigns` shape |

---

## 2. What the SDK Returns

The SDK fires `onFinalResults(vitalSignsResults)`. The payload is `vitalSignsResults.results` — a flat object with camelCase keys, each having a `.value` field (and optionally `.confidence`).

### Vitals Mapped for Report UI (9 fields)

| SDK Key | Metric | Unit |
|---------|--------|------|
| `pulseRate.value` | Heart Rate | bpm |
| `respirationRate.value` | Breathing Rate | brpm |
| `oxygenSaturation.value` | SpO2 | % |
| `sdnn.value` | HRV SDNN | ms |
| `stressLevel.value` | Stress Level | 0–5 enum |
| `stressIndex.value` | Stress Index | float |
| `wellnessIndex.value` | Wellness Index | float |
| `hemoglobin.value` | Hemoglobin | g/dL |
| `hemoglobinA1c.value` | HbA1c | % |
| `bloodPressure.value.systolic` / `.diastolic` | Blood Pressure | mmHg |

### Full 34-Indicator Set (DB schema in `scan_result.py`)

**Cardiovascular:** pulse rate, systolic BP, diastolic BP, pulse pressure, mean arterial pressure, cardiac workload, heart age

**Respiratory:** respiration rate, oxygen saturation (SpO2)

**HRV / Autonomic:** SDNN, RMSSD, mean RRI, SD1, SD2, PRQ, LF/HF ratio, PNS index, PNS zone, SNS index, SNS zone

**Stress & Wellness:** stress level, stress index, normalized stress index, wellness level, wellness index

**Metabolic / Blood:** hemoglobin, hemoglobin A1c

**Risk Scores (0=Unknown, 1=Low, 2=Medium, 3=High):** high HbA1c risk, high BP risk, high fasting glucose risk, high cholesterol risk, low hemoglobin risk, ASCVD risk score, ASCVD risk level

> **Note:** The SDK also accepts optional `subjectDemographic` (sex, age, weight, height) for improved accuracy. This is currently commented out in `useMonitor.ts` — it should be wired up once user profiles are built.

---

## 3. Current Backend Status

### What Is Already Built ✅

| File | What it does |
|------|------|
| `app/main.py` | FastAPI app, CORS config, mounts `results` router |
| `app/config.py` | Env vars — DB URL, JWT secret, SMTP settings, app env flag |
| `app/database.py` | SQLAlchemy engine + `get_db()` request-scoped dependency |
| `app/models/user.py` | `users` table — email, hashed_password, full_name, is_verified |
| `app/models/scan_session.py` | `scan_sessions` table — pack name, scans_purchased, scans_remaining, payment_reference |
| `app/models/scan_result.py` | `scan_results` table — all 34 SDK indicator columns |
| `app/routers/results.py` | `POST /api/results` (stores subset of vitals) + `GET /api/results/{user_id}` |

### DB Tables Already Modeled

```
users
  └── scan_sessions  (entitlement packs — 1-to-many)
  └── scan_results   (individual scan outputs — 1-to-many)
```

### Installed Dependencies (`requirements.txt`)

- `fastapi`, `uvicorn[standard]`
- `sqlalchemy`, `alembic`, `psycopg[binary]`
- `python-dotenv`
- `passlib[bcrypt]`, `python-jose[cryptography]` — ready for auth
- `python-multipart`
- `reportlab` — PDF generation (server-side)

---

## 4. What Needs to Be Built

### Auth Module — `app/routers/auth.py`

- `POST /auth/signup` — hash password, create `User` row, seed 1 free scan into `scan_sessions`, send verification email
- `POST /auth/login` — verify credentials, return JWT access token
- `GET /auth/verify-email?token=...` — mark `is_verified = True`
- `app/dependencies.py` — `get_current_user` JWT dependency used by all protected routes

### Scan Entitlement — extend `app/routers/results.py`

- Gate `POST /api/results` behind `get_current_user`
- Before storing: check `sum(scans_remaining) > 0` across user's `scan_sessions`
- Deduct 1 from the oldest active `ScanSession.scans_remaining`
- Return `403` if no scans remain (prompt to purchase)
- Fix the vitals mapper to extract **all 34 fields**, not just 12

### Payment Module — `app/routers/payments.py`

- `POST /payments/create-order` — create a Razorpay order for a chosen pack (e.g. 4 scans)
- `POST /payments/verify-payment` — verify Razorpay HMAC signature, then create a `ScanSession` row with purchased scan count
- Add `razorpay` to `requirements.txt`

### Schemas — `app/schemas/`

Move all inline Pydantic models out of routers:

- `app/schemas/user.py` — `UserCreate`, `UserOut`, `Token`
- `app/schemas/scan.py` — `ScanResultCreate`, `ScanResultOut`
- `app/schemas/payment.py` — `CreateOrderRequest`, `VerifyPaymentRequest`

### Wire Up in `main.py`

```python
from app.routers import auth, results, payments

app.include_router(auth.router)
app.include_router(results.router)
app.include_router(payments.router)
```

---

## 5. Key Gaps to Fix

### Gap 1 — Hardcoded `user_id` in Frontend

In `src/hooks/useMonitor.ts` line 142:

```ts
user_id: 'test-user-001', // Placeholder until auth is built
```

Once auth is live, this should be replaced with the JWT-decoded user ID from the auth context.

### Gap 2 — Incomplete Vitals Mapper in `results.py`

Currently only 12 of 34 indicators are extracted. The following SDK keys are silently dropped and stored as `NULL`:

`rmssd`, `meanRri`, `sd1`, `sd2`, `prq`, `lfhf`, `pnsIndex`, `pnsZone`, `snsIndex`, `snsZone`, `normalizedStressIndex`, `wellnessLevel`, `highHemoglobinA1cRisk`, `highBloodPressureRisk`, `highFastingGlucoseRisk`, `highTotalCholesterolRisk`, `lowHemoglobinRisk`, `ascvdRisk`, `ascvdRiskLevel`, `pulsePressure`, `meanArterialPressure`, `cardiacWorkload`

### Gap 3 — No Entitlement Check

Any POST to `/api/results` currently saves without checking if the user has scans remaining. The "1 free scan → paid unlimited" business rule is modeled in the DB but not enforced in any router.

### Gap 4 — No Auth on Any Endpoint

All current routes are unprotected. `user_id` is a freeform string — there is no token validation.

### Gap 5 — `subjectDemographic` Not Passed to SDK

The BioSense SDK accepts `{ sex, age, weight, height }` for more accurate readings. This is commented out in `useMonitor.ts`. A user profile endpoint should capture these and pass them when starting a session.

---

## 6. Recommended Build Order

### Step 1 — Auth

1. Create `app/schemas/user.py` — `UserCreate`, `UserOut`, `Token`, `TokenData`
2. Create `app/utils/auth.py` — `hash_password`, `verify_password`, `create_access_token`, `decode_token`
3. Create `app/dependencies.py` — `get_current_user` FastAPI dependency
4. Create `app/routers/auth.py` — `POST /auth/signup`, `POST /auth/login`
5. Seed 1 free `ScanSession` on signup
6. Register in `main.py`

### Step 2 — Fix Scan Save + Entitlement

1. Extend `results.py` mapper to cover all 34 SDK indicators
2. Add `get_current_user` dependency to `POST /api/results`
3. Add entitlement check: query `scan_sessions`, sum `scans_remaining`, reject if 0
4. Decrement `scans_remaining` on successful save
5. Replace hardcoded `user_id` in frontend with token-derived value

### Step 3 — Payment

1. Add `razorpay` to `requirements.txt`
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `config.py`
3. Create `app/schemas/payment.py`
4. Create `app/routers/payments.py` — `POST /payments/create-order`, `POST /payments/verify-payment`
5. On verified payment → insert `ScanSession` with purchased count
6. Register in `main.py`

### Step 4 — Polish

1. Move all inline Pydantic schemas to `app/schemas/`
2. Add Alembic migration baseline (replace `create_all` in `main.py`)
3. Email verification flow (SMTP config already in `config.py`)
4. User profile endpoint — capture `sex`, `age`, `weight`, `height` for SDK accuracy
5. Wire `subjectDemographic` in frontend `useMonitor.ts`

---

*Last updated: May 2026*

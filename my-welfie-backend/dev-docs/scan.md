# Scan Module — Logic, Testing & Expected Behaviour

## Overview

The scan module receives the raw BioSense SDK output from the browser after a completed face scan, stores all 34 vitals in the database, and enforces the "1 free scan → paid unlimited" entitlement rule.

It is designed with **backward compatibility as a first-class concern** — the existing frontend UI continues to work without any changes while auth is being wired up.

---

## Files

| File | Purpose |
|------|---------|
| `app/schemas/scan.py` | Pydantic schemas — `ScanResultCreate`, `ScanResultOut`, `ScanSaveResponse` |
| `app/routers/results.py` | Route handlers — `POST /api/results`, `GET /api/results/me`, `GET /api/results/{user_id}` |
| `app/models/scan_result.py` | SQLAlchemy model — all 34 indicator columns |
| `app/models/scan_session.py` | Entitlement packs — `scans_purchased`, `scans_remaining` |

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/results` | Optional | Save a completed scan |
| `GET` | `/api/results/me` | Required (JWT) | List authenticated user's scans |
| `GET` | `/api/results/{user_id}` | None (legacy) | List scans by user_id |

---

## Core Logic

### POST /api/results — Dual-Mode Operation

This endpoint operates in two modes to keep the UI working at all times:

```
Client sends POST /api/results
        ↓
Is there an Authorization: Bearer <token> header?
        ↓                           ↓
       YES                          NO
        ↓                           ↓
Decode + validate JWT        Use user_id from request body
        ↓                           ↓
User exists + is_active?     Log a warning (unauthenticated)
        ↓                           ↓
Check scans_remaining > 0    Skip entitlement check
        ↓                           ↓
   remaining = 0?            scans_remaining = -1 (sentinel)
       → 403 Forbidden
        ↓
Map all 34 vitals → ScanResult row (same for both paths)
        ↓
INSERT INTO scan_results
        ↓
(Authenticated only) Decrement scans_remaining on oldest active ScanSession
        ↓
Commit + return ScanSaveResponse
```

**Why `-1` for `scans_remaining` in unauthenticated mode?**
The frontend can read this value and prompt the user to log in once auth is built, without having to change the scan-save call itself.

---

### Entitlement Check

```
SELECT SUM(scans_remaining)
FROM scan_sessions
WHERE user_id = <id> AND scans_remaining > 0
```

- If total = 0 → `403 Forbidden` with message: `"No scans remaining. Please purchase a scan pack to continue."`
- If total > 0 → proceed

### Entitlement Decrement

After a successful save, 1 scan is deducted from the **oldest active pack** (the one with the earliest `created_at` that still has `scans_remaining > 0`). This happens in the **same DB transaction** as the scan insert — if the insert fails, the decrement is rolled back.

```
SELECT * FROM scan_sessions
WHERE user_id = <id> AND scans_remaining > 0
ORDER BY created_at ASC
LIMIT 1
→ oldest_active.scans_remaining -= 1
```

---

## Full 34-Field Vitals Mapper

All fields are extracted from the BioSense SDK `vitalSignsResults.results` object. Every field uses `.get()` with an empty-dict fallback so missing SDK fields store as `NULL` (never raise `KeyError`).

### SDK Key → DB Column Mapping

| SDK Key (camelCase) | DB Column | Unit / Type |
|---------------------|-----------|-------------|
| `pulseRate.value` | `pulse_rate` | bpm |
| `bloodPressure.value.systolic` | `blood_pressure_systolic` | mmHg |
| `bloodPressure.value.diastolic` | `blood_pressure_diastolic` | mmHg |
| `pulsePressure.value` | `pulse_pressure` | mmHg |
| `meanArterialPressure.value` | `mean_arterial_pressure` | mmHg |
| `cardiacWorkload.value` | `cardiac_workload` | float |
| `heartAge.value` | `heart_age` | years |
| `respirationRate.value` | `respiration_rate` | brpm |
| `oxygenSaturation.value` | `oxygen_saturation` | % SpO2 |
| `sdnn.value` | `sdnn` | ms |
| `rmssd.value` | `rmssd` | ms |
| `meanRri.value` | `mean_rri` | ms |
| `sd1.value` | `sd1` | ms |
| `sd2.value` | `sd2` | ms |
| `prq.value` | `prq` | float |
| `lfhf.value` | `lfhf` | ratio |
| `pnsIndex.value` | `pns_index` | float |
| `pnsZone.value` | `pns_zone` | 0=Unknown, 1=Low, 2=Normal, 3=High |
| `snsIndex.value` | `sns_index` | float |
| `snsZone.value` | `sns_zone` | 0=Unknown, 1=Low, 2=Normal, 3=High |
| `stressLevel.value` | `stress_level` | 0=Unknown … 5=Extreme |
| `stressIndex.value` | `stress_index` | float |
| `normalizedStressIndex.value` | `normalized_stress_index` | float |
| `wellnessLevel.value` | `wellness_level` | 0=Unknown, 1=Low, 2=Normal, 3=High |
| `wellnessIndex.value` | `wellness_index` | float |
| `hemoglobin.value` | `hemoglobin` | g/dL |
| `hemoglobinA1c.value` | `hemoglobin_a1c` | % |
| `highHemoglobinA1cRisk.value` | `high_hemoglobin_a1c_risk` | 0–3 enum |
| `highBloodPressureRisk.value` | `high_blood_pressure_risk` | 0–3 enum |
| `highFastingGlucoseRisk.value` | `high_fasting_glucose_risk` | 0–3 enum |
| `highTotalCholesterolRisk.value` | `high_total_cholesterol_risk` | 0–3 enum |
| `lowHemoglobinRisk.value` | `low_hemoglobin_risk` | 0–3 enum |
| `ascvdRisk.value` | `ascvd_risk` | % score |
| `ascvdRiskLevel.value` | `ascvd_risk_level` | 0–3 enum |

---

## Backward Compatibility — What the Frontend Does NOT Need to Change

The current frontend (`useMonitor.ts`) sends:

```ts
fetch('https://localhost:8001/api/results', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'test-user-001',
    vitals: vitalSignsResults.results
  })
})
```

This will continue to work exactly as before. The backend:
- Detects no Authorization header → falls into unauthenticated mode
- Uses `user_id: 'test-user-001'` from the body
- Skips the entitlement check
- Saves the result (FK not enforced in SQLite dev mode)
- Returns `{ status: "success", id: "...", scans_remaining: -1, authenticated: false }`

**When to update the frontend:** Once `POST /auth/login` is called and a token is stored, replace the hardcoded `user_id` and add the Authorization header:

```ts
fetch('https://localhost:8001/api/results', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    user_id: currentUser.id,   // still included but ignored server-side
    vitals: vitalSignsResults.results
  })
})
```

---

## How to Test

### Option A — Swagger UI

1. Start the server: `uvicorn app.main:app --reload --port 8001`
2. Open `http://localhost:8001/docs`
3. Use the **Results** section.

---

### Option B — curl

**Save a scan (unauthenticated / dev mode):**
```bash
curl -X POST http://localhost:8001/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-001",
    "vitals": {
      "pulseRate": { "value": 72 },
      "respirationRate": { "value": 16 },
      "oxygenSaturation": { "value": 98.5 },
      "sdnn": { "value": 45.2 },
      "stressLevel": { "value": 2 },
      "stressIndex": { "value": 0.6 },
      "wellnessIndex": { "value": 75 },
      "hemoglobin": { "value": 14.2 },
      "hemoglobinA1c": { "value": 5.4 },
      "bloodPressure": { "value": { "systolic": 118, "diastolic": 76 } },
      "rmssd": { "value": 38.1 },
      "pnsIndex": { "value": -0.4 },
      "snsIndex": { "value": 0.3 },
      "ascvdRisk": { "value": 4.2 },
      "ascvdRiskLevel": { "value": 1 }
    }
  }'
```

**Save a scan (authenticated):**
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Save scan with token
curl -X POST http://localhost:8001/api/results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "user_id": "ignored", "vitals": { "pulseRate": { "value": 72 } } }'
```

**Get my scans (authenticated):**
```bash
curl http://localhost:8001/api/results/me \
  -H "Authorization: Bearer $TOKEN"
```

**Get scans by user_id (legacy):**
```bash
curl http://localhost:8001/api/results/test-user-001
```

---

### Option C — Python script

```python
import requests

BASE = "http://localhost:8001"

SAMPLE_VITALS = {
    "pulseRate": {"value": 72},
    "respirationRate": {"value": 16},
    "oxygenSaturation": {"value": 98.5},
    "sdnn": {"value": 45.2},
    "rmssd": {"value": 38.1},
    "stressLevel": {"value": 2},
    "stressIndex": {"value": 0.6},
    "wellnessIndex": {"value": 75},
    "hemoglobin": {"value": 14.2},
    "hemoglobinA1c": {"value": 5.4},
    "bloodPressure": {"value": {"systolic": 118, "diastolic": 76}},
    "pnsIndex": {"value": -0.4},
    "snsIndex": {"value": 0.3},
    "ascvdRisk": {"value": 4.2},
    "ascvdRiskLevel": {"value": 1},
    "highBloodPressureRisk": {"value": 1},
}

# 1. Signup + login
requests.post(f"{BASE}/auth/signup", json={"email": "scan@test.com", "password": "Pass123!"})
token = requests.post(f"{BASE}/auth/login", json={"email": "scan@test.com", "password": "Pass123!"}).json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Save a scan (authenticated)
r = requests.post(f"{BASE}/api/results", json={"user_id": "ignored", "vitals": SAMPLE_VITALS}, headers=headers)
print("Save scan:", r.json())
# Expected: { "status": "success", "id": "...", "scans_remaining": 0, "authenticated": true }

# 3. Try a second scan — should fail (no scans remaining)
r = requests.post(f"{BASE}/api/results", json={"user_id": "ignored", "vitals": SAMPLE_VITALS}, headers=headers)
print("Second scan:", r.status_code, r.json())
# Expected: 403 "No scans remaining. Please purchase a scan pack to continue."

# 4. Get scan history
r = requests.get(f"{BASE}/api/results/me", headers=headers)
print("History:", len(r.json()), "scan(s) found")
```

---

## Expected Behaviour

### POST /api/results

| Scenario | Status | Response |
|----------|--------|----------|
| Valid scan, no JWT (dev mode) | 200 | `{ status, id, scans_remaining: -1, authenticated: false }` |
| Valid scan, valid JWT, scans available | 200 | `{ status, id, scans_remaining: N-1, authenticated: true }` |
| Valid scan, valid JWT, 0 scans remaining | 403 | `"No scans remaining. Please purchase a scan pack."` |
| Invalid / expired JWT | 401 | `"Invalid or expired token"` |
| Valid JWT, deactivated account | 401 | `"User not found or deactivated"` |
| Missing `vitals` field in body | 422 | Pydantic validation error |

### GET /api/results/me

| Scenario | Status | Response |
|----------|--------|----------|
| Valid JWT with scan history | 200 | Array of `ScanResultOut` objects |
| Valid JWT, no scans yet | 200 | Empty array `[]` |
| No / invalid JWT | 401 | `"Not authenticated"` or `"Invalid or expired token"` |

### GET /api/results/{user_id}

| Scenario | Status | Response |
|----------|--------|----------|
| user_id has scans | 200 | Array of `ScanResultOut` objects |
| user_id has no scans | 200 | Empty array `[]` |

---

## What Changes When the Frontend Sends a JWT

Once `useMonitor.ts` sends the Authorization header:

1. `scans_remaining` in the response will be a real count (not `-1`)
2. Entitlement enforcement becomes active — the user is blocked after their free scan
3. The console warning `"Scan saved without authentication"` will stop appearing
4. The frontend can read `scans_remaining` to show a "Buy more scans" prompt

---

## What Is NOT Yet Implemented

- **Payment-linked ScanSessions** — users with 0 scans remaining cannot currently purchase more (Step 3 of the build plan adds the Razorpay payment flow).
- **Scan history pagination** — `GET /api/results/me` returns all scans; a `?limit=&offset=` should be added for users with many scans.
- **`subjectDemographic` forwarding** — age, sex, weight, height from the user profile should be passed to the SDK for more accurate readings.

---

*Last updated: May 2026*

# Payments Module — Logic, Testing & Expected Behaviour

## Overview

Payments use **Stripe Checkout** — Stripe's hosted payment page. The backend never handles raw card data; Stripe handles all PCI compliance. The flow is:

1. Backend creates a Stripe Checkout Session → returns a URL
2. Frontend redirects the browser to that URL (Stripe's hosted page)
3. User pays on Stripe
4. Stripe sends a signed webhook to the backend
5. Backend verifies the signature and credits scans to the user

---

## Files

| File | Purpose |
|------|---------|
| `app/routers/payments.py` | All payment route handlers |
| `app/schemas/payment.py` | Pydantic schemas — `ScanPack`, `CheckoutSessionResponse`, `EntitlementSummary` |
| `app/models/scan_session.py` | DB model — one row per purchased pack |
| `app/config.py` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` |

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/payments/packs` | None | List available scan packs + prices |
| `GET` | `/payments/entitlement` | JWT | Get user's current scan balance |
| `POST` | `/payments/create-checkout-session` | JWT | Start a Stripe Checkout flow |
| `POST` | `/payments/webhook` | None (Stripe-signed) | Fulfil orders after payment |

---

## Scan Pack Catalogue

Defined directly in `payments.py` (no DB table needed). Update prices there when changing pricing. Currency: **Singapore Dollar (SGD)**.

| Pack ID | Name | Scans | Price | SGD Cents |
|---------|------|-------|-------|-----------|
| `single` | Single Scan | 1 | S$5.00 | 500 |
| `basic` | Basic Pack | 4 | S$16.00 | 1600 |
| `standard` | Standard Pack | 12 | S$24.00 | 2400 |
| `premium` | Premium Pack | 52 | S$36.00 | 3600 |

---

## Logic

### POST /payments/create-checkout-session

```
Client sends: { pack_id: "basic" }   +   Authorization: Bearer <token>
        ↓
1. Validate pack_id exists in catalogue  →  400 if not found
2. Check STRIPE_SECRET_KEY is configured →  503 if missing
3. stripe.checkout.Session.create(...)
     line_items: [{ pack name, price, qty: 1 }]
     metadata:   { user_id, pack_id, scans }   ← passed through to webhook
     success_url: STRIPE_SUCCESS_URL
     cancel_url:  STRIPE_CANCEL_URL
        ↓
4. Return { checkout_url, session_id }
        ↓
Frontend redirects browser to checkout_url
```

**Scans are NOT credited here.** Crediting happens only in the webhook.

---

### POST /payments/webhook

```
Stripe sends POST to /payments/webhook
  Headers: stripe-signature: t=...,v1=...
  Body: raw JSON event payload
        ↓
1. Read raw request body (must be raw bytes for signature verification)
2. stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
   → SignatureVerificationError  →  400 (Stripe will retry)
        ↓
3. Check event type == "checkout.session.completed"
   (all other events return 200 immediately — Stripe retries on non-200)
        ↓
4. Extract metadata: user_id, pack_id, scans
5. INSERT INTO scan_sessions (user_id, pack_name, scans_purchased, scans_remaining, payment_reference)
6. Return { received: true }  →  200
```

**Why 200 for all events?** Stripe retries any non-200 response. For unhandled event types we just return 200 to prevent Stripe from retrying indefinitely.

---

## Environment Variables Required

Add these to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_SUCCESS_URL=http://localhost:8000/payment-success
STRIPE_CANCEL_URL=http://localhost:8000/payment-cancelled
```

Get your keys from: **[https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)**

Use `sk_test_...` keys for development. Switch to `sk_live_...` only in production.

---

## How to Test

### Step 1 — Install Stripe CLI (for local webhook testing)

Download from: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

```powershell
# Login to your Stripe account
stripe login

# Forward Stripe webhooks to your local server
stripe listen --forward-to localhost:8001/payments/webhook
```

The CLI will print your temporary webhook secret:
```
> Ready! Your webhook signing secret is whsec_xxxxxx (^C to quit)
```

Copy that `whsec_xxxxxx` value into your `.env` as `STRIPE_WEBHOOK_SECRET`, then restart uvicorn.

---

### Step 2 — Test in Swagger

1. Start server: `uvicorn app.main:app --port 8001`
2. Start Stripe CLI forwarding (separate terminal): `stripe listen --forward-to localhost:8001/payments/webhook`
3. Open `http://127.0.0.1:8001/docs`

**See available packs:**
- `GET /payments/packs` → no auth needed

**Check your scan balance:**
- Authorize in Swagger → `GET /payments/entitlement`
- Expected: `{ "total_scans_remaining": 1, "packs": [...] }` (1 from free scan on signup)

**Create a checkout session:**
- `POST /payments/create-checkout-session` with body: `{ "pack_id": "basic" }`
- Copy the `checkout_url` from the response → open in browser
- Use Stripe test card: **`4242 4242 4242 4242`**, any future date, any CVC
- After payment, Stripe CLI forwards the webhook → scans are credited

**Verify scans were credited:**
- `GET /payments/entitlement` → `total_scans_remaining` should now be 5 (1 free + 4 from Basic Pack)

---

### Step 3 — Test with curl

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get scan packs
curl http://localhost:8001/payments/packs

# Check entitlement
curl http://localhost:8001/payments/entitlement \
  -H "Authorization: Bearer $TOKEN"

# Create checkout session
curl -X POST http://localhost:8001/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pack_id": "basic"}'
```

---

## Stripe Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

Use any future expiry date and any 3-digit CVC.

---

## Expected Behaviour

### GET /payments/packs

| Scenario | Status | Response |
|----------|--------|----------|
| Any request | 200 | Array of 4 `ScanPack` objects |

### GET /payments/entitlement

| Scenario | Status | Response |
|----------|--------|----------|
| Authenticated, has free scan | 200 | `{ total_scans_remaining: 1, packs: [...] }` |
| Authenticated, bought Basic Pack | 200 | `{ total_scans_remaining: 5, packs: [...] }` |
| No JWT | 403 | `"Not authenticated"` |

### POST /payments/create-checkout-session

| Scenario | Status | Response |
|----------|--------|----------|
| Valid pack_id, authenticated | 200 | `{ checkout_url, session_id }` |
| Invalid pack_id | 400 | `"Unknown pack_id '...'"` |
| No JWT | 403 | `"Not authenticated"` |
| Stripe not configured | 503 | `"Stripe is not configured"` |

### POST /payments/webhook

| Scenario | Status | Behaviour |
|----------|--------|-----------|
| Valid signature, `checkout.session.completed` | 200 | ScanSession created, scans credited |
| Valid signature, unhandled event type | 200 | No-op, returns `{ received: true }` |
| Invalid signature | 400 | Stripe retries the event |
| Missing metadata in session | 200 | Logs error, no ScanSession created |

---

## Full User Journey After This Module

```
Signup  →  1 free scan seeded
        ↓
Use free scan (scans_remaining → 0)
        ↓
Frontend sees scans_remaining = 0 in POST /api/results response
        ↓
Show "Buy scans" prompt  →  GET /payments/packs
        ↓
User picks a pack  →  POST /payments/create-checkout-session
        ↓
Redirect to Stripe Checkout  →  User pays
        ↓
Webhook fires  →  ScanSession created  →  scans_remaining increases
        ↓
User can scan again
```

---

## Production Checklist

- [ ] Replace `sk_test_...` with `sk_live_...` in production `.env`
- [ ] Set up a real webhook endpoint in Stripe Dashboard → Developers → Webhooks
- [ ] Point webhook to `https://your-domain.com/payments/webhook`
- [ ] Select event: `checkout.session.completed`
- [ ] Copy the live webhook signing secret to production `.env`
- [ ] Test with a real card in Stripe's live mode before launch

---

## What Is NOT Yet Implemented

- **Refunds** — no refund endpoint; would need to call `stripe.Refund.create()` and decrement `scans_remaining`.
- **Subscription / recurring payments** — current flow is one-time purchases only. Stripe Subscriptions can be added later.
- **Invoice emails** — Stripe can send automatic receipts; enable in Stripe Dashboard → Settings → Emails.
- **Currency** — currently hardcoded to INR. Multi-currency support requires detecting user locale.

---

*Last updated: May 2026*

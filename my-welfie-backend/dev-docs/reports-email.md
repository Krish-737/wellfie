# Reports & Email Delivery

> Module: `app/routers/reports.py`  
> Services: `app/services/report_pdf.py`, `app/services/mailer.py`  
> Schemas: `app/schemas/report.py`  
> Frontend: `src/components/DashboardPage.tsx`

---

## Overview

This module generates a personalised PDF health report from a user's stored scan result and delivers it either via email or as a direct browser download.  All 34 BioSense SDK indicators across 7 health categories are included.

---

## Architecture

```
Browser / App
     │
     ▼
POST /reports/email-latest          ─── JWT required
POST /reports/email/{scan_result_id} ─── JWT + ownership check
GET  /reports/download/{scan_result_id} ─── JWT + ownership check
     │
     ▼
reports.py router
     │
     ├── report_pdf.py  (ReportLab A4 canvas)
     │       └── returns PDF bytes (never written to disk)
     │
     └── mailer.py (smtplib STARTTLS)
             └── sends MIMEMultipart (HTML body + PDF attachment)
```

---

## PDF Report Layout

Generated using **ReportLab**'s low-level `canvas` API.

| Section | Indicators |
|---------|-----------|
| Cardiovascular | Pulse Rate, Systolic BP, Diastolic BP, Pulse Pressure, MAP, Cardiac Workload, Heart Age |
| Respiratory | Respiration Rate, SpO2 |
| HRV / Autonomic Nervous System | SDNN, RMSSD, Mean RRI, SD1, SD2, PRQ, LF/HF, PNS Index/Zone, SNS Index/Zone |
| Stress & Wellness | Stress Level, Stress Index, Normalised Stress Index, Wellness Level, Wellness Index |
| Metabolic / Blood | Haemoglobin, HbA1c |
| Cardio-Metabolic Risk Scores | High HbA1c Risk, High BP Risk, High Fasting Glucose Risk, High Total Cholesterol Risk, Low Haemoglobin Risk, ASCVD Score, ASCVD Risk Level |

**Design choices**
- Teal brand header with user name, email, and scan date
- Alternating row shading for readability
- Colour-coded risk labels: green (Low/Normal), amber (Medium), red (High), purple (Extreme)
- Medical disclaimer footer on every page
- Never written to disk — generated in-memory and streamed directly

---

## API Endpoints

### `POST /reports/email-latest`

Emails the most recent scan result to the authenticated user's registered address.

**Auth:** Bearer JWT required  
**Body:**
```json
{
  "email_override": "optional@other.com"
}
```

**Response `200`:**
```json
{
  "status": "sent",
  "to": "user@example.com",
  "scan_result_id": "uuid-here",
  "sent_at": "2026-05-08T10:00:00Z"
}
```

**Errors:**
- `404` — No scan results found for this account
- `503` — SMTP not configured or delivery failed

---

### `POST /reports/email/{scan_result_id}`

Emails a specific scan result (by UUID). Ownership enforced.

**Auth:** Bearer JWT required  
**Path param:** `scan_result_id` — UUID of the target scan result  
**Body:** same as above  
**Errors:** `404` if scan not found OR belongs to another user (intentionally ambiguous)

---

### `GET /reports/download/{scan_result_id}`

Streams the PDF directly to the browser as a file download.

**Auth:** Bearer JWT required  
**Response:** `application/pdf` binary, `Content-Disposition: attachment`

---

## Email Configuration

Add the following to `my-welfie-backend/.env`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password-here
EMAIL_FROM=noreply@mywellfie.com
```

**Gmail App Password setup:**
1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already on
3. Under "2-Step Verification" → **App passwords**
4. Create a new app password → copy the 16-character key
5. Paste it as `SMTP_PASSWORD` in `.env`

> Other providers: change `SMTP_HOST`/`SMTP_PORT` accordingly (e.g. AWS SES uses port 587 on `email-smtp.<region>.amazonaws.com`).

---

## Privacy & Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication required | All 3 endpoints use `Depends(get_current_user)` |
| Ownership enforcement | `_get_owned_scan()` returns 404 for both "not found" and "wrong owner" to prevent scan ID enumeration |
| No disk writes | PDFs are generated as in-memory `io.BytesIO` objects |
| TLS transport | `smtplib.SMTP.starttls()` is always called before `login()` |
| Error isolation | SMTP failures return 503 (not 500) so clients can retry; raw exceptions are never exposed |
| Logging | User ID, scan ID, and recipient are logged at INFO level for audit purposes |

**Production hardening checklist:**
- [ ] Set `APP_ENV=production` (disables Swagger docs)
- [ ] Restrict `CORS allow_origins` to your frontend domain
- [ ] Add rate limiting to `/reports/email-*` (e.g. 3 emails per user per hour)
- [ ] Add email verification gate: only send reports to `user.email` unless the override address is verified
- [ ] For high volume: replace synchronous `send_report_email()` with a task queue (Celery / ARQ / RQ)
- [ ] Consider signed S3 download links instead of inline PDF generation for very large user bases
- [ ] Data retention policy: add a `purge_after_days` column and a scheduled cleanup job

---

## Frontend Integration

Both actions are available directly on the Dashboard (`/dashboard`):

| UI element | Action |
|-----------|--------|
| **📧 Email Latest Report** button | Calls `POST /reports/email-latest` and shows success/error inline |
| **⬇ Download PDF** button (Latest Scan card) | Calls `GET /reports/download/{id}` and triggers browser download |
| **⬇ PDF** button (each history row) | Per-scan download from Recent Scan History list |

Loading/disabled states are shown during API calls to prevent double-submission.

---

## Testing

### 1. Configure SMTP

Fill in `SMTP_USER` and `SMTP_PASSWORD` in `.env`.  During development you can use [Mailtrap](https://mailtrap.io) or your real Gmail + App Password.

### 2. Start the backend

```powershell
cd my-welfie-backend
.venv\Scripts\activate
uvicorn app.main:app --port 8001
```

### 3. Test via Swagger (`/docs`)

1. Authenticate: `POST /auth/login` → copy the `access_token`
2. Click **Authorize** → paste the token
3. Test `POST /reports/email-latest` with body `{}`
4. Check your inbox for the PDF

### 4. Test download

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8001/reports/download/<scan_result_id> \
     --output test-report.pdf
```

### 5. Frontend

Open `/dashboard` after a scan is saved.  The "Email Latest Report" and "Download PDF" buttons appear in the **Latest Scan Summary** card, plus a small **⬇ PDF** button on each row in **Recent Scan History**.

---

## Files Changed

| File | Change |
|------|--------|
| `app/schemas/report.py` | **Created** — `EmailLatestReportRequest`, `EmailReportResponse` |
| `app/services/report_pdf.py` | **Created** — A4 PDF builder covering all 34 indicators |
| `app/services/mailer.py` | **Created** — SMTP STARTTLS email sender with HTML body + PDF attachment |
| `app/routers/reports.py` | **Created** — 3 endpoints with JWT + ownership guards |
| `app/main.py` | **Updated** — registered `reports.router` |
| `src/components/DashboardPage.tsx` | **Updated** — email + download buttons with loading states |

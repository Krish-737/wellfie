# Ngrok Dev Setup — My Wellfie

How to run the app in local mode or expose it publicly via ngrok (e.g. for phone testing).

---

## Project structure

| Server | Port | Stack |
|---|---|---|
| Frontend | 8000 (HTTPS) | React + Webpack Dev Server |
| Backend | 8001 (HTTP) | FastAPI + Uvicorn |

---

## Prerequisites

### Install ngrok (once)
```powershell
winget install ngrok.ngrok
```

### Authenticate ngrok (once)
```powershell
ngrok config add-authtoken YOUR_TOKEN_HERE
```
Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

### ngrok.yml config (once)
Location: `C:\Users\<you>\AppData\Local/ngrok/ngrok.yml`

```yaml
version: "2"
authtoken: YOUR_TOKEN_HERE

tunnels:
  backend:
    addr: 8001
    proto: http
    # Optional: add your free static domain here so the backend URL never changes
    # domain: your-static-domain.ngrok-free.app

  frontend:
    addr: https://localhost:8000
    proto: http
    host_header: "localhost:8000"
```

> **Free static domain:** ngrok gives 1 free static domain per account.  
> Go to https://dashboard.ngrok.com/domains → New Domain.  
> Assign it to the backend tunnel so `BACKEND_URL` in the frontend never needs updating.

---

## Mode 1 — Local development

All traffic stays on localhost. No ngrok needed.

### Start with one command (from project root)
```powershell
.\start-local.ps1
```

This opens two terminals:
- Backend: copies `.env.local` → `.env`, starts uvicorn on port 8001
- Frontend: runs `npm start`, reads `BACKEND_URL=http://localhost:8001` from `.env`

### Or start manually

**Terminal 1 — Backend:**
```powershell
cd my-welfie-backend
Copy-Item .env.local .env -Force
.venv\Scripts\activate
uvicorn app.main:app --port 8001
```

**Terminal 2 — Frontend:**
```powershell
cd my-welfie
npm start
```

**URLs:**
- Frontend: https://localhost:8000
- Backend: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## Mode 2 — Ngrok (phone / remote testing)

### Step 1 — Get today's ngrok URLs

Start ngrok:
```powershell
ngrok start --all
```

Note the two forwarding URLs, e.g.:
```
backend  -> https://abc123.ngrok-free.app  -> localhost:8001
frontend -> https://xyz789.ngrok-free.app  -> localhost:8000
```

### Step 2 — Update the env files

**`my-welfie-backend/.env.ngrok`** — replace `FRONTEND_NGROK_URL` (2 places):
```dotenv
STRIPE_SUCCESS_URL=https://xyz789.ngrok-free.app/payment-success
STRIPE_CANCEL_URL=https://xyz789.ngrok-free.app/payment-cancelled
FRONTEND_URL=https://xyz789.ngrok-free.app
```

**`my-welfie/.env.ngrok`** — replace `REPLACE_WITH_BACKEND_NGROK_URL`:
```dotenv
BACKEND_URL=https://abc123.ngrok-free.app
```
> Skip this if you set up a static domain for the backend — that URL never changes.

### Step 3 — Start with one command (from project root)
```powershell
.\start-ngrok.ps1
```

This opens three terminals:
- ngrok: starts both tunnels
- Backend: copies `.env.ngrok` → `.env`, starts uvicorn
- Frontend: runs `npm run start:ngrok`, reads `BACKEND_URL` from `.env.ngrok`

### Or start manually

**Terminal 1 — ngrok:**
```powershell
ngrok start --all
```

**Terminal 2 — Backend:**
```powershell
cd my-welfie-backend
Copy-Item .env.ngrok .env -Force
.venv\Scripts\activate
uvicorn app.main:app --port 8001
```

**Terminal 3 — Frontend:**
```powershell
cd my-welfie
npm run start:ngrok
```

### Step 4 — Stripe webhook (if testing payments)
```powershell
stripe listen --forward-to https://abc123.ngrok-free.app/payments/webhook
```

---

## How the BACKEND_URL flows through the code

```
my-welfie/.env          (local)  BACKEND_URL=http://localhost:8001
my-welfie/.env.ngrok    (ngrok)  BACKEND_URL=https://your-ngrok-url
        │
        ▼ read by webpack.config.js (DefinePlugin)
        │
        ▼ injected as process.env.BACKEND_URL at build time
        │
        ▼ my-welfie/src/api/config.ts
          export const API_BASE = process.env.BACKEND_URL || 'http://localhost:8001'
        │
        ▼ used by all API calls in the app
```

---

## File reference

| File | Purpose |
|---|---|
| `my-welfie/.env` | Local mode frontend env (BACKEND_URL=localhost) |
| `my-welfie/.env.ngrok` | Ngrok mode frontend env (update BACKEND_URL each session) |
| `my-welfie-backend/.env.local` | Local mode backend env (Stripe/FRONTEND_URL → localhost) |
| `my-welfie-backend/.env.ngrok` | Ngrok mode backend env (update FRONTEND_NGROK_URL each session) |
| `my-welfie-backend/.env` | Active env — overwritten by startup scripts, do not edit directly |
| `start-local.ps1` | One-command local startup |
| `start-ngrok.ps1` | One-command ngrok startup |

---

## Switching modes — summary

| What you want | Command |
|---|---|
| Local dev (browser on same PC) | `.\start-local.ps1` |
| Phone / remote testing | Update `.env.ngrok` files → `.\start-ngrok.ps1` |
| Frontend only (local) | `cd my-welfie && npm start` |
| Frontend only (ngrok) | `cd my-welfie && npm run start:ngrok` |

# ─────────────────────────────────────────────────────────────
# start-ngrok.ps1  —  Start both servers in NGROK mode
# Usage: .\start-ngrok.ps1
#
# Before running:
#   1. Update my-welfie-backend/.env.ngrok  — replace FRONTEND_NGROK_URL
#   2. Update my-welfie/.env.ngrok          — replace REPLACE_WITH_BACKEND_NGROK_URL
#      (skip step 2 if you're using an ngrok static domain for the backend)
# ─────────────────────────────────────────────────────────────

Write-Host "Starting in NGROK mode..." -ForegroundColor Cyan

# Start ngrok tunnels (both backend + frontend)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Write-Host 'Starting ngrok tunnels...' -ForegroundColor Green
  ngrok start --all
"@

# Backend — copy .env.ngrok → .env, activate venv, start uvicorn
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location 'my-welfie-backend'
  Copy-Item '.env.ngrok' '.env' -Force
  Write-Host 'Backend .env set to NGROK' -ForegroundColor Green
  .venv\Scripts\activate
  uvicorn app.main:app --port 8001
"@

# Frontend — npm run start:ngrok (reads .env.ngrok via ENV_FILE)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location 'my-welfie'
  Write-Host 'Starting frontend in NGROK mode' -ForegroundColor Green
  npm run start:ngrok
"@

Write-Host ""
Write-Host "Servers starting in new windows." -ForegroundColor Cyan
Write-Host "Check the ngrok window for your public URLs." -ForegroundColor Yellow
Write-Host ""
Write-Host "Reminder — update these files with today's frontend ngrok URL:" -ForegroundColor Magenta
Write-Host "  my-welfie-backend/.env.ngrok  (FRONTEND_NGROK_URL x2)" -ForegroundColor Magenta
Write-Host "  my-welfie/.env.ngrok          (BACKEND_URL — skip if using static domain)" -ForegroundColor Magenta

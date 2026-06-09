# ─────────────────────────────────────────────────────────────
# start-local.ps1  —  Start both servers in LOCAL mode
# Usage: .\start-local.ps1
# ─────────────────────────────────────────────────────────────

Write-Host "Starting in LOCAL mode..." -ForegroundColor Cyan

# Backend — copy .env.local → .env, activate venv, start uvicorn
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location 'my-welfie-backend'
  Copy-Item '.env.local' '.env' -Force
  Write-Host 'Backend .env set to LOCAL' -ForegroundColor Green
  .venv\Scripts\activate
  uvicorn app.main:app --port 8001
"@

# Frontend — npm start (reads .env which has BACKEND_URL=http://localhost:8001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location 'my-welfie'
  Write-Host 'Starting frontend in LOCAL mode' -ForegroundColor Green
  npm start
"@

Write-Host ""
Write-Host "Servers starting in new windows:" -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:8000" -ForegroundColor Yellow
Write-Host "  API Docs -> http://localhost:8001/docs" -ForegroundColor Yellow

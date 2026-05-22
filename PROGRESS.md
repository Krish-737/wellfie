# My Wellfie — Project Progress

Edit this file anytime to track what’s done and what’s left. Use `- [x]` for completed and `- [ ]` for pending.

---

## Core product flow

- [x] Landing page (marketing, pricing, Stripe checkout)
- [x] Email/password signup & login (JWT)
- [x] Free scan on signup
- [x] Camera scan (BioSense SDK face session)
- [x] Save scan results (34 vitals) to backend
- [x] Dashboard (latest metrics, 7-day chart, recent scans)
- [x] PDF download per scan
- [x] Email latest report (SMTP required)
- [x] Stripe payments & scan entitlement

---

## Health profile (SDK user information)

- [x] Backend: profile fields on `User` (sex, age, height, weight, smoking)
- [x] API: `GET /auth/me` includes profile + `profile_complete`
- [x] API: `PATCH /auth/me/profile`
- [x] Frontend: Health profile page (`/profile`)
- [x] Gate `/camera` until profile is complete
- [x] Pass `userInformation` to BioSense SDK in `useMonitor`
- [x] **Prepare for Your Scan** guide — `/prepare-scan`, dashboard card, camera checklist
- [x] Sex: Male / Female / Prefer not to say
- [x] Date of birth (DD/MM/YYYY) → age computed and stored on save
- [x] `users.created_at` / `users.updated_at` exposed in API; `scan_results` audit columns added
- [ ] QA: confirm `heart_age` and `ascvd_risk` appear after scan with full profile
- [ ] (Optional) Snapshot demographics on each `ScanResult` row

---

## Auth & account — SSO

- [x] OAuth backend + frontend (`/auth/callback`, social buttons, JWT flow)
- [x] Google — local dev working
- [x] **Microsoft** — Implementation done; robust email capture added (OIDC + preferred_username fallback)
- [x] **Facebook** — Implementation done; Graph API integration for profile + email
- [ ] Email verification flow
- [ ] Password reset / forgot password

---

## Dashboard & history (partial)

- [ ] Full scan history page (“View All”)
- [ ] Per-scan email from UI
- [ ] Show more than 4 vitals on dashboard

---

## Camera & entitlement

- [x] Block `/camera` when `scansRemaining === 0` (`ScansRequiredRoute` + in-page fallback)
- [x] No-scans screen with Buy Scan Pack → `/pricing#pricing` or Back to Dashboard
- [x] Handle 403 from `POST /api/results` in UI (save error banner + actions)

---

## Community, legal, corporate (not started)

- [ ] Community features
- [ ] Corporate / contact page
- [ ] Privacy, Terms, footer links

---

## Infrastructure

- [ ] Alembic migrations (prod)
- [x] Dev migration helper for profile columns on startup
- [ ] Automated tests (frontend + backend)
- [ ] Remove legacy unauthenticated `POST /api/results`

---

*Last updated: May 2026*

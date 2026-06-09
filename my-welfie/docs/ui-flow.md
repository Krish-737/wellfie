# MyWellfie UI Flow

## Purpose
This document captures the current frontend UX flow (landing, auth, scan, payments), and proposes an improved post-login flow that avoids dropping users directly into camera.

## Current Route Map
Defined in `src/components/App.tsx`:

- `/` -> `LandingPage`
- `/login` -> `AuthPage`
- `/camera` -> Protected route (`ProtectedRoute`)
- `/payment-success` -> `PaymentSuccess`
- `/payment-cancelled` -> `PaymentCancelled`
- `*` -> redirects to `/`

## Current User Journey

### 1) First visit / landing

- Landing CTA (`Get Started`) sends:
  - logged-in user -> `/camera`
  - logged-out user -> `/login`

Reference:
- `src/components/LandingPage/HeroSection.tsx` (`handleGetStarted`)

### 2) Auth page behavior

- Auth page has Login + Sign Up tabs.
- `from` location fallback is currently `/camera`.
- After either login or signup, user is redirected to `from`.

Reference:
- `src/components/Auth/AuthPage.tsx`
  - `const from = ... ?? '/camera'`
  - `navigate(from, { replace: true })`

### 3) New user free scan

- On signup, frontend auto-logins immediately.
- Backend seeds free entitlement; frontend fetches entitlement and stores it in auth context.

Reference:
- `src/context/AuthContext.tsx`
  - `signup()` -> `await login(email, password)`
  - `fetchEntitlement()` from `/payments/entitlement`

### 4) Scan flow

- `/camera` is gated by JWT.
- On completed scan, frontend posts vitals to `/api/results` with auth token and user ID.
- On success, it refreshes entitlement count.

Reference:
- `src/hooks/useMonitor.ts`

### 5) Out-of-scans behavior

- If `scansRemaining === 0`, camera Start button is replaced with a card + `Buy More Scans` link (`/#pricing`).

Reference:
- `src/components/BiosenseSignalMonitor.tsx`

### 6) Purchase flow

- Pricing cards call `/payments/create-checkout-session`.
- If not logged in -> redirect to login first.
- If logged in -> redirect to Stripe checkout URL.

Reference:
- `src/components/LandingPage/PricingSection.tsx`

### 7) Payment return flow

- Stripe redirect pages:
  - `/payment-success`: refreshes entitlement and shows updated scan count
  - `/payment-cancelled`: returns user to plans/home

Reference:
- `src/components/PaymentResult.tsx`

## UX Concern (Current)

The app currently redirects users to `/camera` immediately after login/signup by default. This can feel abrupt, especially for new users who should see onboarding context before scanning.

## Proposed Improved UI Flow

### New route to introduce

- `/dashboard` (or `/home`) as authenticated landing screen.

### Updated redirection behavior

- Login success -> `/dashboard`
- Signup success -> `/dashboard?welcome=1`
- Camera entry should happen from CTA clicks on dashboard (not automatic redirect)

### Dashboard content (mobile-first)

- Greeting + profile summary
- Entitlement card (`scansRemaining`)
- Primary CTA:
  - if `scansRemaining > 0` -> `Start Free Scan` / `Start Scan`
  - if `scansRemaining === 0` -> `Buy Scan Pack`
- Secondary actions:
  - `How it works`
  - `View Plans`
  - `Go to Camera` (optional power-user shortcut)

### First-time welcome state (`welcome=1`)

- Banner: `Welcome! You have 1 free scan.`
- 3-step pre-scan tips:
  1. Sit in good lighting
  2. Keep phone steady
  3. Keep face centered for full duration
- CTA: `Start My Free Scan`

## Implementation Plan (Frontend)

1. Create `DashboardPage.tsx` (new component, responsive).
2. Add route `/dashboard` in `App.tsx` (protected).
3. Update `AuthPage.tsx`:
   - change fallback from `/camera` to `/dashboard`
   - send signup users to `/dashboard?welcome=1`
4. Keep `/camera` protected and unchanged.
5. Reuse `useAuth()` state (`user`, `scansRemaining`, `refreshEntitlement`) for dashboard cards.
6. Keep existing pricing and payment routes unchanged.

## Acceptance Criteria

- User is not forced into camera right after auth.
- New signup user sees free-scan welcome state.
- Camera is still one-tap from dashboard.
- Entitlement count is visible before scanning.
- Zero-scan user clearly sees purchase path.
- Flow is mobile-friendly (primary target device).

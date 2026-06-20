// src/api/kioskApi.ts
// All kiosk-related API calls.
// Uses apiFetch (not raw fetch) so the ngrok-skip-browser-warning header
// is automatically included — without it ngrok returns an HTML page instead
// of JSON and every call silently fails with "Session not found".

import { apiFetch } from './apiFetch';

export interface KioskSession {
  id: string;
  kiosk_id: string;
  status: "pending_payment" | "paid" | "scanned" | "report_sent";
  email: string | null;
  guest_name: string | null;
  sex: string | null;
  date_of_birth: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  smoking_status: string | null;
  scan_result_id: string | null;
  expires_at: string;
  is_expired: boolean;
}

export interface KioskProfileUpdate {
  guest_name?: string;
  email?: string;
  sex?: string;
  date_of_birth?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  smoking_status?: string;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {
      // response wasn't JSON — surface the status
      detail = `HTTP ${res.status}`;
    }
    throw { status: res.status, detail };
  }

  try {
    return await res.json();
  } catch {
    // Ngrok HTML page or empty body — means the ngrok warning slipped through
    throw { status: 200, detail: "Invalid response from server. Check ngrok-skip-browser-warning header." };
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export const createKioskSession = (kiosk_id: string): Promise<KioskSession> =>
  req("/kiosk/session", {
    method: "POST",
    body: JSON.stringify({ kiosk_id }),
  });

// ── Direct Checkout (combined session + Stripe for $1 flow) ─────────────────

export const createDirectCheckout = (): Promise<{ session_id: string; checkout_url: string }> =>
  req("/kiosk/direct-checkout", {
    method: "POST",
    body: JSON.stringify({ kiosk_id: "direct" }),
  });

export const getKioskSession = (id: string): Promise<KioskSession> =>
  req(`/kiosk/session/${id}`);

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateKioskProfile = (
  id: string,
  data: KioskProfileUpdate
): Promise<KioskSession> =>
  req(`/kiosk/session/${id}/profile`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ── Checkout ──────────────────────────────────────────────────────────────────

export const createKioskCheckout = (
  id: string
): Promise<{ checkout_url: string }> =>
  req(`/kiosk/session/${id}/checkout`, { method: "POST" });

export const simulateKioskPayment = (id: string): Promise<KioskSession> =>
  req(`/kiosk/session/${id}/simulate-payment`, { method: "POST" });

// ── Scan ──────────────────────────────────────────────────────────────────────

export const saveKioskScan = (
  id: string,
  vitals: Record<string, unknown>,
  meta?: { scan_platform?: string; measurement_duration_sec?: number }
): Promise<{ scan_result_id: string; status: string }> =>
  req(`/kiosk/session/${id}/scan`, {
    method: "POST",
    body: JSON.stringify({
      vitals,
      scan_platform: meta?.scan_platform ?? "kiosk",
      measurement_duration_sec: meta?.measurement_duration_sec ?? null,
    }),
  });

// ── Email ─────────────────────────────────────────────────────────────────────

export const sendKioskReport = (
  id: string,
  email?: string
): Promise<{ message: string }> =>
  req(`/kiosk/session/${id}/email`, {
    method: "POST",
    body: JSON.stringify({ email: email ?? null }),
  });

// ── PDF download (direct link — apiFetch not needed, browser handles it) ──────
export const kioskPdfUrl = (id: string): string => {
  const base = process.env.BACKEND_URL || '';
  return `${base}/kiosk/session/${id}/pdf`;
};
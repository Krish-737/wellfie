// src/components/kiosk/KioskLandingPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE mobile entry point for Kiosk users.
// Matches website branding (Light Theme).
// FIXED: Removed flex-col height constraints to ensure natural mobile scrolling.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createKioskCheckout,
  getKioskSession,
  createKioskSession,
  KioskSession,
} from "../../api/kioskApi";
import logoSrc from "../../assets/mywellfie-logo.png";

export default function KioskLandingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [session, setSession] = useState<KioskSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentCancelled, setPaymentCancelled] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      const kioskId = searchParams.get("kiosk_id") || "default";
      createKioskSession(kioskId)
        .then((s) => {
          navigate(`/kiosk/${s.id}${window.location.search}`, { replace: true });
        })
        .catch(() => {
          setError("Unable to start your session. Please scan the QR code again.");
          setLoading(false);
        });
      return;
    }

    if (searchParams.get("payment") === "cancelled") {
      setPaymentCancelled(true);
    }

    getKioskSession(sessionId)
      .then((s) => {
        if (s.status === "paid" || s.status === "scanned" || s.status === "report_sent") {
          navigate(`/kiosk/payment-done`, { replace: true });
          return;
        }
        setSession(s);
      })
      .catch((err) => {
        console.error("[KioskLandingPage] getKioskSession failed:", err);
        setError("Session not found. Please scan the QR code again.");
      })
      .finally(() => setLoading(false));
  }, [sessionId, navigate, searchParams]);

  async function handlePay() {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);

    try {
      const { checkout_url } = await createKioskCheckout(sessionId);
      window.location.href = checkout_url;
    } catch (e: any) {
      setError(e?.detail ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/10" />
          <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-slate-600 font-bold mt-6 tracking-tight text-center">Preparing Secure Checkout</p>
      </div>
    );
  }

  if (error || session?.is_expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-slate-900 text-xl font-extrabold mb-3">
          {session?.is_expired ? "Session Expired" : "Checkout Unavailable"}
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
          {session?.is_expired
            ? "For your security, kiosk sessions expire after 24 hours. Please scan the QR code again."
            : error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 text-teal-600 font-bold text-sm uppercase tracking-widest hover:text-teal-700 transition-colors"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 flex flex-col">
      
      {/* ── Centered Logo ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <img src={logoSrc} alt="MyWellfie" className="h-12 object-contain mb-8" />

        <div className="w-full max-w-md mx-auto space-y-5 text-center">
          
          {paymentCancelled && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <span className="text-xl">💳</span>
              <p className="text-amber-800 text-xs font-bold leading-tight">Payment was cancelled. You can try again below.</p>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full relative overflow-hidden rounded-[22px] bg-teal-500 py-5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-teal-500/25"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-white font-black text-lg tracking-tight uppercase italic">
                {submitting ? "Redirecting..." : "Pay & Start Scan"}
              </span>
              {!submitting && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </div>
          </button>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="w-3 h-[1.5px] bg-slate-200" />
              <span>Secure Checkout Powered by Stripe</span>
              <span className="w-3 h-[1.5px] bg-slate-200" />
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed px-4 font-medium max-w-[280px]">
              After payment, return to the Kiosk PC screen to enter your details and begin the scan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

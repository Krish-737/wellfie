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
  simulateKioskPayment,
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

  async function handleSimulatePay() {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);

    try {
      await simulateKioskPayment(sessionId);
      window.location.href = `/kiosk/payment-done`;
    } catch (e: any) {
      setError(e?.detail ?? "Simulation failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
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
          className="mt-8 text-emerald-600 font-bold text-sm uppercase tracking-widest hover:text-emerald-700 transition-colors"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white text-slate-900 selection:bg-emerald-100">
      
      {/* ── Brand Header ── */}
      <nav className="px-6 py-6 flex items-center justify-center border-b border-slate-100 bg-white sticky top-0 z-50">
        <img src={logoSrc} alt="MyWellfie" className="h-9 object-contain" />
      </nav>

      {/* ── Hero Section ── */}
      <header className="relative overflow-hidden pt-10 pb-8 px-6 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full aspect-square bg-emerald-50/50 blur-[80px] rounded-full -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">Live Kiosk Session</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1] mb-4 text-slate-900">
            Smart Health <br />
            <span className="text-emerald-600">Starts Here.</span>
          </h1>
          <p className="text-slate-500 text-base font-medium max-w-[280px] mx-auto leading-relaxed">
            Clinical-grade facial scanning and analysis on the big screen.
          </p>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="px-6 py-4">
        <div className="max-w-md mx-auto space-y-4">
          
          {paymentCancelled && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <span className="text-xl">💳</span>
              <p className="text-amber-800 text-xs font-bold leading-tight">Payment was cancelled. You can try again below.</p>
            </div>
          )}

          {/* ── Feature Cards ── */}
          <div className="grid gap-3">
            {[
              { 
                title: "34 Clinical Vitals", 
                desc: "BP, Heart Rate, Stress, SpO2 & more.",
                icon: "🫀",
                color: "bg-blue-50 text-blue-600 border-blue-100"
              },
              { 
                title: "AI Health Analysis", 
                desc: "Biological Heart Age & Risk insights.",
                icon: "🧠",
                color: "bg-purple-50 text-purple-600 border-purple-100"
              },
              { 
                title: "Digital PDF Report", 
                desc: "Sent instantly to your private email.",
                icon: "📄",
                color: "bg-emerald-50 text-emerald-600 border-emerald-100"
              }
            ].map((f, i) => (
              <div key={i} className={`bg-white border ${f.color} p-4 rounded-3xl flex items-center gap-4 shadow-sm`}>
                <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-2xl bg-white/50 border border-white shadow-sm">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{f.title}</h3>
                  <p className="text-slate-500 text-[13px] font-medium mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Action Section (No longer mt-auto) ── */}
      <section className="p-6 pb-12">
        <div className="max-w-md mx-auto space-y-6">
          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full relative overflow-hidden rounded-[22px] bg-emerald-500 py-5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25"
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

          <button
            onClick={handleSimulatePay}
            disabled={submitting}
            className="w-full rounded-[22px] border-2 border-dashed border-amber-300 bg-amber-50 py-4 text-amber-700 font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Simulating..." : "Simulate Payment (Dev Only)"}
          </button>

          <div className="flex flex-col items-center gap-3">
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
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/apiFetch';

const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#14b8a6" viewBox="0 0 24 24" style={{ marginRight: 8, flexShrink: 0 }}>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

interface Plan {
  name: string;
  packId: string;
  price: string;
  features: string[];
  popular: boolean;
}

const plans: Plan[] = [
  { name: 'Single Scan',   packId: 'single',   price: 'S$5',  features: ['1 Scan', 'S$5.00 per scan'],   popular: false },
  { name: 'Basic Pack',    packId: 'basic',    price: 'S$16', features: ['4 Scans', 'S$4.00 per scan'],   popular: true  },
  { name: 'Standard Pack', packId: 'standard', price: 'S$24', features: ['12 Scans', 'S$2.00 per scan'],  popular: false },
  { name: 'Premium Pack',  packId: 'premium',  price: 'S$36', features: ['52 Scans', 'S$0.69 per scan'],  popular: false },
];

// ── Non-responsive shared styles ──────────────────────────────────────────────
const shared: Record<string, React.CSSProperties> = {
  corporateLink:  { color: '#2dd4bf', fontWeight: 700, textDecoration: 'none', marginLeft: 4 },
  popularBadge:   { position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', background: '#14b8a6', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
  planNamePopular:{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0d9488' },
  planName:       { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  price:          { fontSize: 40, fontWeight: 700, marginBottom: 24, display: 'block' },
  featureList:    { listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  featureItem:    { display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 14 },
  btnDefault:     { width: '100%', padding: '12px 0', background: '#f1f5f9', color: '#334155', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, transition: 'background 0.2s' },
  btnPopular:     { width: '100%', padding: '12px 0', background: '#14b8a6', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, transition: 'background 0.2s' },
  btnLoading:     { opacity: 0.7, cursor: 'not-allowed' },
  viewAllLink:    { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s', fontSize: 15 },
  errorMsg:       { marginTop: 12, fontSize: 13, color: '#fca5a5', textAlign: 'center' },
};

// ── Component ─────────────────────────────────────────────────────────────────

const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  // Responsive styles
  const s: Record<string, React.CSSProperties> = {
    section: { padding: isMobile ? '64px 16px' : '96px 24px', background: '#0f172a', color: '#ffffff' },
    inner:   { maxWidth: 1280, margin: '0 auto' },
    header:  { textAlign: 'center', marginBottom: isMobile ? 40 : 64 },
    h2:      { fontSize: isMobile ? 26 : 36, fontWeight: 700, marginBottom: 16 },
    subtitle:{ color: '#94a3b8', marginBottom: 32, fontSize: 15 },
    corporateBadge: { display: 'inline-block', padding: '8px 16px', background: '#1e293b', borderRadius: 8, fontSize: 14, color: '#94a3b8', marginBottom: 48 },
    grid:    { display: 'grid', gridTemplateColumns: cols, gap: isMobile ? 16 : 24, alignItems: 'end' },
    card:    { background: '#ffffff', borderRadius: 16, padding: isMobile ? 20 : 32, color: '#0f172a', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
    // Scale is removed on mobile/tablet so cards don't get clipped
    cardPopular: { background: '#ffffff', borderRadius: 16, padding: isMobile ? 20 : 32, color: '#0f172a', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: '2px solid #2dd4bf', transform: isTablet ? 'none' : 'scale(1.05)', position: 'relative' },
    viewAll: { marginTop: 48, textAlign: 'center' },
  };

  const handleBuy = async (packId: string) => {
    if (!token) {
      navigate('/login', { state: { from: '/#pricing' } });
      return;
    }
    setError(null);
    setLoadingPack(packId);
    try {
      const res = await apiFetch('/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack_id: packId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Could not start checkout');
      }
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoadingPack(null);
    }
  };

  return (
    <section id="pricing" style={s.section}>
      <div style={s.inner}>
        <div style={s.header}>
          <h2 style={s.h2}>Choose Your Wellness Plan</h2>
          <p style={s.subtitle}>Flexible scan packs to fit your health monitoring needs</p>
          <div style={s.corporateBadge}>
            Looking for corporate wellness solutions?
            <a href="#" style={shared.corporateLink}>Contact Us</a>
          </div>
        </div>

        <div style={s.grid}>
          {plans.map((plan) => {
            const isLoading = loadingPack === plan.packId;
            const baseBtn = plan.popular ? shared.btnPopular : shared.btnDefault;
            const btnStyle = isLoading ? { ...baseBtn, ...shared.btnLoading } : baseBtn;

            return (
              <div key={plan.packId} style={plan.popular ? s.cardPopular : s.card}>
                {plan.popular && <div style={shared.popularBadge}>Most Popular</div>}
                <h3 style={plan.popular ? shared.planNamePopular : shared.planName}>{plan.name}</h3>
                <div style={shared.price}>{plan.price}</div>
                <ul style={shared.featureList}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={shared.featureItem}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  style={btnStyle}
                  onClick={() => handleBuy(plan.packId)}
                  disabled={isLoading || loadingPack !== null}
                >
                  {isLoading ? 'Redirecting…' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        {error && <p style={shared.errorMsg}>{error}</p>}

        <div style={s.viewAll}>
          <a href="#" style={shared.viewAllLink}>
            View All Plans
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

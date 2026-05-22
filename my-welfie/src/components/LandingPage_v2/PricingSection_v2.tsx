import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/apiFetch';

interface Plan {
  name: string;
  packId: string;
  tagline: string;
  price: string;
  unit: string;
  features: string[];
  popular: boolean;
  btnLabel: string;
}

const plans: Plan[] = [
  {
    name: 'Single',    packId: 'single',   tagline: 'One-time deep dive',
    price: 'S$5',    unit: '/scan',
    features: ['1 Full Vital Scan', '24h Report Access'],
    popular: false,  btnLabel: 'Buy Now',
  },
  {
    name: 'Basic',     packId: 'basic',    tagline: 'Weekly check-ins',
    price: 'S$16',   unit: '/pack',
    features: ['4 Scans', 'Monthly Trends', 'Email Support'],
    popular: false,  btnLabel: 'Select Basic',
  },
  {
    name: 'Standard',  packId: 'standard', tagline: 'Daily optimization',
    price: 'S$24',   unit: '/pack',
    features: ['12 Scans', 'Advanced AI Insights', 'Weekly Bio-optimization', 'Priority Processing'],
    popular: true,   btnLabel: 'Start Standard',
  },
  {
    name: 'Premium',   packId: 'premium',  tagline: 'Ultimate precision',
    price: 'S$36',   unit: '/pack',
    features: ['52 Scans', 'Concierge Dashboard', 'Real-time Alerts', 'Multi-device Sync', '24/7 Clinical Support'],
    popular: false,  btnLabel: 'Go Premium',
  },
];

const PricingSection_v2: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  return (
    <section id="pricing" style={{ padding: isMobile ? '64px 20px' : '80px 64px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <h2 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: '#ffffff', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
          Choose Your Wellness Plan
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, color: '#bbcabf' }}>Monthly</span>
          <div style={{ width: 48, height: 24, background: '#26364a', borderRadius: 9999, padding: 4, position: 'relative' as const }}>
            <div style={{ width: 16, height: 16, background: '#4edea3', borderRadius: '50%', position: 'absolute', right: 4, top: 4 }} />
          </div>
          <span style={{ fontSize: 16, color: '#ffffff', fontWeight: 700 }}>Annual (Save 20%)</span>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 24, alignItems: 'end' }}>
        {plans.map((plan) => {
          const isLoading = loadingPack === plan.packId;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.packId}
              style={{
                background: 'rgba(30,41,59,0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isPopular ? '1px solid rgba(78,222,163,0.4)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 32,
                padding: isMobile ? 24 : 32,
                display: 'flex',
                flexDirection: 'column' as const,
                position: 'relative' as const,
                transform: isPopular && !isTablet ? 'scale(1.05)' : 'none',
                zIndex: isPopular ? 1 : 0,
                boxShadow: isPopular ? '0 0 25px -5px rgba(78,222,163,0.3)' : 'none',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => {
                if (!isPopular) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={e => {
                if (!isPopular) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                  background: '#4edea3', color: '#003824',
                  padding: '4px 20px', borderRadius: 9999,
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  whiteSpace: 'nowrap' as const,
                }}>
                  Most Popular
                </div>
              )}

              {/* Plan name + tagline */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 22, fontWeight: 600, color: '#ffffff', margin: '0 0 4px' }}>{plan.name}</h4>
                <p style={{ fontSize: 16, color: '#bbcabf', margin: 0 }}>{plan.tagline}</p>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 32 }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 16, color: '#bbcabf', marginLeft: 4 }}>{plan.unit}</span>
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#d3e4fe' }}>
                    <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: 18, transform: 'scale(0.85)', flexShrink: 0 }}>check</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                onClick={() => handleBuy(plan.packId)}
                disabled={isLoading || loadingPack !== null}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: isLoading || loadingPack !== null ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s, background 0.2s',
                  ...(isPopular
                    ? { background: '#4edea3', color: '#003824', border: 'none' }
                    : { background: 'transparent', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }
                  ),
                }}
                onMouseEnter={e => {
                  if (!isPopular) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                  else (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  if (!isPopular) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  else (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                }}
              >
                {isLoading ? 'Redirecting…' : plan.btnLabel}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ marginTop: 24, fontSize: 14, color: '#fca5a5', textAlign: 'center' }}>{error}</p>
      )}
    </section>
  );
};

export default PricingSection_v2;

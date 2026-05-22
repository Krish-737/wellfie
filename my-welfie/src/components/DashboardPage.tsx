import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/apiFetch';
import logoSrc from '../assets/mywellfie-logo.png';
import ScanPrepDashboardCard from './ScanPrep/ScanPrepDashboardCard';
import HealthIndicatorsCarousel from './HealthIndicatorsPage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScanResult {
  id: string;
  scanned_at: string;
  pulse_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null;
  stress_level?: number | null;
  wellness_index?: number | null;
}

// ── Inline metric icons ───────────────────────────────────────────────────────

const HeartIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path fill="#14b8a6" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const WaveIcon = () => (
  <svg width="22" height="22" fill="none" stroke="#14b8a6" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const WindIcon = () => (
  <svg width="22" height="22" fill="none" stroke="#14b8a6" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
);

const BrainIcon = () => (
  <svg width="22" height="22" fill="none" stroke="#14b8a6" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3 3 3 0 0 1-1.5 2.6V14a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-1.4A3 3 0 0 1 4.5 10a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ScanIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {/* Scanner Target Corners */}
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    {/* Inner Camera/Biometric Lens */}
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const FaceScanIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {/* Tech Viewfinder Corners */}
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />

    {/* Human Face Silhouette */}
    <path d="M12 14a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
    <path d="M17.5 19c-.5-2.2-2.3-4-5.5-4s-5 1.8-5.5 4" />

    {/* Subtle Biometric Target Nodes */}
    <circle cx="12" cy="10.5" r="0.5" fill="currentColor" />
  </svg>
);

// ── Status badge helper ───────────────────────────────────────────────────────

function pulseStatus(v?: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: '—', color: '#64748b', bg: '#f1f5f9' };
  if (v >= 60 && v <= 100) return { label: 'Optimal', color: '#0f766e', bg: '#f0fdfa' };
  if (v < 60) return { label: 'Low', color: '#92400e', bg: '#fffbeb' };
  return { label: 'Elevated', color: '#b45309', bg: '#fff7ed' };
}

function bpStatus(sys?: number | null): { label: string; color: string; bg: string } {
  if (sys == null) return { label: '—', color: '#64748b', bg: '#f1f5f9' };
  if (sys < 120) return { label: 'Healthy', color: '#166534', bg: '#f0fdf4' };
  if (sys < 130) return { label: 'Elevated', color: '#92400e', bg: '#fffbeb' };
  return { label: 'High', color: '#991b1b', bg: '#fef2f2' };
}

function spo2Status(v?: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: '—', color: '#64748b', bg: '#f1f5f9' };
  if (v >= 98) return { label: 'Perfect', color: '#1d4ed8', bg: '#eff6ff' };
  if (v >= 95) return { label: 'Good', color: '#0f766e', bg: '#f0fdfa' };
  return { label: 'Low', color: '#991b1b', bg: '#fef2f2' };
}

function stressStatus(v?: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: '—', color: '#64748b', bg: '#f1f5f9' };
  if (v <= 2) return { label: 'Low', color: '#166534', bg: '#f0fdf4' };
  if (v <= 3) return { label: 'Moderate', color: '#92400e', bg: '#fffbeb' };
  return { label: 'Higher Stress', color: '#991b1b', bg: '#fef2f2' };
}

// ── Time-ago formatter ────────────────────────────────────────────────────────

// Ensures backend timestamps without timezone info are treated as UTC
function toUtcDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - toUtcDate(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`;
}

function shortDate(iso?: string): string {
  if (!iso) return '--';
  return toUtcDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortTime(iso?: string): string {
  if (!iso) return '';
  return toUtcDate(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ── Vitality Trend SVG chart ──────────────────────────────────────────────────

const VitalityChart: React.FC<{ data: ScanResult[] }> = ({ data }) => {
  const W = 560; const H = 130; const PAD = { t: 12, r: 16, b: 28, l: 32 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // Build last 7 days labels
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  });

  // Map scans to last 7 days by day index
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: (number | null)[] = Array(7).fill(null);
  data.forEach(s => {
    if (s.wellness_index == null) return;
    const d = new Date(s.scanned_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) buckets[6 - diff] = s.wellness_index;
  });

  const hasData = buckets.some(v => v !== null);
  const xPos = (i: number) => PAD.l + (i / 6) * plotW;
  const yPos = (v: number) => PAD.t + plotH - (v / 100) * plotH;

  // Build path only through non-null points
  const pts = buckets.map((v, i) => (v !== null ? { x: xPos(i), y: yPos(v), v } : null)).filter(Boolean) as { x: number; y: number; v: number }[];
  const linePath = pts.length >= 2
    ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    : '';
  const areaPath = pts.length >= 2
    ? `${linePath} L${pts[pts.length - 1].x},${H - PAD.b} L${pts[0].x},${H - PAD.b} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines */}
      {[0, 25, 50, 75, 100].map(val => (
        <g key={val}>
          <line
            x1={PAD.l} y1={yPos(val)} x2={W - PAD.r} y2={yPos(val)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"
          />
          <text x={PAD.l - 4} y={yPos(val) + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{val}</text>
        </g>
      ))}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

      {/* Line */}
      {linePath && <path d={linePath} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
      ))}

      {/* Empty state placeholder dots */}
      {!hasData && buckets.map((_, i) => (
        <circle key={i} cx={xPos(i)} cy={PAD.t + plotH / 2} r="3" fill="#e2e8f0" />
      ))}

      {/* X-axis labels */}
      {days.map((d, i) => (
        <text key={i} x={xPos(i)} y={H - 4} fontSize="10" fill="#94a3b8" textAnchor="middle">{d}</text>
      ))}
    </svg>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, scansRemaining, logout } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const [history, setHistory] = useState<ScanResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [emailingLatest, setEmailingLatest] = useState<boolean>(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const params = new URLSearchParams(location.search);
  const isWelcome = params.get('welcome') === '1';

  useEffect(() => {
    if (!token) { setHistory([]); setHistoryLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        setHistoryLoading(true); setHistoryError(null);
        const res = await apiFetch('/api/results/me', {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not load recent scans');
        const data = await res.json();
        if (mounted) setHistory(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (mounted) setHistoryError(err.message || 'Failed to load scan history');
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const latest = history[0];
  const recent = history.slice(0, 5);

  const handleEmailLatest = useCallback(async () => {
    if (!token || !latest) return;
    setEmailingLatest(true); setEmailMsg(null);
    try {
      const res = await apiFetch('/reports/email-latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || 'Failed to send email');
      }
      const data = await res.json();
      setEmailMsg(`Report sent to ${(data as any).to}`);
    } catch (e: any) {
      setEmailMsg(`Error: ${e.message}`);
    } finally {
      setEmailingLatest(false);
    }
  }, [token, latest]);

  const handleDownload = useCallback(async (scanId: string) => {
    if (!token) return;
    setDownloadingId(scanId);
    try {
      const res = await apiFetch(`/reports/download/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `wellfie-report-${scanId.slice(0, 8)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setEmailMsg(`Download error: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  }, [token]);

  const firstName = useMemo(() => {
    const name = user?.full_name || user?.email || 'there';
    return name.split(' ')[0].split('@')[0];
  }, [user]);

  const userInitial = useMemo(() => firstName.charAt(0).toUpperCase(), [firstName]);

  const metrics = useMemo(() => [
    {
      icon: <HeartIcon />,
      label: 'PULSE',
      value: latest?.pulse_rate != null ? `${Math.round(latest.pulse_rate)}` : '--',
      unit: 'bpm',
      status: pulseStatus(latest?.pulse_rate),
    },
    {
      icon: <WaveIcon />,
      label: 'BLOOD PRESSURE',
      value: latest?.blood_pressure_systolic != null && latest?.blood_pressure_diastolic != null
        ? `${Math.round(latest.blood_pressure_systolic)}/${Math.round(latest.blood_pressure_diastolic)}`
        : '--',
      unit: 'mmHg',
      status: bpStatus(latest?.blood_pressure_systolic),
    },
    {
      icon: <WindIcon />,
      label: 'SPO2',
      value: latest?.oxygen_saturation != null ? `${Math.round(latest.oxygen_saturation)}` : '--',
      unit: '%',
      status: spo2Status(latest?.oxygen_saturation),
    },
    {
      icon: <BrainIcon />,
      label: 'STRESS LEVEL',
      value: latest?.stress_level != null ? `${Math.round(latest.stress_level)}` : '--',
      unit: '/100',
      status: stressStatus(latest?.stress_level),
    },
  ], [latest]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const TEAL = '#14b8a6';
  const TEAL_DARK = '#0f766e';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: 0, zIndex: 100,
        padding: isMobile ? '0 16px' : '0 32px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <img src={logoSrc} alt="MyWellfie" style={{ height: isMobile ? 48 : 64, width: 'auto', objectFit: 'contain', cursor: 'pointer' }} onClick={() => navigate('/')} />

          {/* Nav links — desktop */}
          {!isTablet && (
            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              {[{ label: 'Home', path: '/' }, { label: 'Dashboard', path: '/dashboard' }, { label: 'Community', path: '#' }].map(({ label, path }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 15, fontWeight: active ? 700 : 500,
                      color: active ? TEAL_DARK : '#374151',
                      borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                      paddingBottom: 4,
                      transition: 'color 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Scans remaining badge */}
            {scansRemaining !== null && scansRemaining !== undefined && (
              <span style={{
                fontSize: 12, fontWeight: 700, borderRadius: 20,
                padding: '4px 10px', whiteSpace: 'nowrap',
                ...(scansRemaining === 0
                  ? { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }
                  : { background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }),
              }}>
                {scansRemaining === 0 ? '0 scans left' : `${scansRemaining} scan${scansRemaining === 1 ? '' : 's'} left`}
              </span>
            )}
            {/* Avatar dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${TEAL}, #0ea5e9)`,
                  border: 'none', cursor: 'pointer',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                {userInitial}
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 44,
                  background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid #e2e8f0', minWidth: 180, zIndex: 200,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user?.full_name || firstName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile?next=/dashboard'); }}
                    style={{
                      width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                      textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#0f172a',
                      fontWeight: 500, fontFamily: 'inherit',
                    }}
                  >
                    Health profile
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                    style={{
                      width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                      textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#dc2626',
                      fontWeight: 600, fontFamily: 'inherit',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 32px' }}>

        {/* Welcome + CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Welcome{isWelcome ? ' to MyWellfie' : `, ${firstName}`}
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', margin: '4px 0 0' }}>Smart Scans. Health Insights.</p>
          </div>
          {scansRemaining !== 0 ? (
            // <button
            //   onClick={() => navigate('/camera')}
            //   style={{
            //     display: 'flex', alignItems: 'center', gap: 8,
            //     background: TEAL, color: '#fff', border: 'none', borderRadius: 12,
            //     padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            //     boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
            //     fontFamily: 'inherit',
            //   }}
            // >
            //   <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Start New Scan
            // </button>
            <button
              onClick={() => navigate('/camera')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: TEAL,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px 22px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              <FaceScanIcon />
              <span>Start New Scan</span>
            </button>
          ) : (
            <button
              onClick={() => { window.location.href = '/pricing#pricing'; }}
              style={{
                background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12,
                padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Buy Scan Pack
            </button>
          )}
        </div>

        {/* Welcome new-user banner */}
        {isWelcome && (
          <div style={{
            background: '#ecfeff', border: '1px solid #99f6e4', borderRadius: 14,
            padding: '14px 18px', marginBottom: 24, fontSize: 14, fontWeight: 600, color: '#0f766e',
          }}>
            Account created! Your first scan is on us — review the preparation guide below, then tap &quot;Start New Scan&quot;.
          </div>
        )}

        <ScanPrepDashboardCard
          defaultExpanded={isWelcome || (!historyLoading && history.length === 0)}
        />

        {/* ── Latest Scan Summary ─────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Latest Scan Summary</h2>
            {latest && (
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                Scanned {timeAgo(latest.scanned_at)}
              </span>
            )}
          </div>

          {historyLoading ? (
            <div style={{ color: '#94a3b8', fontSize: 14, padding: '16px 0' }}>Loading your latest scan...</div>
          ) : historyError ? (
            <div style={{ color: '#ef4444', fontSize: 14 }}>{historyError}</div>
          ) : !latest ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '20px', fontSize: 14, color: '#64748b', textAlign: 'center' }}>
              No scans yet. Hit "Start New Scan" to see your health summary here.
            </div>
          ) : (
            <>
              {/* Metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {metrics.map(({ icon, label, value, unit, status }) => (
                  <div key={label} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
                    padding: isMobile ? '14px 12px' : '18px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ background: '#f0fdfa', borderRadius: 8, padding: 6, display: 'flex' }}>{icon}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 999,
                        padding: '3px 8px',
                        color: status.color, background: status.bg,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                        {value}
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginLeft: 3 }}>{value !== '--' ? unit : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Email + download buttons
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleEmailLatest}
                  disabled={emailingLatest}
                  style={{
                    background: '#f0fdfa', color: TEAL_DARK,
                    border: `1px solid #99f6e4`, borderRadius: 9,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {emailingLatest ? 'Sending…' : '📧 Email Report'}
                </button>
                <button
                  onClick={() => handleDownload(latest.id)}
                  disabled={downloadingId === latest.id}
                  style={{
                    background: '#eff6ff', color: '#1d4ed8',
                    border: '1px solid #bfdbfe', borderRadius: 9,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {downloadingId === latest.id ? 'Downloading…' : '⬇ Download PDF'}
                </button>
              </div> */}

              {/* Email + download buttons */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'auto auto',
                        gap: 10,
                        marginTop: 4,
                      }}>
                        <button
                          onClick={handleEmailLatest}
                          disabled={emailingLatest}
                          style={{
                            background: '#f0fdfa',
                            color: TEAL_DARK,
                            border: `1px solid #99f6e4`,
                            borderRadius: 9,
                            padding: isMobile ? '12px 14px' : '8px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <span>📧</span>
                          {emailingLatest ? 'Sending…' : 'Email Report'}
                        </button>

                        <button
                          onClick={() => handleDownload(latest.id)}
                          disabled={downloadingId === latest.id}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: 9,
                            padding: isMobile ? '12px 14px' : '8px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <DownloadIcon />
                          {downloadingId === latest.id ? 'Downloading…' : 'Download PDF'}
                        </button>
                      </div>
              {emailMsg && (
                <div style={{
                  marginTop: 10, fontSize: 13, borderRadius: 8, padding: '8px 12px',
                  background: emailMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                  color: emailMsg.startsWith('Error') ? '#991b1b' : '#166534',
                  border: `1px solid ${emailMsg.startsWith('Error') ? '#fecaca' : '#bbf7d0'}`,
                }}>
                  {emailMsg}
                </div>
              )}
            </>
          )}
        </div>
              {latest && !historyLoading && localStorage.getItem('showHealthIndicators') !== 'false' && (
              <HealthIndicatorsCarousel scan={latest} isMobile={isMobile} />
            )}

        {/* ── Two-column: Vitality Trend + Recent Scans ───────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Vitality Trend */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: isMobile ? '20px 16px' : '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Vitality Trend</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>7-day progression of your average wellness score</p>
              </div>
              <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontWeight: 600 }}>Last 7 Days</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <VitalityChart data={history} />
            </div>
            {history.length === 0 && !historyLoading && (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                Complete your first scan to start tracking your wellness trend.
              </p>
            )}
          </div>

          {/* Recent Scans */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: isMobile ? '20px 16px' : '24px 28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Scans</h3>
              {history.length > 5 && (
                <button style={{ background: 'none', border: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  View All
                </button>
              )}
            </div>

            {historyLoading ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</div>
            ) : recent.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>No previous scans yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                {recent.map((scan, idx) => (
                  <li key={scan.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: idx < recent.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{shortDate(scan.scanned_at)}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{shortTime(scan.scanned_at)} · Full Scan</div>
                    </div>
                    <button
                      onClick={() => handleDownload(scan.id)}
                      disabled={downloadingId === scan.id}
                      title="Download PDF"
                      style={{
                        background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '6px 8px', cursor: 'pointer', color: '#64748b',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      {downloadingId === scan.id ? '…' : <DownloadIcon />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Download Full Report */}
            {latest && (
              <button
                onClick={() => handleDownload(latest.id)}
                disabled={downloadingId === latest.id}
                style={{
                  marginTop: 16, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: '11px 0', fontSize: 14, fontWeight: 600, color: '#0f172a',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <DownloadIcon /> Download Full Report
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#fff', borderTop: '1px solid #e2e8f0', marginTop: 16 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px' : '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <img src={logoSrc} alt="MyWellfie" style={{ height: 40, objectFit: 'contain' }} />
            <div style={{ display: 'flex', gap: isMobile ? 16 : 28, flexWrap: 'wrap' }}>
              {['Technology', 'Privacy', 'Terms', 'Support', 'Careers'].map(link => (
                <button key={link} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>© 2024 MyWellfie. Clinical Precision meets Lifestyle.</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Smart Scans. Health Insights.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;

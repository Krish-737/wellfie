import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/apiFetch';
import { useIsMobileLayout, useIsTabletLayout } from '../hooks/useLayoutBreakpoint';
import PageContainer from '../layout/PageContainer';
import logoSrc from '../assets/mywellfie-logo.png';
import LatestScanSummary from './scan/LatestScanSummary';
import NewUserHealthOverview from './dashboard/NewUserHealthOverview';
import HealthOverviewLoading from './dashboard/HealthOverviewLoading';
import RecentScansPanel from './dashboard/RecentScansPanel';
import MetricTrendsPanel from './dashboard/MetricTrendsPanel';
import InstallBanner from './InstallBanner';
import type { ScanResult } from '../content/scanIndicators';

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Inline icons ───────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, scansRemaining } = useAuth();
  const isMobile = useIsMobileLayout();
  const isTablet = useIsTabletLayout();

  const [history, setHistory] = useState<ScanResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [emailingLatest, setEmailingLatest] = useState<boolean>(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showAllRecentScans, setShowAllRecentScans] = useState(false);
  const [installVisible, setInstallVisible] = useState(false);

  const RECENT_SCANS_LIMIT = 4;

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
  const recent = showAllRecentScans
    ? history
    : history.slice(0, RECENT_SCANS_LIMIT);

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

  const handleDownloadAll = useCallback(async () => {
    if (!token || history.length === 0) return;
    setDownloadingId('all');
    setEmailMsg(null);
    try {
      for (const scan of history) {
        const res = await apiFetch(`/reports/download/${scan.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wellfie-report-${scan.id.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      setEmailMsg(`Download error: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  }, [token, history]);

  const firstName = useMemo(() => {
    const name = user?.full_name || user?.email || 'there';
    return name.split(' ')[0].split('@')[0];
  }, [user]);

  const showFullMetrics = true;

  return (
    <>
      <PageContainer>

        {/* Welcome + CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Welcome{isWelcome ? ' to MyWellfie' : `, ${firstName}`}
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', margin: '4px 0 0' }}>Smart Scans. Health Insights.</p>
          </div>
          {scansRemaining !== 0 ? (
            // Top CTA moved into WellnessHero card
            // <button
            //   onClick={() => navigate('/camera')}
            //   style={{
            //     display: 'flex',
            //     alignItems: 'center',
            //     gap: 10,
            //     background: TEAL,
            //     color: '#fff',
            //     border: 'none',
            //     borderRadius: 12,
            //     padding: '13px 22px',
            //     fontSize: 15,
            //     fontWeight: 700,
            //     cursor: 'pointer',
            //     boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
            //     fontFamily: 'inherit',
            //     transition: 'all 0.2s ease',
            //   }}
            // >
            //   <FaceScanIcon />
            //   <span>Start New Scan</span>
            // </button>
            null
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

        {/* Welcome new-user banner merged into NewUserHealthOverview */}

        {/* ── Health Overview ─────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Health Overview</h2>

          {historyLoading ? (
            <HealthOverviewLoading isMobile={isMobile} />
          ) : historyError ? (
            <div style={{ color: '#ef4444', fontSize: 14 }}>{historyError}</div>
          ) : !latest ? (
            <NewUserHealthOverview
              isMobile={isMobile}
              isWelcome={isWelcome}
              onStartScan={scansRemaining !== 0 ? () => navigate('/camera') : undefined}
              onBuyScans={() => { window.location.href = '/pricing#pricing'; }}
            />
          ) : (
            <LatestScanSummary
              scan={latest}
              scanHistory={history}
              isMobile={isMobile}
              allowExpand={showFullMetrics}
              onEmailLatest={handleEmailLatest}
              onDownload={() => handleDownload(latest.id)}
              onStartScan={scansRemaining !== 0 ? () => navigate('/camera') : undefined}
              emailingLatest={emailingLatest}
              downloading={downloadingId === latest.id}
              emailMsg={emailMsg}
            />
          )}
        </div>

        {/* ── Two-column: Vitality Trend + Recent Scans ───────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: 20, marginBottom: 24, minWidth: 0 }}>

          <div style={{ minWidth: 0, maxWidth: '100%' }}>
          <MetricTrendsPanel
            scans={history}
            loading={historyLoading}
            isMobile={isMobile}
          />
          </div>

          {/* Recent Scans column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <RecentScansPanel
              scans={recent}
              totalCount={history.length}
              loading={historyLoading}
              downloadingId={downloadingId}
              onDownloadScan={handleDownload}
              onDownloadAll={handleDownloadAll}
              onViewAll={
                history.length > RECENT_SCANS_LIMIT && !showAllRecentScans
                  ? () => setShowAllRecentScans(true)
                  : undefined
              }
            />

            {history.length >= 2 && (
              <button
                onClick={() => navigate('/diff')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  background: 'linear-gradient(135deg,#0f766e,#0d9488)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '14px 20px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(15,118,110,0.28)',
                }}
              >
                📊 Compare Scans — AI Health Consultation
              </button>
            )}
          </div>
        </div>

      </PageContainer>

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
              <button
                onClick={() => setInstallVisible(true)}
                style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
              >
                + Install App
              </button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>© 2024 MyWellfie. Clinical Precision meets Lifestyle.</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Smart Scans. Health Insights.</span>
          </div>
        </div>
      </footer>
      <InstallBanner visible={installVisible} onClose={() => setInstallVisible(false)} />
    </>
  );
};

export default DashboardPage;

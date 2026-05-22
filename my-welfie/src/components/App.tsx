import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import UAParser from 'ua-parser-js';

import BiosenseSignalMonitor from './BiosenseSignalMonitor';
import SettingsBars from './SettingsBars';
import { Flex } from './shared/Flex';
import { useCameras, useDisableZoom } from '../hooks';
import LandingPage from './LandingPage/LandingPage';
import LandingPage_v2 from './LandingPage_v2/LandingPage_v2';
import AuthPage from './Auth/AuthPage';
import OAuthCallbackPage from './Auth/OAuthCallbackPage';
import DashboardPage from './DashboardPage';
import HealthProfilePage from './HealthProfile/HealthProfilePage';
import PrepareScanPage from './ScanPrep/PrepareScanPage';
import HealthIndicatorsPage from './HealthIndicatorsPage';
import { PaymentSuccess, PaymentCancelled } from './PaymentResult';
import { AuthProvider, useAuth } from '../context/AuthContext';

// ── Styles ────────────────────────────────────────────────────────────────────

const Container = styled(Flex)<{ isSettingsOpen: boolean }>`
  height: 100%;
  width: 100%;
  position: relative;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  background-color: ${({ isSettingsOpen }) =>
    isSettingsOpen ? 'rgba(0, 0, 0, 0.5)' : '#ffffff'};
`;

const LoadingScreen: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontSize: 16,
  }}>
    Loading…
  </div>
);

// ── Protected route wrapper ───────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

// ── Requires completed health profile (for camera / accurate risk scores) ─────

const ProfileRequiredRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user?.profile_complete) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/profile?next=${next}`} replace />;
  }

  return <>{children}</>;
};

// ── Requires at least one scan entitlement ────────────────────────────────────

const NoScansScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#fff7ed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28,
        }}>
          📷
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
          No scans remaining
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px', lineHeight: 1.5 }}>
          Purchase a scan pack to continue, or return to your dashboard to review past results.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={() => { window.location.href = '/pricing#pricing'; }}
            style={{
              width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
              background: '#14b8a6', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Buy Scan Pack
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            style={{
              width: '100%', padding: '14px 20px', border: '1.5px solid #e2e8f0',
              borderRadius: 12, background: '#fff', color: '#0f172a', fontSize: 15,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const ScansRequiredRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, scansRemaining, refreshEntitlement } = useAuth();
  const [entitlementReady, setEntitlementReady] = useState(false);

  useEffect(() => {
    let active = true;
    refreshEntitlement().finally(() => {
      if (active) setEntitlementReady(true);
    });
    return () => { active = false; };
  }, [refreshEntitlement]);

  if (isLoading || !entitlementReady) {
    return <LoadingScreen />;
  }

  if (scansRemaining === 0) {
    return <NoScansScreen />;
  }

  return <>{children}</>;
};

// ── Landing route — redirects logged-in users straight to dashboard ───────────

const LandingRoute: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

// ── Camera app (existing logic, unchanged) ────────────────────────────────────

const CameraApp = () => {
  const cameras = useCameras();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cameraId, setCameraId] = useState<string>();
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [isMobile] = useState(
    UAParser(navigator.userAgent).device.type === 'mobile',
  );
  useDisableZoom();

  const onSettingsClickedHandler = useCallback((event) => {
    const settingsBars = document.getElementById('settingsBars');
    const isSettingsButtonClicked = event.target.id === 'settingsButton';

    const isInsideSettingsClicked =
      settingsBars.contains(event.target as Node) || isSettingsButtonClicked;

    if (!isInsideSettingsClicked) {
      setIsSettingsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', onSettingsClickedHandler);
    return () => {
      document.removeEventListener('click', onSettingsClickedHandler);
    };
  }, []);

  const updateLicenseStatus = useCallback((valid) => {
    setIsLicenseValid(valid);
  }, []);

  const toggleSettingsClick = useCallback(() => {
    setIsSettingsOpen(!isSettingsOpen);
  }, [isSettingsOpen]);

  const handleCloseSettings = useCallback(({ cameraId }) => {
    setCameraId(cameraId);
    setIsSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (!cameras?.length) return;
    setCameraId(cameras[0].deviceId);
  }, [cameras]);

  return (
    <Container isSettingsOpen={isSettingsOpen}>
      <BiosenseSignalMonitor
        showMonitor={!(isMobile && isSettingsOpen)}
        cameraId={cameraId}
        onLicenseStatus={updateLicenseStatus}
        onSettingsClick={toggleSettingsClick}
        isSettingsOpen={isSettingsOpen}
      />
      <SettingsBars
        open={isSettingsOpen}
        onClose={handleCloseSettings}
        cameras={cameras}
        isLicenseValid={isLicenseValid}
      />
    </Container>
  );
};

// ── Root app ──────────────────────────────────────────────────────────────────

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingRoute />} />
    <Route path="/pricing" element={<LandingPage />} />
    <Route path="/v2" element={<LandingPage_v2 />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/auth/callback" element={<OAuthCallbackPage />} />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <HealthProfilePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    {/* <Route
      path="/health-indicators"
      element={
        <ProtectedRoute>
          <HealthIndicatorsPage />
        </ProtectedRoute>
      }
    /> */}
    <Route
      path="/prepare-scan"
      element={
        <ProtectedRoute>
          <PrepareScanPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/camera"
      element={
        <ProtectedRoute>
          <ProfileRequiredRoute>
            <ScansRequiredRoute>
              <CameraApp />
            </ScansRequiredRoute>
          </ProfileRequiredRoute>
        </ProtectedRoute>
      }
    />
    <Route path="/payment-success" element={<PaymentSuccess />} />
    <Route path="/payment-cancelled" element={<PaymentCancelled />} />
    {/* Catch-all → landing page */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;

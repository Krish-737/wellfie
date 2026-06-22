import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  isMobile, isTablet, SessionState, SmokingStatus, UserInformation,
} from '@biosensesignal/web-sdk';
import {
  useCameras,
  useDisableZoom,
  useLicenseKey,
  useMeasurementDuration,
  usePageVisibility,
  usePrevious,
  useResolvedScanAlert,
} from '../../hooks';
import { AlertActionType } from '../../alerts/alertTypes';
import {
  createDirectCheckout,
  getKioskSession,
  updateKioskProfile,
  saveKioskScan,
  sendKioskReport,
} from '../../api/kioskApi';
import useKioskMonitor from '../../hooks/useKioskMonitor';
import Mask from '../../assets/mask.svg';
import { mirror } from '../../style/mirror';
import Timer from '../../components/Timer';
import Stats from '../../components/Stats';
import StartButton from '../../components/StartButton';
import { InfoAlert } from '../../components/alert';
import ScanWarningToast from '../../components/scan-alerts/ScanWarningToast';
import ScanErrorPanel from '../../components/scan-alerts/ScanErrorPanel';
import { ArrowRight, Mail, CheckCircle, RefreshCw, AlertTriangle, Activity } from 'lucide-react';

type FlowStage = 'init' | 'creating_checkout' | 'checking_payment' | 'payment_failed' | 'profile' | 'profile_saving' | 'scanning' | 'saving' | 'sending' | 'success';

const SPIN_STYLE = `@keyframes spin{to{transform:rotate(360deg)}}`;

// ── Responsive styled components ──────────────────────────────────────────────

const PageContainer = styled.div`
  width: 100%;
  min-height: 100dvh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Hanken Grotesk', 'Segoe UI', sans-serif;
`;

const ContentCard = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 20px;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 48px 32px;
    max-width: 560px;
  }
`;

const Card = styled.div`
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  padding: 32px 24px;
  border: 1px solid #e2e8f0;

  @media (min-width: 768px) {
    padding: 40px 32px;
  }
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0 0 24px;
  line-height: 1.5;
`;

const PrimaryButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: ${p => p.disabled ? '#94a3b8' : '#0f766e'};
  border: none;
  border-radius: 14px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  font-family: inherit;
  box-shadow: ${p => p.disabled ? 'none' : '0 4px 12px rgba(15, 118, 110, 0.15)'};

  &:hover:not(:disabled) {
    background: #14b8a6;
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const GhostButton = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 14px;
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid ${p => p.hasError ? '#fca5a5' : 'transparent'};
  border-radius: 12px;
  outline: none;
  background: ${p => p.hasError ? '#fffafa' : '#f1f5f9'};
  color: #0f172a;
  font-family: inherit;
  transition: all 0.2s;

  &:focus {
    border-color: ${p => p.hasError ? '#fca5a5' : '#0f766e'};
    box-shadow: ${p => p.hasError ? 'none' : '0 0 0 4px rgba(15,118,110,0.12)'};
    background: ${p => p.hasError ? '#fffafa' : '#fff'};
  }
`;

const SectionLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 8px;
`;

const ErrorText = styled.p`
  font-size: 12px;
  color: #dc2626;
  margin: 6px 0 0;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 14px 40px 14px 14px;
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid transparent;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  color: #0f172a;
  font-family: inherit;
  background: #f1f5f9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center;
  cursor: pointer;
  appearance: none;

  &:focus {
    border-color: #0f766e;
    background-color: #fff;
  }
`;

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 0;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const CountdownText = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin-top: 24px;
  font-weight: 500;
`;

// ── Scan layout (matching BiosenseSignalMonitor) ──────────────────────────────

const MonitorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: start;
  align-items: center;
  flex: 1;
`;

const MeasurementContentWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
`;

const ProgressBarWrap = styled.div`
  padding-bottom: 12px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ScanMainContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  overflow: hidden;

  @media (min-width: 768px) {
    width: 640px;
  }
  @media (min-width: 1280px) {
    width: 800px;
  }
`;

const VideoAndStatsWrap = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  overflow: hidden;
`;

const VideoWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
`;

const BlurOverlay = styled.div<{ $desktop: boolean }>`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
  backdrop-filter: blur(10px) brightness(0.55);
  -webkit-backdrop-filter: blur(10px) brightness(0.55);
  background-color: rgba(24,25,30,0.2);
  mask-image: url(${Mask});
  mask-size: ${p => p.$desktop ? 'contain' : 'cover'};
  mask-position: center; mask-repeat: no-repeat;
  -webkit-mask-image: url(${Mask});
  -webkit-mask-size: ${p => p.$desktop ? 'contain' : 'cover'};
  -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;
  mask-composite: exclude; -webkit-mask-composite: xor; pointer-events: none;
`;

const ScanVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  ${mirror};
`;

const ScanCameraHint = styled.p`
  position: absolute; top: 12px; left: 16px; right: 16px; z-index: 15;
  margin: 0; padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.88); font-size: 12px; color: #64748b;
  text-align: center; pointer-events: none;
`;

const CameraLoadingOverlay = styled.div`
  position: absolute; inset: 0; z-index: 20;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px;
  background: #f1f5f9; border-radius: 12px;

  .cs {
    width: 40px; height: 40px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #14b8a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
`;

const CameraLoadingMessage = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  font-family: inherit;
`;

const ControlPanel = styled.div`
  width: 100%;
  background: #ffffff;
  padding: 16px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

// ── Main Component ───────────────────────────────────────────────────────────

export default function KioskNewFlowPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('session_id');
  const cancelledParam = searchParams.get('cancelled');
  const actionParam = searchParams.get('action');

  // ── Flow state ──────────────────────────────────────────────────────────
  const [stage, setStage] = useState<FlowStage>('init');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileDataRef = useRef<any>(null);

  // ── Profile form state ────────────────────────────────────────────────
  const [guestName, setGuestName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [smoking, setSmoking] = useState('unspecified');

  // ── Scan state ─────────────────────────────────────────────────────────
  const { cameras, ready: camerasReady, refresh: refreshCameras } = useCameras();
  const [cameraId, setCameraId] = useState<string | undefined>();
  const [videoReady, setVideoReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startMeasuring, setStartMeasuring] = useState(false);
  const [isMeasurementEnabled, setIsMeasurementEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const scanErrorRef = useRef<boolean>(false);
  const [processingTime] = useMeasurementDuration();
  const [licenseKey] = useLicenseKey();
  const isPageVisible = usePageVisibility();
  const mobileView = useMemo(() => isMobile(), []);
  const isDesktop = useMemo(() => !isTablet() && !isMobile(), []);
  useDisableZoom();

  // ── SDK UserInformation from optional profile data ──────────────────────
  const sdkUserInformation = useMemo<UserInformation | undefined>(() => {
    const pd = profileDataRef.current;
    if (!pd) return undefined;
    const info: any = {};
    if (pd.date_of_birth) {
      const parsed = new Date(pd.date_of_birth);
      if (!isNaN(parsed.getTime())) {
        const age = Math.floor((Date.now() - parsed.getTime()) / (365.25 * 86400000));
        if (age >= 18 && age <= 110) info.age = age;
      }
    }
    if (pd.height_cm && pd.height_cm >= 130 && pd.height_cm <= 230) info.height = pd.height_cm;
    if (pd.weight_kg && pd.weight_kg >= 40 && pd.weight_kg <= 200) info.weight = pd.weight_kg;
    if (pd.smoking_status) {
      if (pd.smoking_status === 'smoker') info.smoking = SmokingStatus.SMOKER;
      else if (pd.smoking_status === 'non_smoker') info.smoking = SmokingStatus.NON_SMOKER;
      else info.smoking = SmokingStatus.UNSPECIFIED;
    }
    return Object.keys(info).length ? info as UserInformation : undefined;
  }, []);

  // ── Scan completion handler (must be defined BEFORE useKioskMonitor) ─────
  const handleScanComplete = useCallback((vitalSignsResults: any) => {
    if (savedRef.current || !sessionId) return;

    // Don't save if there's an active camera/scan error
    if (scanErrorRef.current) {
      console.log('[KioskFlow] Blocking save due to active scan error');
      return;
    }

    const vitals = vitalSignsResults?.results ?? vitalSignsResults;
    // Don't save if no meaningful data was collected
    if (!vitals || Object.keys(vitals).length === 0) {
      console.log('[KioskFlow] Blocking save — no vital sign data');
      return;
    }

    savedRef.current = true;
    setSaving(true);
    setStage('saving');

    saveKioskScan(sessionId, vitals, {
      scan_platform: 'kiosk',
      measurement_duration_sec: processingTime,
    })
      .then(async () => {
        const sendEmail = email || profileDataRef.current?.email;
        if (sendEmail) {
          try {
            await sendKioskReport(sessionId, sendEmail);
          } catch {
            // Email failure is non-critical — still show success
          }
        }
        setStage('success');
        startCountdown();
      })
      .catch((e) => {
        savedRef.current = false;
        setSaving(false);
        setStage('scanning');
        setErrorMsg('Failed to save scan results. Please try again.');
      });
  }, [sessionId, processingTime, email]);

  // ── Kiosk Monitor Hook ─────────────────────────────────────────────────
  const {
    sessionState, vitalSigns, finalReport,
    error, warning, info, scanInterrupted, clearScanAlert, retrySession,
  } = useKioskMonitor({
    video, cameraId, processingTime, licenseKey,
    startMeasuring,
    shouldInitCamera: stage === 'scanning' && !saving,
    onScanComplete: handleScanComplete,
    userInformation: sdkUserInformation,
  });

  const prevSessionState = usePrevious(sessionState);
  const { scanError, scanWarning, clearScanWarning } = useResolvedScanAlert(error, warning);

  // Track active errors in a ref so handleScanComplete can check it
  useEffect(() => { scanErrorRef.current = error?.code != null && error.code !== -1; }, [error]);

  // ── Camera selection ──────────────────────────────────────────────────
  useEffect(() => {
    const validCameras = cameras?.filter(c => c.deviceId);
    if (!validCameras?.length) return;
    setCameraId(prev => prev ?? validCameras[0].deviceId);
  }, [cameras]);

  // ── Session state effects ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionState === SessionState.MEASURING) {
      setIsLoading(false);
      setIsMeasurementEnabled(!scanError);
      if (!isPageVisible) setStartMeasuring(false);
    } else if (
      (sessionState === SessionState.ACTIVE || sessionState === SessionState.TERMINATED) && scanError
    ) {
      setIsMeasurementEnabled(false);
    }
    if (sessionState === SessionState.ACTIVE && prevSessionState !== sessionState) {
      setStartMeasuring(false);
      setIsLoading(false);
    }
  }, [scanError, sessionState, isPageVisible, prevSessionState]);

  // ── Derived scan states ────────────────────────────────────────────────
  const isPreparingScanner = sessionState === undefined && !scanError && stage === 'scanning';
  const isInitialisingCamera = !videoReady && Boolean(licenseKey)
    && (camerasReady && !cameraId && !scanError)
    && sessionState !== SessionState.ACTIVE;
  const cameraLoading = (isPreparingScanner || isInitialisingCamera) && !scanError;
  const canMeasure = !cameraLoading && sessionState === SessionState.ACTIVE
    && Boolean(cameraId) && !scanError;

  const handleButtonClick = useCallback(() => {
    if (!canMeasure) return;
    setIsLoading(true);
    setStartMeasuring(true);
  }, [canMeasure]);

  const handleAlertAction = useCallback((type: AlertActionType) => {
    if (type === 'retry') {
      clearScanAlert();
      setStartMeasuring(false);
      setIsLoading(false);
      refreshCameras?.().then(() => retrySession());
    } else if (type === 'dismiss') {
      clearScanWarning();
    }
  }, [clearScanAlert, clearScanWarning, refreshCameras, retrySession]);

  const handleRetryScan = useCallback(() => {
    setStartMeasuring(false);
    savedRef.current = false;
    clearScanAlert();
    retrySession();
  }, [clearScanAlert, retrySession]);

  // ── Countdown for success redirect ─────────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/kiosk', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [navigate]);

  // ── URL param handling ────────────────────────────────────────────────
  const handleCreateCheckout = useCallback(async () => {
    setStage('creating_checkout');
    try {
      const result = await createDirectCheckout();
      setSessionId(result.session_id);
      window.location.href = result.checkout_url;
    } catch (e: any) {
      setStage('payment_failed');
      setErrorMsg(e?.detail || 'Failed to create checkout. Please try again.');
    }
  }, []);

  const startPolling = useCallback((sid: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const s = await getKioskSession(sid);
        if (s.status === 'paid') {
          clearInterval(pollRef.current!);
          setEmail(s.email || '');
          setStage('profile');
        } else if (attempts >= maxAttempts || s.is_expired) {
          clearInterval(pollRef.current!);
          setStage('payment_failed');
          setErrorMsg('Payment confirmation timed out. Please try again.');
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(pollRef.current!);
          setStage('payment_failed');
          setErrorMsg('Unable to verify payment. Please try again.');
        }
      }
    }, 2000);
  }, []);

  const pollPaymentStatus = useCallback((sid: string) => {
    getKioskSession(sid).then(s => {
      if (s.status === 'paid') {
        setEmail(s.email || '');
        setStage('profile');
      } else if (s.is_expired) {
        setStage('payment_failed');
        setErrorMsg('Session has expired. Please start again.');
      } else {
        startPolling(sid);
      }
    }).catch(() => {
      startPolling(sid);
    });
  }, [startPolling]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    handleCreateCheckout();
  }, [handleCreateCheckout]);

  // ── Initial setup from URL params ─────────────────────────────────────
  useEffect(() => {
    if (actionParam === 'start') {
      handleCreateCheckout();
    } else if (sessionIdParam) {
      setSessionId(sessionIdParam);
      if (cancelledParam === 'true') {
        setStage('payment_failed');
        setErrorMsg('Payment was cancelled. Please try again.');
      } else {
        setStage('checking_payment');
        pollPaymentStatus(sessionIdParam);
      }
    } else {
      navigate('/kiosk', { replace: true });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Profile form submit ────────────────────────────────────────────────
  const handleProfileSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!profileEmail.trim()) {
      setProfileError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileEmail.trim())) {
      setProfileError('Please enter a valid email address');
      return;
    }

    if (!sessionId) return;
    setStage('profile_saving');
    try {
      const profileData: any = { email: profileEmail.trim() };
      if (guestName.trim()) profileData.guest_name = guestName.trim();
      if (dob) profileData.date_of_birth = dob;
      if (heightCm) profileData.height_cm = parseFloat(heightCm);
      if (weightKg) profileData.weight_kg = parseFloat(weightKg);
      if (smoking !== 'unspecified') profileData.smoking_status = smoking;
      profileDataRef.current = profileData;

      await updateKioskProfile(sessionId, profileData);
      setEmail(profileEmail.trim());
      setStage('scanning');
    } catch (e: any) {
      setProfileError(e?.detail || 'Failed to save profile');
      setStage('profile');
    }
  }, [sessionId, profileEmail, guestName, dob, heightCm, weightKg, smoking]);

  const handleSkipProfile = useCallback(async () => {
    if (!sessionId) return;
    setStage('scanning');
  }, [sessionId]);

  // ── Render by stage ─────────────────────────────────────────────────
  // Payment failed
  if (stage === 'payment_failed') {
    return (
      <PageContainer>
        <ContentCard>
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <AlertTriangle size={32} color="#ea580c" strokeWidth={2} />
              </div>
              <Title>Payment Issue</Title>
              <Subtitle>{errorMsg || 'Something went wrong with your payment.'}</Subtitle>
              <PrimaryButton onClick={handleRetry}>
                <RefreshCw size={18} />
                Try Again
              </PrimaryButton>
              <GhostButton onClick={() => navigate('/kiosk', { replace: true })}>
                Back to Home
              </GhostButton>
            </div>
          </Card>
        </ContentCard>
      </PageContainer>
    );
  }

  // Creating checkout / Checking payment
  if (stage === 'creating_checkout' || stage === 'checking_payment') {
    return (
      <PageContainer>
        <ContentCard>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="cs" style={{
              width: 48, height: 48,
              border: '4px solid #e2e8f0',
              borderTopColor: '#14b8a6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px',
            }} />
            <Title style={{ fontSize: 22 }}>
              {stage === 'creating_checkout' ? 'Redirecting to Secure Checkout...' : 'Verifying Payment...'}
            </Title>
            <Subtitle>
              {stage === 'creating_checkout'
                ? 'Please wait while we prepare your payment.'
                : 'Please wait while we confirm your payment.'}
            </Subtitle>
          </div>
        </ContentCard>
        <style>{SPIN_STYLE}</style>
      </PageContainer>
    );
  }

  // Profile form
  if (stage === 'profile' || stage === 'profile_saving') {
    return (
      <PageContainer>
        <ContentCard>
          <Card>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Activity size={28} color="#0f766e" strokeWidth={2.2} />
            </div>
            <Title>Health Profile</Title>
            <Subtitle>
              Tell us a bit about yourself so we can personalise your scan results.
              <strong> Email is required</strong> to receive your report.
            </Subtitle>

            <form onSubmit={handleProfileSubmit} noValidate>
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Email address *</SectionLabel>
                <Input
                  type="email"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  placeholder="you@example.com"
                  hasError={!!profileError}
                />
                {profileError && <ErrorText>{profileError}</ErrorText>}
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 6 }}>
                  We'll send your full report here after the scan
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Your name (optional)</SectionLabel>
                <Input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="e.g. Alex"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Date of birth (optional)</SectionLabel>
                <Input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 110)).toISOString().slice(0, 10)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Body measurements (optional)</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      placeholder="Height (cm)"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      placeholder="Weight (kg)"
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Smoking status (optional)</SectionLabel>
                <Select value={smoking} onChange={e => setSmoking(e.target.value)}>
                  <option value="unspecified">Prefer not to say</option>
                  <option value="non_smoker">Never / non-smoker</option>
                  <option value="smoker">Current smoker</option>
                </Select>
              </div>

              <PrimaryButton type="submit" disabled={stage === 'profile_saving'}>
                {stage === 'profile_saving' ? 'Saving...' : 'Continue to Scan'}
                {stage !== 'profile_saving' && <ArrowRight size={18} />}
              </PrimaryButton>

              <GhostButton type="button" onClick={handleSkipProfile} disabled={stage === 'profile_saving'}>
                Skip — go straight to scan (no email report)
              </GhostButton>
            </form>
          </Card>
        </ContentCard>
      </PageContainer>
    );
  }

  // Saving / Sending
  if (stage === 'saving' || stage === 'sending') {
    return (
      <PageContainer>
        <ContentCard>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="cs" style={{
              width: 48, height: 48,
              border: '4px solid #e2e8f0',
              borderTopColor: '#14b8a6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px',
            }} />
            <Title style={{ fontSize: 22 }}>
              Sending your report...
            </Title>
            <Subtitle>Please wait a moment.</Subtitle>
          </div>
        </ContentCard>
        <style>{SPIN_STYLE}</style>
      </PageContainer>
    );
  }

  // Scanning
  if (stage === 'scanning') {
    const measuring = sessionState === SessionState.MEASURING;
    const showCameraLoading = isPreparingScanner || isInitialisingCamera;
    const showTopHint = !measuring && !finalReport && !scanError && !showCameraLoading;
    const cameraLoadingMsg = isPreparingScanner
      ? 'Preparing scanner…'
      : 'Initialising camera…';

    return (
      <PageContainer style={{ background: '#000', height: '100dvh', overflow: 'hidden', minHeight: 0, minWidth: '100vw', alignItems: 'stretch' }}>
        <style>{SPIN_STYLE}</style>
        <MonitorWrapper>
          <MeasurementContentWrapper>
            <ScanMainContent>
              {measuring && (
                <ProgressBarWrap>
                  <Timer started durationSeconds={processingTime} />
                </ProgressBarWrap>
              )}
              <VideoAndStatsWrap>
                <VideoWrap>
                  <BlurOverlay $desktop={isDesktop} />
                  <ScanVideo
                    ref={video}
                    id="video"
                    muted
                    playsInline
                    onCanPlay={() => setVideoReady(true)}
                    onPlaying={() => setVideoReady(true)}
                  />
                  {showCameraLoading && (
                    <CameraLoadingOverlay>
                      <div className="cs" />
                      <CameraLoadingMessage>{cameraLoadingMsg}</CameraLoadingMessage>
                    </CameraLoadingOverlay>
                  )}
                </VideoWrap>
                {showTopHint && (
                  <ScanCameraHint>
                    Stay still and ensure your face is within the guide for clinical precision.
                  </ScanCameraHint>
                )}
                {!scanError && isMeasurementEnabled && <Stats vitalSigns={vitalSigns} />}
                {measuring && scanWarning && (
                  <ScanWarningToast
                    alert={scanWarning}
                    onAction={(type) => handleAlertAction(type)}
                  />
                )}
                {measuring && <InfoAlert message={info?.message} />}
              </VideoAndStatsWrap>

              <ControlPanel>
                {scanInterrupted ? (
                  <div style={{ width: '100%', maxWidth: 440, textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Scan Interrupted</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                      Please ensure your face is centered and well-lit, then try again.
                    </p>
                    <PrimaryButton onClick={handleRetryScan}>
                      <RefreshCw size={18} />
                      Try Again
                    </PrimaryButton>
                  </div>
                ) : saving ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div className="cs" style={{
                      width: 44, height: 44,
                      border: '4px solid #e2e8f0',
                      borderTopColor: '#14b8a6',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 16px',
                    }} />
                    <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>Sending your report…</p>
                  </div>
                ) : scanError ? (
                  <ScanErrorPanel
                    alert={scanError}
                    onAction={(type) => handleAlertAction(type)}
                  />
                ) : measuring ? null : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
                    <StartButton
                      isLoading={isLoading}
                      isMeasuring={false}
                      disabled={!canMeasure}
                      onClick={handleButtonClick}
                    />
                  </div>
                )}
              </ControlPanel>
            </ScanMainContent>
          </MeasurementContentWrapper>
        </MonitorWrapper>
      </PageContainer>
    );
  }

  // Success
  if (stage === 'success') {
    return (
      <PageContainer>
        <ContentCard>
          <Card>
            <SuccessContainer>
              <SuccessIcon>
                <CheckCircle size={40} color="#16a34a" strokeWidth={2.5} />
              </SuccessIcon>
              <Title>Scan Complete!</Title>
              <Subtitle>
                Your comprehensive health report has been sent to{' '}
                <strong style={{ color: '#0f766e' }}>{email || profileDataRef.current?.email || 'your email'}</strong>.
              </Subtitle>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '16px 20px',
                margin: '16px 0 8px',
                width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={20} color="#16a34a" strokeWidth={2} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#166534' }}>
                    Report sent successfully
                  </p>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#15803d' }}>
                  Please check your inbox (and spam folder) for the full PDF report with all 34+ health metrics and AI insights.
                </p>
              </div>
              <CountdownText>
                Returning to home page in {countdown} seconds...
              </CountdownText>
            </SuccessContainer>
          </Card>
        </ContentCard>
      </PageContainer>
    );
  }

  // Init / fallback
  return (
    <PageContainer>
      <ContentCard>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="cs" style={{
            width: 40, height: 40,
            border: '3px solid #e2e8f0',
            borderTopColor: '#14b8a6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b', fontSize: 15, fontWeight: 600 }}>Loading...</p>
        </div>
        <style>{SPIN_STYLE}</style>
      </ContentCard>
    </PageContainer>
  );
}

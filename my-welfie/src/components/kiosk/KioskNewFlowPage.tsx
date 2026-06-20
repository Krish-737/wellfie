import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  isMobile, SessionState, UserInformation,
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
import { ArrowRight, Mail, CheckCircle, RefreshCw, AlertTriangle, Camera, Activity } from 'lucide-react';

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

// ── Full-Screen Scan Layout ──────────────────────────────────────────────────

const FullScreenContainer = styled.div`
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #000;
  font-family: 'Hanken Grotesk', 'Segoe UI', sans-serif;
`;

const ScanContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  position: relative;
  overflow: hidden;
`;

const VideoWrapper = styled.div`
  flex: 1;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 1024px) {
    max-width: 640px;
    border-radius: 12px;
    margin: 16px auto 0;
  }
`;

const BlurOverlay = styled.div<{ maskUrl: string }>`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
  backdrop-filter: blur(10px) brightness(0.55);
  -webkit-backdrop-filter: blur(10px) brightness(0.55);
  background-color: rgba(24,25,30,0.2);
  mask-image: url(${p => p.maskUrl});
  mask-size: cover; mask-position: center; mask-repeat: no-repeat;
  -webkit-mask-image: url(${p => p.maskUrl});
  -webkit-mask-size: cover;
  -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;
  mask-composite: exclude; -webkit-mask-composite: xor; pointer-events: none;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
`;

const CameraHint = styled.p`
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
  padding: 20px; text-align: center;

  .cs {
    width: 40px; height: 40px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #14b8a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @media (min-width: 768px) {
    .cs { width: 48px; height: 48px; border-width: 4px; }
  }
`;

const MeasureButton = styled.button<{ measuring?: boolean }>`
  width: 100%;
  max-width: 320px;
  padding: 18px 0;
  border-radius: 100px;
  border: none;
  font-size: 17px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  ${p => p.measuring ? `
    background: #fef2f2;
    color: #dc2626;
    &:hover { background: #fee2e2; }
  ` : `
    background: #0f766e;
    color: #fff;
    box-shadow: 0 4px 16px rgba(15,118,110,0.3);
    &:hover:not(:disabled) {
      background: #14b8a6;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(15,118,110,0.4);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  overflow-x: auto;
  padding: 8px 0;

  @media (min-width: 768px) {
    justify-content: center;
  }
`;

const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 20px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  flex-shrink: 0;

  .value {
    color: #0f172a;
    font-weight: 800;
  }
`;

const ErrorCard = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  max-width: 400px;
  width: 100%;
`;

const BottomPanel = styled.div`
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  z-index: 5;

  @media (min-width: 1024px) {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px 32px 40px;
  }
`;

const ScanStepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 360px;
`;

const ScanStepRow = styled.div<{ done?: boolean; current?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 13px;
  font-weight: ${p => p.current ? 700 : 500};
  color: ${p => p.done ? '#16a34a' : p.current ? '#0f172a' : '#94a3b8'};
  opacity: ${p => p.done || p.current ? 1 : 0.5};
  transition: all 0.3s;
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
  const [loadingTimeout, setLoadingTimeout] = useState<number>();

  const [processingTime] = useMeasurementDuration();
  const [licenseKey] = useLicenseKey();
  const isPageVisible = usePageVisibility();
  const mobileView = useMemo(() => isMobile(), []);
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
    return Object.keys(info).length ? info as UserInformation : undefined;
  }, []);

  // ── Scan completion handler (must be defined BEFORE useKioskMonitor) ─────
  const handleScanComplete = useCallback((vitalSignsResults: any) => {
    if (savedRef.current || !sessionId) return;
    savedRef.current = true;
    setSaving(true);
    setStage('saving');

    const vitals = vitalSignsResults?.results ?? vitalSignsResults;

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
    if (sessionState === SessionState.MEASURING) {
      clearTimeout(loadingTimeout);
      setStartMeasuring(false);
      setIsLoading(false);
      return;
    }
    if (!canMeasure) return;
    setIsLoading(true);
    setStartMeasuring(true);
    const timer = window.setTimeout(() => setIsLoading(true), processingTime * 1000);
    setLoadingTimeout(timer);
  }, [canMeasure, processingTime, sessionState, loadingTimeout]);

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
      profileDataRef.current = profileData;

      await updateKioskProfile(sessionId, profileData);
      setEmail(profileEmail.trim());
      setStage('scanning');
    } catch (e: any) {
      setProfileError(e?.detail || 'Failed to save profile');
      setStage('profile');
    }
  }, [sessionId, profileEmail, guestName, dob, heightCm, weightKg]);

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
    // ── Scan step messages ──────────────────────────────────────────────
    const scanSteps = [
      { key: 'pulseRate', icon: '❤️', label: 'Measuring Heart Rate' },
      { key: 'hrvSdnn', icon: '📊', label: 'Analyzing Heart Rate Variability' },
      { key: 'bloodPressure', icon: '🩸', label: 'Measuring Blood Pressure' },
      { key: 'spo2', icon: '🫁', label: 'Measuring Blood Oxygen' },
      { key: 'stress', icon: '🧠', label: 'Analyzing Stress Levels' },
      { key: 'respirationRate', icon: '🌬️', label: 'Measuring Respiration' },
      { key: 'hemoglobin', icon: '🔬', label: 'Analyzing Hemoglobin' },
      { key: 'wellnessIndex', icon: '⭐', label: 'Calculating Wellness Score' },
    ];

    const completedStepCount = scanSteps.filter(s => (vitalSigns as any)?.[s.key]?.value != null).length;

    const renderScanSteps = () => (
      <ScanStepList>
        {scanSteps.map((step, idx) => {
          const done = (vitalSigns as any)?.[step.key]?.value != null;
          const current = idx === completedStepCount && !done && completedStepCount < scanSteps.length;
          if (idx > completedStepCount && !current) return null;
          return (
            <ScanStepRow key={step.key} done={done} current={current}>
              {done ? '✅' : current ? '⏳' : '○'}
              <span>{step.label}</span>
            </ScanStepRow>
          );
        })}
      </ScanStepList>
    );

    return (
      <FullScreenContainer>
        <style>{SPIN_STYLE}</style>

        {scanInterrupted ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <ErrorCard>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Scan Interrupted</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                Please ensure your face is centered and well-lit, then try again.
              </p>
              <PrimaryButton onClick={handleRetryScan}>
                <RefreshCw size={18} />
                Try Again
              </PrimaryButton>
            </ErrorCard>
          </div>
        ) : saving ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
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
          </div>
        ) : (
          <>
            <ScanContentArea>
              {info?.message && (
                <div style={{
                  position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: 'rgba(220,38,38,0.85)', backdropFilter: 'blur(6px)',
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {info.message}
                  </span>
                </div>
              )}
              {!scanError && sessionState === SessionState.MEASURING && !info?.message && (
                <div style={{
                  position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                  borderRadius: 10,
                }}>
                  <span className="cs" style={{
                    width: 16, height: 16, flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#3aee6e',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    Scan in progress — hold still
                  </span>
                </div>
              )}
              <VideoWrapper>
                <StyledVideo
                  ref={video}
                  id="video"
                  muted
                  playsInline
                  onCanPlay={() => setVideoReady(true)}
                  onPlaying={() => setVideoReady(true)}
                />
                {!scanError && <BlurOverlay maskUrl={Mask} />}
                {cameraLoading && (
                  <CameraLoadingOverlay>
                    <div className="cs" />
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#475569' }}>
                      {isPreparingScanner ? 'Preparing scanner...' : 'Initialising camera...'}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
                      Please stay still and ensure good lighting
                    </p>
                  </CameraLoadingOverlay>
                )}
                {!scanError && !cameraLoading && sessionState === SessionState.ACTIVE && (
                  <CameraHint>
                    Stay still and ensure your face is within the guide for the most accurate results.
                  </CameraHint>
                )}
              </VideoWrapper>
            </ScanContentArea>

            <BottomPanel>
              {scanError ? (
                <ErrorCard>
                  <p style={{ fontWeight: 700, color: '#dc2626', margin: '0 0 8px' }}>Camera Error</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>Please ensure camera access is allowed.</p>
                  <PrimaryButton onClick={() => handleAlertAction('retry')}>
                    <RefreshCw size={18} />
                    Retry
                  </PrimaryButton>
                </ErrorCard>
              ) : (
                <>
                  {sessionState === SessionState.MEASURING && (
                    <>
                      {renderScanSteps()}
                      <StatsRow>
                        {vitalSigns?.pulseRate?.value && (
                          <StatPill>
                            <span>Heart</span>
                            <span className="value">{vitalSigns.pulseRate.value} <span style={{ fontWeight: 400, color: '#94a3b8' }}>BPM</span></span>
                          </StatPill>
                        )}
                        {vitalSigns?.stress?.value && (
                          <StatPill>
                            <span>Stress</span>
                            <span className="value">{vitalSigns.stress.value}</span>
                          </StatPill>
                        )}
                        {vitalSigns?.hrvSdnn?.value && (
                          <StatPill>
                            <span>HRV</span>
                            <span className="value">{vitalSigns.hrvSdnn.value} <span style={{ fontWeight: 400, color: '#94a3b8' }}>ms</span></span>
                          </StatPill>
                        )}
                        {vitalSigns?.spo2?.value && (
                          <StatPill>
                            <span>SpO2</span>
                            <span className="value">{vitalSigns.spo2.value}%</span>
                          </StatPill>
                        )}
                      </StatsRow>
                    </>
                  )}
                  <MeasureButton
                    measuring={sessionState === SessionState.MEASURING}
                    disabled={(!canMeasure && sessionState !== SessionState.MEASURING) || isLoading}
                    onClick={handleButtonClick}
                  >
                    {sessionState === SessionState.MEASURING ? (
                      <>Stop</>
                    ) : isLoading ? (
                      <>Preparing...</>
                    ) : (
                      <><Camera size={20} /> Measure Now</>
                    )}
                  </MeasureButton>
                  {scanWarning && (
                    <p style={{ fontSize: 12, color: '#d97706', textAlign: 'center', margin: 0 }}>
                      {scanWarning.message || 'Face detection unstable — please stay still'}
                    </p>
                  )}
                </>
              )}
            </BottomPanel>
          </>
        )}
      </FullScreenContainer>
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

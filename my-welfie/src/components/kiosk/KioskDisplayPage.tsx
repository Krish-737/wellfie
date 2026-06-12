// src/components/kiosk/KioskDisplayPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE display page — never navigates away. Cycles through internal stages:
//
//   IDLE         → shows "Welcome" / "Scan QR to Pay"
//   WAITING_PAY  → shows QR code, polls backend for payment confirmation
//   PROFILE      → (On-Screen) Enter Name, Sex, DOB, Smoking status
//   SCANNING     → The actual health scan via camera
//   REPORT       → Shows results on-screen
//   DONE         → Thank you / Auto-reset
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import QRCode from 'qrcode';
import styled from 'styled-components';
import { isMobile, isTablet, SessionState } from '@biosensesignal/web-sdk';
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
import SettingsBars from '../SettingsBars';
import {
  createKioskSession,
  createKioskCheckout,
  getKioskSession,
  updateKioskProfile,
  saveKioskScan,
  sendKioskReport,
} from '../../api/kioskApi';
import { apiFetch } from '../../api/apiFetch';
import useKioskMonitor from '../../hooks/useKioskMonitor';
import Mask from '../../assets/mask.svg';

// ── Modular Stage Components ──────────────────────────────────────────────────
import KioskPayStage from './KioskPayStage';
import KioskProfileStage, { KioskProfileData } from './Kioskprofilestage';
import KioskScanStage from './KioskScanStage';
import KioskReportStage from './Kioskreportstage';
import KioskDoneStage from './KioskDoneStage';

// ── Stage Type ────────────────────────────────────────────────────────────────
type Stage = 'idle' | 'waiting_pay' | 'profile' | 'scanning' | 'report' | 'done';

const SPIN_STYLE = `@keyframes spin{to{transform:rotate(360deg)}}`;

export default function KioskDisplayPage() {
  const kioskId = new URLSearchParams(window.location.search).get('kiosk_id') || 'default';

  // ── Stage State ────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('idle');

  // ── Session State ──────────────────────────────────────────────────────────
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl]     = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [scanResult, setScanResult]   = useState<Record<string, any> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Profile Logic ──────────────────────────────────────────────────────────
  const [guestName, setGuestName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Scan Logic ─────────────────────────────────────────────────────────────
  const { cameras, ready: camerasReady, refresh: refreshCameras } = useCameras();
  const [isSettingsOpen,      setIsSettingsOpen]      = useState(false);
  const [cameraId,            setCameraId]            = useState<string | undefined>();
  const [isLicenseValid,      setIsLicenseValid]      = useState(false);
  const [videoReady,          setVideoReady]          = useState(false);
  const [isLoading,           setIsLoading]           = useState(false);
  const [startMeasuring,      setStartMeasuring]      = useState(false);
  const [isMeasurementEnabled,setIsMeasurementEnabled]= useState(false);
  const [saving,              setSaving]              = useState(false);
  const savedRef = useRef(false);
  const video    = useRef<HTMLVideoElement>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<number>();

  const [processingTime] = useMeasurementDuration();
  const [licenseKey]     = useLicenseKey();
  const isPageVisible    = usePageVisibility();
  const mobileDev = useMemo(() => isMobile(), []);
  const desktop   = useMemo(() => !isTablet() && !isMobile(), []);
  useDisableZoom();

  // ── Reset Logic ────────────────────────────────────────────────────────────
  const resetToIdle = useCallback(() => {
    if (pollRef.current)      clearInterval(pollRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setSessionId(null); setQrDataUrl(null);
    setSessionEmail(null); setScanResult(null);
    setGuestName('');
    setSaving(false); savedRef.current = false;
    setStartMeasuring(false); setIsLoading(false); setVideoReady(false);
    isStartingRef.current = false;
    setStage('idle');
  }, []);

  // ── Step 1: Payment Flow ───────────────────────────────────────────────────
  const isStartingRef = useRef(false);
  const startSession = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      const session = await createKioskSession(kioskId);
      setSessionId(session.id);

      // Generate QR for the mobile landing page (NOT direct Stripe)
      // This gives the user a "Welcome" experience on their phone.
      const landingUrl = `${window.location.origin}/kiosk/${session.id}`;
      const dataUrl = await QRCode.toDataURL(landingUrl, {
        width: 300, margin: 2, color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      setStage('waiting_pay');

      pollRef.current = setInterval(async () => {
        try {
          const s = await getKioskSession(session.id);
          if (s.status === 'paid') {
            clearInterval(pollRef.current!);
            if (s.email) setSessionEmail(s.email);
            setStage('profile');
          }
        } catch { /* ignore transient poll errors */ }
      }, 2000);
    } catch (e) {
      console.error('[KioskDisplay] startSession failed', e);
      setTimeout(() => {
        isStartingRef.current = false;
        if (stage === 'idle') startSession();
      }, 5000);
    }
  }, [kioskId, stage]);

  useEffect(() => {
    if (stage === 'idle') startSession();
  }, [stage, startSession]);

  // ── Step 2: Profile Submission ──────────────────────────────────────────────
  const handleProfileContinue = useCallback(async (data: KioskProfileData, skip = false) => {
    if (!sessionId) return;
    setProfileSaving(true);
    try {
      if (!skip) {
        await updateKioskProfile(sessionId, {
          guest_name:     data.guest_name,
          email:          data.email,
          sex:            data.sex,
          date_of_birth:  data.date_of_birth,
          height_cm:      data.height_cm,
          weight_kg:      data.weight_kg,
          smoking_status: data.smoking_status,
        });
        if (data.email) setSessionEmail(data.email);
        if (data.guest_name) setGuestName(data.guest_name);
      }
      setStage('scanning');
    } catch (e) {
      console.error('[KioskDisplay] profile error', e);
      setStage('scanning');
    } finally {
      setProfileSaving(false);
    }
  }, [sessionId]);

  // ── Step 3: Scanning Flow ──────────────────────────────────────────────────
  const handleScanComplete = useCallback((vitalSignsResults: any) => {
    if (savedRef.current || !sessionId) return;
    savedRef.current = true;
    setSaving(true);

    const vitals = vitalSignsResults?.results ?? vitalSignsResults;

    saveKioskScan(sessionId, vitals, {
      scan_platform: 'kiosk',
      measurement_duration_sec: processingTime,
    })
      .then(async () => {
        const res = await apiFetch(`/kiosk/session/${sessionId}/scan-result`);
        if (!res.ok) throw new Error('scan-result fetch failed');
        const data = await res.json();
        setScanResult(data);
        setSaving(false);
        setStage('report');
      })
      .catch((e) => {
        console.error('[KioskDisplay] save failed', e);
        setSaving(false);
        savedRef.current = false;
      });
  }, [sessionId, processingTime]);

  const {
    sessionState, vitalSigns, finalReport,
    error, warning, info, clearScanAlert, retrySession,
  } = useKioskMonitor({
    video, cameraId, processingTime, licenseKey,
    startMeasuring,
    shouldInitCamera: stage === 'scanning',
    onScanComplete: handleScanComplete,
  });

  const prevSessionState = usePrevious(sessionState);
  const { scanError, scanWarning, clearScanWarning } = useResolvedScanAlert(error, warning);

  useEffect(() => {
    const validCameras = cameras?.filter(c => c.deviceId);
    if (!validCameras?.length) return;
    setCameraId(prev => prev ?? validCameras[0].deviceId);
  }, [cameras]);

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
      setStartMeasuring(false); setIsLoading(false);
    }
  }, [scanError, sessionState, isPageVisible, prevSessionState]);

  const isPreparingScanner  = sessionState === undefined && !scanError && stage === 'scanning';
  const isInitialisingCamera = !videoReady && Boolean(licenseKey)
    && (camerasReady && !cameraId && !scanError)
    && sessionState !== SessionState.ACTIVE;
  const showCameraLoading   = (isPreparingScanner || isInitialisingCamera) && !scanError;
  const canStartMeasure     = !showCameraLoading && sessionState === SessionState.ACTIVE
    && Boolean(cameraId) && !scanError;

  const handleButtonClick = useCallback(() => {
    if (sessionState === SessionState.MEASURING) {
      clearTimeout(loadingTimeout);
      setStartMeasuring(false); setIsLoading(false); return;
    }
    if (!canStartMeasure) return;
    setIsLoading(true); setStartMeasuring(true);
    setLoadingTimeout(window.setTimeout(() => setIsLoading(true), processingTime * 1000));
  }, [canStartMeasure, processingTime, sessionState, loadingTimeout]);

  const handleAlertAction = useCallback((type: AlertActionType) => {
    if (type === 'retry') {
      clearScanAlert(); setStartMeasuring(false); setIsLoading(false);
      refreshCameras?.().then(() => retrySession());
    } else if (type === 'dismiss') {
      clearScanWarning();
    }
  }, [clearScanAlert, clearScanWarning, refreshCameras, retrySession]);

  // ── Step 4: Report / Done Flow ─────────────────────────────────────────────
  const handleDone = useCallback(() => {
    setStage('done');
    resetTimerRef.current = setTimeout(resetToIdle, 10000);
  }, [resetToIdle]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'visible' }}>
      <style>{SPIN_STYLE}</style>

      {/* 1. PAY STAGE */}
      {(stage === 'idle' || stage === 'waiting_pay') && (
        <KioskPayStage qrDataUrl={qrDataUrl} stage={stage} />
      )}

      {/* 2. PROFILE STAGE */}
      {stage === 'profile' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto' }}>
          <KioskProfileStage
            sessionEmail={sessionEmail}
            onContinue={(data) => handleProfileContinue(data)}
            onSkip={() => handleProfileContinue({}, true)}
            saving={profileSaving}
          />
        </div>
      )}

      {/* 3. SCANNING STAGE */}
      {stage === 'scanning' && (
        <>
          {saving ? (
            <div style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, border: '4px solid rgba(20,184,166,0.2)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
              <p style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>Saving your results…</p>
            </div>
          ) : (
            <KioskScanStage
              videoRef={video}
              maskUrl={Mask}
              isDesktop={desktop}
              mobileDev={mobileDev}
              showCameraLoading={showCameraLoading}
              isPreparingScanner={isPreparingScanner}
              measuring={sessionState === SessionState.MEASURING}
              processingTime={processingTime}
              showTopHint={!startMeasuring && !finalReport && !scanError && !showCameraLoading}
              scanError={scanError}
              scanWarning={scanWarning}
              info={info}
              vitalSigns={vitalSigns}
              isMeasurementEnabled={isMeasurementEnabled}
              isLoading={isLoading}
              canStartMeasure={canStartMeasure}
              onButtonClick={handleButtonClick}
              onAlertAction={handleAlertAction}
              setVideoReady={setVideoReady}
            />
          )}
        </>
      )}

      {/* 4. REPORT STAGE */}
      {stage === 'report' && scanResult && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto' }}>
          <KioskReportStage
            scanResult={scanResult}
            sessionId={sessionId!}
            sessionEmail={sessionEmail}
            guestName={guestName}
            onSendEmail={async (email) => {
              await sendKioskReport(sessionId!, email);
            }}
            onDone={handleDone}
          />
        </div>
      )}

      {/* 5. DONE STAGE */}
      {stage === 'done' && (
        <KioskDoneStage onReset={resetToIdle} />
      )}

      {/* Persistent Settings (Overlay) */}
      <SettingsBars
        open={isSettingsOpen}
        onClose={({ cameraId: cid }) => { setCameraId(cid); setIsSettingsOpen(false); }}
        cameras={cameras}
        isLicenseValid={isLicenseValid}
      />
    </div>
  );
}

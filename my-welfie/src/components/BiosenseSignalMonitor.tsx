import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  isMobile,
  isTablet,
  isIos,
  HealthMonitorCodes,
  SessionState,
} from '@biosensesignal/web-sdk';
import { useMediaPredicate } from 'react-media-hook';
import {
  useLicenseKey,
  useMeasurementDuration,
  useMonitor,
  usePageVisibility,
  usePrevious,
  useResolvedScanAlert,
} from '../hooks';
import { AlertActionType } from '../alerts/alertTypes';
import { useAuth } from '../context/AuthContext';
import { toSdkUserInformation } from '../utils/userProfile';
import Stats from './Stats';
import StartButton from './StartButton';
import { mirror } from '../style/mirror';
import { Flex } from './shared/Flex';
import Timer from './Timer';
import media from '../style/media';
import { InfoAlert } from './alert';
import TopBar from './TopBar';
import ScanErrorPanel from './scan-alerts/ScanErrorPanel';
import ScanWarningToast from './scan-alerts/ScanWarningToast';
import ScanQualityBanner from './dashboard/ScanQualityBanner';
import { scanResultFromLiveVitals } from '../utils/metricAvailability';
import Mask from '../assets/mask.svg';
const FullPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100%;
  background-color: #000000;
  overflow: hidden;
`;

const MonitorWrapper = styled(Flex)<{ isSettingsOpen: boolean }>`
  flex-direction: column;
  width: 100%;
  justify-content: start;
  align-items: center;
  flex: 1;
  overflow: hidden;
  z-index: ${({ isSettingsOpen }) => isSettingsOpen && '-1'};
`;

const MeasurementContentWrapper = styled(Flex)`
  width: 100%;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  overflow: hidden;
`;

const ProgressBarWrapper = styled.div`
  padding-bottom: 12px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProgressBarInner = styled.div`
  flex: 1;
  min-width: 0;
`;

const ScanMainContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  overflow: hidden;

  ${media.tablet`
    width: 640px;
  `}
  ${media.wide`
    width: 800px;
  `}
`;

const VideoAndStatsWrapper = styled(Flex)`
  flex: 1;
  position: relative;
  justify-content: center;
  overflow: hidden;
`;

const VideoWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
`;

// Replace the old Img style definition with this smart mask layer
const BlurOverlay = styled.div<{ isDesktop: boolean; maskUrl: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  
  /* Apply the backdrop filters to target the camera stream underneath */
  backdrop-filter: blur(10px) brightness(0.55);
  -webkit-backdrop-filter: blur(10px) brightness(0.55);
  background-color: rgba(24, 25, 30, 0.2);

  /* Use your precise SVG mask to completely exclude the center cutout from the blur */
  mask-image: url(${props => props.maskUrl});
  mask-size: ${props => props.isDesktop ? 'contain' : 'cover'};
  mask-position: center;
  mask-repeat: no-repeat;
  
  -webkit-mask-image: url(${props => props.maskUrl});
  -webkit-mask-size: ${props => props.isDesktop ? 'contain' : 'cover'};
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  
  /* Inverse composition: keep the outside masked, punch the center open */
  mask-composite: exclude;
  -webkit-mask-composite: xor; 
  
  pointer-events: none;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  ${mirror};
`;

const CameraLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #f1f5f9;
  border-radius: 12px;

  .camera-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #14b8a6;
    border-radius: 50%;
    animation: camera-spin 1s linear infinite;
  }

  @keyframes camera-spin {
    to {
      transform: rotate(360deg);
    }
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

const CameraHint = styled.p`
  position: absolute;
  top: 12px;
  left: 16px;
  right: 16px;
  z-index: 15;
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
  box-sizing: border-box;
  pointer-events: none;
`;

const BiosenseSignalMonitor = ({
  showMonitor,
  cameraId,
  camerasReady = true,
  onRefreshCameras,
  onLicenseStatus,
  onSettingsClick,
  isSettingsOpen,
}) => {
  // ── All hooks must be declared before any conditional return ─────────────

  const video = useRef<HTMLVideoElement>(null);
  const [isMeasurementEnabled, setIsMeasurementEnabled] = useState<boolean>(false);
  const [startMeasuring, setStartMeasuring] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [loadingTimeoutPromise, setLoadingTimeoutPromise] = useState<number>();
  const isPageVisible = usePageVisibility();
  const [processingTime] = useMeasurementDuration();
  const [licenseKey] = useLicenseKey();
  const { user } = useAuth();
  const sdkUserInformation = useMemo(
    () => (user ? toSdkUserInformation(user) : undefined),
    [user?.sex, user?.age, user?.height_cm, user?.weight_kg, user?.smoking_status],
  );
  const {
    sessionState,
    vitalSigns,
    finalReport,
    rawResults,
    reportGeneratedAt,
    offlineMeasurements,
    error,
    warning,
    info,
    scansRemaining,
    saveError,
    clearScanAlert,
    retrySession,
  } = useMonitor(
    video,
    cameraId,
    processingTime,
    licenseKey,
    null,
    startMeasuring,
    sdkUserInformation,
  );
  const prevSessionState = usePrevious(sessionState);
  const navigate = useNavigate();
  const { scanError, scanWarning, clearScanWarning } = useResolvedScanAlert(error, warning);

  const isMeasuring = useCallback(
    () => sessionState === SessionState.MEASURING,
    [sessionState],
  );

  const handleAlertAction = useCallback(
    (type: AlertActionType, refCode?: number) => {
      switch (type) {
        case 'retry':
          clearScanAlert();
          setStartMeasuring(false);
          setIsLoading(false);
          void onRefreshCameras?.().then(() => {
            retrySession();
          });
          break;
        case 'prepare_guide':
          navigate('/prepare-scan');
          break;
        case 'profile':
          navigate('/profile?next=' + encodeURIComponent('/camera'));
          break;
        case 'dashboard':
          navigate('/dashboard');
          break;
        case 'support':
          window.location.href = `mailto:support@mywellfie.com?subject=${encodeURIComponent('Scan issue')}&body=${encodeURIComponent(`Reference code: ${refCode ?? scanError?.code ?? 'unknown'}`)}`;
          break;
        case 'dismiss':
          clearScanWarning();
          break;
        default:
          break;
      }
    },
    [clearScanAlert, clearScanWarning, navigate, scanError?.code, onRefreshCameras, retrySession],
  );

  const waitingForCamera = camerasReady && !cameraId && !scanError;

  const isPreparingScanner = sessionState === undefined;
  const isInitialisingCamera =
    !videoReady && Boolean(licenseKey) && (waitingForCamera || !scanError);
  const showCameraLoading = isPreparingScanner || isInitialisingCamera;

  const canStartMeasure =
    !showCameraLoading &&
    sessionState === SessionState.ACTIVE &&
    videoReady &&
    Boolean(cameraId) &&
    !scanError &&
    scansRemaining !== 0;

  const handleButtonClick = useCallback(() => {
    if (isMeasuring()) {
      clearTimeout(loadingTimeoutPromise);
      setStartMeasuring(false);
      setIsLoading(false);
      return;
    }
    if (!canStartMeasure) return;
    setIsLoading(true);
    setStartMeasuring(true);
    setLoadingTimeoutPromise(
      window.setTimeout(() => setIsLoading(true), processingTime * 1000),
    );
  }, [
    canStartMeasure,
    processingTime,
    isMeasuring,
    loadingTimeoutPromise,
  ]);

  useEffect(() => {
    if (isMeasuring()) {
      setIsLoading(false);
      if (scanError) {
        setIsMeasurementEnabled(false);
      } else {
        setIsMeasurementEnabled(true);
      }
      !isPageVisible && setStartMeasuring(false);
    } else if (
      (sessionState === SessionState.ACTIVE ||
        sessionState === SessionState.TERMINATED) &&
      scanError
    ) {
      setIsMeasurementEnabled(false);
    }
    if (
      sessionState === SessionState.ACTIVE &&
      prevSessionState !== sessionState
    ) {
      setStartMeasuring(false);
      setIsLoading(false);
    }
  }, [scanError, sessionState, isPageVisible]);

  useEffect(() => {
    onLicenseStatus(!(error?.code in HealthMonitorCodes));
  }, [error]);

  useEffect(() => {
    if (finalReport) {
      setIsLoading(false);
    }
  }, [finalReport]);

  useEffect(() => {
    setVideoReady(false);
  }, [cameraId]);

  // Prevent accidental refresh during active scan
  useEffect(() => {
    if (!finalReport) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [finalReport]);

  const mobile = useMemo(() => isMobile(), []);
  const desktop = useMemo(() => !isTablet() && !isMobile(), []);

  const liveScanQuality = useMemo(() => {
    if (!finalReport || !rawResults) return null;
    return scanResultFromLiveVitals(rawResults, {
      durationSec: processingTime,
      platform: 'web',
    });
  }, [finalReport, rawResults, processingTime]);

  const cameraLoadingMessage = isPreparingScanner
    ? 'Preparing scanner…'
    : 'Initialising camera…';

  const measuring = isMeasuring();
  const showTopHint =
    !measuring &&
    !finalReport &&
    !scanError &&
    scansRemaining !== 0 &&
    !showCameraLoading;

  // ── Early return AFTER all hooks ─────────────────────────────────────────
  if (!showMonitor) {
    return null;
  }

  return (
    <FullPageWrapper>
      <TopBar onSettingsClick={onSettingsClick} isMeasuring={isMeasuring()} />
      <MonitorWrapper isSettingsOpen={isSettingsOpen}>
        <MeasurementContentWrapper>
          <ScanMainContent>
            {measuring && (
              <ProgressBarWrapper>
                <ProgressBarInner>
                  <Timer started={true} durationSeconds={processingTime} />
                </ProgressBarInner>
              </ProgressBarWrapper>
            )}
            <VideoAndStatsWrapper>
              <VideoWrapper>
                <BlurOverlay maskUrl={Mask} isDesktop={desktop} />
                <Video
                  ref={video}
                  id="video"
                  muted={true}
                  playsInline={true}
                  onCanPlay={() => setVideoReady(true)}
                  onPlaying={() => setVideoReady(true)}
                />
                {showCameraLoading && (
                  <CameraLoadingOverlay>
                    <div className="camera-spinner" aria-hidden="true" />
                    <CameraLoadingMessage>{cameraLoadingMessage}</CameraLoadingMessage>
                  </CameraLoadingOverlay>
                )}
              </VideoWrapper>
              {showTopHint && (
                <CameraHint>
                  Stay still and ensure your face is within the guide for clinical precision.
                </CameraHint>
              )}
              {isMeasuring() && scanWarning && (
                <ScanWarningToast
                  alert={scanWarning}
                  onAction={(type) => handleAlertAction(type, scanWarning.code)}
                />
              )}
              {isMeasuring() && <InfoAlert message={info.message} />}
            </VideoAndStatsWrapper>

            {/* ── Control panel below video ── */}
            <ControlPanel>
              {/* After scan completes show Back to Dashboard, otherwise show Measure Now */}
              {finalReport ? (
                <>
                  {saveError && (
                    <div style={{
                      width: '100%', maxWidth: 420, padding: '14px 16px', borderRadius: 12,
                      background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                      fontSize: 14, lineHeight: 1.5, textAlign: 'center',
                    }}>
                      {saveError}
                    </div>
                  )}
                  {liveScanQuality && !saveError && (
                    <div style={{ width: '100%', maxWidth: 480 }}>
                      <ScanQualityBanner scan={liveScanQuality} isMobile={mobile} compact />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (saveError) window.location.href = '/pricing#pricing';
                      else navigate('/dashboard');
                    }}
                    style={{
                      background: saveError ? '#14b8a6' : 'rgb(15, 23, 42)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 14,
                      padding: '14px 36px',
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.35)',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                  >
                    {saveError ? 'Buy Scan Pack' : 'Back to Dashboard'}
                  </button>
                  {saveError && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      style={{
                        background: 'none', border: 'none', color: '#64748b',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Back to Dashboard
                    </button>
                  )}
                </>
              ) : scanError ? (
                <ScanErrorPanel
                  alert={scanError}
                  onAction={(type) => handleAlertAction(type, scanError.code)}
                />
              ) : scansRemaining === 0 ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 16px' }}>
                    You have no scans remaining.
                  </p>
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/pricing#pricing'; }}
                    style={{
                      background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 14,
                      padding: '14px 36px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                      fontFamily: 'inherit', marginRight: 12,
                    }}
                  >
                    Buy Scan Pack
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    style={{
                      background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0',
                      borderRadius: 14, padding: '14px 24px', fontSize: 15, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Dashboard
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
                  <StartButton
                    isLoading={isLoading}
                    isMeasuring={measuring}
                    disabled={!canStartMeasure}
                    onClick={handleButtonClick}
                  />
                </div>
              )}

            </ControlPanel>
          </ScanMainContent>
        </MeasurementContentWrapper>
      </MonitorWrapper>
    </FullPageWrapper>
  );
};

export default BiosenseSignalMonitor;



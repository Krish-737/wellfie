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
import Loader from './Loader';
import Mask from '../assets/mask.svg';
const MonitorWrapper = styled(Flex)<{ isSettingsOpen: boolean }>`
  flex-direction: column;
  width: 100%;
  justify-content: start;
  align-items: center;
  flex: 1;
  z-index: ${({ isSettingsOpen }) => isSettingsOpen && '-1'};
  ${media.tablet`
    width: fit-content;
    justify-content: center;
  `}
`;

const MeasurementContentWrapper = styled(Flex)<{ isMobile: boolean }>`
  width: auto;
  height: ${({ isMobile }) => isMobile && '100%'};
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  ${media.mobile`
    margin: 20px 0 40px 0;
  `}
`;

const VideoAndStatsWrapper = styled(Flex)<{ isMobile: boolean }>`
  position: relative;
  justify-content: center;
  width: 100%;
  height: ${({ isMobile }) => isMobile && '100%'};
  ${media.tablet`
    width: 640px;
    height: 480px;
  `} ${media.wide`
    width: 800px;
    height: 600px;
  `};
`;

const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  border-radius: 12px;
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

const ControlPanel = styled.div`
  width: 100%;
  background: #ffffff;
  padding: 16px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  ${media.tablet`
    width: 640px;
  `}
  ${media.wide`
    width: 800px;
  `}
`;

const HintText = styled.p`
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
`;

const BiosenseSignalMonitor = ({
  showMonitor,
  cameraId,
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
    [clearScanAlert, clearScanWarning, navigate, scanError?.code],
  );

  const handleButtonClick = useCallback(() => {
    if (scansRemaining === 0) return;
    setIsLoading(true);
    if (sessionState === SessionState.ACTIVE) {
      setStartMeasuring(true);
      setLoadingTimeoutPromise(
        window.setTimeout(() => setIsLoading(true), processingTime * 1000),
      );
    } else if (isMeasuring()) {
      clearTimeout(loadingTimeoutPromise);
      setStartMeasuring(false);
    }
  }, [sessionState, setIsLoading, processingTime, scansRemaining]);

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

  // Eagerly request camera permission so the browser popup appears immediately.
  // Tracks are stopped right away — the SDK opens its own independent stream.
  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => {
        // Permission denied or unavailable — SDK will surface the proper error.
      });
  }, []);

  const mobile = useMemo(() => isMobile(), []);
  const desktop = useMemo(() => !isTablet() && !isMobile(), []);

  // ── Early return AFTER all hooks ─────────────────────────────────────────
  if (!showMonitor) {
    return null;
  }

  return (
    <>
      <TopBar onSettingsClick={onSettingsClick} isMeasuring={isMeasuring()} />
      <MonitorWrapper isSettingsOpen={isSettingsOpen}>
        <MeasurementContentWrapper isMobile={mobile}>
          <VideoAndStatsWrapper isMobile={mobile}>
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
            </VideoWrapper>
            {!scanError && isMeasurementEnabled && <Stats vitalSigns={vitalSigns} />}
            {isMeasuring() && scanWarning && (
              <ScanWarningToast
                alert={scanWarning}
                onAction={(type) => handleAlertAction(type, scanWarning.code)}
              />
            )}
            {isMeasuring() && <InfoAlert message={info.message} />}
            {!videoReady && licenseKey && <Loader />}
          </VideoAndStatsWrapper>

          {/* ── Control panel below video ── */}
          <ControlPanel>
            {/* Progress bar — only visible while actively scanning */}
            {isMeasuring() && (
              <Timer started={true} durationSeconds={processingTime} />
            )}

            {/* SDK initialising — show subtle status instead of the button */}
            {sessionState === undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                color: '#64748b', fontSize: 13, fontWeight: 500,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" style={{ transformOrigin: 'center', animation: 'spin 1s linear infinite' }} />
                </svg>
                Preparing scanner…
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

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
                  isMeasuring={isMeasuring()}
                  onClick={handleButtonClick}
                />
              </div>
            )}

            <HintText>
              {finalReport
                ? saveError
                  ? 'Purchase a scan pack to save and track your results.'
                  : 'Scan complete! View your results on the dashboard.'
                : scansRemaining === 0
                  ? 'Purchase a scan pack to start a new scan.'
                  : 'Stay still and ensure your face is within the guide for clinical precision.'}
            </HintText>
          </ControlPanel>
        </MeasurementContentWrapper>
      </MonitorWrapper>
    </>
  );
};

export default BiosenseSignalMonitor;



// src/components/kiosk/KioskScanStage.tsx
import React from 'react';
import styled from 'styled-components';
import { Flex } from '../shared/Flex';
import { mirror } from '../../style/mirror';
import Stats from '../Stats';
import StartButton from '../StartButton';
import Timer from '../Timer';
import media from '../../style/media';
import { InfoAlert } from '../alert';
import ScanErrorPanel from '../scan-alerts/ScanErrorPanel';
import ScanWarningToast from '../scan-alerts/ScanWarningToast';

const VideoAndStatsWrapper = styled(Flex)<{ isMob: boolean }>`
  position: relative; justify-content: center; width: 100%;
  aspect-ratio: 4 / 3;
  ${media.tablet`width: 640px; height: 480px; aspect-ratio: auto;`}
  ${media.wide`width: 800px; height: 600px; aspect-ratio: auto;`}
`;
const VideoWrapper = styled.div`
  position: relative; width: 100%; height: 100%;
  z-index: 0; overflow: hidden; border-radius: 12px; background: #000;
`;
const BlurOverlay = styled.div<{ isDesktop: boolean; maskUrl: string }>`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
  backdrop-filter: blur(10px) brightness(0.55);
  -webkit-backdrop-filter: blur(10px) brightness(0.55);
  background-color: rgba(24,25,30,0.2);
  mask-image: url(${p => p.maskUrl});
  mask-size: ${p => p.isDesktop ? 'contain' : 'cover'}; mask-position: center; mask-repeat: no-repeat;
  -webkit-mask-image: url(${p => p.maskUrl});
  -webkit-mask-size: ${p => p.isDesktop ? 'contain' : 'cover'};
  -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;
  mask-composite: exclude; -webkit-mask-composite: xor; pointer-events: none;
`;
const Video = styled.video`width: 100%; height: 100%; object-fit: cover; ${mirror}`;
const ControlPanel = styled.div`
  width: 100%; background: #fff; padding: 16px 20px;
  box-sizing: border-box; display: flex; flex-direction: column;
  align-items: center; gap: 12px;
  ${media.tablet`width: 640px;`} ${media.wide`width: 800px;`}
`;
const CameraHint = styled.p`
  position: absolute; top: 12px; left: 16px; right: 16px; z-index: 15;
  margin: 0; padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.88); font-size: 12px; color: #64748b;
  text-align: center; line-height: 1.5; box-sizing: border-box; pointer-events: none;
`;
const CameraLoadingOverlay = styled.div`
  position: absolute; inset: 0; z-index: 20;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px;
  background: #f1f5f9; border-radius: 12px;
  padding: 20px; text-align: center;
  .cs { width:40px;height:40px;border:3px solid #e2e8f0;
    border-top:3px solid #14b8a6;border-radius:50%;
    animation:cs 1s linear infinite; }

  ${media.tablet`
    .cs { width:44px; height:44px; }
  `}

  @keyframes cs { to { transform:rotate(360deg); } }
`;

interface KioskScanStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  maskUrl: string;
  isDesktop: boolean;
  mobileDev: boolean;
  showCameraLoading: boolean;
  isPreparingScanner: boolean;
  measuring: boolean;
  processingTime: number;
  showTopHint: boolean;
  scanError: any;
  scanWarning: any;
  info: any;
  vitalSigns: any;
  isMeasurementEnabled: boolean;
  isLoading: boolean;
  canStartMeasure: boolean;
  onButtonClick: () => void;
  onAlertAction: (type: any) => void;
  setVideoReady: (ready: boolean) => void;
}

const KioskScanStage: React.FC<KioskScanStageProps> = ({
  videoRef, maskUrl, isDesktop, mobileDev, showCameraLoading, isPreparingScanner,
  measuring, processingTime, showTopHint, scanError, scanWarning, info,
  vitalSigns, isMeasurementEnabled, isLoading, canStartMeasure,
  onButtonClick, onAlertAction, setVideoReady,
}) => {
  return (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#fff',
    }}>
      {measuring && (
        <div style={{ width: '100%', padding: '20px 20px 0', boxSizing: 'border-box', maxWidth: isDesktop ? 800 : 640 }}>
          <Timer started={true} durationSeconds={processingTime} />
        </div>
      )}

      <VideoAndStatsWrapper isMob={mobileDev}>
        <VideoWrapper>
          <BlurOverlay maskUrl={maskUrl} isDesktop={isDesktop} />
          <Video ref={videoRef} id="video" muted playsInline
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
          />
          {showCameraLoading && (
            <CameraLoadingOverlay>
              <div className="cs" />
              <p style={{
                margin: 0, fontSize: mobileDev ? 15 : 16, fontWeight: 700, color: '#475569',
                maxWidth: 280,
              }}>
                {isPreparingScanner ? 'Preparing scanner…' : 'Initialising camera…'}
              </p>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 500, color: '#94a3b8',
                maxWidth: 280,
              }}>
                Please stay still and ensure good lighting
              </p>
            </CameraLoadingOverlay>
          )}
        </VideoWrapper>

        {showTopHint && (
          <CameraHint>
            Stay still and ensure your face is within the guide for the most accurate results.
          </CameraHint>
        )}
        {!scanError && isMeasurementEnabled && <Stats vitalSigns={vitalSigns} />}
        {measuring && scanWarning && (
          <ScanWarningToast alert={scanWarning} onAction={t => onAlertAction(t)} />
        )}
        {measuring && <InfoAlert message={info.message} />}
      </VideoAndStatsWrapper>

      <ControlPanel>
        {scanError ? (
          <ScanErrorPanel alert={scanError} onAction={t => onAlertAction(t)} />
        ) : (
          <StartButton
            isLoading={isLoading} isMeasuring={measuring}
            disabled={!canStartMeasure} onClick={onButtonClick}
          />
        )}
      </ControlPanel>
    </div>
  );
};

export default KioskScanStage;

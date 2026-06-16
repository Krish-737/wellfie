// src/hooks/useKioskMonitor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Auth-free clone of useMonitor for kiosk sessions.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import monitor, {
  AlertData,
  DeviceOrientation,
  EnabledVitalSigns,
  FaceSessionOptions,
  HealthMonitorCodes,
  HealthMonitorSession,
  ImageValidity,
  OfflineMeasurements,
  SessionState,
  UserInformation,
  VitalSigns,
  VitalSignsResults,
} from '@biosensesignal/web-sdk';
import { InfoType, InfoData, ReportVitalSigns } from '../types';

// ── Re-use the same vital-sign mapper from the main hook ─────────────────────

const vitalNode = <T,>(
  node: { value?: T; confidenceLevel?: number } | null | undefined,
  isEnabled: boolean | undefined,
  hasValue: boolean,
) => ({
  value: node?.value,
  isEnabled: isEnabled ?? hasValue,
  confidenceLevel: node?.confidenceLevel ?? null,
});

const mapToReportVitalSigns = (
  vitalSigns: VitalSigns | null,
  enabledVitalSigns?: EnabledVitalSigns,
): ReportVitalSigns => ({
  pulseRate: vitalNode(vitalSigns?.pulseRate, enabledVitalSigns?.isEnabledPulseRate, vitalSigns?.pulseRate?.value != null),
  respirationRate: vitalNode(vitalSigns?.respirationRate, enabledVitalSigns?.isEnabledRespirationRate, vitalSigns?.respirationRate?.value != null),
  stress: vitalNode(vitalSigns?.stressLevel, enabledVitalSigns?.isEnabledStressLevel, vitalSigns?.stressLevel?.value != null),
  hrvSdnn: vitalNode(vitalSigns?.sdnn, enabledVitalSigns?.isEnabledSdnn, vitalSigns?.sdnn?.value != null),
  spo2: vitalNode(vitalSigns?.oxygenSaturation, enabledVitalSigns?.isEnabledSpo2, vitalSigns?.oxygenSaturation?.value != null),
  bloodPressure: vitalNode(vitalSigns?.bloodPressure, enabledVitalSigns?.isEnabledBloodPressure, vitalSigns?.bloodPressure?.value?.systolic != null && vitalSigns?.bloodPressure?.value?.diastolic != null),
  hemoglobin: vitalNode(vitalSigns?.hemoglobin, enabledVitalSigns?.isEnabledHemoglobin, vitalSigns?.hemoglobin?.value != null),
  hemoglobinA1c: vitalNode(vitalSigns?.hemoglobinA1c, enabledVitalSigns?.isEnabledHemoglobinA1c, vitalSigns?.hemoglobinA1c?.value != null),
  wellnessIndex: vitalNode(vitalSigns?.wellnessIndex, enabledVitalSigns?.isEnabledWellnessIndex, vitalSigns?.wellnessIndex?.value != null),
});

const CAMERA_ERROR_CODES = new Set([1001, 1002, 1005]);

// ── Hook interface ────────────────────────────────────────────────────────────

interface UseKioskMonitorOptions {
  video: MutableRefObject<HTMLVideoElement>;
  cameraId: string | undefined;
  processingTime: number;
  licenseKey: string;
  startMeasuring: boolean;
  shouldInitCamera?: boolean;
  userInformation?: UserInformation;
  /** Called with raw VitalSignsResults when scan completes. */
  onScanComplete: (results: VitalSignsResults) => void;
}

const useKioskMonitor = ({
  video,
  cameraId,
  processingTime,
  licenseKey,
  startMeasuring,
  shouldInitCamera = true,
  userInformation,
  onScanComplete,
}: UseKioskMonitorOptions) => {
  const [session, setSession] = useState<HealthMonitorSession>();
  const [sessionState, setSessionState] = useState<SessionState>();
  const [isMonitorReady, setIsMonitorReady] = useState<boolean>(false);
  const [enabledVitalSigns, setEnabledVitalSigns] = useState<EnabledVitalSigns>();
  const [offlineMeasurements, setOfflineMeasurements] = useState<OfflineMeasurements>();
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>();
  const [finalReport, setFinalReport] = useState<ReportVitalSigns>();
  const [rawResults, setRawResults] = useState<any>();
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>();
  const [error, setError] = useState<AlertData>({ code: -1 });
  const [warning, setWarning] = useState<AlertData>({ code: -1 });
  const [info, setInfo] = useState<InfoData>({ type: InfoType.NONE });
  
  const [scanInterrupted, setScanInterrupted] = useState(false);
  const misdetectedRef = useRef(false);
  const [sessionKey, setSessionKey] = useState(0);
  const autoRetriedRef = useRef(false);
  const isDismissing = useRef<boolean>(false);

  const onScanCompleteRef = useRef(onScanComplete);
  useEffect(() => { onScanCompleteRef.current = onScanComplete; }, [onScanComplete]);

  const setInfoWithDismiss = useCallback((newInfo: InfoData, seconds?: number) => {
    if (!isDismissing.current) {
      setInfo(newInfo);
      if (seconds) {
        isDismissing.current = true;
        setTimeout(() => {
          setInfo({ type: InfoType.NONE });
          isDismissing.current = false;
        }, seconds * 1000);
      }
    }
  }, []);

  const updateVitalSigns = useCallback((vs: VitalSigns) => {
    setVitalSigns((prev) => ({ ...prev, ...vs }));
  }, []);

  const onVitalSign = useCallback((vs: VitalSigns) => updateVitalSigns(vs), [updateVitalSigns]);

  const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    console.log('[KioskMonitor] onFinalResults:', JSON.stringify(vitalSignsResults, null, 2));

    if (misdetectedRef.current) {
      console.log('[KioskMonitor] Scan interrupted by misdetection — blocking report');
      setScanInterrupted(true);
      return;
    }

    const vitals: VitalSigns = (vitalSignsResults as any)?.results ?? vitalSignsResults as any;

    setRawResults(vitals);
    updateVitalSigns(vitals);
    setFinalReport(mapToReportVitalSigns(vitals, enabledVitalSigns));
    setReportGeneratedAt(new Date().toISOString());
    setVitalSigns(null);

    onScanCompleteRef.current(vitalSignsResults);
  }, [enabledVitalSigns, updateVitalSigns]);

  const onError = (errorData: AlertData) => {
    console.error('[KioskMonitor] SDK Error:', errorData);
    setError(errorData);
  };

  const onWarning = (warningData: AlertData) => {
    if (warningData.code === HealthMonitorCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING) {
      setVitalSigns(null);
      misdetectedRef.current = true;
    }
    setWarning(warningData);
  };

  const onStateChange = useCallback((state: SessionState) => {
    console.log('[KioskMonitor] State change:', state);
    setSessionState(state);
    if (state === SessionState.MEASURING) {
      setVitalSigns(null);
      setRawResults(undefined);
      misdetectedRef.current = false;
      setScanInterrupted(false);
    }
  }, []);

  const onEnabledVitalSigns = useCallback((vs: EnabledVitalSigns) => setEnabledVitalSigns(vs), []);
  const onOfflineMeasurement = useCallback((om: OfflineMeasurements) => setOfflineMeasurements(om), []);
  const onActivation = useCallback((_id: string) => {}, []);

  const onImageData = useCallback((imageValidity: ImageValidity) => {
    if (imageValidity !== ImageValidity.VALID) {
      const messages: Partial<Record<ImageValidity, string>> = {
        [ImageValidity.INVALID_DEVICE_ORIENTATION]: 'Unsupported Orientation',
        [ImageValidity.TILTED_HEAD]: 'Head Tilted',
        [ImageValidity.FACE_TOO_FAR]: 'You Are Too Far',
        [ImageValidity.UNEVEN_LIGHT]: 'Uneven Lighting',
      };
      setInfo({ type: InfoType.INSTRUCTION, message: messages[imageValidity] ?? 'Face Not Detected' });
    } else {
      setInfoWithDismiss({ type: InfoType.NONE });
    }
  }, [setInfoWithDismiss]);

  // ── 1. Initialize monitor ────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    console.log('[KioskMonitor] Initializing SDK...');
    
    (async () => {
      try {
        await monitor.initialize({
          licenseKey,
          licenseInfo: {
            onEnabledVitalSigns,
            onOfflineMeasurement,
            onActivation,
          },
        });
        
        if (!active) return;
        console.log('[KioskMonitor] SDK Initialized successfully');
        setIsMonitorReady(true);
        setError({ code: -1 });
      } catch (e: any) {
        if (!active) return;
        console.error('[KioskMonitor] SDK Init error:', e);
        setIsMonitorReady(false);
        setError({ code: e.errorCode ?? 7006 });
      }
    })();

    return () => { active = false; };
  }, [licenseKey]); // eslint-disable-line

  // ── 2. Create face session ────────────────────────────────────────────────
  
useEffect(() => {
  if (!shouldInitCamera || !isMonitorReady || !processingTime || !video.current || !cameraId) {
    console.log('[KioskMonitor] createFaceSession deferred:', { shouldInitCamera, isMonitorReady, processingTime, hasVideo: !!video.current, cameraId });
    return;
  }

  // Use a ref instead of a closure variable so the cleanup from a previous
  // render cannot poison the in-flight async call of the new render.
  const cancelledRef = { cancelled: false };

  (async () => {
    try {
      console.log('[KioskMonitor] Creating face session with camera:', cameraId);
      const options: FaceSessionOptions = {
        input: video.current!,
        cameraDeviceId: cameraId,
        processingTime,
        onVitalSign,
        onFinalResults,
        onError,
        onWarning,
        onStateChange,
        orientation: DeviceOrientation.PORTRAIT,
        onImageData,
        ...(userInformation ? { userInformation } : {}),
      };

      const faceSession = await monitor.createFaceSession(options);

      if (cancelledRef.cancelled) {
        console.log('[KioskMonitor] createFaceSession completed after cleanup, terminating');
        faceSession.terminate();
        return;
      }

      console.log('[KioskMonitor] Face session created successfully');
      setSession(faceSession);
      setError({ code: -1 });
      autoRetriedRef.current = false;
    } catch (e: any) {
      if (cancelledRef.cancelled) return;
      const errorCode = e.errorCode;
      console.error('[KioskMonitor] createFaceSession error:', e);

      if (CAMERA_ERROR_CODES.has(errorCode) && !autoRetriedRef.current) {
        autoRetriedRef.current = true;
        console.log('[KioskMonitor] Retrying session due to camera error:', errorCode);
        window.setTimeout(() => setSessionKey((k) => k + 1), 1000);
        return;
      }
      setError({ code: errorCode });
    }
  })();

  return () => {
    cancelledRef.cancelled = true;
  };
}, [shouldInitCamera, isMonitorReady, processingTime, cameraId, sessionKey]); // eslint-disable-line
  // ── 3. Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      setSession((prev) => {
        if (prev) {
          console.log('[KioskMonitor] Unmount: terminating session');
          prev.terminate();
        }
        return undefined;
      });
    };
  }, []);

  // ── 4. Start / stop measuring ──────────────────────────────────────────────
  useEffect(() => {
    if (startMeasuring) {
      if (sessionState === SessionState.ACTIVE) {
        console.log('[KioskMonitor] Starting measurement');
        misdetectedRef.current = false;
        setScanInterrupted(false);
        setFinalReport(undefined);
        setReportGeneratedAt(undefined);
        session?.start();
        setError({ code: -1 });
      } else {
        console.warn('[KioskMonitor] Cannot start measuring: session state is', sessionState);
      }
    } else {
      if (sessionState === SessionState.MEASURING) {
        console.log('[KioskMonitor] Stopping measurement');
        session?.stop();
      }
    }
  }, [startMeasuring, session, sessionState]);

  const retrySession = useCallback(() => {
    console.log('[KioskMonitor] Manual retry requested');
    autoRetriedRef.current = false;
    setError({ code: -1 });
    setSessionKey((k) => k + 1);
  }, []);

  const clearScanAlert = useCallback(() => {
    setError({ code: -1 });
    setWarning({ code: -1 });
  }, []);

  return {
    sessionState,
    vitalSigns: mapToReportVitalSigns(vitalSigns ?? null, enabledVitalSigns),
    finalReport,
    rawResults,
    reportGeneratedAt,
    offlineMeasurements,
    error,
    warning,
    info,
    scanInterrupted,
    clearScanAlert,
    retrySession,
  };
};

export default useKioskMonitor;

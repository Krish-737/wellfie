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
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/apiFetch';

const mapToReportVitalSigns = (
  vitalSigns: VitalSigns | null,
  enabledVitalSigns?: EnabledVitalSigns,
): ReportVitalSigns => ({
  pulseRate: {
    value: vitalSigns?.pulseRate?.value,
    isEnabled:
      enabledVitalSigns?.isEnabledPulseRate ??
      vitalSigns?.pulseRate?.value != null,
  },
  respirationRate: {
    value: vitalSigns?.respirationRate?.value,
    isEnabled:
      enabledVitalSigns?.isEnabledRespirationRate ??
      vitalSigns?.respirationRate?.value != null,
  },
  stress: {
    value: vitalSigns?.stressLevel?.value,
    isEnabled:
      enabledVitalSigns?.isEnabledStressLevel ??
      vitalSigns?.stressLevel?.value != null,
  },
  hrvSdnn: {
    value: vitalSigns?.sdnn?.value,
    isEnabled: enabledVitalSigns?.isEnabledSdnn ?? vitalSigns?.sdnn?.value != null,
  },
  spo2: {
    value: vitalSigns?.oxygenSaturation?.value,
    isEnabled: enabledVitalSigns?.isEnabledSpo2 ?? vitalSigns?.oxygenSaturation?.value != null,
  },
  bloodPressure: {
    value: vitalSigns?.bloodPressure?.value,
    isEnabled:
      enabledVitalSigns?.isEnabledBloodPressure ??
      (vitalSigns?.bloodPressure?.value?.systolic != null &&
        vitalSigns?.bloodPressure?.value?.diastolic != null),
  },
  // Adding more vitals
  hemoglobin: {
    value: vitalSigns?.hemoglobin?.value,
    isEnabled: enabledVitalSigns?.isEnabledHemoglobin ?? vitalSigns?.hemoglobin?.value != null,
  },
  hemoglobinA1c: {
    value: vitalSigns?.hemoglobinA1c?.value,
    isEnabled: enabledVitalSigns?.isEnabledHemoglobinA1c ?? vitalSigns?.hemoglobinA1c?.value != null,
  },
  wellnessIndex: {
    value: vitalSigns?.wellnessIndex?.value,
    isEnabled: enabledVitalSigns?.isEnabledWellnessIndex ?? vitalSigns?.wellnessIndex?.value != null,
  },
});

const useMonitor = (
  video: MutableRefObject<HTMLVideoElement>,
  cameraId: string,
  processingTime: number,
  licenseKey: string,
  productId: string,
  startMeasuring: boolean,
  userInformation?: UserInformation,
) => {
  const { token, user, scansRemaining, refreshEntitlement } = useAuth();

  const [session, setSession] = useState<HealthMonitorSession>();
  const [sessionState, setSessionState] = useState<SessionState>();
  const [isMonitorReady, setIsMonitorReady] = useState<boolean>();
  const [enabledVitalSigns, setEnabledVitalSigns] = useState<
    EnabledVitalSigns
  >();
  const [offlineMeasurements, setOfflineMeasurements] = useState<
    OfflineMeasurements
  >();
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>();
  const [finalReport, setFinalReport] = useState<ReportVitalSigns>();
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [error, setError] = useState<AlertData>({ code: -1 });
  const [warning, setWarning] = useState<AlertData>({ code: -1 });
  const [info, setInfo] = useState<InfoData>({ type: InfoType.NONE });
  const isDismissing = useRef<boolean>(false);

  const setInfoWithDismiss = useCallback(
    (info: InfoData, seconds?: number) => {
      if (!isDismissing.current) {
        setInfo(info);
        if (seconds) {
          isDismissing.current = true;
          setTimeout(() => {
            setInfo({ type: InfoType.NONE });
            isDismissing.current = false;
          }, seconds * 1000);
        }
      }
    },
    [InfoType, setInfo, info, isDismissing, isDismissing.current],
  );

  const updateVitalSigns = useCallback((vitalSigns) => {
    setVitalSigns((prev) => ({
      ...prev,
      ...vitalSigns,
    }));
  }, []);

  const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    updateVitalSigns(vitalSign);
  }, []);

  const [rawResults, setRawResults] = useState<any>();

  const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    console.log('--- SCAN COMPLETED: FULL PAYLOAD ---');
    console.log(JSON.stringify(vitalSignsResults, null, 2));
    console.log('------------------------------------');

    setRawResults(vitalSignsResults.results);
    setSaveError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    apiFetch('/api/results', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: user?.id ?? 'anonymous',
        vitals: vitalSignsResults.results,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = typeof data.detail === 'string' ? data.detail : 'Failed to save scan';
          if (res.status === 403) {
            setSaveError('No scans remaining. Your results were not saved — purchase a scan pack to continue.');
          } else {
            setSaveError(detail);
          }
          if (token) refreshEntitlement();
          return;
        }
        console.log('Saved to backend:', data);
        if (token) refreshEntitlement();
      })
      .catch(() => setSaveError('Could not save scan results. Please try again.'));

    setVitalSigns(null);
    updateVitalSigns(vitalSignsResults.results);
    setFinalReport(
      mapToReportVitalSigns(vitalSignsResults.results, enabledVitalSigns),
    );
    setReportGeneratedAt(new Date().toISOString());
  }, [enabledVitalSigns, token, user, refreshEntitlement]);

  const onError = (errorData: AlertData) => {
    setError(errorData);
  };

  const onWarning = (warningData: AlertData) => {
    if (
      warningData.code ===
      HealthMonitorCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING
    ) {
      setVitalSigns(null);
    }
    setWarning(warningData);
  };

  const onStateChange = useCallback((state: SessionState) => {
    setSessionState(state);
    if (state === SessionState.MEASURING) {
      setVitalSigns(null);
      setRawResults(undefined);
      setSaveError(null);
    }
  }, []);

  const onEnabledVitalSigns = useCallback((vitalSigns: EnabledVitalSigns) => {
    setEnabledVitalSigns(vitalSigns);
  }, []);

  const onOfflineMeasurement = useCallback(
    (offlineMeasurements: OfflineMeasurements) => {
      setOfflineMeasurements(offlineMeasurements);
    },
    [],
  );

  const onActivation = useCallback((activationId: string) => {
    // the device has been activated with activationId
  }, []);

  const onImageData = useCallback((imageValidity: ImageValidity) => {
    let message: string;
    if (imageValidity != ImageValidity.VALID) {
      switch (imageValidity) {
        case ImageValidity.INVALID_DEVICE_ORIENTATION:
          message = 'Unsupported Orientation';
          break;
        case ImageValidity.TILTED_HEAD:
          message = 'Head Tilted';
          break;
        case ImageValidity.FACE_TOO_FAR: // Placeholder, currently not supported
          message = 'You Are Too Far';
          break;
        case ImageValidity.UNEVEN_LIGHT:
          message = 'Uneven Lighting';
          break;
        case ImageValidity.INVALID_ROI:
        default:
          message = 'Face Not Detected';
      }
      setInfo({
        type: InfoType.INSTRUCTION,
        message: message,
      });
    } else {
      setInfoWithDismiss({ type: InfoType.NONE });
    }
  }, []);

  useEffect(() => {
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
        console.log(`Initialized monitor`);
        setIsMonitorReady(true);
        setError({ code: -1 });
      } catch (e) {
        console.error('Error initializing HealthMonitor', e);
        setIsMonitorReady(false);
        setError({ code: e.errorCode });
      }
    })();
  }, [licenseKey, productId]);

  useEffect(() => {
    (async () => {
      try {
        if (!isMonitorReady || !processingTime || !video.current) {
          return;
        }

        session && sessionState === SessionState.ACTIVE && session.terminate();

        const options: FaceSessionOptions = {
          input: video.current,
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
        console.log(`Session created`);
        setSession(faceSession);
        setError({ code: -1 });
      } catch (e) {
        setError({ code: e.errorCode });
        console.error('Error creating a session', e);
      }
    })();
  }, [processingTime, isMonitorReady, cameraId, userInformation]);

  useEffect(() => {
    if (startMeasuring) {
      if (sessionState === SessionState.ACTIVE) {
        setFinalReport(undefined);
        setReportGeneratedAt(undefined);
        session.start();
        setError({ code: -1 });
      }
    } else {
      sessionState === SessionState.MEASURING && session.stop();
    }
  }, [startMeasuring]);

  const clearScanAlert = useCallback(() => {
    setError({ code: -1 });
    setWarning({ code: -1 });
  }, []);

  return {
    sessionState,
    vitalSigns: mapToReportVitalSigns(vitalSigns, enabledVitalSigns),
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
  };
};

export default useMonitor;

export enum AppErrorCode {
  MEASUREMENT_CODE_FACE_UNDETECTED_ERROR = 80001,
}

export enum InfoType {
  NONE,
  INSTRUCTION,
  SUCCESS,
}

export interface InfoData {
  type: InfoType;
  message?: string;
}

export enum VideoReadyState {
  HAVE_ENOUGH_DATA = 4,
}

export interface DisplayVitalSign<T> {
  value: T;
  isEnabled: boolean;
}

export interface BloodPressureValueDisplay {
  systolic: number;
  diastolic: number;
}

export interface ReportVitalSigns {
  pulseRate: DisplayVitalSign<number>;
  respirationRate: DisplayVitalSign<number>;
  stress: DisplayVitalSign<number>;
  hrvSdnn: DisplayVitalSign<number>;
  spo2: DisplayVitalSign<number>;
  bloodPressure: DisplayVitalSign<BloodPressureValueDisplay>;
  hemoglobin: DisplayVitalSign<number>;
  hemoglobinA1c: DisplayVitalSign<number>;
  wellnessIndex: DisplayVitalSign<number>;
}

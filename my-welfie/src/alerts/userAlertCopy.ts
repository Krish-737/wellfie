/** User-facing title + message overrides (B2C copy). Key = alert code. */
export const USER_ALERT_COPY: Record<
  number,
  { title: string; message: string }
> = {
  1001: {
    title: 'Camera not supported',
    message: 'This device camera does not meet scan requirements. Try another device with a front camera that supports 640×480 at 30 FPS.',
  },
  1002: {
    title: 'Camera unavailable',
    message: 'We could not open your camera. Check that it works in other apps, then refresh and try again.',
  },
  1005: {
    title: 'Camera access needed',
    message: 'Allow camera permission for this site in your browser settings, then tap Try Again.',
  },
  1501: {
    title: 'Camera quality notice',
    message: 'Your camera resolution may affect accuracy. If results seem off, try another device.',
  },
  2024: {
    title: 'No internet connection',
    message: 'Check your connection and try again.',
  },
  3003: {
    title: 'Scan stopped — face not detected',
    message: 'Keep your face centered in the guide, stay still, and ensure good lighting. Review our preparation guide for tips.',
  },
  3004: {
    title: 'Scan interrupted — poor detection',
    message: 'Close other apps, improve lighting on your face, and keep the phone steady. Wait a few minutes if your device feels warm.',
  },
  3008: {
    title: 'Scan interrupted — low performance',
    message: 'Your device may be overloaded or lighting is too low. Close other tabs and apps, let the device cool down, then try again.',
  },
  3009: {
    title: 'Scan interrupted',
    message: 'Something disrupted the scan timing. Please start a new scan.',
  },
  3500: {
    title: 'Hold still',
    message: 'We briefly lost your face — keep it centered in the frame.',
  },
  3505: {
    title: 'Camera performance low',
    message: 'Scan quality may be reduced. Follow the preparation guide for best results.',
  },
  4505: {
    title: 'Blood pressure unavailable',
    message: 'We could not calculate blood pressure this time. Your other results are still valid.',
  },
  7007: {
    title: 'Profile update needed',
    message: 'Weight must be between 40–200 kg for accurate scans. Update your health profile and try again.',
  },
  7008: {
    title: 'Profile update needed',
    message: 'Age must be between 18–110 years for scans. Update your health profile and try again.',
  },
  7012: {
    title: 'Profile update needed',
    message: 'Height must be between 130–230 cm for scans. Update your health profile and try again.',
  },
  7015: {
    title: 'Browser not supported',
    message: 'Update your browser to the latest version, or try Chrome or Edge on this device.',
  },
};

export const LICENSE_USER_MESSAGE =
  'Scan is temporarily unavailable. Check your internet connection and try again. If this continues, contact MyWellfie support with the reference code below.';

export const UNKNOWN_ERROR = {
  title: 'Scan could not complete',
  message: 'Something unexpected happened. Try again, or contact support with the reference code below.',
};

export const UNKNOWN_WARNING = {
  title: 'Scan quality notice',
  message: 'Something may affect this scan. Follow the preparation guide if issues continue.',
};

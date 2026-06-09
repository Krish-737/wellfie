import {
  Sex,
  SmokingStatus,
  UserInformation,
} from '@biosensesignal/web-sdk';

export type ProfileSex = 'male' | 'female' | 'unspecified';
export type ProfileSmoking = 'smoker' | 'non_smoker' | 'unspecified';

/** BioSense SDK scan ranges (errors 7007 / 7008 / 7012). */
export const SDK_AGE_MIN = 18;
export const SDK_AGE_MAX = 110;
export const SDK_HEIGHT_CM_MIN = 130;
export const SDK_HEIGHT_CM_MAX = 230;
export const SDK_WEIGHT_KG_MIN = 40;
export const SDK_WEIGHT_KG_MAX = 200;

export interface HealthProfile {
  sex: ProfileSex | null;
  date_of_birth: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  smoking_status: ProfileSmoking | null;
  profile_complete: boolean;
}

export function isProfileComplete(profile: Partial<HealthProfile>): boolean {
  return (
    (profile.sex === 'male' ||
      profile.sex === 'female' ||
      profile.sex === 'unspecified') &&
    profile.age != null &&
    profile.height_cm != null &&
    profile.weight_kg != null
  );
}

/** True when profile fields are set and within BioSense SDK limits for scanning. */
export function isSdkProfileReady(profile: Partial<HealthProfile>): boolean {
  if (!isProfileComplete(profile)) {
    return false;
  }
  const age = profile.age as number;
  const height = profile.height_cm as number;
  const weight = profile.weight_kg as number;
  return (
    age >= SDK_AGE_MIN &&
    age <= SDK_AGE_MAX &&
    height >= SDK_HEIGHT_CM_MIN &&
    height <= SDK_HEIGHT_CM_MAX &&
    weight >= SDK_WEIGHT_KG_MIN &&
    weight <= SDK_WEIGHT_KG_MAX
  );
}

/** User-facing message when scan is blocked due to profile state. */
export function getSdkProfileGateMessage(
  profile: Partial<HealthProfile> | null | undefined,
): string {
  if (!profile || !isProfileComplete(profile)) {
    return 'Complete your health profile before scanning. We need sex, date of birth, height, and weight for accurate results.';
  }
  const age = profile.age as number;
  const height = profile.height_cm as number;
  const weight = profile.weight_kg as number;
  if (age < SDK_AGE_MIN || age > SDK_AGE_MAX) {
    return `Age must be between ${SDK_AGE_MIN} and ${SDK_AGE_MAX} years for scans. Update your profile and try again.`;
  }
  if (height < SDK_HEIGHT_CM_MIN || height > SDK_HEIGHT_CM_MAX) {
    return `Height must be between ${SDK_HEIGHT_CM_MIN} and ${SDK_HEIGHT_CM_MAX} cm for scans. Update your profile and try again.`;
  }
  if (weight < SDK_WEIGHT_KG_MIN || weight > SDK_WEIGHT_KG_MAX) {
    return `Weight must be between ${SDK_WEIGHT_KG_MIN} and ${SDK_WEIGHT_KG_MAX} kg for scans. Update your profile and try again.`;
  }
  return 'Update your health profile before scanning.';
}

export function toSdkUserInformation(
  profile: Partial<HealthProfile>,
): UserInformation | undefined {
  if (!isSdkProfileReady(profile)) {
    return undefined;
  }

  const sex =
    profile.sex === 'male'
      ? Sex.MALE
      : profile.sex === 'female'
        ? Sex.FEMALE
        : Sex.UNSPECIFIED;

  let smokingStatus = SmokingStatus.UNSPECIFIED;
  if (profile.smoking_status === 'smoker') {
    smokingStatus = SmokingStatus.SMOKER;
  } else if (profile.smoking_status === 'non_smoker') {
    smokingStatus = SmokingStatus.NON_SMOKER;
  }

  return {
    sex,
    age: profile.age as number,
    height: profile.height_cm as number,
    weight: profile.weight_kg as number,
    smokingStatus,
  };
}

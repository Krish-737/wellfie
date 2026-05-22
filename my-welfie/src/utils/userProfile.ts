import {
  Sex,
  SmokingStatus,
  UserInformation,
} from '@biosensesignal/web-sdk';

export type ProfileSex = 'male' | 'female' | 'unspecified';
export type ProfileSmoking = 'smoker' | 'non_smoker' | 'unspecified';

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

export function toSdkUserInformation(
  profile: Partial<HealthProfile>,
): UserInformation | undefined {
  if (!isProfileComplete(profile)) {
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

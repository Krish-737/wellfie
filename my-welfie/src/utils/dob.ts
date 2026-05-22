/** Date of birth helpers — UI uses DD/MM/YYYY; API stores canonical date server-side. */

export const AGE_MIN = 15;
export const AGE_MAX = 120;

/** Auto-format digits into DD/MM/YYYY as the user types. */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Parse DD/MM/YYYY; returns null if incomplete or invalid. */
export function parseDobDdMmYyyy(value: string): Date | null {
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
}

export function ageFromDob(dob: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isDobInValidAgeRange(dob: Date): boolean {
  const age = ageFromDob(dob);
  return age >= AGE_MIN && age <= AGE_MAX;
}

/** Max DOB string for date picker boundary (120 years ago). */
export function minDobDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - AGE_MAX);
  return d;
}

/** Min DOB for 15+ (15 years ago, end of day). */
export function maxDobDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - AGE_MIN);
  return d;
}

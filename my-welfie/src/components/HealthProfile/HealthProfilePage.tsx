import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ShieldPlus, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobileLayout } from '../../hooks/useLayoutBreakpoint';
import PageContainer from '../../layout/PageContainer';
import { colors, typography } from '../../style/tokens';

import {
  getSdkProfileGateMessage,
  isProfileComplete,
  isSdkProfileReady,
} from '../../utils/userProfile';
import type { ProfileSex, ProfileSmoking } from '../../utils/userProfile';
import {
  cmToFtIn,
  formatHeightCmHint,
  formatWeightKgHint,
  ftInToCm,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  kgToLb,
  lbToKg,
  loadUnitPreference,
  saveUnitPreference,
  UnitSystem,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  WEIGHT_LB_MAX,
  WEIGHT_LB_MIN,
} from '../../utils/units';
import {
  AGE_MIN,
  AGE_MAX,
  ageFromDob,
  isDobInValidAgeRange,
  parseDobDdMmYyyy,
  minDobDate,
  maxDobDate,
} from '../../utils/dob';

const TEAL_DARK = colors.tealDark;
const TEAL_FOCUS = 'rgba(15, 118, 110, 0.12)';
const PROFILE_BLUE = '#2563eb';

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: 12,
};

const rangeHintStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginTop: 6,
};

const fieldNoticeStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#dc2626',
  marginTop: 6,
  fontWeight: 500,
  lineHeight: 1.45,
};

type ProfileFieldKey = 'dob' | 'height' | 'weight';

const bindInputFocus = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = TEAL_DARK;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${TEAL_FOCUS}`;
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.boxShadow = 'none';
  },
};

const UnitToggle: React.FC<{
  value: UnitSystem;
  onChange: (v: UnitSystem) => void;
  isMobile: boolean;
}> = ({ value, onChange, isMobile }) => (
  <div
    role="group"
    aria-label="Unit system"
    style={{
      display: 'flex',
      padding: 4,
      background: '#f1f5f9',
      borderRadius: 999,
      gap: 4,
    }}
  >
    {(['metric', 'imperial'] as const).map((opt) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
            transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
            background: active ? '#ffffff' : 'transparent',
            color: active ? PROFILE_BLUE : '#64748b',
            boxShadow: active ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
          }}
        >
          {opt === 'metric'
            ? isMobile ? 'Metric' : 'Metric (cm, kg)'
            : isMobile ? 'Imperial' : 'Imperial (ft, lb)'}
        </button>
      );
    })}
  </div>
);

const SEX_OPTIONS: {
  value: ProfileSex;
  label: string;
  shortLabel: string;
  Icon: React.FC<{ color: string; size?: number }>;
}[] = [
  {
    value: 'male',
    label: 'Male',
    shortLabel: 'Male',
    Icon: ({ color, size = 22 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="10" cy="14" r="5" />
        <path d="M15 9l5-5M20 4h-5M20 4v5" />
      </svg>
    ),
  },
  {
    value: 'female',
    label: 'Female',
    shortLabel: 'Female',
    Icon: ({ color, size = 22 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="9" r="5" />
        <path d="M12 14v7M9 18h6" />
      </svg>
    ),
  },
  {
    value: 'unspecified',
    label: 'Prefer not to say',
    shortLabel: 'Prefer not',
    Icon: ({ color, size = 22 }) => <User size={size} color={color} strokeWidth={2} />,
  },
];

const SexCards: React.FC<{
  value: ProfileSex | null;
  onChange: (v: ProfileSex) => void;
}> = ({ value, onChange }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
    }}
  >
    {SEX_OPTIONS.map(({ value: opt, label, shortLabel, Icon }) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '14px 6px',
            minHeight: 88,
            borderRadius: 14,
            border: active ? `2px solid ${TEAL_DARK}` : '1.5px solid #e2e8f0',
            background: active ? 'rgba(15, 118, 110, 0.06)' : '#ffffff',
            color: active ? TEAL_DARK : '#475569',
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <Icon color={active ? TEAL_DARK : '#64748b'} />
          <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>
            {shortLabel === 'Prefer not' ? (
              <>
                Prefer
                <br />
                not to say
              </>
            ) : (
              label
            )}
          </span>
        </button>
      );
    })}
  </div>
);

const SuffixInput: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  suffix: string;
  placeholder?: string;
  hasError?: boolean;
  type?: string;
  step?: number | string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  'aria-invalid'?: boolean;
}> = ({
  id,
  value,
  onChange,
  onBlur,
  suffix,
  placeholder,
  hasError = false,
  type = 'text',
  step,
  inputMode,
  autoComplete,
  'aria-invalid': ariaInvalid,
}) => {
  const [focused, setFocused] = useState(false);

  return (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      background: hasError ? '#fffafa' : '#f1f5f9',
      borderRadius: 12,
      border: hasError
        ? '1.5px solid #fca5a5'
        : focused
          ? `1.5px solid ${TEAL_DARK}`
          : '1.5px solid transparent',
      boxShadow: focused && !hasError ? `0 0 0 3px ${TEAL_FOCUS}` : 'none',
      overflow: 'hidden',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
  >
    <input
      id={id}
      type={type}
      step={step}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '14px 12px',
        fontSize: 16,
        fontWeight: 600,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: colors.slate900,
        fontFamily: typography.fontFamily,
      }}
    />
    <span
      style={{
        padding: '0 14px 0 4px',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#94a3b8',
        flexShrink: 0,
      }}
    >
      {suffix}
    </span>
  </div>
  );
};

const HealthProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const forScan = searchParams.get('for') === 'scan' || next.includes('/camera');
  const scanGateMessage = forScan ? getSdkProfileGateMessage(user) : null;
  const showScanBanner =
    forScan && !isSdkProfileReady(user) && !isProfileComplete(user ?? {});
  const isMobile = useIsMobileLayout();

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => loadUnitPreference());
  const [sex, setSex] = useState<ProfileSex | null>(null);
  const [dob, setDob] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [smoking, setSmoking] = useState<ProfileSmoking>('unspecified');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<ProfileFieldKey, boolean>>({
    dob: false,
    height: false,
    weight: false,
  });

  const markTouched = (field: ProfileFieldKey) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const showFieldError = (field: ProfileFieldKey) =>
    touched[field] || submitAttempted;

  const [dobFocused, setDobFocused] = useState(false);

  const populateFromUser = useCallback(() => {
    if (!user) return;
    if (
      user.sex === 'male' ||
      user.sex === 'female' ||
      user.sex === 'unspecified'
    ) {
      setSex(user.sex);
    }
    if (user.date_of_birth) setDob(user.date_of_birth);
    if (user.height_cm != null) {
      setHeightCm(String(user.height_cm));
      const { feet, inches } = cmToFtIn(user.height_cm);
      setHeightFt(String(feet));
      setHeightIn(String(inches));
    }
    if (user.weight_kg != null) {
      setWeightKg(String(user.weight_kg));
      setWeightLb(String(kgToLb(user.weight_kg)));
    }
    if (user.smoking_status) setSmoking(user.smoking_status as ProfileSmoking);
  }, [user]);

  useEffect(() => {
    populateFromUser();
  }, [populateFromUser]);

  const handleUnitChange = (nextUnit: UnitSystem) => {
    if (nextUnit === unitSystem) return;

    if (nextUnit === 'imperial') {
      const cm = parseFloat(heightCm);
      const kg = parseFloat(weightKg);
      if (!Number.isNaN(cm)) {
        const { feet, inches } = cmToFtIn(cm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
      if (!Number.isNaN(kg)) setWeightLb(String(kgToLb(kg)));
    } else {
      const ft = parseInt(heightFt, 10);
      const inch = parseFloat(heightIn);
      const lb = parseFloat(weightLb);
      if (!Number.isNaN(ft) && !Number.isNaN(inch)) {
        setHeightCm(String(ftInToCm(ft, inch)));
      }
      if (!Number.isNaN(lb)) setWeightKg(String(lbToKg(lb)));
    }

    setUnitSystem(nextUnit);
    saveUnitPreference(nextUnit);
  };

  const imperialHeightHint = useMemo(() => {
    const ft = parseInt(heightFt, 10);
    const inch = parseFloat(heightIn);
    if (Number.isNaN(ft) || Number.isNaN(inch)) return undefined;
    const cm = ftInToCm(ft, inch);
    if (cm < HEIGHT_CM_MIN || cm > HEIGHT_CM_MAX) return undefined;
    return formatHeightCmHint(cm);
  }, [heightFt, heightIn]);

  const imperialWeightHint = useMemo(() => {
    const lb = parseFloat(weightLb);
    if (Number.isNaN(lb)) return undefined;
    const kg = lbToKg(lb);
    if (kg < WEIGHT_KG_MIN || kg > WEIGHT_KG_MAX) return undefined;
    return formatWeightKgHint(kg);
  }, [weightLb]);

  const dobPreview = useMemo(() => {
    const parsed = parseDobDdMmYyyy(dob);
    if (!parsed) return null;
    if (!isDobInValidAgeRange(parsed)) return null;
    return ageFromDob(parsed);
  }, [dob]);

  const resolvedHeightCm = useMemo(() => {
    if (unitSystem === 'metric') {
      const n = parseFloat(heightCm);
      return Number.isNaN(n) ? null : n;
    }
    const ft = parseInt(heightFt, 10);
    const inch = parseFloat(heightIn);
    if (Number.isNaN(ft) || Number.isNaN(inch)) return null;
    return ftInToCm(ft, inch);
  }, [unitSystem, heightCm, heightFt, heightIn]);

  const resolvedWeightKg = useMemo(() => {
    if (unitSystem === 'metric') {
      const n = parseFloat(weightKg);
      return Number.isNaN(n) ? null : n;
    }
    const lb = parseFloat(weightLb);
    if (Number.isNaN(lb)) return null;
    return lbToKg(lb);
  }, [unitSystem, weightKg, weightLb]);

  const dobValidationError = useMemo((): string | null => {
    const trimmed = dob.trim();
    if (!trimmed) return 'Enter your date of birth.';
    const parsed = parseDobDdMmYyyy(dob);
    if (!parsed) return 'Enter a valid date of birth.';
    if (!isDobInValidAgeRange(parsed)) {
      return `Age must be between ${AGE_MIN} and ${AGE_MAX} years.`;
    }
    return null;
  }, [dob]);

  const heightValidationError = useMemo((): string | null => {
    if (unitSystem === 'metric') {
      if (!heightCm.trim()) return 'Enter your height.';
      if (resolvedHeightCm == null) return 'Enter a valid height in centimetres.';
    } else if (!heightFt.trim() && !heightIn.trim()) {
      return 'Enter your height in feet and inches.';
    } else if (resolvedHeightCm == null) {
      return 'Enter a valid height in feet and inches.';
    }
    if (
      resolvedHeightCm != null &&
      (resolvedHeightCm < HEIGHT_CM_MIN || resolvedHeightCm > HEIGHT_CM_MAX)
    ) {
      return `Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`;
    }
    return null;
  }, [unitSystem, heightCm, heightFt, heightIn, resolvedHeightCm]);

  const weightValidationError = useMemo((): string | null => {
    if (unitSystem === 'metric') {
      if (!weightKg.trim()) return 'Enter your weight.';
      if (resolvedWeightKg == null) return 'Enter a valid weight in kilograms.';
    } else if (!weightLb.trim()) {
      return 'Enter your weight in pounds.';
    } else if (resolvedWeightKg == null) {
      return 'Enter a valid weight in pounds.';
    }
    if (
      resolvedWeightKg != null &&
      (resolvedWeightKg < WEIGHT_KG_MIN || resolvedWeightKg > WEIGHT_KG_MAX)
    ) {
      const imperialNote =
        unitSystem === 'imperial'
          ? ` (${WEIGHT_LB_MIN}–${WEIGHT_LB_MAX} lb)`
          : '';
      return `Weight must be between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg${imperialNote}.`;
    }
    return null;
  }, [unitSystem, weightKg, weightLb, resolvedWeightKg]);

  const dobError = useMemo(() => {
    if (!dobValidationError) return null;
    const parsed = parseDobDdMmYyyy(dob);
    const isRangeIssue = parsed != null && !isDobInValidAgeRange(parsed);
    if (isRangeIssue || showFieldError('dob')) return dobValidationError;
    return null;
  }, [dob, dobValidationError, touched.dob, submitAttempted]);

  const heightError = useMemo(() => {
    if (!heightValidationError) return null;
    const isRangeIssue =
      resolvedHeightCm != null &&
      (resolvedHeightCm < HEIGHT_CM_MIN || resolvedHeightCm > HEIGHT_CM_MAX);
    if (isRangeIssue || showFieldError('height')) return heightValidationError;
    return null;
  }, [heightValidationError, resolvedHeightCm, touched.height, submitAttempted]);

  const weightError = useMemo(() => {
    if (!weightValidationError) return null;
    const isRangeIssue =
      resolvedWeightKg != null &&
      (resolvedWeightKg < WEIGHT_KG_MIN || resolvedWeightKg > WEIGHT_KG_MAX);
    if (isRangeIssue || showFieldError('weight')) return weightValidationError;
    return null;
  }, [weightValidationError, resolvedWeightKg, touched.weight, submitAttempted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError(null);

    if (sex !== 'male' && sex !== 'female' && sex !== 'unspecified') {
      setError('Please select sex at birth.');
      return;
    }

    if (dobValidationError || heightValidationError || weightValidationError) {
      return;
    }

    const heightNum = resolvedHeightCm as number;
    const weightNum = resolvedWeightKg as number;

    setLoading(true);
    try {
      await updateProfile({
        sex,
        date_of_birth: dob.trim(),
        height_cm: heightNum,
        weight_kg: weightNum,
        smoking_status: smoking,
      });
      saveUnitPreference(unitSystem);
      navigate(next, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 40px 14px 14px',
    fontSize: 15,
    fontWeight: 600,
    border: '1.5px solid transparent',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box',
    color: colors.slate900,
    fontFamily: typography.fontFamily,
    background: `#f1f5f9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center`,
    cursor: 'pointer',
    appearance: 'none',
  };

  return (
    <PageContainer variant="profile">
      <div
        style={{
          width: '100%',
          minHeight: isMobile
            ? 'calc(100dvh - 56px - 56px)'
            : 'calc(100dvh - 72px)',
          background: '#ffffff',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          padding: isMobile ? '20px 16px 28px' : '0',
          fontFamily: typography.fontFamily,
          display: isMobile ? 'block' : 'flex',
          justifyContent: 'center',
        }}
      >
        {/* Desktop: centered column with max width */}
        <div
          style={{
            width: '100%',
            maxWidth: isMobile ? '100%' : 680,
            padding: isMobile ? '0' : '36px 0 48px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <ShieldPlus size={32} color={TEAL_DARK} strokeWidth={2} />
          </div>

          <h1
            style={{
              fontSize: isMobile ? 28 : 32,
              fontWeight: 800,
              color: colors.slate900,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            Health profile
          </h1>

          <p
            style={{
              fontSize: 15,
              color: colors.slate500,
              lineHeight: 1.55,
              margin: '0 0 12px',
              maxWidth: 480,
            }}
          >
            A few details help us calculate Heart Age and cardiovascular risk more accurately during your scan.
          </p>

          <ul
            style={{
              margin: '0 0 28px',
              padding: 0,
              listStyle: 'none',
              fontSize: 13,
              color: '#94a3b8',
              lineHeight: 1.7,
            }}
          >
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEAL_DARK, fontSize: 8 }}>●</span>
              Used for scan accuracy
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEAL_DARK, fontSize: 8 }}>●</span>
              Stored securely
            </li>
          </ul>

          {showScanBanner && scanGateMessage && (
            <div
              style={{
                background: '#ecfeff',
                border: '1px solid #99f6e4',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: 14,
                lineHeight: 1.5,
                color: TEAL_DARK,
                fontWeight: 500,
              }}
            >
              {scanGateMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '100%', width: '100%', minWidth: 0 }}>
            <section style={{ marginBottom: 24 }}>
              <p style={sectionLabelStyle}>Sex at birth</p>
              <SexCards value={sex} onChange={setSex} />
            </section>

            <section style={{ marginBottom: 24 }}>
              <p style={sectionLabelStyle}>Date of birth</p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: dobError ? '#fffafa' : '#f1f5f9',
                  borderRadius: 12,
                  border: dobError
                    ? '1.5px solid #fca5a5'
                    : dobFocused
                      ? `1.5px solid ${TEAL_DARK}`
                      : '1.5px solid transparent',
                  boxShadow: dobFocused && !dobError ? `0 0 0 3px ${TEAL_FOCUS}` : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <input
                  id="dob"
                  type="date"
                  autoComplete="bday"
                  value={dob || ''}
                  onChange={(e) => setDob(e.target.value)}
                  onFocus={() => setDobFocused(true)}
                  onBlur={() => {
                    setDobFocused(false);
                    markTouched('dob');
                  }}
                  min={minDobDate().toISOString().slice(0, 10)}
                  max={maxDobDate().toISOString().slice(0, 10)}
                  aria-invalid={!!dobError}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '14px 12px',
                    fontSize: 16,
                    fontWeight: 600,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: colors.slate900,
                    fontFamily: typography.fontFamily,
                    minHeight: 24,
                  }}
                />
              </div>
              {dobError ? (
                <p style={fieldNoticeStyle} role="alert">{dobError}</p>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: '#94a3b8',
                    marginTop: 8,
                    fontStyle: dobPreview != null ? 'italic' : 'normal',
                  }}
                >
                  {dobPreview != null
                    ? `Age: ${dobPreview} years (saved when you continue)`
                    : `Age ${AGE_MIN}–${AGE_MAX} years`}
                </p>
              )}
            </section>

            <section style={{ marginBottom: 24 }}>
              <p style={sectionLabelStyle}>Body measurements</p>
              <div style={{ marginBottom: 16 }}>
                <UnitToggle value={unitSystem} onChange={handleUnitChange} isMobile={isMobile} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12,
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {unitSystem === 'metric' ? (
                  <>
                    <div style={{ minWidth: 0 }}>
                      <SuffixInput
                        id="height-cm"
                        type="number"
                        step={0.1}
                        value={heightCm}
                        onChange={setHeightCm}
                        onBlur={() => markTouched('height')}
                        suffix="CM"
                        placeholder="172.7"
                        hasError={!!heightError}
                        aria-invalid={!!heightError}
                      />
                      {heightError ? (
                        <p style={fieldNoticeStyle} role="alert">{heightError}</p>
                      ) : (
                        <p style={rangeHintStyle}>
                          Range: {HEIGHT_CM_MIN}–{HEIGHT_CM_MAX} CM
                        </p>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <SuffixInput
                        id="weight-kg"
                        type="number"
                        step={0.1}
                        value={weightKg}
                        onChange={setWeightKg}
                        onBlur={() => markTouched('weight')}
                        suffix="KG"
                        placeholder="85"
                        hasError={!!weightError}
                        aria-invalid={!!weightError}
                      />
                      {weightError ? (
                        <p style={fieldNoticeStyle} role="alert">{weightError}</p>
                      ) : (
                        <p style={rangeHintStyle}>
                          Range: {WEIGHT_KG_MIN}–{WEIGHT_KG_MAX} KG
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <SuffixInput
                            id="height-ft"
                            type="number"
                            value={heightFt}
                            onChange={setHeightFt}
                            onBlur={() => markTouched('height')}
                            suffix="FT"
                            placeholder="5"
                            hasError={!!heightError}
                            aria-invalid={!!heightError}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <SuffixInput
                            id="height-in"
                            type="number"
                            step={0.5}
                            value={heightIn}
                            onChange={setHeightIn}
                            onBlur={() => markTouched('height')}
                            suffix="IN"
                            placeholder="8"
                            hasError={!!heightError}
                            aria-invalid={!!heightError}
                          />
                        </div>
                      </div>
                      {heightError ? (
                        <p style={fieldNoticeStyle} role="alert">{heightError}</p>
                      ) : imperialHeightHint ? (
                        <p style={{ ...rangeHintStyle, color: TEAL_DARK }}>{imperialHeightHint}</p>
                      ) : (
                        <p style={rangeHintStyle}>
                          Range: {HEIGHT_CM_MIN}–{HEIGHT_CM_MAX} CM
                        </p>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <SuffixInput
                        id="weight-lb"
                        type="number"
                        step={0.1}
                        value={weightLb}
                        onChange={setWeightLb}
                        onBlur={() => markTouched('weight')}
                        suffix="LB"
                        placeholder="187"
                        hasError={!!weightError}
                        aria-invalid={!!weightError}
                      />
                      {weightError ? (
                        <p style={fieldNoticeStyle} role="alert">{weightError}</p>
                      ) : (
                        <p style={rangeHintStyle}>
                          {imperialWeightHint ||
                            `Range: ${WEIGHT_LB_MIN}–${WEIGHT_LB_MAX} LB`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <p style={sectionLabelStyle}>Smoking status</p>
              <select
                id="smoking"
                style={selectStyle}
                value={smoking}
                onChange={(e) => setSmoking(e.target.value as ProfileSmoking)}
                {...bindInputFocus}
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="non_smoker">Never / non-smoker</option>
                <option value="smoker">Current smoker</option>
              </select>
            </section>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#dc2626',
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '16px 0',
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                background: loading ? '#94a3b8' : TEAL_DARK,
                border: 'none',
                borderRadius: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                fontFamily: typography.fontFamily,
              }}
            >
              {loading ? 'Saving…' : 'Save and continue'}
              {!loading && <ArrowRight size={18} strokeWidth={2.5} />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                width: '100%',
                marginTop: 14,
                padding: '10px',
                fontSize: 14,
                fontWeight: 600,
                color: colors.slate500,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: typography.fontFamily,
              }}
            >
              Back to dashboard
            </button>
          </form>

          <p
            style={{
              marginTop: 32,
              fontSize: 11,
              color: '#94a3b8',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            © 2026 MyWellfie. All health data is encrypted and HIPAA compliant.
          </p>

        </div> {/* end centered column */}
      </div>
    </PageContainer>
  );
};

export default HealthProfilePage;

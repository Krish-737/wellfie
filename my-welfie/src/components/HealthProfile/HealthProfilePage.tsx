import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
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
} from '../../utils/units';
import {
  AGE_MIN,
  AGE_MAX,
  ageFromDob,
  formatDobInput,
  isDobInValidAgeRange,
  parseDobDdMmYyyy,
} from '../../utils/dob';
import loginLogoSrc from '../../assets/My-Wellfie-login-logo.png';

const TEAL = '#0d9488';
const TEAL_LIGHT = 'rgba(13, 148, 136, 0.12)';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 8,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: 12,
};

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  fontSize: 15,
  border: '1.5px solid #e5e7eb',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111827',
  fontFamily: 'inherit',
  background: '#ffffff',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  marginTop: 6,
};

const bindInputFocus = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = TEAL;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${TEAL_LIGHT}`;
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#e5e7eb';
    e.currentTarget.style.boxShadow = 'none';
  },
};

const Field: React.FC<{
  label: string;
  id?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, id, hint, children }) => (
  <div>
    <label htmlFor={id} style={labelStyle}>{label}</label>
    {children}
    {hint && <p style={hintStyle}>{hint}</p>}
  </div>
);

const UnitToggle: React.FC<{
  value: UnitSystem;
  onChange: (v: UnitSystem) => void;
}> = ({ value, onChange }) => (
  <div
    role="group"
    aria-label="Unit system"
    style={{
      display: 'flex',
      padding: 4,
      background: '#f1f5f9',
      borderRadius: 12,
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
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 9,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
            background: active ? '#ffffff' : 'transparent',
            color: active ? TEAL : '#64748b',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {opt === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lb)'}
        </button>
      );
    })}
  </div>
);

const SEX_OPTIONS: { value: ProfileSex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

const SexPills: React.FC<{
  value: ProfileSex | null;
  onChange: (v: ProfileSex) => void;
  isMobile: boolean;
}> = ({ value, onChange, isMobile }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {SEX_OPTIONS.map(({ value: opt, label }) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: isMobile && opt === 'unspecified' ? '1 1 100%' : 1,
            padding: isMobile ? '12px 10px' : '13px 12px',
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
            borderRadius: 12,
            border: active ? `2px solid ${TEAL}` : '1.5px solid #e5e7eb',
            background: active ? TEAL_LIGHT : '#ffffff',
            color: active ? '#0f766e' : '#374151',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s, background 0.15s',
            minWidth: 0,
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const ProfileCard: React.FC<{ isMobile: boolean; children: React.ReactNode }> = ({
  isMobile,
  children,
}) => (
  <div style={{
    width: '100%',
    maxWidth: isMobile ? 440 : 520,
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
    padding: isMobile ? '32px 24px 28px' : '48px 40px 40px',
  }}>
    {children}
  </div>
);

const HealthProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const isMobile = useMediaPredicate('(max-width: 640px)');

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

  const [showHealthIndicators, setShowHealthIndicators] = useState<boolean>(() => {
  return localStorage.getItem('showHealthIndicators') !== 'false'; // default ON
});

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

  const handleUnitChange = (next: UnitSystem) => {
    if (next === unitSystem) return;

    if (next === 'imperial') {
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

    setUnitSystem(next);
    saveUnitPreference(next);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sex !== 'male' && sex !== 'female' && sex !== 'unspecified') {
      setError('Please select sex at birth.');
      return;
    }

    const parsedDob = parseDobDdMmYyyy(dob);
    if (!parsedDob) {
      setError('Enter a valid date of birth as DD/MM/YYYY (e.g. 20/05/1991).');
      return;
    }
    if (!isDobInValidAgeRange(parsedDob)) {
      setError(`Date of birth must imply an age between ${AGE_MIN} and ${AGE_MAX}.`);
      return;
    }

    let heightNum: number;
    let weightNum: number;

    if (unitSystem === 'metric') {
      heightNum = parseFloat(heightCm);
      weightNum = parseFloat(weightKg);
      if (Number.isNaN(heightNum) || heightNum < HEIGHT_CM_MIN || heightNum > HEIGHT_CM_MAX) {
        setError(`Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`);
        return;
      }
      if (Number.isNaN(weightNum) || weightNum < WEIGHT_KG_MIN || weightNum > WEIGHT_KG_MAX) {
        setError(`Weight must be between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg.`);
        return;
      }
    } else {
      const ft = parseInt(heightFt, 10);
      const inch = parseFloat(heightIn);
      const lb = parseFloat(weightLb);
      if (Number.isNaN(ft) || Number.isNaN(inch)) {
        setError('Enter your height in feet and inches.');
        return;
      }
      heightNum = ftInToCm(ft, inch);
      if (heightNum < HEIGHT_CM_MIN || heightNum > HEIGHT_CM_MAX) {
        setError('Height must be between about 3′3″ and 8′2″.');
        return;
      }
      if (Number.isNaN(lb)) {
        setError('Enter your weight in pounds.');
        return;
      }
      weightNum = lbToKg(lb);
      if (weightNum < WEIGHT_KG_MIN || weightNum > WEIGHT_KG_MAX) {
        setError('Weight must be between about 66 and 661 lb.');
        return;
      }
    }

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

  const measurementsGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: 16,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '16px' : '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <ProfileCard isMobile={isMobile}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img src={loginLogoSrc} alt="My Wellfie" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
          Health profile
        </h1>
        <p style={{ textAlign: 'center', fontSize: 15, color: '#6b7280', lineHeight: 1.55, margin: '0 0 8px' }}>
          A few details help us calculate Heart Age and cardiovascular risk more accurately during your scan.
        </p>
        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#94a3b8',
          margin: '0 0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <span style={{ color: TEAL }}>●</span>
          Used for scan accuracy · Stored securely
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 20 }}>
            <UnitToggle value={unitSystem} onChange={handleUnitChange} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Sex at birth</label>
            <SexPills value={sex} onChange={setSex} isMobile={isMobile} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Field
              label="Date of birth"
              id="dob"
              hint={
                dobPreview != null
                  ? `Age: ${dobPreview} years (saved when you continue)`
                  : 'Format: DD/MM/YYYY'
              }
            >
              <input
                id="dob"
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                required
                style={baseInputStyle}
                value={dob}
                onChange={(e) => setDob(formatDobInput(e.target.value))}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                {...bindInputFocus}
              />
            </Field>
          </div>

          <p style={{ ...sectionLabelStyle, marginTop: 4 }}>Body measurements</p>

          <div style={{ ...measurementsGrid, marginBottom: 20 }}>
            {unitSystem === 'metric' ? (
              <>
                <Field label="Height" id="height-cm" hint="Centimetres">
                  <input
                    id="height-cm"
                    type="number"
                    min={HEIGHT_CM_MIN}
                    max={HEIGHT_CM_MAX}
                    step={0.1}
                    required
                    style={baseInputStyle}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 165"
                    {...bindInputFocus}
                  />
                </Field>
                <Field label="Weight" id="weight-kg" hint="Kilograms">
                  <input
                    id="weight-kg"
                    type="number"
                    min={WEIGHT_KG_MIN}
                    max={WEIGHT_KG_MAX}
                    step={0.1}
                    required
                    style={baseInputStyle}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 75"
                    {...bindInputFocus}
                  />
                </Field>
              </>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Height</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        id="height-ft"
                        type="number"
                        min={3}
                        max={8}
                        required
                        style={baseInputStyle}
                        value={heightFt}
                        onChange={(e) => setHeightFt(e.target.value)}
                        placeholder="ft"
                        aria-label="Feet"
                        {...bindInputFocus}
                      />
                      <span style={{ ...hintStyle, display: 'block', textAlign: 'center' }}>ft</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        id="height-in"
                        type="number"
                        min={0}
                        max={11}
                        step={0.5}
                        required
                        style={baseInputStyle}
                        value={heightIn}
                        onChange={(e) => setHeightIn(e.target.value)}
                        placeholder="in"
                        aria-label="Inches"
                        {...bindInputFocus}
                      />
                      <span style={{ ...hintStyle, display: 'block', textAlign: 'center' }}>in</span>
                    </div>
                  </div>
                  {imperialHeightHint && (
                    <p style={{ ...hintStyle, color: TEAL, fontWeight: 500 }}>{imperialHeightHint}</p>
                  )}
                </div>
                <Field label="Weight" id="weight-lb" hint={imperialWeightHint || 'Pounds'}>
                  <input
                    id="weight-lb"
                    type="number"
                    min={66}
                    max={661}
                    step={0.1}
                    required
                    style={baseInputStyle}
                    value={weightLb}
                    onChange={(e) => setWeightLb(e.target.value)}
                    placeholder="e.g. 165"
                    {...bindInputFocus}
                  />
                </Field>
              </>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <Field label="Smoking status" id="smoking" hint="Optional">
              <select
                id="smoking"
                style={{ ...baseInputStyle, cursor: 'pointer' }}
                value={smoking}
                onChange={(e) => setSmoking(e.target.value as ProfileSmoking)}
                {...bindInputFocus}
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="non_smoker">Never / non-smoker</option>
                <option value="smoker">Current smoker</option>
              </select>
            </Field>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#dc2626',
              margin: '16px 0',
            }}>
              {error}
            </div>
          )}
                          {/* Health Indicators Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#f8fafc',
              borderRadius: 12,
              border: '1.5px solid #e5e7eb',
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Show Health Indicators
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Display health cards on your dashboard
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !showHealthIndicators;
                  setShowHealthIndicators(next);
                  localStorage.setItem('showHealthIndicators', String(next));
                }}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  background: showHealthIndicators ? TEAL : '#d1d5db',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                role="switch"
                aria-checked={showHealthIndicators}
                aria-label="Show health indicators on dashboard"
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  left: showHealthIndicators ? 23 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '15px 0',
              fontSize: 16,
              fontWeight: 700,
              color: '#ffffff',
              background: loading ? '#94a3b8' : TEAL,
              border: 'none',
              borderRadius: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#0f766e';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = TEAL;
            }}
          >
            {loading ? 'Saving…' : 'Save and continue'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '10px',
              fontSize: 14,
              color: '#6b7280',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Back to dashboard
          </button>
        </form>
      </ProfileCard>
    </div>
  );
};

export default HealthProfilePage;

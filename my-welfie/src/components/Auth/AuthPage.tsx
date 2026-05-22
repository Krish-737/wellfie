import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/apiFetch';
import { API_BASE } from '../../api/config';
import loginLogoSrc from '../../assets/My-Wellfie-login-logo.png';

type Mode = 'signin' | 'signup';
interface LocationState { from?: string; }
type OAuthProvider = 'google' | 'microsoft' | 'facebook';


const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
    <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
    <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
    <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#1877F2"/>
    <path fill="#fff" d="M13.5 8.5H15V6h-1.5C11.57 6 10 7.57 10 9.5V11H8v2.5h2V21h2.5v-7.5H15l.5-2.5h-3V9.5c0-.55.45-1 1-1z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);

const SOCIAL_BUTTONS: { label: string; provider: OAuthProvider; Icon: React.FC }[] = [
  { label: 'Continue with Google', provider: 'google', Icon: GoogleIcon },
  { label: 'Continue with Microsoft', provider: 'microsoft', Icon: MicrosoftIcon },
  { label: 'Continue with Facebook', provider: 'facebook', Icon: FacebookIcon },
];

const AuthPage: React.FC = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaPredicate('(max-width: 640px)');

  const from = (location.state as LocationState)?.from ?? '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    apiFetch('/auth/oauth/providers')
      .then((res) => (res.ok ? res.json() : { providers: [] }))
      .then((data) => setOauthProviders(data.providers ?? []))
      .catch(() => setOauthProviders([]));
  }, []);

  const switchMode = (m: Mode) => { setMode(m); setError(null); };

  const oauthNext = mode === 'signup'
    ? '/profile?next=' + encodeURIComponent('/dashboard?welcome=1')
    : from;

  const handleOAuth = (provider: OAuthProvider) => {
    const url = `${API_BASE}/auth/oauth/${provider}/start?${new URLSearchParams({ next: oauthNext })}`;
    window.location.href = url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
        navigate(from, { replace: true });
      } else {
        await signup(email, password, fullName || undefined);
        navigate('/profile?next=' + encodeURIComponent('/dashboard?welcome=1'), { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const visibleSocial = SOCIAL_BUTTONS.filter((b) => oauthProviders.includes(b.provider));
  const isDisabled = loading || !email || !password || (mode === 'signup' && !fullName);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px 13px 44px',
    fontSize: 15,
    border: '1.5px solid #e5e7eb',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
    color: '#111827',
    background: '#ffffff',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '32px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#ffffff',
        borderRadius: 24,
        boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
        padding: isMobile ? '36px 24px 32px' : '48px 40px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 88, height: 88,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img src={loginLogoSrc} alt="MyWellfie" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          </div>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
          Welcome to MyWellfie
        </h1>
        <p style={{ textAlign: 'center', fontSize: 15, color: '#6b7280', margin: '0 0 28px' }}>
          {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
        </p>

        {visibleSocial.length > 0 && (
          <>
            {visibleSocial.map(({ label, Icon, provider }) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleOAuth(provider)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: '13px 16px', marginBottom: 12,
                  background: '#ffffff', border: '1.5px solid #e5e7eb', borderRadius: 12,
                  fontSize: 15, fontWeight: 600, color: '#111827', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Icon />
                {label}
              </button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                  <UserIcon />
                </span>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <EmailIcon />
              </span>
              <input
                style={inputStyle}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <LockIcon />
              </span>
              <input
                style={inputStyle}
                type="password"
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', margin: '12px 0' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isDisabled} style={{
            width: '100%', marginTop: 20, padding: '15px 0',
            fontSize: 16, fontWeight: 700, color: '#ffffff',
            background: isDisabled ? '#6b7280' : 'rgb(15, 23, 42)',
            border: 'none', borderRadius: 14,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}>
            {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create Account')}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, fontSize: 13 }}>
          {mode === 'signin' ? (
            <>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>
                Forgot password?
              </button>
              <span style={{ color: '#6b7280' }}>
                Need an account?{' '}
                <button type="button" onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(15, 23, 42)', fontWeight: 700, fontSize: 13, padding: 0, fontFamily: 'inherit' }}>
                  Sign up
                </button>
              </span>
            </>
          ) : (
            <span style={{ color: '#6b7280', margin: '0 auto' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(15, 23, 42)', fontWeight: 700, fontSize: 13, padding: 0, fontFamily: 'inherit' }}>
                Sign in
              </button>
            </span>
          )}
        </div>

        {mode === 'signup' && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
            You get 1 free scan when you sign up.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Handles redirect from backend OAuth callback:
 * /auth/callback?token=...&next=/dashboard
 * /auth/callback?error=...
 */
const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [message, setMessage] = useState('Completing sign-in…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setMessage(error);
      setFailed(true);
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setMessage('Missing sign-in token. Please try again from the login page.');
      setFailed(true);
      return;
    }

    const next = searchParams.get('next') || '/dashboard';
    const isNew = searchParams.get('new') === '1';

    (async () => {
      try {
        const user = await loginWithToken(token);
        if (isNew || !user?.profile_complete) {
          const dest = isNew ? '/dashboard?welcome=1' : next;
          navigate(
            `/profile?next=${encodeURIComponent(dest)}`,
            { replace: true },
          );
        } else {
          navigate(next.startsWith('/') ? next : '/dashboard', { replace: true });
        }
      } catch {
        setMessage('Could not complete sign-in. Please try again.');
        setFailed(true);
      }
    })();
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#64748b',
        fontSize: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {failed && (
        <Link to="/login" style={{ display: 'inline-block', marginTop: 16, color: '#0f766e', fontWeight: 600 }}>
          Back to sign in
        </Link>
      )}
    </div>
  );
};

export default OAuthCallbackPage;

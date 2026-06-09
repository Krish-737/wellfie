import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/ADBb0ugxQnJqLf_R2UEQk_ckDiojQ7F5iYwlTiytC4oSJjAlL8WnH4sMXrzvYisSlMNk84uppfl2BYrNEgik9prkU0vA6JCEI_Dic44OJXdBMZOS3NffAUKHY6OJTMrd0vrFAH5ZVXjigyTFUp-EZiJNIEsNZo-fBoN83X7tb-zAstnciHw3oFvn_WQmaCBhQRdys3R0QDFhfn2nEqq8_ZjlkORJNLki_mBdKfx2i-eYvTwvky9uhZJSbPAHV5qpuzv4m0ZYiNX_4SgvKiA';

const Navbar_v2: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, scansRemaining } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const handleLogout = () => { logout(); navigate('/'); };

  const badgeLabel = scansRemaining === 0
    ? '0 scans left'
    : scansRemaining > 0
      ? `${scansRemaining} scan${scansRemaining === 1 ? '' : 's'} left`
      : null;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(3, 20, 39, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMobile ? '0 20px' : '0 64px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 72,
      }}>
        {/* Logo */}
        <img
          src={LOGO_URL}
          alt="MyWellfie"
          style={{ height: isMobile ? 40 : 52, width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />

        {/* Nav links — desktop only */}
        {!isTablet && (
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="/" style={{ color: '#4edea3', fontWeight: 700, fontSize: 16, textDecoration: 'none', borderBottom: '2px solid #4edea3', paddingBottom: 2 }}>
              Home
            </a>
            <a href="#" style={{ color: '#bbcabf', fontWeight: 500, fontSize: 16, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d3e4fe')}
              onMouseLeave={e => (e.currentTarget.style.color = '#bbcabf')}>
              Dashboard
            </a>
            <a href="#" style={{ color: '#bbcabf', fontWeight: 500, fontSize: 16, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d3e4fe')}
              onMouseLeave={e => (e.currentTarget.style.color = '#bbcabf')}>
              Community
            </a>
          </nav>
        )}

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              {badgeLabel && (
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                  background: scansRemaining === 0 ? 'rgba(255,100,100,0.15)' : 'rgba(78,222,163,0.15)',
                  color: scansRemaining === 0 ? '#fca5a5' : '#4edea3',
                  border: `1px solid ${scansRemaining === 0 ? 'rgba(255,100,100,0.3)' : 'rgba(78,222,163,0.3)'}`,
                  borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' as const,
                }}>
                  {badgeLabel}
                </span>
              )}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(78,222,163,0.2)', border: '1px solid rgba(78,222,163,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4edea3', fontWeight: 700, fontSize: 14,
              }}>
                {initials}
              </div>
              {!isMobile && (
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#bbcabf',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d3e4fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#bbcabf'; }}
                >
                  Log out
                </button>
              )}
              <button
                onClick={() => navigate('/camera')}
                style={{
                  background: '#4edea3', color: '#003824',
                  border: 'none', borderRadius: 9999,
                  padding: isMobile ? '8px 16px' : '8px 20px',
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const, cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {isMobile ? 'Scan' : 'Start Scan'}
              </button>
            </>
          ) : (
            <>
              {!isMobile && (
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    fontSize: 14, fontWeight: 600, color: '#d3e4fe',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '8px 18px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Log In
                </button>
              )}
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: '#4edea3', color: '#003824',
                  border: 'none', borderRadius: 9999,
                  padding: '8px 20px',
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const, cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Start Scan
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar_v2;

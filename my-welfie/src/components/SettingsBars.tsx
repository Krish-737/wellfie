import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoSrc from '../assets/mywellfie-logo.png';

// ── SVG helpers ───────────────────────────────────────────────────────────────

const SvgIcon: React.FC<{ d: string; size?: number }> = ({ d, size = 20 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

// ── Nav structure (mirrors landing page) ──────────────────────────────────────

const NAV_SECTIONS = [
  {
    group: null,
    items: [
      {
        label: 'Home',
        path: '/',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        label: 'Scan',
        path: '/camera',
        icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const SettingsBars = ({ open, onClose, cameras, isLicenseValid: _isLicenseValid }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, scansRemaining } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [cameraId, setCameraId] = useState<string>();

  useEffect(() => {
    cameras?.length && setCameraId(cameras[0].deviceId);
  }, [cameras]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose({ cameraId });
      setIsClosing(false);
    }, 260);
  }, [cameraId, onClose]);

  const handleNav = useCallback((path: string) => {
    handleClose();
    setTimeout(() => navigate(path), 280);
  }, [handleClose, navigate]);

  const handleSignOut = useCallback(() => {
    handleClose();
    setTimeout(() => { logout(); navigate('/'); }, 280);
  }, [handleClose, logout, navigate]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.full_name || user?.email || '';

  const badgeLabel = scansRemaining === 0
    ? '0 scans left'
    : scansRemaining > 0
      ? `${scansRemaining} scan${scansRemaining === 1 ? '' : 's'} left`
      : null;

  return (
    // Always keep this div in the DOM — CameraApp uses getElementById('settingsBars')
    // for click-outside detection and crashes if the element is missing.
    <div id="settingsBars">
    {(open || isClosing) && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.38)',
          opacity: isClosing ? 0 : 1,
          transition: 'opacity 0.25s',
        }}
      />

      {/* Drawer panel — slides from right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: Math.min(360, window.innerWidth),
        background: '#ffffff',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.14)',
        transform: isClosing ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
        }}>
          <img src={logoSrc} alt="MyWellfie" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          <button
            onClick={handleClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              padding: '8px 10px', cursor: 'pointer', color: '#334155',
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc',
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: '50%',
              background: '#ccfbf1', color: '#0f766e',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15, flexShrink: 0,
            }}>
              {initials}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </p>
              {badgeLabel !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: scansRemaining === 0 ? '#ea580c' : '#0d9488',
                }}>
                  {badgeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.group && (
                <p style={{
                  margin: '16px 8px 6px', fontSize: 11, fontWeight: 600,
                  color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {section.group}
                </p>
              )}
              {section.items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNav(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      width: '100%', padding: '13px 16px',
                      borderRadius: 10, border: 'none',
                      fontSize: 15, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#1e293b',
                      background: isActive ? 'rgb(15, 23, 42)' : 'transparent',
                      textAlign: 'left', cursor: 'pointer',
                      marginBottom: 2, fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <SvgIcon d={item.icon} size={20} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sign out footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '14px 0',
              borderRadius: 12, fontSize: 15, fontWeight: 700,
              color: '#64748b', background: '#f1f5f9', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
    )}
    </div>
  );
};

export default SettingsBars;

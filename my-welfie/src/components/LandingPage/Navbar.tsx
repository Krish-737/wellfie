import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/mywellfie-logo.png';

// ── Icon helpers ───────────────────────────────────────────────────────────────

const SvgIcon: React.FC<{ d: string; size?: number }> = ({ d, size = 20 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

// ── Menu structure ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    group: null,
    items: [
      { label: 'Home',     href: '/',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', active: true },
      { label: 'Pricing', href: '#pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', active: false },
    ],
  },
  {
    group: 'Health & Wellness',
    items: [
      { label: 'Challenges', href: '#', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', active: false },
      { label: 'Community',  href: '#', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', active: false },
    ],
  },
  {
    group: 'Resources',
    items: [
      { label: 'Resources',         href: '#', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', active: false },
      { label: 'Health Indicators', href: '#', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', active: false },
    ],
  },
];

// ── Dropdown menu items for logged-in avatar ───────────────────────────────────

const AVATAR_MENU = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    label: 'Start Scan',
    path: '/camera',
    icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile   = useMediaPredicate('(max-width: 640px)');
  const isTablet   = useMediaPredicate('(max-width: 1024px)');
  const showHamburger = isTablet;

  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Clean, modern scroll lock implementation
  useEffect(() => {
    if (showHamburger && menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen, showHamburger]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.email
    ? (user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.email[0].toUpperCase())
    : '?';

  const displayName = user?.full_name || user?.email || '';

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); setAvatarOpen(false); };

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 76 }}>

            {/* Logo */}
            <div onClick={() => navigate('/')} style={{ cursor: 'pointer', flexShrink: 0 }}>
              <img src={logoSrc} alt="MyWellfie" style={{ height: isMobile ? 48 : 64, width: 'auto', objectFit: 'contain' }} />
            </div>

            {/* Desktop nav links */}
            {!showHamburger && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {NAV_SECTIONS.flatMap(s => s.items).map(item => (
                  <a key={item.label} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 14, fontWeight: item.active ? 600 : 500,
                    color: item.active ? '#0d9488' : '#334155',
                    textDecoration: 'none', cursor: 'pointer', transition: 'color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#0d9488')}
                    onMouseLeave={e => (e.currentTarget.style.color = item.active ? '#0d9488' : '#334155')}
                  >
                    <SvgIcon d={item.icon} size={16} />
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            {/* Right section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

              {/* Logged-in — avatar dropdown (desktop only) */}
              {user?.email && !showHamburger && (
                <div ref={avatarRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setAvatarOpen(o => !o)}
                    title={displayName}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: '1px solid #e2e8f0',
                      borderRadius: 40, padding: '5px 12px 5px 6px',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#0d9488')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
                      color: '#fff', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>
                      {initials}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                    {/* Chevron */}
                    <svg width="14" height="14" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"
                      style={{ transform: avatarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {avatarOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      background: '#fff', borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      border: '1px solid #f1f5f9',
                      minWidth: 200, zIndex: 200, overflow: 'hidden',
                    }}>
                      {/* User info header */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{user.email}</div>
                      </div>

                      {/* Nav items */}
                      <div style={{ padding: '6px 6px' }}>
                        {AVATAR_MENU.map(item => (
                          <button
                            key={item.label}
                            onClick={() => { navigate(item.path); setAvatarOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '10px 12px',
                              background: 'none', border: 'none', borderRadius: 8,
                              fontSize: 14, fontWeight: 500, color: '#1e293b',
                              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <SvgIcon d={item.icon} size={16} />
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Sign out */}
                      <div style={{ padding: '6px 6px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={handleLogout}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '10px 12px',
                            background: 'none', border: 'none', borderRadius: 8,
                            fontSize: 14, fontWeight: 500, color: '#ef4444',
                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <SvgIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={16} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Login button — desktop, not logged in */}
              {!user?.email && !showHamburger && (
                <button
                  onClick={() => navigate('/login')}
                  style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: '#14b8a6', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0d9488')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#14b8a6')}
                >
                  Log In
                </button>
              )}

              {/* Hamburger — mobile/tablet */}
              {showHamburger && (
                <button
                  onClick={() => setMenuOpen(true)}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center' }}
                  aria-label="Open menu"
                >
                  <HamburgerIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Drawer overlay ──────────────────────────────────────────────────── */}
      {showHamburger && (
        <>
          {/* Backdrop (Bumped zIndex to 999) */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.45)',
              opacity: menuOpen ? 1 : 0,
              pointerEvents: menuOpen ? 'auto' : 'none',
              transition: 'opacity 0.25s',
              touchAction: 'none',
            }}
          />

          {/* Drawer panel (Bumped zIndex to 1000) */}
          <div 
            aria-hidden={!menuOpen}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: isMobile ? '100%' : 400,
              zIndex: 1000,
              background: '#ffffff',
              boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
              transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
              visibility: menuOpen ? 'visible' : 'hidden',
              transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), visibility 0.3s',
              display: 'flex',
              flexDirection: 'column',
              overscrollBehavior: 'contain',
              height: '100%',
            }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <img src={logoSrc} alt="MyWellfie" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
              <button
                onClick={() => setMenuOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center' }}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            {/* If logged in — show user info + quick links */}
            {user?.email && (
              <div style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
                  <span style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
                    color: '#fff', display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}>
                    {initials}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>
                {/* Quick action row */}
                <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
                  <button
                    onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      color: '#0f172a', background: '#ffffff', border: '1px solid #e2e8f0',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => { navigate('/camera'); setMenuOpen(false); }}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      color: '#ffffff', background: '#14b8a6', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Start Scan
                  </button>
                </div>
              </div>
            )}

            {/* Nav sections */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
              {NAV_SECTIONS.map((section, si) => (
                <div key={si} style={{ marginBottom: 8 }}>
                  {section.group && (
                    <p style={{ margin: '16px 8px 6px', fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {section.group}
                    </p>
                  )}
                  {section.items.map(item => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 16px', borderRadius: 10,
                        fontSize: 15, fontWeight: item.active ? 700 : 500,
                        color: item.active ? '#ffffff' : '#1e293b',
                        background: item.active ? '#0f172a' : 'transparent',
                        textDecoration: 'none', transition: 'background 0.15s', marginBottom: 2,
                      }}
                      onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLAnchorElement).style.background = '#f1f5f9'; }}
                      onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                    >
                      <SvgIcon d={item.icon} size={20} />
                      {item.label}
                    </a>
                  ))}
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              {user?.email ? (
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => { navigate('/login'); setMenuOpen(false); }}
                  style={{
                    width: '100%', padding: '15px 0',
                    borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#ffffff', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(to right, #3b82f6, #14b8a6)',
                    boxShadow: '0 4px 14px rgba(20,184,166,0.3)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.92')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
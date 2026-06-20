import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { LayoutDashboard, BookOpen, User, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsMobileLayout } from '../hooks/useLayoutBreakpoint';
import { colors, layout } from '../style/tokens';
import media from '../style/media';
import logoSrc from '../assets/mywellfie-logo.png';
import InstallBanner from '../components/InstallBanner';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${colors.white};
  border-bottom: 1px solid ${colors.slate200};
  padding: 0 ${layout.pagePaddingMobile}px;
  box-sizing: border-box;

  ${media.tablet`
    padding: 0 ${layout.pagePaddingDesktop}px;
  `}
`;

const Inner = styled.div`
  max-width: ${layout.maxContent}px;
  margin: 0 auto;
  height: ${layout.headerMobile}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${media.desktop`
    height: ${layout.headerDesktop}px;
  `}
`;

const LogoButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const LogoImg = styled.img<{ $compact: boolean }>`
  height: ${({ $compact }) => ($compact ? 40 : 52)}px;
  width: auto;
  object-fit: contain;

  ${media.desktop`
    height: 56px;
  `}
`;

const DesktopNav = styled.nav`
  display: none;
  align-items: center;
  gap: 28px;

  ${media.desktop`
    display: flex;
  `}
`;

const NavLink = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? colors.teal : 'transparent')};
  cursor: pointer;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? colors.tealDark : '#374151')};
  padding: 0 0 4px;
  font-family: inherit;
  transition: color 0.15s;

  &:hover {
    color: ${colors.tealDark};
  }
`;

const RightActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;

  ${media.desktop`
    margin-left: 0;
  `}
`;

const ScansBadge = styled.span<{ $empty: boolean }>`
  font-size: 12px;
  font-weight: 700;
  border-radius: 20px;
  padding: 4px 10px;
  white-space: nowrap;
  background: ${({ $empty }) => ($empty ? '#fff7ed' : '#f0fdfa')};
  color: ${({ $empty }) => ($empty ? '#ea580c' : '#0d9488')};
  border: 1px solid ${({ $empty }) => ($empty ? '#fed7aa' : '#99f6e4')};
`;

const AvatarButton = styled.button`
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${colors.teal}, #0ea5e9);
  border: none;
  cursor: pointer;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
`;

const MenuDropdown = styled.div`
  position: absolute;
  right: 0;
  top: 44px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid ${colors.slate200};
  min-width: 200px;
  z-index: 200;
  overflow: hidden;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 11px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: ${({ $danger }) => ($danger ? '#dc2626' : colors.slate900)};
  font-weight: ${({ $danger }) => ($danger ? 600 : 500)};
  font-family: inherit;

  &:hover {
    background: #f8fafc;
  }
`;

const DESKTOP_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Prepare', path: '/prepare-scan' },
  { label: 'Profile', path: '/profile' },
] as const;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, scansRemaining, logout } = useAuth();
  const isMobile = useIsMobileLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [installVisible, setInstallVisible] = useState(false);

  const firstName = useMemo(() => {
    const name = user?.full_name || user?.email || 'there';
    return name.split(' ')[0].split('@')[0];
  }, [user]);

  const userInitial = useMemo(
    () => firstName.charAt(0).toUpperCase(),
    [firstName],
  );

  const scansEmpty = scansRemaining === 0;

  return (
    <Header>
      <Inner>
        <LogoButton type="button" onClick={() => navigate('/dashboard')} aria-label="MyWellfie home">
          <LogoImg src={logoSrc} alt="MyWellfie" $compact={isMobile} />
        </LogoButton>

        <DesktopNav aria-label="Main navigation">
          {DESKTOP_LINKS.map(({ label, path }) => (
            <NavLink
              key={path}
              type="button"
              $active={location.pathname === path}
              onClick={() => navigate(path)}
            >
              {label}
            </NavLink>
          ))}
        </DesktopNav>

        <RightActions>
          {scansRemaining !== null && scansRemaining !== undefined && (
            <ScansBadge $empty={scansEmpty}>
              {scansEmpty
                ? '0 scans left'
                : `${scansRemaining} scan${scansRemaining === 1 ? '' : 's'} left`}
            </ScansBadge>
          )}
          <div style={{ position: 'relative' }}>
            <AvatarButton
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              {userInitial}
            </AvatarButton>
            {menuOpen && (
              <>
                <div
                  role="presentation"
                  style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                  onClick={() => setMenuOpen(false)}
                />
                <MenuDropdown>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.slate900 }}>
                      {user?.full_name || firstName}
                    </div>
                    <div style={{ fontSize: 12, color: colors.slate500, marginTop: 2 }}>
                      {user?.email}
                    </div>
                  </div>
                  <MenuItem
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?next=/dashboard');
                    }}
                  >
                    Health profile
                  </MenuItem>
                  <MenuItem
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/prepare-scan');
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BookOpen size={16} /> Preparation guide
                    </span>
                  </MenuItem>
                  <MenuItem
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/dashboard');
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LayoutDashboard size={16} /> Dashboard
                    </span>
                  </MenuItem>
                  <MenuItem
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setInstallVisible(true);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Download size={16} /> Install App
                    </span>
                  </MenuItem>
                  <MenuItem
                    type="button"
                    $danger
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                  >
                    Sign out
                  </MenuItem>
                </MenuDropdown>
              </>
            )}
          </div>
        </RightActions>
      </Inner>
      <InstallBanner visible={installVisible} onClose={() => setInstallVisible(false)} />
    </Header>
  );
};

export default AppHeader;

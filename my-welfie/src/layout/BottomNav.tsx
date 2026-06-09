import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { LayoutDashboard, Camera, BookOpen, User, LucideIcon } from 'lucide-react';
import { colors, layout } from '../style/tokens';

const Bar = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-sizing: border-box;
  height: calc(${layout.bottomNav}px + env(safe-area-inset-bottom, 0px));
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: ${colors.white};
  border-top: 1px solid ${colors.slate200};
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
`;

const NavItem = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  min-height: ${layout.touchMin}px;
  padding: 6px 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ $active }) => ($active ? colors.tealDark : colors.slate500)};
`;

const IconWrap = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
`;

type NavEntry = {
  label: string;
  path: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavEntry[] = [
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Scan', path: '/camera', Icon: Camera },
  { label: 'Guide', path: '/prepare-scan', Icon: BookOpen },
  { label: 'Profile', path: '/profile', Icon: User },
];

const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Bar aria-label="App navigation">
      {NAV_ITEMS.map(({ label, path, Icon }) => {
        const active = isActive(path);
        return (
          <NavItem
            key={path}
            type="button"
            $active={active}
            onClick={() => navigate(path)}
            aria-current={active ? 'page' : undefined}
          >
            <IconWrap>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            </IconWrap>
            <span>{label}</span>
          </NavItem>
        );
      })}
    </Bar>
  );
};

/** Portal to document.body so fixed positioning is not broken by ancestor transforms. */
const BottomNav: React.FC = () => {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(<BottomNavBar />, document.body);
};

export default BottomNav;

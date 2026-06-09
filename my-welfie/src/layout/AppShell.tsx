import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { PageMain, PageShell } from './PageContainer';
import { useIsMobileLayout } from '../hooks/useLayoutBreakpoint';

const AppShell: React.FC = () => {
  const isMobile = useIsMobileLayout();

  return (
    <PageShell>
      <AppHeader />
      <PageMain $reserveBottomNav={isMobile}>
        <Outlet />
      </PageMain>
      {isMobile && <BottomNav />}
    </PageShell>
  );
};

export default AppShell;

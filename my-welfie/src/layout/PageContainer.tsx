import React from 'react';
import styled from 'styled-components';
import { colors, fonts, layout } from '../style/tokens';
import media from '../style/media';

export type PageContainerVariant = 'default' | 'narrow' | 'form' | 'profile';

const maxWidthForVariant: Record<PageContainerVariant, number | 'none'> = {
  default: layout.maxContent,
  narrow: layout.maxNarrow,
  form: layout.maxForm,
  profile: 'none',
};

const Wrapper = styled.main<{ $variant: PageContainerVariant }>`
  width: 100%;
  max-width: ${({ $variant }) => {
    const w = maxWidthForVariant[$variant];
    return w === 'none' ? '100%' : `${w}px`;
  }};
  margin: 0 auto;
  box-sizing: border-box;
  padding: ${({ $variant }) => ($variant === 'profile' ? 0 : `${layout.pagePaddingMobile}px`)};

  ${media.tablet`
    padding: ${({ $variant }) =>
      $variant === 'profile' ? 0 : `${layout.pagePaddingDesktop}px`};
  `}
`;

interface PageContainerProps {
  children: React.ReactNode;
  variant?: PageContainerVariant;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  variant = 'default',
  className,
}) => (
  <Wrapper $variant={variant} className={className}>
    {children}
  </Wrapper>
);

export default PageContainer;

export const PageShell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${colors.pageBg};
  font-family: ${fonts.primary};
`;

export const PageMain = styled.div<{ $reserveBottomNav: boolean }>`
  flex: 1;
  width: 100%;
  overflow-x: hidden;
  padding-bottom: ${({ $reserveBottomNav }) =>
    $reserveBottomNav
      ? `calc(${layout.bottomNavReserved}px + env(safe-area-inset-bottom, 0px))`
      : '0'};
`;

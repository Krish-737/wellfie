import { useMediaPredicate } from 'react-media-hook';
import { mediaQuery } from '../style/tokens';

/** True on viewports below 768px — bottom nav + compact header. */
export function useIsMobileLayout(): boolean {
  return useMediaPredicate(mediaQuery.mobile);
}

/** True on viewports below 1024px — single-column layouts. */
export function useIsTabletLayout(): boolean {
  return useMediaPredicate(`(max-width: ${1023}px)`);
}

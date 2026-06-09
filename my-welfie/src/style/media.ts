import { css } from 'styled-components';
import { bp } from './tokens';

export interface Media {
  mobile: any;
  tablet: any;
  desktop: any;
  wide: any;
}

/** Min-width breakpoints aligned with tokens.ts */
export const defaultMediaBreakpoints = {
  mobile: `${bp.sm}px`,
  tablet: `${bp.md}px`,
  desktop: `${bp.lg}px`,
  wide: `${bp.xl}px`,
};

const media = Object.keys(defaultMediaBreakpoints).reduce((memo, val) => {
  memo[val] = (...args) => css`
    @media (min-width: ${defaultMediaBreakpoints[val]}) {
      ${css(
        // @ts-ignore
        ...args,
      )};
    }
  `;
  return memo;
}, {});

export default media as Media;

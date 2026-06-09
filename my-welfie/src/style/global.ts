import { createGlobalStyle } from 'styled-components';
import { fonts } from './tokens';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    background: #f1f4f9;
    font-family: ${fonts.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html, body, #root {
    min-height: 100%;
    overflow-x: hidden;
  }

  #root {
    min-height: 100%;
    /* Avoid transform here — it breaks position:fixed for descendants (bottom nav). */
  }
  .blur-mask-overlay {
    backdrop-filter: blur(8px) brightness(0.6);
    -webkit-backdrop-filter: blur(8px) brightness(0.6);
    pointer-events: none;
  }
  input {
    font-family: ${fonts.primary};
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type=number] {
    -moz-appearance: textfield; /* Firefox */
  }

  button {
    font-family: ${fonts.primary};
  }

  h1, h2, h3, h4, h5, h6, p {
    margin: 0;
  }
`;

export default GlobalStyle;

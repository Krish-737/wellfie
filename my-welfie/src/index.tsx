import './fix-sdk-path';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import GlobalStyle from './style/global';
import './styles/tailwind.compiled.css';
import styled from 'styled-components';
import { captureInstallPrompt } from './utils/installPrompt';
const Wrapper = styled.div`
  width: 100%;
  min-height: 100%;
`;

import { BrowserRouter } from 'react-router-dom';

// ── Service Worker Registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works without it
    });
  });
}

// ── Capture PWA install prompt early so it's available on demand ─────────
window.addEventListener('beforeinstallprompt', captureInstallPrompt);

ReactDOM.render(
  <BrowserRouter>
    <Wrapper>
      <GlobalStyle />
      <App />
    </Wrapper>
  </BrowserRouter>,
  document.getElementById('root'),
);

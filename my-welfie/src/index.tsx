import './fix-sdk-path';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import GlobalStyle from './style/global';
import './styles/tailwind.compiled.css';
import styled from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  min-height: 100%;
`;

import { BrowserRouter } from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <Wrapper>
      <GlobalStyle />
      <App />
    </Wrapper>
  </BrowserRouter>,
  document.getElementById('root'),
);

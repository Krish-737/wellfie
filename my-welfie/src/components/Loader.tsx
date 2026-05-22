import React from 'react';
import { Flex } from './shared/Flex';
import styled from 'styled-components';

const LoadingWrapper = styled(Flex)`
  position: absolute;
  top: 0;
  left: 0;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #f1f5f9;
  z-index: 20;
`;
const Message = styled.h2`
  font-size: 16px;
  color: #64748b;
  font-weight: 600;
  font-family: inherit;
`;

const Loader = () => (
  <LoadingWrapper>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="spinner" />
      <Message id="loading-message">{'Initialising camera...'}</Message>
      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #14b8a6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </LoadingWrapper>
);
export default Loader;

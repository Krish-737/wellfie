import React from 'react';

interface AlertSupportCodeProps {
  code: number;
}

const AlertSupportCode: React.FC<AlertSupportCodeProps> = ({ code }) => (
  <p style={{
    margin: '12px 0 0', fontSize: 12, color: '#94a3b8', fontWeight: 500,
  }}>
    Reference code: <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{code}</span>
  </p>
);

export default AlertSupportCode;

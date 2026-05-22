import React from 'react';
import { useMediaPredicate } from 'react-media-hook';
import logoSrc from '../../assets/mywellfie-logo.png';

const shared: Record<string, React.CSSProperties> = {
  brandDesc: {
    fontSize: 14,
    lineHeight: 1.65,
  },
  colTitle: {
    color: '#ffffff',
    fontWeight: 700,
    marginBottom: 24,
    fontSize: 15,
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  link: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'color 0.15s',
  },
  connectText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 1.6,
  },
  connectEmail: {
    color: '#2dd4bf',
    fontWeight: 500,
    textDecoration: 'none',
    fontSize: 14,
  },
};

const Footer: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const cols = isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr 1fr';

  const s: Record<string, React.CSSProperties> = {
    footer: {
      background: '#0f172a',
      color: '#94a3b8',
      padding: isMobile ? '48px 16px' : '64px 24px',
    },
    inner: {
      maxWidth: 1280,
      margin: '0 auto',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: isMobile ? 28 : 48,
      marginBottom: 40,
    },
    bottom: {
      paddingTop: 24,
      borderTop: '1px solid #1e293b',
      display: 'flex',
      justifyContent: isMobile ? 'center' : 'space-between',
      alignItems: 'center',
      textAlign: isMobile ? 'center' as const : 'left' as const,
      fontSize: 12,
    },
  };

  return (
    <footer style={s.footer}>
      <div style={s.inner}>
        <div style={s.grid}>
          {/* Brand */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <img src={logoSrc} alt="MyWellfie" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
            </div>
            <p style={shared.brandDesc}>Smart health monitoring powered by advanced PPG technology.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={shared.colTitle}>Quick Links</h4>
            <ul style={shared.linkList}>
              {['Home', 'Pricing', 'Resources'].map(l => (
                <li key={l}>
                  <a href="#" style={shared.link}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2dd4bf')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={shared.colTitle}>Support</h4>
            <ul style={shared.linkList}>
              {['Help Center', 'Contact Us', 'Privacy Policy'].map(l => (
                <li key={l}>
                  <a href="#" style={shared.link}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2dd4bf')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 style={shared.colTitle}>Connect</h4>
            <p style={shared.connectText}>Stay updated with health tips and news</p>
            <a href="mailto:info@mywellfie.com" style={shared.connectEmail}>info@mywellfie.com</a>
          </div>
        </div>

        <div style={s.bottom}>
          <p>© 2024 MyWellfie. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

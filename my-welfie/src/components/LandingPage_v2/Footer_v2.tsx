import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/ADBb0ugxQnJqLf_R2UEQk_ckDiojQ7F5iYwlTiytC4oSJjAlL8WnH4sMXrzvYisSlMNk84uppfl2BYrNEgik9prkU0vA6JCEI_Dic44OJXdBMZOS3NffAUKHY6OJTMrd0vrFAH5ZVXjigyTFUp-EZiJNIEsNZo-fBoN83X7tb-zAstnciHw3oFvn_WQmaCBhQRdys3R0QDFhfn2nEqq8_ZjlkORJNLki_mBdKfx2i-eYvTwvky9uhZJSbPAHV5qpuzv4m0ZYiNX_4SgvKiA';

const footerLinks = [
  { title: 'Product',  links: ['Technology', 'Pricing', 'Dashboard'] },
  { title: 'Company',  links: ['Careers', 'Privacy', 'Terms'] },
  { title: 'Support',  links: ['Support', 'Help Center', 'API Docs'] },
];

const Footer_v2: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  return (
    <footer style={{
      background: '#000f21',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMobile ? '48px 20px' : '64px 64px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr',
        gap: isMobile ? 40 : 64,
      }}>
        {/* Brand column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <img src={LOGO_URL} alt="MyWellfie" style={{ height: 48, width: 'auto', objectFit: 'contain', objectPosition: 'left' }} />
          <p style={{ fontSize: 14, color: '#bbcabf', lineHeight: 1.65, maxWidth: 300, margin: 0 }}>
            © 2024 MyWellfie. Clinical Precision meets Luxury Lifestyle.
          </p>
          {/* Social icons */}
          <div style={{ display: 'flex', gap: 20 }}>
            {['public', 'share', 'smart_display'].map(icon => (
              <span
                key={icon}
                className="material-symbols-outlined"
                style={{ color: '#bbcabf', fontSize: 22, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLSpanElement).style.color = '#4edea3')}
                onMouseLeave={e => ((e.currentTarget as HTMLSpanElement).style.color = '#bbcabf')}
              >
                {icon}
              </span>
            ))}
          </div>
        </div>

        {/* Links columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: isMobile ? 24 : 32,
        }}>
          {footerLinks.map(col => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#ffffff', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>
                {col.title}
              </p>
              {col.links.map(link => (
                <a
                  key={link}
                  href="#"
                  style={{ fontSize: 15, color: '#bbcabf', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#4edea3')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#bbcabf')}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer_v2;

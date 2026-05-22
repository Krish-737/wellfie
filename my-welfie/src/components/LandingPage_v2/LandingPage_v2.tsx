import React from 'react';
import Navbar_v2 from './Navbar_v2';
import HeroSection_v2 from './HeroSection_v2';
import FeaturesSection_v2 from './FeaturesSection_v2';
import HowItWorksSection_v2 from './HowItWorksSection_v2';
import ScienceSection_v2 from './ScienceSection_v2';
import PricingSection_v2 from './PricingSection_v2';
import CTASection_v2 from './CTASection_v2';
import Footer_v2 from './Footer_v2';

const LandingPage_v2: React.FC = () => (
  <div style={{
    fontFamily: "'Manrope', sans-serif",
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    overflowX: 'hidden',
    background: '#031427',
    color: '#d3e4fe',
    margin: 0,
    padding: 0,
    minHeight: '100vh',
  }}>
    <Navbar_v2 />
    <main>
      <HeroSection_v2 />
      <FeaturesSection_v2 />
      <HowItWorksSection_v2 />
      <ScienceSection_v2 />
      <PricingSection_v2 />
      <CTASection_v2 />
    </main>
    <Footer_v2 />
  </div>
);

export default LandingPage_v2;

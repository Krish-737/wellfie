import React from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import ScienceSection from './ScienceSection';
import PricingSection from './PricingSection';
import CTASection from './CTASection';
import Footer from './Footer';

const pageStyle: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  overflowX: 'hidden',
  background: '#ffffff',
  color: '#0f172a',
  margin: 0,
  padding: 0,
};

const LandingPage: React.FC = () => {
  return (
    <div style={pageStyle}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ScienceSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;

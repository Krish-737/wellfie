import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KioskFlowLanding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bpmRef = useRef<HTMLSpanElement>(null);
  const wellRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 280, H = 400;
    canvas.width = W; canvas.height = H;

    const GREEN = '#3aee6e';
    const FACE_COLOR = 'rgba(58,238,110,0.22)';
    const FACE_STROKE = 'rgba(58,238,110,0.45)';

    let t = 0;
    let ecgPoints: number[] = [];
    let scanY = 60;
    let scanDir = 1;
    const bpmBase = 72, wellBase = 8.4;
    let bpmVal = bpmBase, wellVal = wellBase;
    let lastBeat = 0;
    let animId = 0;

    function ecgWave(x: number) {
      const cycle = x % 120;
      if (cycle < 40) return Math.sin(cycle * 0.08) * 2;
      if (cycle < 50) return Math.sin((cycle-40) * 0.3) * 6;
      if (cycle < 55) return -Math.sin((cycle-50) * 0.6) * 22;
      if (cycle < 60) return Math.sin((cycle-55) * 0.6) * 38;
      if (cycle < 65) return -Math.sin((cycle-60) * 0.6) * 15;
      if (cycle < 70) return Math.sin((cycle-65) * 0.3) * 8;
      if (cycle < 80) return Math.sin((cycle-70) * 0.15) * 3;
      return Math.sin(cycle * 0.05) * 1.5;
    }

    function drawFace() {
      const cx = W / 2, headY = 115, headRx = 52, headRy = 62;
      const shoulderW = 110, shoulderTop = 210, shoulderCurve = 30;

      ctx.save();
      ctx.strokeStyle = FACE_STROKE;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(58,238,110,0.06)';

      ctx.beginPath();
      ctx.ellipse(cx, headY, headRx, headRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - shoulderW, H - 90);
      ctx.quadraticCurveTo(cx - shoulderW, shoulderTop, cx - shoulderW * 0.35, shoulderTop - shoulderCurve);
      ctx.lineTo(cx + shoulderW * 0.35, shoulderTop - shoulderCurve);
      ctx.quadraticCurveTo(cx + shoulderW, shoulderTop, cx + shoulderW, H - 90);
      ctx.fillStyle = 'rgba(58,238,110,0.06)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawScanLine() {
      ctx.save();
      ctx.strokeStyle = 'rgba(58,238,110,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(20, scanY);
      ctx.lineTo(W - 20, scanY);
      ctx.stroke();
      ctx.setLineDash([]);

      const grad = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 4);
      grad.addColorStop(0, 'rgba(58,238,110,0)');
      grad.addColorStop(1, 'rgba(58,238,110,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(20, scanY - 18, W - 40, 22);
      ctx.restore();
    }

    function drawECG() {
      const ecgY = 230;
      const totalW = W - 40;
      const speed = 1.8;

      ecgPoints.push(t * speed % totalW);
      if (ecgPoints.length > totalW) ecgPoints.shift();

      ctx.save();

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < totalW; i++) {
        const px = 20 + i;
        const age = (totalW - i) / totalW;
        const py = ecgY + ecgWave(totalW - i + t * speed);
        ctx.globalAlpha = age > 0.15 ? 1 : age / 0.15;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = GREEN;
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(58,238,110,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, ecgY);
      ctx.lineTo(W - 20, ecgY);
      ctx.stroke();
      ctx.restore();
    }

    function drawCorners() {
      const r = 18, len = 18, m = 16;
      ctx.save();
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2;
      const corners = [
        [m, m, 1, 1],
        [W - m, m, -1, 1],
        [m, H - 90 - m, 1, -1],
        [W - m, H - 90 - m, -1, -1],
      ];
      corners.forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * len, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * len);
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawDots() {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const px = 20 + Math.random() * (W - 40);
        const py = 40 + Math.random() * (H - 130);
        ctx.fillStyle = `rgba(58,238,110,${0.03 + Math.random() * 0.06})`;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function updateVitals() {
      const now = Date.now();
      const beatInterval = 60000 / bpmBase;
      if (now - lastBeat > beatInterval) {
        lastBeat = now;
        bpmVal = bpmBase + Math.round((Math.random() - 0.5) * 4);
        wellVal = parseFloat((wellBase + (Math.random() - 0.5) * 0.4).toFixed(1));
        if (bpmRef.current) bpmRef.current.textContent = String(bpmVal);
        if (wellRef.current) wellRef.current.textContent = wellVal.toFixed(1);
      }
    }

    function loop() {
      ctx!.clearRect(0, 0, W, H);

      drawDots();
      drawFace();
      drawScanLine();
      drawECG();
      drawCorners();

      scanY += scanDir * 0.6;
      if (scanY > 200) scanDir = -1;
      if (scanY < 60) scanDir = 1;

      t++;
      updateVitals();
      animId = requestAnimationFrame(loop);
    }

    loop();

    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    const sections = document.querySelectorAll('.flow-landing section > div');
    sections.forEach(el => {
      (el as HTMLElement).style.transition = 'all 1s ease';
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(2rem)';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleStartFlow = async () => {
    setLoading(true);
    navigate('/kiosk/flow?action=start');
  };

  return (
    <div className="flow-landing bg-background text-on-surface font-body-md selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md shadow-sm">
        <nav className="flex justify-between items-center px-gutter py-4 max-w-container-max mx-auto">
          <img src="/icons/apple-touch-icon.png" alt="MyWellfie" style={{ width: 80, height: 40, borderRadius: 10 }} />
          <div className="hidden md:flex items-center gap-stack-lg font-body-md text-body-md">
            <a className="text-secondary border-b-2 border-secondary font-bold hover:text-secondary transition-colors" href="#home">Home</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors" href="#wellness">Health & Wellness</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors" href="#resources">Resources</a>
          </div>

        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-gradient pt-16 pb-section-padding overflow-hidden" id="home">
          <div className="max-w-container-max mx-auto px-gutter grid grid-cols-1 md:grid-cols-2 gap-stack-lg items-center">
            <div className="space-y-stack-lg text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-secondary-container/30 border border-secondary/20 text-on-secondary-container font-label-lg text-label-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indicator-optimal opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indicator-optimal"></span>
                </span>
                Limited Time Launch Offer
              </div>
              <h1 className="font-display-lg text-display-lg md:text-display-lg leading-tight tracking-tight text-primary">
                Take Control of Your Health with <span className="text-secondary">Smart Smartphone Scans</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto md:mx-0">
                Non-invasive vital sign monitoring. No wearables needed. Just your phone camera and our clinical-grade AI technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-stack-md justify-center md:justify-start pt-4">
                <button
                  onClick={handleStartFlow}
                  disabled={loading}
                  className="px-8 py-4 rounded-full bg-secondary text-on-secondary font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {loading ? 'Redirecting...' : 'Get My First Scan for $1'}
                  {!loading && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                </button>
                <div className="flex items-center justify-center gap-2 px-6 py-4">
                  <span className="text-on-surface-variant line-through font-label-lg text-label-lg">Usual $5</span>
                  <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold text-xs">80% OFF</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-secondary-fixed/20 blur-[100px] -z-10 rounded-full scale-125"></div>
              <div className="flex justify-center items-center" style={{ padding: '24px 0' }}>
                <div
                  aria-label="Face scan animation showing pulse 72 BPM and wellness 8.4"
                  style={{
                    background: '#0d1117',
                    borderRadius: 28,
                    width: 280,
                    height: 400,
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #1a2a1a',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                  <div
                    style={{
                      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(30,188,124,0.12)', border: '0.5px solid rgba(30,188,124,0.35)',
                      borderRadius: 20, padding: '3px 12px', fontFamily: 'monospace',
                      fontSize: 10, color: '#1EBC7C', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                    }}
                  >
                    ● SCANNING
                  </div>
                  <div
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '16px 20px 18px', background: '#0d1117',
                      borderTop: '1px solid #1a2a1a', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span ref={bpmRef} style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>72</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a6a4a', letterSpacing: '0.06em' }}>pulse · bpm</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                      <span ref={wellRef} style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>8.4</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a6a4a', letterSpacing: '0.06em' }}>wellness</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-section-padding bg-surface-container-lowest" id="wellness">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-4">What MyWellfie Offers</h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg">Comprehensive health tracking powered by precision AI.</p>
            </div>
            <div className="bento-grid">
              <div className="col-span-12 md:col-span-8 bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-secondary/50 transition-colors group">
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-indicator-high/10 text-indicator-high flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-primary mb-3">Heart Health</h3>
                  <p className="text-on-surface-variant flex-grow">Advanced monitoring for heart rate and Heart Rate Variability (HRV). Get early detection of cardiovascular trends and understand your heart's resilience under stress.</p>
                  <div className="mt-8 flex gap-4 overflow-hidden">
                    <div className="flex-1 h-32 bg-surface-container-low rounded-xl relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-indicator-high/20 to-transparent"></div>
                      <div className="w-full h-full flex items-end px-2 gap-1">
                        <div className="w-2 h-1/3 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-1/2 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-2/3 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-1/2 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-3/4 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-1/2 bg-indicator-high rounded-t"></div>
                        <div className="w-2 h-5/6 bg-indicator-high rounded-t"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 bg-primary text-on-primary p-8 rounded-3xl group">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">vital_signs</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Vital Signs</h3>
                <p className="text-outline-variant">Track blood pressure trends and blood oxygen (SpO2) levels with clinical accuracy using only your smartphone lens.</p>
              </div>
              <div className="col-span-12 md:col-span-5 bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-secondary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-action-blue/10 text-action-blue flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-primary mb-3">Stress & Wellness</h3>
                <p className="text-on-surface-variant">Measure stress levels and systemic recovery. Understand when to push harder and when to focus on rest and rejuvenation.</p>
              </div>
              <div className="col-span-12 md:col-span-7 bg-secondary-container p-8 rounded-3xl border border-secondary/20 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-on-secondary-container/10 text-on-secondary-container flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined">smartphone</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-secondary-container mb-3">Anytime, Anywhere</h3>
                  <p className="text-on-secondary-container/80 max-w-md">No external hardware or bulky wearables required. Your wellness companion is already in your pocket, ready whenever you are.</p>
                </div>
                <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[200px] text-on-secondary-container opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700">sensors_krx</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-section-padding bg-background">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-4">How It Works</h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg">Get medical-grade insights in under 60 seconds.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-lg relative">
              <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-outline-variant -z-10"></div>
              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-secondary flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-headline-md font-bold text-secondary">1</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-primary mb-2">Open App</h4>
                <p className="text-on-surface-variant">Launch the MyWellfie app on your smartphone to start.</p>
              </div>
              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-secondary flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-headline-md font-bold text-secondary">2</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-primary mb-2">Position Face</h4>
                <p className="text-on-surface-variant">Hold your phone steady and center your face in the guide.</p>
              </div>
              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-secondary flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-headline-md font-bold text-secondary">3</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-primary mb-2">AI Analysis</h4>
                <p className="text-on-surface-variant">Our PPG technology analyzes blood flow in milliseconds.</p>
              </div>
              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-secondary flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-headline-md font-bold text-secondary">4</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-primary mb-2">Instant Results</h4>
                <p className="text-on-surface-variant">View your vitals and actionable health recommendations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Science Section */}
        <section className="py-section-padding bg-primary text-on-primary">
          <div className="max-w-container-max mx-auto px-gutter grid grid-cols-1 md:grid-cols-2 gap-stack-lg items-center">
            <div className="relative rounded-3xl overflow-hidden aspect-video shadow-2xl">
              <img
                alt="PPG Technology Science"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsueQdLYcuBIzcQL_EIQF5NpoXJIaHZyUXoRmkk52OJSzTbSFlvQFsM6l_yfnzH8rxDarUhmBaqAxAa5Py6Mh2FHgECFLvoG_9X6CPLYtiqkIEfqmGnSVkJDMpjkz44gsyjgKgnQH7z1lPfF8B9ptmkNokAcS_I_o6XVmsMW7bG1sulcUH8TZX11FzJIe0Gn0BFNSkXiARgKFRRhvfd3GB4Ju51bOb9n2E_REtrwpDVo_OUOnvWZgR_bCmsYJmTXe-deyfQbGgiIE"
              />
              <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
              </div>
            </div>
            <div className="space-y-stack-md">
              <h2 className="font-display-lg text-display-lg text-secondary-fixed">The Science: PPG Technology</h2>
              <p className="text-outline-variant font-body-lg text-body-lg">
                Photoplethysmography (PPG) is a clinically validated, non-invasive optical technique that detects blood volume changes in the microvascular bed.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-secondary-fixed">check_circle</span>
                  <p><span className="font-bold text-white">Medical-Grade Accuracy:</span> Used in hospital pulse oximeters for decades.</p>
                </li>
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-secondary-fixed">check_circle</span>
                  <p><span className="font-bold text-white">AI-Driven Extraction:</span> Our algorithms filter noise to extract pure biometric signals.</p>
                </li>
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-secondary-fixed">check_circle</span>
                  <p><span className="font-bold text-white">Rapid Processing:</span> Massive data sets processed in under 60 seconds.</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Special Offer Section */}
        <section className="py-section-padding bg-background relative overflow-hidden" id="pricing">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary-fixed/5 -skew-x-12"></div>
          <div className="max-w-container-max mx-auto px-gutter text-center relative z-10">
            <div className="max-w-2xl mx-auto bg-white p-12 rounded-[2rem] shadow-xl border border-outline-variant/30">
              <h2 className="font-display-lg text-display-lg text-primary mb-4">Start Your Wellness Journey Today</h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg mb-10">Experience the future of health monitoring for a fraction of the cost.</p>
              <div className="bg-surface-container-low p-8 rounded-2xl mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-secondary/10">
                <div className="text-left">
                  <p className="text-label-lg font-label-lg text-secondary uppercase tracking-widest mb-2">Introductory Offer</p>
                  <h3 className="font-headline-lg text-headline-lg text-primary">First Scan: $1</h3>
                  <p className="text-on-surface-variant">Normally $5 per scan</p>
                </div>
                <div className="px-6 py-2 rounded-full bg-indicator-optimal/20 text-on-secondary-container font-bold border border-indicator-optimal/30">
                  Save 80% Today
                </div>
              </div>
              <button
                onClick={handleStartFlow}
                disabled={loading}
                className="w-full py-5 rounded-full bg-secondary text-on-secondary font-bold text-xl shadow-lg hover:shadow-2xl hover:bg-secondary/90 transition-all scale-100 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {loading ? 'Redirecting...' : 'Get Started Now'}
                {!loading && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>}
              </button>
              <p className="mt-6 text-label-sm font-label-sm text-on-surface-variant">No credit card required to sign up. Immediate access to dashboard.</p>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .hero-gradient {
          background: radial-gradient(circle at 80% 20%, rgba(112, 252, 181, 0.15) 0%, transparent 40%),
                      radial-gradient(circle at 20% 80%, rgba(13, 34, 63, 0.05) 0%, transparent 40%);
        }
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
        }
      `}</style>
    </div>
  );
}

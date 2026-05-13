import { useRef, useEffect, useState } from 'react';
import {
  ChevronRight, Zap, Lock, Smartphone, ArrowRight, Download,
  Wifi, QrCode, CheckSquare, Radio, SlidersHorizontal, ClipboardList,
  ScanLine, Speaker, Lightbulb, Mic, Cable, Shield, FileDown,
  Package, FolderKanban, Activity, Wrench, Database,
  ChevronDown, ExternalLink, Truck, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isNative } from '@/services/platform';


// ---------------------------------------------------------------------------
// Scroll-reveal hook: fires once when element enters the viewport
// ---------------------------------------------------------------------------
function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

// ---------------------------------------------------------------------------
// All animation keyframes + utility classes in one <style> block
// ---------------------------------------------------------------------------
const ANIM_CSS = `
  /* Keyframes */
  @keyframes rigFadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rigHeaderIn {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rigFloat {
    0%, 100% { transform: translateY(0px);  }
    50%       { transform: translateY(-9px); }
  }
  @keyframes rigScan {
    0%   { top: 14%; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { top: 83%; opacity: 0; }
  }
  @keyframes nativeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mockupFloat {
    0%, 100% { transform: translateY(0px) rotate(-1deg); }
    50%       { transform: translateY(-10px) rotate(-1deg); }
  }
  @keyframes phoneFloat {
    0%, 100% { transform: translateY(0px) rotate(2deg); }
    50%       { transform: translateY(-14px) rotate(2deg); }
  }
  @keyframes statusBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes scanBar {
    0%   { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(120px); opacity: 0; }
  }

  /* Header slide-down on mount */
  .rig-header { animation: rigHeaderIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }

  /* Hero staggered entrance (CSS animation, not transition) */
  .rig-hero-el { animation: rigFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
  .d0 { animation-delay: 0ms;   }
  .d1 { animation-delay: 130ms; }
  .d2 { animation-delay: 260ms; }
  .d3 { animation-delay: 390ms; }
  .d4 { animation-delay: 520ms; }

  /* Native Welcome Screen animations */
  .native-animate-0 { animation: nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0ms; }
  .native-animate-1 { animation: nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 120ms; }
  .native-animate-2 { animation: nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 240ms; }

  /* Floating mockup */
  .rig-mockup-float { animation: mockupFloat 6s ease-in-out infinite; }
  .rig-phone-float  { animation: phoneFloat 5s ease-in-out infinite; animation-delay: 0.8s; }

  /* Floating mockup cards */
  .rig-float { animation: rigFloat 5s ease-in-out infinite; }

  /* Moving QR scan line */
  .rig-scan-line {
    position: absolute;
    left: 1.5rem; right: 1.5rem;
    height: 2px;
    background: linear-gradient(to right, transparent, hsl(var(--primary)), transparent);
    box-shadow: 0 0 10px hsl(var(--primary) / 0.7);
    animation: rigScan 2.4s ease-in-out infinite;
    pointer-events: none;
  }

  /* Status dot blink */
  .rig-blink { animation: statusBlink 2s ease-in-out infinite; }

  /* Scan bar in phone mockup */
  .rig-scanbar {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(to right, transparent, hsl(var(--primary)), transparent);
    animation: scanBar 1.8s ease-in-out infinite;
    pointer-events: none;
  }

  /* Scroll-reveal: fade up */
  .rig-reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .rig-reveal.rig-vis { opacity: 1; transform: translateY(0); }

  /* Scroll-reveal: slide in from right */
  .rig-reveal-r {
    opacity: 0;
    transform: translateX(30px);
    transition: opacity 0.62s ease, transform 0.62s ease;
  }
  .rig-reveal-r.rig-vis { opacity: 1; transform: translateX(0); }

  /* Scroll-reveal: slide in from left */
  .rig-reveal-l {
    opacity: 0;
    transform: translateX(-30px);
    transition: opacity 0.62s ease, transform 0.62s ease;
  }
  .rig-reveal-l.rig-vis { opacity: 1; transform: translateX(0); }

  /* Inventory item slide-in (staggered via inline transitionDelay) */
  .rig-inv-item {
    opacity: 0;
    transform: translateX(-16px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .rig-inv-item.rig-vis { opacity: 1; transform: translateX(0); }

  /* Card hover lift */
  .rig-card-lift {
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .rig-card-lift:hover {
    transform: translateY(-5px) scale(1.015);
    box-shadow: 0 22px 55px rgba(0,0,0,0.3);
  }

  /* Sub-feature card hover */
  .rig-subcard {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
  }
  .rig-subcard:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    border-color: hsl(var(--primary) / 0.5);
  }

  /* Page transition: slide + fade out */
  @keyframes pageSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(20px); }
  }

  /* Page transition: slide + fade in */
  @keyframes pageSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .page-exit { animation: pageSlideOut 0.3s ease forwards; }
  .page-enter { animation: pageSlideIn 0.4s ease forwards; }

  /* Footer columns */
  .footer-col-header {
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    margin-bottom: 0.75rem;
  }
  .footer-link {
    display: block;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    transition: color 0.18s ease;
    margin-bottom: 0.4rem;
  }
  .footer-link:hover { color: hsl(var(--foreground)); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Native Welcome Screen (ersetzt Landing komplett in der APK)
// ─────────────────────────────────────────────────────────────────────────────
function NativeWelcome() {
  const navigate = useNavigate();

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center px-6 overflow-hidden relative page-enter">

        {/* Animated background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Main Content - centered with better spacing */}
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full relative z-10 py-8">

          {/* LOGO */}
          <div className="mb-8 native-animate-0">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-2xl" />
              <img
                src="/logo-transparent.png"
                alt="RigFlow"
                className="h-28 w-28 object-contain drop-shadow-2xl relative"
              />
            </div>
          </div>

          {/* HEADLINE */}
          <div className="space-y-4 mb-8 native-animate-1">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                Dein Event-Gear
              </h1>
            </div>
            <div>
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                vollständig im Griff
              </h2>
            </div>
            <p className="text-xs text-muted-foreground pt-1 font-medium">
              Verwalte dein komplettes Inventar offline und in Echtzeit
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 w-full native-animate-2">

            <Button
              size="lg"
              className="w-full text-base font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01]"
              onClick={() => navigate('/register')}
            >
              Kostenlos Registrieren
            </Button>

            {/* Secondary Action */}
            <button
              onClick={() => navigate('/auth?step=login')}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Du hast bereits ein Konto? Melde dich an
            </button>

          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-6 text-xs text-muted-foreground relative z-10 pb-6">
          <a href="/impressum" className="hover:text-foreground transition-colors duration-200 font-medium">
            Impressum
          </a>
          <a href="/datenschutz" className="hover:text-foreground transition-colors duration-200 font-medium">
            Datenschutz
          </a>
        </div>

      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero Device Mockup (Desktop + Phone)
// ---------------------------------------------------------------------------
function HeroMockup() {
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <img
        src="/mockups.png"
        alt="RigFlow Dashboard"
        className="rig-mockup-float relative w-full h-auto object-contain"
        style={{ 
          filter: 'drop-shadow(0 40px 20px rgba(0,0,0,0.2))',
          transition: 'transform 0.4s ease, filter 0.4s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03) translateY(-6px)';
          (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 55px 40px rgba(0,0,0,0.5))';
          (e.currentTarget as HTMLImageElement).style.animationPlayState = 'paused';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLImageElement).style.transform = '';
          (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 40px 20px rgba(0,0,0,0.2))';
          (e.currentTarget as HTMLImageElement).style.animationPlayState = 'running';
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Landing() {
  if (isNative()) return <NativeWelcome />;

  const navigate = useNavigate();
  const { canInstall, isInstalled, install, deviceType } = useInstallPrompt();
  const featuresRef = useRef<HTMLDivElement>(null);
  const [qrRef,    qrVisible]    = useScrollReveal();
  const [invRef,   invVisible]   = useScrollReveal();
  const [projRef,  projVisible]  = useScrollReveal();
  const [techRef,  techVisible]  = useScrollReveal();
  const [secRef,   secVisible]   = useScrollReveal();
  const [featRef,  featVisible]  = useScrollReveal();
  const [ctaRef,   ctaVisible]   = useScrollReveal();

  const handleInstallApp = async () => {
    if (deviceType === "desktop") { navigate("/install"); return; }
    if (deviceType === "android" && canInstall) {
      const accepted = await install();
      if (!accepted) navigate("/install");
      return;
    }
    navigate("/install");
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { title: 'Offline-Funktionen',   description: 'Arbeite überall, auch ohne Internet. Alles synchronisiert sich automatisch.', Icon: Wifi },
    { title: 'QR-Code Management',   description: 'Generiere und scanne QR-Codes. Schnelle Erfassung deiner Ausrüstung.',         Icon: QrCode },
    { title: 'Event-Checklisten',    description: 'Plane deine Gigs mit intelligenten Checklisten und Equipment-Paketen.',          Icon: CheckSquare },
    { title: 'Echtzeit-Sync',        description: 'Alle deine Geräte sind immer aktuell. Cloud-sicher und schnell.',               Icon: Radio },
    { title: 'DMX-Konfiguration',    description: 'Verwalte deine DMX-Kanäle und Universen direkt in der App.',                     Icon: SlidersHorizontal },
    { title: 'Audit-Log',            description: 'Nachverfolgung aller Änderungen. Wer hat was und wann gemacht?',                 Icon: ClipboardList },
  ];

  const invItems = [
    { icon: Speaker,   name: 'JBL EON 615',       status: 'verfügbar',  color: 'text-green-500' },
    { icon: Lightbulb, name: 'Moving Head 250W',   status: 'verliehen',  color: 'text-amber-500' },
    { icon: Mic,       name: 'SM58 Mikrofon',       status: 'verfügbar',  color: 'text-green-500' },
    { icon: Cable,     name: 'XLR 10m (x8)',        status: 'in-einsatz', color: 'text-blue-500' },
  ];

  return (
    <>
      <style>{ANIM_CSS}</style>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header className="rig-header border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="text-xl sm:text-2xl font-bold gradient-text">RigFlow</div>
            <div className="flex gap-1.5 sm:gap-2">
              {!isInstalled && !isNative() && (
                <Button variant="outline" size="icon" onClick={handleInstallApp} className="sm:hidden" title="App installieren">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {!isInstalled && !isNative() && (
                <Button variant="outline" size="sm" onClick={handleInstallApp} className="hidden sm:inline-flex gap-1.5">
                  <Download className="h-4 w-4" />
                  App installieren
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => navigate('/auth?step=login')} className="sm:hidden">
                <Lock className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/auth?step=login')} className="hidden sm:inline-flex">
                Anmelden
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                <span className="hidden sm:inline">Kostenlos starten</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
          <div className="text-center space-y-6">

{/*
            <div className="rig-hero-el d0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
              <span className="rig-blink w-1.5 h-1.5 rounded-full bg-primary" />
              Jetzt in Beta – kostenlos testen
            </div> */}

            {/* Title – pain-first headline */}
            <h1 className="rig-hero-el d0 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Nie wieder fehlendes
              <br />
              <span className="gradient-text">Equipment beim Gig.</span>
            </h1>

            {/* Real scenario subtitle */}
            <p className="rig-hero-el d1 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Perfekt für Verleiher, DJs und kleine Event-Teams, die den Überblick über ihr
              Equipment behalten wollen – ohne Excel-Chaos und manuelle Listen.
            </p>

            {/* CTA Buttons */}
            <div className="rig-hero-el d2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/register')} className="gap-2 text-base px-8">
                Kostenlos starten
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!isInstalled && !isNative() && (
                <Button size="lg" variant="outline" onClick={handleInstallApp} className="gap-2">
                  <Download className="h-4 w-4" />
                  App installieren
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={scrollToFeatures} className="gap-2 text-muted-foreground">
                Features ansehen
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Social proof hint */}
            <p className="rig-hero-el d3 text-xs text-muted-foreground/60">
              Kein Kreditkarte. Keine Verpflichtung. Sofort loslegen.
            </p>
          </div>

          {/* Device Mockup */}
          <div className="rig-hero-el d4">
            <HeroMockup />
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Feature Preview 1: QR Scanner                                  */}
          {/* -------------------------------------------------------------- */}
          <div ref={qrRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-8">

            <div className={`rig-reveal-l space-y-4 ${qrVisible ? 'rig-vis' : ''}`}>
              <h2 className="text-2xl sm:text-3xl font-bold">QR-Code Scanning</h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Erfasse dein Equipment mit einem Scan. Einfach. Schnell. Offline.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>QR-Codes für alle Geräte generieren</span>
                </li>
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Status in Echtzeit aktualisieren</span>
                </li>
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Auch ohne Internet arbeiten</span>
                </li>
              </ul>
            </div>

            <div className={`rig-reveal-r ${qrVisible ? 'rig-vis' : ''}`}
                 style={{ transitionDelay: qrVisible ? '80ms' : '0ms' }}>
              <Card className="rig-float glass-card p-6 aspect-[4/3] flex items-center justify-center overflow-hidden relative">
                <div className="w-full max-w-[240px] mx-auto relative">
                  <div className="rounded-2xl border-2 border-border bg-background/80 p-3 shadow-xl">
                    <div className="rounded-lg bg-muted/30 aspect-square flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-4 border-2 border-primary/40 rounded-lg" />
                      <div className="absolute top-4 left-4  w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                      <div className="absolute bottom-4 left-4  w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-md" />
                      <div className="rig-scan-line" />
                      <QrCode className="h-12 w-12 text-primary/30" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 px-1">
                      <ScanLine className="h-4 w-4 text-primary" />
                      <div className="h-2 bg-primary/20 rounded-full flex-1" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Feature Preview 2: Inventory                                   */}
          {/* -------------------------------------------------------------- */}
          <div ref={invRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-8">

            <div className={`rig-reveal-l order-2 md:order-1 ${invVisible ? 'rig-vis' : ''}`}>
              <Card className="rig-float glass-card p-6 aspect-[4/3] flex items-center justify-center overflow-hidden">
                <div className="w-full max-w-[280px] space-y-2">
                  {invItems.map((item, i) => (
                    <div
                      key={i}
                      className={`rig-inv-item flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/50 ${invVisible ? 'rig-vis' : ''}`}
                      style={{ transitionDelay: invVisible ? `${i * 100 + 150}ms` : '0ms' }}
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className={`text-xs ${item.color}`}>{item.status}</div>
                      </div>
                      <QrCode className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className={`rig-reveal-r space-y-4 order-1 md:order-2 ${invVisible ? 'rig-vis' : ''}`}
                 style={{ transitionDelay: invVisible ? '100ms' : '0ms' }}>
              <h2 className="text-2xl sm:text-3xl font-bold">Inventar-Übersicht</h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Alle Geräte auf einen Blick. Filter, suche und verwalte dein komplettes Equipment.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Kategorien: Licht, Ton, Kabel & mehr</span>
                </li>
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Verleih-Status immer im Blick</span>
                </li>
                <li className="flex gap-2 items-start">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Bilder und Notizen pro Gerät</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* NEW: Projekt- & Pack-Management                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-muted/10 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div ref={projRef} className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

              {/* Text */}
              <div className={`rig-reveal-l space-y-5 ${projVisible ? 'rig-vis' : ''}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Projekt- &amp; Pack-Management
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Packlisten, die mitdenken.
                </h2>
                <p className="text-muted-foreground text-base">
                  Stell dein Material für Projekte zusammen und behalte beim Packen den Überblick.
                  RigFlow zeigt dir in Echtzeit, was bereits verladen ist und was noch fehlt.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: ClipboardList, label: 'Projekt-Reports', desc: 'Generiere Reports pro Event' },
                    { icon: Package,       label: 'Set-Listen',      desc: 'Packages schnell verwalten' },
                    { icon: Activity,      label: 'Echtzeit',        desc: 'Verfügbarkeit live sehen' },
                  ].map((f, i) => (
                    <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                      <f.icon className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup */}
              <div className={`rig-reveal-r ${projVisible ? 'rig-vis' : ''}`}
                   style={{ transitionDelay: projVisible ? '100ms' : '0ms' }}>
                <Card className="rig-float glass-card p-5 space-y-3">
                  {/* Project header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">Projekt: Open Air Berlin</div>
                      <div className="text-xs text-muted-foreground">15. Juni 2025 · 3 Packages</div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-green-500/15 text-green-500 text-xs font-medium">aktiv</div>
                  </div>
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    {[
                      { name: 'PA System',    items: 8, done: 8  },
                      { name: 'Licht-Rig',   items: 12, done: 10 },
                      { name: 'Backline',    items: 5,  done: 5  },
                    ].map((pkg, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-primary" />
                            <span className="font-medium">{pkg.name}</span>
                          </div>
                          <span className="text-muted-foreground">{pkg.done}/{pkg.items} bereit</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${(pkg.done / pkg.items) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-border/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-primary" />
                      <span>23 von 25 Artikeln verfügbar</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* NEW: Technik-Features – Das Herzstück (3-Spalten)                */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
            <div ref={techRef} className={`text-center space-y-3 rig-reveal ${techVisible ? 'rig-vis' : ''}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                Das Herzstück
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold">Mehr als nur eine Liste.</h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                RigFlow geht tiefer als andere Tools – mit Features, die du im täglichen
                Event-Betrieb wirklich brauchst.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: SlidersHorizontal,
                  title: 'DMX-Patchplan',
                  tag: 'Licht & Technik',
                  description:
                    'Plane dein Universum. Verwalte Startadressen und Modi direkt am Gerät – Konflikte werden automatisch erkannt.',
                  link: '/features/dmx',
                  linkLabel: 'DMX-Workflow ansehen',
                  preview: (
                    <div className="space-y-1 pt-2">
                      {[
                        { ch: '001', name: 'Spot A', mode: '16ch', ok: true },
                        { ch: '017', name: 'Spot B', mode: '16ch', ok: true },
                        { ch: '033', name: 'Hazer',  mode: '4ch',  ok: false },
                      ].map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${r.ok ? 'bg-muted/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <span className="font-mono text-primary/80 w-7">{r.ch}</span>
                          <span className="flex-1">{r.name}</span>
                          <span className="text-muted-foreground">{r.mode}</span>
                          {!r.ok && <span className="text-red-400 text-[10px]">Konflikt</span>}
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  icon: Wrench,
                  title: 'Wartung & Service',
                  tag: 'DGUV V3 konform',
                  description:
                    'Tracke Prüfzyklen und reparierte Mängel in der Maintenance-Historie. Kein Gerät fällt durch die Prüfung.',
                  link: '/features/service',
                  linkLabel: 'Service-Features ansehen',
                  preview: (
                    <div className="space-y-2 pt-2">
                      {[
                        { name: 'SM58 #3',       date: '12.03.25', status: 'geprüft',   col: 'text-green-400' },
                        { name: 'Moving Head A', date: '01.06.25', status: 'fällig',    col: 'text-amber-400' },
                        { name: 'Endstufe Crown', date: '—',      status: 'Mangel',    col: 'text-red-400' },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 px-2 py-1.5 rounded">
                          <Wrench className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{r.name}</span>
                          <span className="text-muted-foreground">{r.date}</span>
                          <span className={r.col}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  icon: ScanLine,
                  title: 'QR-Scanner Workflow',
                  tag: 'Kern-Feature',
                  description:
                    'Verleih, Aufbau, Abbau, Inventur – vier Modi, ein Wizard. Ein Scan aktualisiert den Status und bucht gegen dein Projekt.',
                  link: '/features/scanner',
                  linkLabel: 'Scanner-Workflow ansehen',
                  preview: (
                    <div className="space-y-1.5 pt-2">
                      {[
                        { icon: Truck,        label: 'Verleih',         col: 'text-blue-400',    bg: 'bg-blue-400/10'    },
                        { icon: Package,      label: 'Aufbau',          col: 'text-primary',     bg: 'bg-primary/10'     },
                        { icon: RotateCcw,    label: 'Abbau/Rückgabe',  col: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                        { icon: ClipboardList,label: 'Inventur',        col: 'text-muted-foreground', bg: 'bg-muted/20'  },
                      ].map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border/30 ${r.bg}`}>
                          <r.icon className={`h-3 w-3 ${r.col} flex-shrink-0`} />
                          <span className={`font-medium ${r.col}`}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`rig-reveal ${techVisible ? 'rig-vis' : ''}`}
                  style={{ transitionDelay: techVisible ? `${i * 100}ms` : '0ms' }}
                >
                  <Card
                    className="rig-subcard glass-card p-6 space-y-4 h-full flex flex-col border border-border/50"
                    onClick={() => navigate(card.link)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20">
                        {card.tag}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-base">{card.title}</h3>
                      <p className="text-muted-foreground text-sm">{card.description}</p>
                    </div>
                    {/* Mini preview */}
                    <div className="flex-1 rounded-lg bg-background/40 border border-border/30 p-2 overflow-hidden">
                      {card.preview}
                    </div>
                    <button
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium mt-auto"
                      onClick={(e) => { e.stopPropagation(); navigate(card.link); }}
                    >
                      {card.linkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* NEW: Sicherheit auf Enterprise-Level                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-muted/10 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div ref={secRef} className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

              <div className={`rig-reveal-l space-y-5 ${secVisible ? 'rig-vis' : ''}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  Sicherheit &amp; Datenschutz
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Sicherheit auf<br />Enterprise-Level.
                </h2>
                <p className="text-muted-foreground text-base">
                  Deine Daten gehören dir. Mit Multi-Faktor-Authentisierung (MFA),
                  regelmäßigen Backups und DSGVO-konformem Hosting ist dein Inventar
                  jederzeit sicher.
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Multi-Faktor-Authentisierung (MFA)',  desc: 'Kein unbefugter Zugriff auf dein Konto' },
                    { label: 'DSGVO-konformes Hosting',  desc: 'Daten in europäischen Rechenzentren' },
                    { label: 'Automatische Backups',                desc: 'Dein Inventar ist immer gesichert' },
                    { label: 'Account-Löschung jederzeit',          desc: 'Volle Kontrolle über deine Daten' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import / Export side */}
              <div className={`rig-reveal-r space-y-5 ${secVisible ? 'rig-vis' : ''}`}
                   style={{ transitionDelay: secVisible ? '120ms' : '0ms' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <FileDown className="h-3.5 w-3.5" />
                  Import &amp; Export
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Kein<br />Vendor Lock-in.
                </h2>
                <p className="text-muted-foreground text-base">
                  Exportiere deine Daten jederzeit als CSV oder synchronisiere sie direkt
                  mit Google Sheets – dein Inventar bleibt immer portabel.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="glass-card p-4 space-y-2 border border-border/50">
                    <FileDown className="h-5 w-5 text-primary" />
                    <div className="text-sm font-semibold">CSV-Export</div>
                    <div className="text-xs text-muted-foreground">Alle Daten als Datei herunterladen</div>
                  </Card>
                  <Card className="glass-card p-4 space-y-2 border border-border/50">
                    <Database className="h-5 w-5 text-primary" />
                    <div className="text-sm font-semibold">Google Sheets</div>
                    <div className="text-xs text-muted-foreground">Direkte Synchronisierung</div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Features Grid Section                                            */}
        {/* ---------------------------------------------------------------- */}
        <section ref={featuresRef} className="bg-muted/20 border-y border-border/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">

            <div ref={featRef} className={`text-center space-y-3 rig-reveal ${featVisible ? 'rig-vis' : ''}`}>
              <h2 className="text-3xl sm:text-4xl font-bold">Das bekommst du mit RigFlow</h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Alles, was du für professionelles Inventory-Management brauchst
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className={`rig-reveal ${featVisible ? 'rig-vis' : ''}`}
                  style={{ transitionDelay: featVisible ? `${i * 80}ms` : '0ms' }}
                >
                  <Card className="rig-card-lift glass-card p-5 space-y-3 h-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </Card>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div ref={ctaRef} className={`rig-reveal text-center space-y-4 pt-6 ${ctaVisible ? 'rig-vis' : ''}`}>
              <p className="text-lg text-muted-foreground">
                Bereit, dein Inventar-Chaos zu beenden?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
                  Inventar jetzt organisieren
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60">Kostenlos. Kein Kreditkarte. Sofort starten.</p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer – 4-column layout                                         */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* 4-column grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

              {/* Brand */}
              <div className="col-span-2 md:col-span-1 space-y-3">
                <div className="text-xl font-bold gradient-text">RigFlow</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Das Inventar-Management für Veranstaltungstechniker.
                </p>
              </div>

              {/* Produkt */}
              <div>
                <div className="footer-col-header">Produkt</div>
                <a href="#" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }} className="footer-link">Features</a>
                <a href="/install" className="footer-link">App installieren</a>
                <a href="/register" className="footer-link">Jetzt starten</a>
                <a href="/features/dmx" className="footer-link">DMX-Workflow</a>
              </div>

              {/* Rechtliches */}
              <div>
                <div className="footer-col-header">Rechtliches</div>
                <a href="/impressum" className="footer-link">Impressum</a>
                <a href="/datenschutz" className="footer-link">Datenschutz</a>
                <a href="/nutzungsbedingungen" className="footer-link">Nutzungsbedingungen</a>
              </div>

              {/* Kontakt */}
              <div>
                <div className="footer-col-header">Kontakt</div>
                <a href="mailto:rigflow.app@gmail.com" className="footer-link">rigflow.app@gmail.com</a>
              </div>

            </div>

            {/* Bottom bar */}
            <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">© 2026 RigFlow. Gebaut für Veranstaltungstechniker.</p>
              <p className="text-xs text-muted-foreground/50">Made with ❤️ for the live events industry.</p>
            </div>

          </div>
        </footer>

      </div>
    </>
  );
}
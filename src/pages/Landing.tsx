import { useRef, useEffect, useState } from 'react';
import {
  ChevronRight, Zap, Lock, Smartphone, ArrowRight, Download,
  Wifi, QrCode, CheckSquare, Radio, SlidersHorizontal, ClipboardList,
  ScanLine, Speaker, Lightbulb, Mic, Cable
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';


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

  /* Header slide-down on mount */
  .rig-header { animation: rigHeaderIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }

  /* Hero staggered entrance (CSS animation, not transition) */
  .rig-hero-el { animation: rigFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
  .d0 { animation-delay: 0ms;   }
  .d1 { animation-delay: 130ms; }
  .d2 { animation-delay: 260ms; }
  .d3 { animation-delay: 390ms; }

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
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Landing() {
  const navigate = useNavigate();
  const { canInstall, isInstalled, install, deviceType } = useInstallPrompt();
  const featuresRef = useRef<HTMLDivElement>(null);          // scroll-to target
  const [qrRef,   qrVisible]   = useScrollReveal();
  const [invRef,  invVisible]  = useScrollReveal();
  const [featRef, featVisible] = useScrollReveal();
  const [ctaRef,  ctaVisible]  = useScrollReveal();

  const handleInstallApp = async () => {
    // Desktop → immer zum Windows-Installer
    if (deviceType === "desktop") {
      navigate("/install");
      return;
    }

    // Android mit nativem Prompt → direkt installieren
    if (deviceType === "android" && canInstall) {
      const accepted = await install();
      if (!accepted) navigate("/install"); // User hat abgelehnt → Anleitung zeigen
      return;
    }

    // iOS oder Android ohne Prompt → Installationsanleitung
    navigate("/install");
  };

  const [debugInfo, setDebugInfo] = useState<string>("waiting...");

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { title: 'Offline-Funktionen',   description: 'Arbeite überall, auch ohne Internet. Alles synchronisiert sich automatisch.', Icon: Wifi },
    { title: 'QR-Code Management',   description: 'Generiere und scanne QR-Codes. Schnelle Erfassung deiner Ausrüstung.',         Icon: QrCode },
    { title: 'Event-Checklisten',    description: 'Plane deine Gigs mit intelligenten Checklisten und Equipment-Paketen.',          Icon: CheckSquare },
    { title: 'Echtzeit-Sync',        description: 'Alle deine Geräte sind immer aktuell. Cloud-sicher und schnell.',               Icon: Radio },
    { title: 'DMX-Konfiguration',    description: 'Verwalte deine DMX-Kanäle und Universe direkt in der App.',                     Icon: SlidersHorizontal },
    { title: 'Audit-Log',            description: 'Nachverfolgung aller Änderungen. Wer hat was und wann gemacht?',                 Icon: ClipboardList },
  ];

  const invItems = [
    { icon: Speaker,   name: 'JBL EON 615',       status: 'verfügbar', color: 'text-green-500' },
    { icon: Lightbulb, name: 'Moving Head 250W',   status: 'verliehen', color: 'text-amber-500' },
    { icon: Mic,       name: 'SM58 Mikrofon',       status: 'verfügbar', color: 'text-green-500' },
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
              {!isInstalled && (
                <Button variant="outline" size="icon" onClick={handleInstallApp} className="sm:hidden">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {!isInstalled && (
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
                <span className="hidden sm:inline">Registrieren</span>
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

            {/* Title – fades up immediately on mount */}
            <h1 className="rig-hero-el d0 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Deine Event-Gear
              <br />
              <span className="gradient-text">vollständig im Griff</span>
            </h1>

            {/* Subtitle */}
            <p className="rig-hero-el d1 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Verwalte dein Inventar offline, synchronisiere automatisch, und behalte den
              Überblick über jeden Gig.
            </p>

            {/* Value Props – stagger wrapper */}
            <div className="rig-hero-el d2 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 my-10">
              <Card className="rig-card-lift glass-card p-5 text-center">
                <Zap className="h-7 w-7 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Schnell & Mobil</h3>
                <p className="text-sm text-muted-foreground">Offline-First, lädt in Millisekunden</p>
              </Card>
              <Card className="rig-card-lift glass-card p-5 text-center">
                <Lock className="h-7 w-7 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Deine Daten</h3>
                <p className="text-sm text-muted-foreground">Sichere Cloud-Synchronisierung</p>
              </Card>
              <Card className="rig-card-lift glass-card p-5 text-center">
                <Smartphone className="h-7 w-7 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">App-Like</h3>
                <p className="text-sm text-muted-foreground">Native App-Erfahrung als PWA</p>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div className="rig-hero-el d3 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={scrollToFeatures} className="gap-2">
                Jetzt entdecken
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isInstalled && (
                <Button size="lg" variant="outline" onClick={handleInstallApp} className="gap-2">
                  <Download className="h-4 w-4" />
                  App herunterladen
                </Button>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Feature Preview 1: QR Scanner                                  */}
          {/* -------------------------------------------------------------- */}
          <div ref={qrRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-8">

            {/* Text slides in from the left */}
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

            {/* Mockup slides in from the right, then floats */}
            <div className={`rig-reveal-r ${qrVisible ? 'rig-vis' : ''}`}
                 style={{ transitionDelay: qrVisible ? '80ms' : '0ms' }}>
              <Card className="rig-float glass-card p-6 aspect-[4/3] flex items-center justify-center overflow-hidden relative">
                <div className="w-full max-w-[240px] mx-auto relative">
                  <div className="rounded-2xl border-2 border-border bg-background/80 p-3 shadow-xl">
                    <div className="rounded-lg bg-muted/30 aspect-square flex items-center justify-center relative overflow-hidden">
                      {/* Viewfinder corners */}
                      <div className="absolute inset-4 border-2 border-primary/40 rounded-lg" />
                      <div className="absolute top-4 left-4  w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                      <div className="absolute bottom-4 left-4  w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-md" />
                      {/* Animated scan line — moves vertically instead of just pulsing */}
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

            {/* Mockup slides in from the left, then floats; items stagger inside */}
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

            {/* Text slides in from the right */}
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
        {/* Features Grid Section                                            */}
        {/* ---------------------------------------------------------------- */}
        <section ref={featuresRef} className="bg-muted/20 border-y border-border/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">

            {/* Section heading triggers the reveal */}
            <div ref={featRef} className={`text-center space-y-3 rig-reveal ${featVisible ? 'rig-vis' : ''}`}>
              <h2 className="text-3xl sm:text-4xl font-bold">Das bekommst du mit RigFlow</h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Alles, was du für professionelles Inventory-Management brauchst
              </p>
            </div>

            {/* Feature cards: staggered fade-up + hover lift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                // Wrapper handles reveal; Card handles hover — no transform conflict
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
                Bereit, dein Inventar zu revolutionieren?
              </p>
              <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
                Konto erstellen & loslegen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                           */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-muted-foreground space-y-3">

            <p>© 2026 RigFlow. Gebaut für Veranstaltungstechniker.</p>

            <div className="flex justify-center gap-6 text-sm">
              <a
                href="/impressum"
                className="hover:text-foreground transition-colors"
              >
                Impressum
              </a>

              <a
                href="/datenschutz"
                className="hover:text-foreground transition-colors"
              >
                Datenschutz
              </a>
            </div>

          </div>
        </footer>

      </div>
    </>
  );
}
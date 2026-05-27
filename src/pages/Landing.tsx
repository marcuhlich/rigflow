import { useRef, useEffect, useState } from 'react';
import {
  ChevronRight, Zap, Lock, Smartphone, ArrowRight, Download,
  Wifi, QrCode, CheckSquare, Radio, SlidersHorizontal, ClipboardList,
  ScanLine, Speaker, Lightbulb, Mic, Cable, Shield, FileDown,
  Package, FolderKanban, Activity, Wrench, Database,
  ChevronDown, ExternalLink, Truck, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card }   from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isNative } from '@/services/platform';
import { useTranslation } from 'react-i18next';

// ─── Scroll-reveal ────────────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

// ─── CSS (unverändert) ────────────────────────────────────────────────────────

const ANIM_CSS = `
  @keyframes rigFadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rigHeaderIn { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes rigFloat { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-9px)} }
  @keyframes rigScan { 0%{top:14%;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{top:83%;opacity:0} }
  @keyframes nativeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mockupFloat { 0%,100%{transform:translateY(0px) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(-1deg)} }
  @keyframes statusBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes scanBar { 0%{transform:translateY(0);opacity:0.8} 100%{transform:translateY(120px);opacity:0} }
  @keyframes pageSlideOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(20px)} }
  @keyframes pageSlideIn  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .rig-header{animation:rigHeaderIn 0.5s cubic-bezier(0.22,1,0.36,1) both}
  .rig-hero-el{animation:rigFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both}
  .d0{animation-delay:0ms}.d1{animation-delay:130ms}.d2{animation-delay:260ms}.d3{animation-delay:390ms}.d4{animation-delay:520ms}
  .native-animate-0{animation:nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both;animation-delay:0ms}
  .native-animate-1{animation:nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both;animation-delay:120ms}
  .native-animate-2{animation:nativeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both;animation-delay:240ms}
  .rig-mockup-float{animation:mockupFloat 6s ease-in-out infinite}
  .rig-float{animation:rigFloat 5s ease-in-out infinite}
  .rig-scan-line{position:absolute;left:1.5rem;right:1.5rem;height:2px;background:linear-gradient(to right,transparent,hsl(var(--primary)),transparent);box-shadow:0 0 10px hsl(var(--primary)/0.7);animation:rigScan 2.4s ease-in-out infinite;pointer-events:none}
  .rig-blink{animation:statusBlink 2s ease-in-out infinite}
  .rig-scanbar{position:absolute;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,hsl(var(--primary)),transparent);animation:scanBar 1.8s ease-in-out infinite;pointer-events:none}
  .rig-reveal{opacity:0;transform:translateY(22px);transition:opacity .55s ease,transform .55s ease}
  .rig-reveal.rig-vis{opacity:1;transform:translateY(0)}
  .rig-reveal-r{opacity:0;transform:translateX(30px);transition:opacity .62s ease,transform .62s ease}
  .rig-reveal-r.rig-vis{opacity:1;transform:translateX(0)}
  .rig-reveal-l{opacity:0;transform:translateX(-30px);transition:opacity .62s ease,transform .62s ease}
  .rig-reveal-l.rig-vis{opacity:1;transform:translateX(0)}
  .rig-inv-item{opacity:0;transform:translateX(-16px);transition:opacity .4s ease,transform .4s ease}
  .rig-inv-item.rig-vis{opacity:1;transform:translateX(0)}
  .rig-card-lift{transition:transform .22s ease,box-shadow .22s ease}
  .rig-card-lift:hover{transform:translateY(-5px) scale(1.015);box-shadow:0 22px 55px rgba(0,0,0,.3)}
  .rig-subcard{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;cursor:pointer}
  .rig-subcard:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.25);border-color:hsl(var(--primary)/.5)}
  .page-exit{animation:pageSlideOut .3s ease forwards}
  .page-enter{animation:pageSlideIn .4s ease forwards}
  .footer-col-header{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:hsl(var(--muted-foreground));margin-bottom:.75rem}
  .footer-link{display:block;font-size:.875rem;color:hsl(var(--muted-foreground));transition:color .18s ease;margin-bottom:.4rem}
  .footer-link:hover{color:hsl(var(--foreground))}
`;

// ─── NativeWelcome ────────────────────────────────────────────────────────────

function NativeWelcome() {
  const navigate = useNavigate();
  const { t }    = useTranslation();

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center px-6 overflow-hidden relative page-enter">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full relative z-10 py-8">
          <div className="mb-8 native-animate-0">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-2xl" />
              <img src="/logo-transparent.png" alt="RigFlow" className="h-28 w-28 object-contain drop-shadow-2xl relative" />
            </div>
          </div>

          <div className="space-y-4 mb-8 native-animate-1">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                {t('landing.home.native.headline_1')}
              </h1>
            </div>
            <div>
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                {t('landing.home.native.headline_2')}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground pt-1 font-medium">
              {t('landing.home.native.subtitle')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full native-animate-2">
            <Button
              size="lg"
              className="w-full text-base font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 hover:scale-[1.01]"
              onClick={() => navigate('/register')}
            >
              {t('landing.home.native.cta_register')}
            </Button>
            <button
              onClick={() => navigate('/auth?step=login')}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {t('landing.home.native.cta_login')}
            </button>
          </div>
        </div>

        <div className="flex gap-6 text-xs text-muted-foreground relative z-10 pb-6">
          <a href="/impressum"   className="hover:text-foreground transition-colors duration-200 font-medium">{t('settings.imprint_link')}</a>
          <a href="/datenschutz" className="hover:text-foreground transition-colors duration-200 font-medium">{t('landing.home.footer.privacy')}</a>
        </div>
      </div>
    </>
  );
}

// ─── HeroMockup (keine Texte) ─────────────────────────────────────────────────

function HeroMockup() {
  const { t } = useTranslation();
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>
      <img
        src="/mockups.png"
        alt={t('landing.home.hero.mockup_alt')}
        className="rig-mockup-float relative w-full h-auto object-contain"
        style={{ filter: 'drop-shadow(0 40px 20px rgba(0,0,0,0.2))', transition: 'transform 0.4s ease, filter 0.4s ease' }}
        onMouseEnter={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.transform = 'scale(1.03) translateY(-6px)';
          img.style.filter = 'drop-shadow(0 55px 40px rgba(0,0,0,0.5))';
          img.style.animationPlayState = 'paused';
        }}
        onMouseLeave={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.transform = '';
          img.style.filter = 'drop-shadow(0 40px 20px rgba(0,0,0,0.2))';
          img.style.animationPlayState = 'running';
        }}
      />
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  if (isNative()) return <NativeWelcome />;

  const navigate = useNavigate();
  const { t }    = useTranslation();
  const { canInstall, isInstalled, install, deviceType } = useInstallPrompt();

  const featuresRef = useRef<HTMLDivElement>(null);
  const [qrRef,   qrVisible]   = useScrollReveal();
  const [invRef,  invVisible]  = useScrollReveal();
  const [projRef, projVisible] = useScrollReveal();
  const [techRef, techVisible] = useScrollReveal();
  const [secRef,  secVisible]  = useScrollReveal();
  const [featRef, featVisible] = useScrollReveal();
  const [ctaRef,  ctaVisible]  = useScrollReveal();

  const handleInstallApp = async () => {
    if (deviceType === 'desktop') { navigate('/install'); return; }
    if (deviceType === 'android' && canInstall) {
      const accepted = await install();
      if (!accepted) navigate('/install');
      return;
    }
    navigate('/install');
  };

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Daten aus JSON ──────────────────────────────────────────────────────────

  type TextItem     = { title: string; description: string };
  type InvItem      = { name: string; status: string };
  type SubFeature   = { label: string; desc: string };
  type DemoPkg      = { name: string; items: number; done: number };
  type TechCard     = { title: string; tag: string; description: string; link_label: string };
  type SecurityItem = { label: string; desc: string };
  type DmxRow       = { ch: string; name: string; mode: string };
  type SvcRow       = { name: string; date: string; status: string };
  type QrListItem   = string;

  const featureTexts  = t('landing.home.features_section.items', { returnObjects: true }) as TextItem[];
  const FEAT_ICONS    = [Wifi, QrCode, CheckSquare, Radio, SlidersHorizontal, ClipboardList];
  const features      = featureTexts.map((f, i) => ({ ...f, Icon: FEAT_ICONS[i] }));

  const invItemTexts  = t('landing.home.inventory_section.demo_items', { returnObjects: true }) as InvItem[];
  const INV_ICONS     = [Speaker, Lightbulb, Mic, Cable];
  const invItems      = invItemTexts.map((item, i) => ({ ...item, icon: INV_ICONS[i] }));

  const subFeatTexts  = t('landing.home.project_section.sub_features', { returnObjects: true }) as SubFeature[];
  const SUB_ICONS     = [ClipboardList, Package, Activity];
  const subFeatures   = subFeatTexts.map((f, i) => ({ ...f, Icon: SUB_ICONS[i] }));

  const demoPackages  = t('landing.home.project_section.demo_packages', { returnObjects: true }) as DemoPkg[];

  const techCards     = t('landing.home.tech_section.cards', { returnObjects: true }) as TechCard[];
  const TECH_ICONS    = [SlidersHorizontal, Wrench, ScanLine];
  const TECH_LINKS    = ['/features/dmx', '/features/service', '/features/scanner'];

  const DMX_OK        = [true, true, false];
  const dmxRows       = (t('landing.home.tech_section.dmx_preview_rows', { returnObjects: true }) as DmxRow[])
    .map((r, i) => ({ ...r, ok: DMX_OK[i] }));

  const SVC_COLS      = ['text-green-400', 'text-amber-400', 'text-red-400'];
  const svcRows       = (t('landing.home.tech_section.service_preview_rows', { returnObjects: true }) as SvcRow[])
    .map((r, i) => ({ ...r, col: SVC_COLS[i] }));

  const SCANNER_VIS   = [
    { icon: Truck,         col: 'text-blue-400',         bg: 'bg-blue-400/10'    },
    { icon: Package,       col: 'text-primary',           bg: 'bg-primary/10'     },
    { icon: RotateCcw,     col: 'text-emerald-400',       bg: 'bg-emerald-400/10' },
    { icon: ClipboardList, col: 'text-muted-foreground',  bg: 'bg-muted/20'       },
  ];
  const scannerModes  = (t('landing.home.tech_section.scanner_modes', { returnObjects: true }) as string[])
    .map((label, i) => ({ label, ...SCANNER_VIS[i] }));

  const secItems      = t('landing.home.security_section.security.items', { returnObjects: true }) as SecurityItem[];
  const qrListItems   = t('landing.home.qr_section.items', { returnObjects: true }) as QrListItem[];
  const invListItems  = t('landing.home.inventory_section.items', { returnObjects: true }) as QrListItem[];

  // Tech-Card Preview JSX — gebaut aus übersetzten Daten
  const techPreviews = [
    // DMX
    <div className="space-y-1 pt-2">
      {dmxRows.map((r, i) => (
        <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${r.ok ? 'bg-muted/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <span className="font-mono text-primary/80 w-7">{r.ch}</span>
          <span className="flex-1">{r.name}</span>
          <span className="text-muted-foreground">{r.mode}</span>
          {!r.ok && <span className="text-red-400 text-[10px]">{t('landing.home.tech_section.conflict_label')}</span>}
        </div>
      ))}
    </div>,
    // Service
    <div className="space-y-2 pt-2">
      {svcRows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 px-2 py-1.5 rounded">
          <Wrench className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 truncate">{r.name}</span>
          <span className="text-muted-foreground">{r.date}</span>
          <span className={r.col}>{r.status}</span>
        </div>
      ))}
    </div>,
    // Scanner
    <div className="space-y-1.5 pt-2">
      {scannerModes.map((m, i) => (
        <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border/30 ${m.bg}`}>
          <m.icon className={`h-3 w-3 ${m.col} flex-shrink-0`} />
          <span className={`font-medium ${m.col}`}>{m.label}</span>
        </div>
      ))}
    </div>,
  ];

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">

        {/* Header */}
        <header className="rig-header border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="text-xl sm:text-2xl font-bold gradient-text">RigFlow</div>
            <div className="flex gap-1.5 sm:gap-2">
              {!isInstalled && !isNative() && (
                <Button variant="outline" size="icon" onClick={handleInstallApp} className="sm:hidden" title={t('landing.home.header.install')}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {!isInstalled && !isNative() && (
                <Button variant="outline" size="sm" onClick={handleInstallApp} className="hidden sm:inline-flex gap-1.5">
                  <Download className="h-4 w-4" />
                  {t('landing.home.header.install')}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => navigate('/auth?step=login')} className="sm:hidden">
                <Lock className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/auth?step=login')} className="hidden sm:inline-flex">
                {t('landing.home.header.login')}
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                <span className="hidden sm:inline">{t('landing.common.startFree')}</span>
                <span className="sm:hidden">{t('landing.home.header.start_mobile')}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
          <div className="text-center space-y-6">
            <h1 className="rig-hero-el d0 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {t('landing.home.hero.title_line1')}
              <br />
              <span className="gradient-text">{t('landing.home.hero.title_highlight')}</span>
            </h1>
            <p className="rig-hero-el d1 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.home.hero.subtitle')}
            </p>
            <div className="rig-hero-el d2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/register')} className="gap-2 text-base px-8">
                {t('landing.common.startFree')} <ArrowRight className="h-4 w-4" />
              </Button>
              {!isInstalled && !isNative() && (
                <Button size="lg" variant="outline" onClick={handleInstallApp} className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('landing.home.header.install')}
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={scrollToFeatures} className="gap-2 text-muted-foreground">
                {t('landing.home.hero.cta_features')} <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <p className="rig-hero-el d3 text-xs text-muted-foreground/60">
              {t('landing.home.hero.no_cc')}
            </p>
          </div>

          <div className="rig-hero-el d4"><HeroMockup /></div>

          {/* QR Scanner */}
          <div ref={qrRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-8">
            <div className={`rig-reveal-l space-y-4 ${qrVisible ? 'rig-vis' : ''}`}>
              <h2 className="text-2xl sm:text-3xl font-bold">{t('landing.home.qr_section.title')}</h2>
              <p className="text-muted-foreground text-base sm:text-lg">{t('landing.home.qr_section.description')}</p>
              <ul className="space-y-2 text-sm">
                {qrListItems.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`rig-reveal-r ${qrVisible ? 'rig-vis' : ''}`} style={{ transitionDelay: qrVisible ? '80ms' : '0ms' }}>
              <Card className="rig-float glass-card p-6 aspect-[4/3] flex items-center justify-center overflow-hidden relative">
                <div className="w-full max-w-[240px] mx-auto relative">
                  <div className="rounded-2xl border-2 border-border bg-background/80 p-3 shadow-xl">
                    <div className="rounded-lg bg-muted/30 aspect-square flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-4 border-2 border-primary/40 rounded-lg" />
                      <div className="absolute top-4 left-4   w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                      <div className="absolute top-4 right-4  w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
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

          {/* Inventar */}
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
                        <div className="text-xs text-muted-foreground">{item.status}</div>
                      </div>
                      <QrCode className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className={`rig-reveal-r space-y-4 order-1 md:order-2 ${invVisible ? 'rig-vis' : ''}`}
                 style={{ transitionDelay: invVisible ? '100ms' : '0ms' }}>
              <h2 className="text-2xl sm:text-3xl font-bold">{t('landing.home.inventory_section.title')}</h2>
              <p className="text-muted-foreground text-base sm:text-lg">{t('landing.home.inventory_section.description')}</p>
              <ul className="space-y-2 text-sm">
                {invListItems.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Projekt- & Pack-Management */}
        <section className="bg-muted/10 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div ref={projRef} className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className={`rig-reveal-l space-y-5 ${projVisible ? 'rig-vis' : ''}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {t('landing.home.project_section.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">{t('landing.home.project_section.title')}</h2>
                <p className="text-muted-foreground text-base">{t('landing.home.project_section.description')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {subFeatures.map((f, i) => (
                    <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                      <f.Icon className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rig-reveal-r ${projVisible ? 'rig-vis' : ''}`}
                   style={{ transitionDelay: projVisible ? '100ms' : '0ms' }}>
                <Card className="rig-float glass-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">
                        {t('landing.home.project_section.demo_project_prefix')} {t('landing.home.project_section.demo_project_name')}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('landing.home.project_section.demo_project_meta')}</div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-green-500/15 text-green-500 text-xs font-medium">
                      {t('landing.home.project_section.demo_status_active')}
                    </div>
                  </div>
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    {demoPackages.map((pkg, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-primary" />
                            <span className="font-medium">{pkg.name}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {pkg.done}/{pkg.items} {t('landing.home.project_section.demo_ready')}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${(pkg.done / pkg.items) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-border/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-primary" />
                      <span>{t('landing.home.project_section.demo_availability')}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Tech-Features */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
            <div ref={techRef} className={`text-center space-y-3 rig-reveal ${techVisible ? 'rig-vis' : ''}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                {t('landing.home.tech_section.badge')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold">{t('landing.home.tech_section.title')}</h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                {t('landing.home.tech_section.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {techCards.map((card, i) => (
                <div
                  key={i}
                  className={`rig-reveal ${techVisible ? 'rig-vis' : ''}`}
                  style={{ transitionDelay: techVisible ? `${i * 100}ms` : '0ms' }}
                >
                  <Card
                    className="rig-subcard glass-card p-6 space-y-4 h-full flex flex-col border border-border/50"
                    onClick={() => navigate(TECH_LINKS[i])}
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {(() => { const Icon = TECH_ICONS[i]; return <Icon className="h-5 w-5 text-primary" />; })()}
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20">
                        {card.tag}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-base">{card.title}</h3>
                      <p className="text-muted-foreground text-sm">{card.description}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-background/40 border border-border/30 p-2 overflow-hidden">
                      {techPreviews[i]}
                    </div>
                    <button
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium mt-auto"
                      onClick={e => { e.stopPropagation(); navigate(TECH_LINKS[i]); }}
                    >
                      {card.link_label} <ExternalLink className="h-3 w-3" />
                    </button>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sicherheit & Import/Export */}
        <section className="bg-muted/10 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div ref={secRef} className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

              <div className={`rig-reveal-l space-y-5 ${secVisible ? 'rig-vis' : ''}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  {t('landing.home.security_section.security.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t('landing.home.security_section.security.title_line1')}<br />
                  {t('landing.home.security_section.security.title_line2')}
                </h2>
                <p className="text-muted-foreground text-base">
                  {t('landing.home.security_section.security.description')}
                </p>
                <div className="space-y-3">
                  {secItems.map((item, i) => (
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

              <div className={`rig-reveal-r space-y-5 ${secVisible ? 'rig-vis' : ''}`}
                   style={{ transitionDelay: secVisible ? '120ms' : '0ms' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <FileDown className="h-3.5 w-3.5" />
                  {t('landing.home.security_section.export.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t('landing.home.security_section.export.title_line1')}<br />
                  {t('landing.home.security_section.export.title_line2')}
                </h2>
                <p className="text-muted-foreground text-base">
                  {t('landing.home.security_section.export.description')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="glass-card p-4 space-y-2 border border-border/50">
                    <FileDown className="h-5 w-5 text-primary" />
                    <div className="text-sm font-semibold">{t('landing.home.security_section.export.csv_title')}</div>
                    <div className="text-xs text-muted-foreground">{t('landing.home.security_section.export.csv_desc')}</div>
                  </Card>
                  <Card className="glass-card p-4 space-y-2 border border-border/50">
                    <Database className="h-5 w-5 text-primary" />
                    <div className="text-sm font-semibold">{t('landing.home.security_section.export.sheets_title')}</div>
                    <div className="text-xs text-muted-foreground">{t('landing.home.security_section.export.sheets_desc')}</div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features-Grid */}
        <section ref={featuresRef} className="bg-muted/20 border-y border-border/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">
            <div ref={featRef} className={`text-center space-y-3 rig-reveal ${featVisible ? 'rig-vis' : ''}`}>
              <h2 className="text-3xl sm:text-4xl font-bold">{t('landing.home.features_section.title')}</h2>
              <p className="text-muted-foreground text-base sm:text-lg">{t('landing.home.features_section.description')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div key={i} className={`rig-reveal ${featVisible ? 'rig-vis' : ''}`}
                     style={{ transitionDelay: featVisible ? `${i * 80}ms` : '0ms' }}>
                  <Card className="rig-card-lift glass-card p-5 space-y-3 h-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <f.Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.description}</p>
                  </Card>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div ref={ctaRef} className={`rig-reveal text-center space-y-4 pt-6 ${ctaVisible ? 'rig-vis' : ''}`}>
              <p className="text-lg text-muted-foreground">{t('landing.home.cta_section.title')}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
                  {t('landing.home.cta_section.btn')} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60">{t('landing.home.cta_section.no_cc')}</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              <div className="col-span-2 md:col-span-1 space-y-3">
                <div className="text-xl font-bold gradient-text">RigFlow</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('landing.home.footer.brand_desc')}</p>
              </div>
              <div>
                <div className="footer-col-header">{t('landing.home.footer.col_product')}</div>
                <a href="#" onClick={e => { e.preventDefault(); scrollToFeatures(); }} className="footer-link">{t('landing.home.footer.link_features')}</a>
                <a href="/install"       className="footer-link">{t('landing.home.header.install')}</a>
                <a href="/register"      className="footer-link">{t('landing.home.footer.link_start')}</a>
                <a href="/features/dmx"  className="footer-link">{t('landing.home.footer.link_dmx')}</a>
              </div>
              <div>
                <div className="footer-col-header">{t('landing.home.footer.col_legal')}</div>
                <a href="/impressum"           className="footer-link">{t('settings.imprint_link')}</a>
                <a href="/datenschutz"          className="footer-link">{t('landing.home.footer.privacy')}</a>
                <a href="/nutzungsbedingungen"  className="footer-link">{t('settings.terms_link')}</a>
              </div>
              <div>
                <div className="footer-col-header">{t('landing.home.footer.col_contact')}</div>
                <a href="mailto:rigflow.app@gmail.com" className="footer-link">rigflow.app@gmail.com</a>
              </div>
            </div>

            <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t('landing.home.footer.copyright')}</p>
              <p className="text-xs text-muted-foreground/50">{t('landing.home.footer.made_with')}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wrench, Shield, Bell, CheckCheck, Sparkles, Search,
  ChevronRight, CheckCircle2, Clock, AlertTriangle, Plus, ImageIcon, Trash2, FileClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card }   from '@/components/ui/card';
import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Scroll-Hook ──────────────────────────────────────────────────────────────

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

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  .du-0 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .du-1 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; animation-delay:120ms; }
  .du-2 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; animation-delay:240ms; }
  .sub-reveal { opacity:0; transform:translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .sub-reveal.sub-vis { opacity:1; transform:translateY(0); }
  @keyframes pageSlideIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .page-enter { animation: pageSlideIn 0.4s ease forwards; }
  @keyframes overduePulse { 0%,100%{opacity:1;}50%{opacity:0.72;} }
  .overdue-pulse { animation: overduePulse 2.2s ease-in-out infinite; }
  @keyframes entryPopIn {
    0%   { opacity:0; transform: translateX(-10px) scale(0.97); }
    55%  { transform: translateX(2px) scale(1.01); }
    100% { opacity:1; transform: translateX(0) scale(1); }
  }
  .entry-new { animation: entryPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

type MType = 'check' | 'reparatur' | 'reinigung' | 'inspektion';

const TYPE_ICONS: Record<MType, React.ReactNode> = {
  check:      <CheckCheck className="h-3.5 w-3.5" />,
  reparatur:  <Wrench     className="h-3.5 w-3.5" />,
  reinigung:  <Sparkles   className="h-3.5 w-3.5" />,
  inspektion: <Search     className="h-3.5 w-3.5" />,
};

const TYPE_DOT: Record<MType, string> = {
  check:      '#6366f1',
  reparatur:  '#f59e0b',
  reinigung:  '#22c55e',
  inspektion: '#3b82f6',
};

// Visueller Config für die Status-Banner — Texte kommen aus JSON
const STATUS_VISUAL = [
  { cls: 'bg-green-500/10 text-green-600 border-green-500/20',   icon: <CheckCircle2   className="h-4 w-4 shrink-0" />, pulse: false },
  { cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: <Clock          className="h-4 w-4 shrink-0" />, pulse: false },
  { cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertTriangle className="h-4 w-4 shrink-0" />, pulse: true  },
];

// Visueller Config für Benefits-Icons
const BENEFIT_ICONS = [FileClock, Bell, ImageIcon, CheckCircle2];

const PILL_TYPES: MType[] = ['check', 'reparatur', 'reinigung', 'inspektion'];

function TypePill({ type, label, isActive, onClick }: {
  type: MType; label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
        ${isActive
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'}`}
    >
      {TYPE_ICONS[type]}
      {label}
    </button>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function ServiceInstandhaltung() {
  const navigate    = useNavigate();
  const { t }       = useTranslation();
  const [activePill, setActivePill] = useState<MType>('check');
  const [ref1, vis1] = useScrollReveal();
  const [ref2, vis2] = useScrollReveal();
  const [ref3, vis3] = useScrollReveal();

  // Demo-Daten aus JSON
  const demoDevices = t('landing.features.service.demo_devices', { returnObjects: true }) as Array<{
    label: string; interval: string; text: string;
  }>;
  const demoRecords = t('landing.features.service.demo_records', { returnObjects: true }) as Array<{
    type: MType; ago: string; notes: string; cost?: string;
  }>;
  const benefits = t('landing.features.service.benefits.items', { returnObjects: true }) as Array<{
    title: string; desc: string;
  }>;
  const trackedItems = t('landing.features.service.tracked.items', { returnObjects: true }) as string[];

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 page-enter">

        {/* Header */}
        <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />{t('common.back')}
            </Button>
            <div className="text-xl font-bold gradient-text">RigFlow</div>
            <Button size="sm" onClick={() => navigate('/register')}>
              {t('landing.common.startFree')}
            </Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-16">

          {/* Hero */}
          <div className="space-y-5 max-w-2xl">
            <div className="du-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <Wrench className="h-3.5 w-3.5" />
              {t('landing.features.service.hero.badge')}
            </div>
            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              {t('landing.features.service.hero.title_line1')}<br />
              <span className="gradient-text">{t('landing.features.service.hero.title_highlight')}</span>
            </h1>
            <p className="du-2 text-lg text-muted-foreground">
              {t('landing.features.service.hero.description')}
            </p>
            <div className="du-2">
              <Button onClick={() => navigate('/register')} className="gap-2">
                {t('landing.common.tryNow')} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mockup */}
          <div ref={ref1} className={`sub-reveal ${vis1 ? 'sub-vis' : ''} space-y-6`}>

            {/* Status-Banner */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('landing.features.service.status_section_title')}
            </h3>
            <div className="space-y-2.5">
              {demoDevices.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs text-muted-foreground pl-1">
                    {d.label} · {t('landing.features.service.interval_label', { interval: d.interval })}
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium
                    ${STATUS_VISUAL[i].cls} ${STATUS_VISUAL[i].pulse ? 'overdue-pulse' : ''}`}>
                    {STATUS_VISUAL[i].icon}
                    <span className="flex-1 min-w-0 text-sm">{d.text}</span>
                    <span className="text-xs font-normal opacity-60 shrink-0">
                      {t('landing.features.service.interval_label', { interval: d.interval })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Aktionszeile */}
            <div className="flex gap-2 mt-2">
              <button className="flex-1 flex items-center justify-center gap-2 text-sm font-medium h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <CheckCheck className="h-4 w-4" />{t('maintenance.quick_confirm')}
              </button>
              <button className="flex items-center gap-1.5 text-sm font-medium h-9 px-4 rounded-md border border-border hover:bg-muted/50 transition-colors">
                <Plus className="h-4 w-4" />{t('maintenance.add_entry')}
              </button>
            </div>

            {/* Formular-Demo */}
            <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
              <div className="text-xs text-muted-foreground font-medium mb-1">
                {t('landing.features.service.form_title')}
              </div>
              <div className="flex flex-wrap gap-2">
                {PILL_TYPES.map(type => (
                  <TypePill
                    key={type}
                    type={type}
                    label={t(`landing.features.service.type_labels.${type}`)}
                    isActive={activePill === type}
                    onClick={() => setActivePill(type)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('maintenance.form.date_label')}</div>
                  <div className="h-9 rounded-md border border-border bg-background/80 px-3 flex items-center text-xs text-muted-foreground">
                    15.05.2026
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('maintenance.form.cost_label')}</div>
                  <div className="h-9 rounded-md border border-border bg-background/80 px-3 flex items-center text-xs text-muted-foreground">
                    € —
                  </div>
                </div>
              </div>
              <div className="h-16 rounded-md border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                {t('maintenance.form.notes_placeholder')}
              </div>
              <div className="flex justify-between items-center pt-1">
                <button className="flex items-center gap-1.5 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />{t('landing.features.service.form_photo_btn')}
                </button>
                <div className="flex gap-2">
                  <button className="text-xs px-3 h-8 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground">
                    {t('common.cancel')}
                  </button>
                  <button className="text-xs px-3 h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('landing.features.service.timeline_title')}
            </h3>
            <div>
              {demoRecords.map((rec, idx) => (
                <div key={idx} className={`flex gap-3 ${idx === 0 ? 'entry-new' : ''}`}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-[1.1rem] shrink-0" />
                    <div
                      className={`w-3 h-3 rounded-full ring-2 ring-background shrink-0 z-10 ${idx === 0 ? 'scale-125' : ''} transition-transform`}
                      style={{ backgroundColor: TYPE_DOT[rec.type] }}
                    />
                    {idx < demoRecords.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[0.75rem]" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${idx < demoRecords.length - 1 ? 'pb-3' : 'pb-1'}`}>
                    <div className={`group rounded-lg border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all
                      ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {t(`landing.features.service.type_labels.${rec.type}`)}
                            </span>
                            <span className="text-xs text-muted-foreground">{rec.ago}</span>
                            {rec.cost && (
                              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                € {rec.cost}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rec.notes}</p>
                        </div>
                        <button className="shrink-0 p-1.5 rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div ref={ref2} className={`sub-reveal ${vis2 ? 'sub-vis' : ''} space-y-4`}>
            <h2 className="text-xl font-bold">{t('landing.features.service.benefits.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((b, i) => {
                const Icon = BENEFIT_ICONS[i];
                return (
                  <Card key={i} className="glass-card p-5 space-y-3 border border-border/50">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{b.title}</h3>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tracked items */}
          <div ref={ref3} className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-4`}>
            <h2 className="text-xl font-bold">{t('landing.features.service.tracked.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trackedItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-muted/20 border border-border/30">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">{t('landing.features.service.cta.title')}</h2>
            <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
              {t('landing.common.startFree')} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('landing.features.service.footer.copyright')}</p>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <a href="/impressum"  className="hover:text-foreground transition-colors">{t('settings.imprint_link')}</a>
              <a href="/datenschutz" className="hover:text-foreground transition-colors">{t('settings.privacy_policy_link')}</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
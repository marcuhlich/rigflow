import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ScanLine, ChevronRight, Truck, Package,
  RotateCcw, ClipboardList, ArrowRight, CheckCircle2,
  QrCode, X, AlertTriangle, Zap, Users, FolderKanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRef, useEffect, useState } from 'react';

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
  @keyframes rigScan {
    0%   { top: 12%; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { top: 82%; opacity: 0; }
  }
  .scan-line {
    position: absolute; left: 1rem; right: 1rem; height: 2px;
    background: linear-gradient(to right, transparent, hsl(var(--primary)), transparent);
    box-shadow: 0 0 8px hsl(var(--primary) / 0.7);
    animation: rigScan 2.2s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes stepSlide { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
  .step-enter { animation: stepSlide 0.25s ease-out forwards; }
  @keyframes blink { 0%,100%{opacity:1;}50%{opacity:0.35;} }
  .blink { animation: blink 1.8s ease-in-out infinite; }
`;

// Static config – only non-translatable parts
const MODE_CONFIG = [
  {
    id: 'verleih' as const,
    icon: Truck,
    colorClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    activeCls:  'bg-blue-400/15',
    statusColor: 'text-blue-400',
  },
  {
    id: 'aufbau' as const,
    icon: Package,
    colorClass: 'text-primary bg-primary/10 border-primary/20',
    activeCls:  'bg-primary/15',
    statusColor: 'text-primary',
  },
  {
    id: 'abbau' as const,
    icon: RotateCcw,
    colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    activeCls:  'bg-emerald-400/15',
    statusColor: 'text-emerald-400',
  },
  {
    id: 'inventur' as const,
    icon: ClipboardList,
    colorClass: 'text-muted-foreground bg-muted/10 border-muted/20',
    activeCls:  'bg-muted/20',
    statusColor: 'text-muted-foreground',
  },
];

type ModeId = typeof MODE_CONFIG[number]['id'];
type WStep = 'mode' | 'context' | 'scan' | 'summary';
const STEP_ORDER: WStep[] = ['mode', 'context', 'scan', 'summary'];

export default function ScannerWorkflow() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeMode, setActiveMode] = useState<ModeId>('aufbau');
  const [demoStep, setDemoStep]     = useState<WStep>('mode');
  const [ref1, vis1] = useScrollReveal();
  const [ref2, vis2] = useScrollReveal();
  const [ref3, vis3] = useScrollReveal();

  // Build translatable mode objects at render time
  const MODES = MODE_CONFIG.map(m => ({
    ...m,
    label:        t(`scanner_workflow.modes.${m.id}.label`),
    description:  t(`scanner_workflow.modes.${m.id}.description`),
    targetStatus: t(`scanner_workflow.modes.${m.id}.target_status`),
  }));

  const STEP_LABELS: Record<WStep, string> = {
    mode:    t('scanner_workflow.steps.mode'),
    context: t('scanner_workflow.steps.context'),
    scan:    t('scanner_workflow.steps.scan'),
    summary: t('scanner_workflow.steps.summary'),
  };

  const SCAN_ITEMS = [
    { name: 'JBL EON 615',      cat: t('scanner_workflow.demo_items.cat_audio'),    inSet: true  },
    { name: 'Moving Head 250W', cat: t('scanner_workflow.demo_items.cat_lighting'), inSet: true  },
    { name: 'SM58 Mikrofon',    cat: t('scanner_workflow.demo_items.cat_audio'),    inSet: true  },
    { name: 'Hazer Look Sol.',  cat: t('scanner_workflow.demo_items.cat_effects'),  inSet: false },
  ];

  const mode      = MODES.find(m => m.id === activeMode)!;
  const stepIndex = STEP_ORDER.indexOf(demoStep);
  const ModeIcon  = mode.icon;

  const goNext = () => {
    const next = STEP_ORDER[Math.min(stepIndex + 1, STEP_ORDER.length - 1)];
    setDemoStep(next);
  };
  const goBack = () => {
    const prev = STEP_ORDER[Math.max(stepIndex - 1, 0)];
    setDemoStep(prev);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 page-enter">

        <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />{t('common.back')}
            </Button>
            <div className="text-xl font-bold gradient-text">RigFlow</div>
            <Button size="sm" onClick={() => navigate('/register')}>
              {t('scanner_workflow.start_free')}
            </Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-20">

          {/* ── Hero ── */}
          <div className="space-y-5 max-w-2xl">
            <div className="du-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <ScanLine className="h-3.5 w-3.5" />{t('scanner_workflow.badge')}
            </div>
            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              {t('scanner_workflow.hero_title_1')}<br />
              <span className="gradient-text">{t('scanner_workflow.hero_title_2')}</span>
            </h1>
            <p className="du-2 text-lg text-muted-foreground">
              {t('scanner_workflow.hero_description')}
            </p>
            <div className="du-2">
              <Button onClick={() => navigate('/register')} className="gap-2">
                {t('scanner_workflow.try_now')} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Interaktives Wizard-Demo ── */}
          <div ref={ref1} className={`sub-reveal ${vis1 ? 'sub-vis' : ''}`}>
            <h2 className="text-xl font-bold mb-5">{t('scanner_workflow.demo.section_title')}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Left: Mode selector */}
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                  {t('scanner_workflow.demo.mode_select_label')}
                </div>
                {MODES.map(m => {
                  const Icon = m.icon;
                  const isActive = activeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setActiveMode(m.id); setDemoStep('mode'); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                        ${m.colorClass} ${isActive ? m.activeCls : 'opacity-60 hover:opacity-80'}`}
                    >
                      <div className="p-2.5 rounded-lg bg-white/5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-opacity ${isActive ? 'opacity-80' : 'opacity-30'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Right: Wizard phone mockup */}
              <div className="flex flex-col items-center gap-4">
                <Card className="glass-card w-full max-w-xs border border-border/50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <ScanLine className="h-5 w-5 text-primary" />{t('scanner_workflow.demo.scanner_title')}
                      </h3>
                      <p className="text-xs text-muted-foreground">{STEP_LABELS[demoStep]}</p>
                    </div>
                    {demoStep !== 'mode' && (
                      <button
                        onClick={() => setDemoStep('mode')}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />{t('common.cancel')}
                      </button>
                    )}
                  </div>

                  {/* Step dots */}
                  <div className="flex gap-1.5 px-4 pb-3">
                    {STEP_ORDER.map((s, i) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`}
                      />
                    ))}
                  </div>

                  {/* Step content */}
                  <div className="px-4 pb-4 step-enter" key={demoStep}>

                    {/* STEP: mode */}
                    {demoStep === 'mode' && (
                      <div className="space-y-2">
                        {MODES.map(m => {
                          const Icon = m.icon;
                          const isActive = activeMode === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => { setActiveMode(m.id); setDemoStep('context'); }}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                ${isActive ? `${m.colorClass} ${m.activeCls}` : 'border-border/50 hover:bg-muted/20'}`}
                            >
                              <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-muted/20'}`}>
                                <Icon className={`h-4 w-4 ${isActive ? '' : 'text-muted-foreground'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs">{m.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.description}</p>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* STEP: context */}
                    {demoStep === 'context' && (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${mode.colorClass} ${mode.activeCls}`}>
                          <div className="p-2 rounded-lg bg-white/10"><ModeIcon className="h-4 w-4" /></div>
                          <div>
                            <p className="font-semibold text-xs">{mode.label}</p>
                            <p className="text-[10px] text-muted-foreground">{mode.description}</p>
                          </div>
                        </div>

                        {activeMode === 'verleih' && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {t('scanner_workflow.context_step.lend_to_label')}
                              </div>
                              <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs text-muted-foreground/50">
                                {t('scanner_workflow.context_step.lend_to_placeholder')}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {t('scanner_workflow.context_step.return_until_label')}
                              </div>
                              <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs text-muted-foreground/50">
                                {t('scanner_workflow.context_step.return_until_placeholder')}
                              </div>
                            </div>
                          </div>
                        )}

                        {(activeMode === 'aufbau' || activeMode === 'abbau') && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {t('scanner_workflow.context_step.project_label')}
                            </div>
                            <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs justify-between">
                              <span>Open Air Berlin 2026</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="text-[10px] text-muted-foreground pl-1">
                              {t('scanner_workflow.context_step.project_items_expected', { count: 25 })}
                            </div>
                          </div>
                        )}

                        {activeMode === 'inventur' && (
                          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                            {t('scanner_workflow.context_step.inventur_info')}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={goBack}
                            className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={goNext}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium"
                          >
                            {t('scanner_workflow.context_step.next_button')} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP: scan */}
                    {demoStep === 'scan' && (
                      <div className="space-y-3">
                        {/* Project progress */}
                        {(activeMode === 'aufbau' || activeMode === 'abbau') && (
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">Open Air Berlin 2026</span>
                              <span className="text-muted-foreground">
                                {t('scanner_workflow.scan_step.project_progress', { scanned: 3, total: 25 })}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: '12%', transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        )}

                        {/* Scanner button */}
                        <div className="flex flex-col items-center gap-2 py-5 rounded-xl bg-primary/10 border border-primary/30">
                          <div className="relative w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden border border-border/30">
                            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
                            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr" />
                            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl" />
                            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
                            <div className="scan-line" />
                            <QrCode className="h-6 w-6 text-primary/20" />
                          </div>
                          <p className="font-semibold text-primary text-xs">{t('scanner_workflow.scan_step.scan_more')}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t('scanner_workflow.scan_step.items_scanned', { count: 3 })}
                          </p>
                        </div>

                        {/* Scanned items */}
                        <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/30">
                          {SCAN_ITEMS.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                              {(activeMode === 'aufbau' || activeMode === 'abbau') && (
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.inSet ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.cat}</p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0
                                ${mode.id === 'verleih' ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                : mode.id === 'aufbau'  ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30'}`}>
                                {mode.targetStatus}
                              </span>
                              <button className="text-muted-foreground/40 hover:text-destructive transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={goBack}
                            className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={goNext}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium"
                          >
                            {t('scanner_workflow.scan_step.to_summary', { count: 3 })} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP: summary */}
                    {demoStep === 'summary' && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {t('scanner_workflow.summary_step.action_label')}
                          </p>
                          <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${mode.colorClass} ${mode.activeCls}`}>
                            <div className="p-1.5 rounded-md bg-white/10"><ModeIcon className="h-3.5 w-3.5" /></div>
                            <div>
                              <p className="font-semibold text-xs">{mode.label}</p>
                              {activeMode === 'aufbau' && (
                                <p className="text-[10px] text-muted-foreground">
                                  {t('scanner_workflow.summary_step.project_info', { name: 'Open Air Berlin 2026' })}
                                </p>
                              )}
                              {activeMode === 'verleih' && (
                                <p className="text-[10px] text-muted-foreground">
                                  {t('scanner_workflow.summary_step.lend_info', { name: 'Max Mustermann', date: '20.05.2026' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/50 overflow-hidden">
                          <div className="px-3 py-2 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('scanner_workflow.summary_step.items_count', { count: 3 })}
                          </div>
                          <div className="divide-y divide-border/30">
                            {SCAN_ITEMS.slice(0, 3).map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{item.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{item.cat}</p>
                                </div>
                                {activeMode === 'abbau' ? (
                                  <div className="flex gap-1">
                                    {[
                                      t('scanner_workflow.summary_step.condition_ok'),
                                      t('scanner_workflow.summary_step.condition_defect'),
                                      t('scanner_workflow.summary_step.condition_missing'),
                                    ].map((label, j) => (
                                      <button key={j} className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors
                                        ${j === 0 ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/40' : 'border-border/50 text-muted-foreground'}`}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0
                                    ${mode.id === 'verleih' ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                    : mode.id === 'aufbau'  ? 'bg-primary/20 text-primary border-primary/30'
                                    : 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30'}`}>
                                    {mode.targetStatus}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={goBack}
                            className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDemoStep('mode')}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />{t('scanner_workflow.summary_step.confirm')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  {t('scanner_workflow.demo.hint')}
                </p>
              </div>
            </div>
          </div>

          {/* ── Feature Details ── */}
          <div ref={ref2} className={`sub-reveal ${vis2 ? 'sub-vis' : ''} space-y-5`}>
            <h2 className="text-xl font-bold">{t('scanner_workflow.features.section_title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { id: 'verleih',   icon: Truck,          color: 'text-blue-400',         bg: 'bg-blue-400/10'  },
                  { id: 'aufbau',    icon: Package,         color: 'text-primary',          bg: 'bg-primary/10'   },
                  { id: 'abbau',     icon: RotateCcw,       color: 'text-emerald-400',      bg: 'bg-emerald-400/10' },
                  { id: 'inventur',  icon: ClipboardList,   color: 'text-muted-foreground', bg: 'bg-muted/20'     },
                ] as const
              ).map(f => {
                const Icon = f.icon;
                return (
                  <Card key={f.id} className="glass-card p-5 space-y-3 border border-border/50">
                    <div className={`h-9 w-9 rounded-lg ${f.bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${f.color}`} />
                    </div>
                    <h3 className="font-semibold text-sm">{t(`scanner_workflow.features.${f.id}.title`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`scanner_workflow.features.${f.id}.desc`)}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ── Projekt-Integration ── */}
          <div ref={ref3} className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-5`}>
            <h2 className="text-xl font-bold">{t('scanner_workflow.project_integration.section_title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { id: 'check',           icon: FolderKanban  },
                  { id: 'not_in_set',      icon: AlertTriangle },
                  { id: 'location_update', icon: Users         },
                ] as const
              ).map(b => {
                const Icon = b.icon;
                return (
                  <Card key={b.id} className="glass-card p-5 space-y-3 border border-border/50">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{t(`scanner_workflow.project_integration.${b.id}.title`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`scanner_workflow.project_integration.${b.id}.desc`)}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">{t('scanner_workflow.cta.title')}</h2>
            <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
              {t('scanner_workflow.cta.button')} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('scanner_workflow.footer.copyright')}</p>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <a href="/impressum" className="hover:text-foreground transition-colors">{t('scanner_workflow.footer.imprint')}</a>
              <a href="/datenschutz" className="hover:text-foreground transition-colors">{t('scanner_workflow.footer.privacy')}</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
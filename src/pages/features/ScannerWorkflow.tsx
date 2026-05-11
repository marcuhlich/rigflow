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

// The 4 scanner modes – matching Scanner.tsx exactly
const MODES = [
  {
    id: 'verleih',
    label: 'Verleih',
    icon: Truck,
    colorClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    activeCls:  'bg-blue-400/15',
    description: 'Equipment ausgeben und als verliehen markieren',
    targetStatus: 'verliehen',
    statusColor: 'text-blue-400',
  },
  {
    id: 'aufbau',
    label: 'Aufbau',
    icon: Package,
    colorClass: 'text-primary bg-primary/10 border-primary/20',
    activeCls:  'bg-primary/15',
    description: 'Items als "Im Einsatz" markieren – optional gegen Projekt prüfen',
    targetStatus: 'in-einsatz',
    statusColor: 'text-primary',
  },
  {
    id: 'abbau',
    label: 'Abbau / Rückgabe',
    icon: RotateCcw,
    colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    activeCls:  'bg-emerald-400/15',
    description: 'Items zurückbuchen und Zustand beim Scannen erfassen',
    targetStatus: 'verfügbar',
    statusColor: 'text-emerald-400',
  },
  {
    id: 'inventur',
    label: 'Inventur',
    icon: ClipboardList,
    colorClass: 'text-muted-foreground bg-muted/10 border-muted/20',
    activeCls:  'bg-muted/20',
    description: 'Vorhandene Items erfassen und Bestand überprüfen',
    targetStatus: 'verfügbar',
    statusColor: 'text-muted-foreground',
  },
] as const;

type ModeId = typeof MODES[number]['id'];

// Fake scanned items for the scan-step demo
const SCAN_ITEMS = [
  { name: 'JBL EON 615',     cat: 'Ton',         inSet: true  },
  { name: 'Moving Head 250W',cat: 'Lichttechnik', inSet: true  },
  { name: 'SM58 Mikrofon',   cat: 'Ton',         inSet: true  },
  { name: 'Hazer Look Sol.', cat: 'Effekte',      inSet: false },
];

// Wizard steps: mode → context → scan → summary
type WStep = 'mode' | 'context' | 'scan' | 'summary';
const STEP_ORDER: WStep[] = ['mode', 'context', 'scan', 'summary'];
const STEP_LABELS: Record<WStep, string> = {
  mode: 'Modus wählen', context: 'Details eingeben',
  scan: 'Items scannen', summary: 'Zusammenfassung',
};

export default function ScannerWorkflow() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<ModeId>('aufbau');
  const [demoStep, setDemoStep]     = useState<WStep>('mode');
  const [ref1, vis1] = useScrollReveal();
  const [ref2, vis2] = useScrollReveal();
  const [ref3, vis3] = useScrollReveal();

  const mode       = MODES.find(m => m.id === activeMode)!;
  const stepIndex  = STEP_ORDER.indexOf(demoStep);
  const ModeIcon   = mode.icon;

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
              <ArrowLeft className="h-4 w-4" />Zurück
            </Button>
            <div className="text-xl font-bold gradient-text">RigFlow</div>
            <Button size="sm" onClick={() => navigate('/register')}>Kostenlos starten</Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-20">

          {/* ── Hero ── */}
          <div className="space-y-5 max-w-2xl">
            <div className="du-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <ScanLine className="h-3.5 w-3.5" />QR-Scanner &amp; Scan-Workflow
            </div>
            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              Scannen –<br /><span className="gradient-text">nicht suchen.</span>
            </h1>
            <p className="du-2 text-lg text-muted-foreground">
              Ein QR-Code-Scan setzt den Status deines Equipments – ob Verleih, Aufbau,
              Rückgabe oder Inventur. Der wizard-basierte Scanner führt dich in vier
              einfachen Schritten durch den kompletten Workflow.
            </p>
            <div className="du-2">
              <Button onClick={() => navigate('/register')} className="gap-2">
                Jetzt testen <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Interaktives Wizard-Demo ── */}
          <div ref={ref1} className={`sub-reveal ${vis1 ? 'sub-vis' : ''}`}>
            <h2 className="text-xl font-bold mb-5">So funktioniert's – interaktiv</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Left: Mode selector (always visible) */}
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                  Modus wählen
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
                        <ScanLine className="h-5 w-5 text-primary" />Scanner
                      </h3>
                      <p className="text-xs text-muted-foreground">{STEP_LABELS[demoStep]}</p>
                    </div>
                    {demoStep !== 'mode' && (
                      <button onClick={() => setDemoStep('mode')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <X className="h-3.5 w-3.5" />Abbrechen
                      </button>
                    )}
                  </div>

                  {/* Step dots */}
                  <div className="flex gap-1.5 px-4 pb-3">
                    {STEP_ORDER.map((s, i) => (
                      <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
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
                              <div className="text-xs text-muted-foreground">An wen wird verliehen? *</div>
                              <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs text-muted-foreground/50">Max Mustermann</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Rückgabe bis (optional)</div>
                              <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs text-muted-foreground/50">20.05.2026</div>
                            </div>
                          </div>
                        )}

                        {(activeMode === 'aufbau' || activeMode === 'abbau') && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Projekt zur Prüfung (optional)</div>
                            <div className="h-8 rounded-md border border-border bg-background/60 px-3 flex items-center text-xs justify-between">
                              <span>Open Air Berlin 2026</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="text-[10px] text-muted-foreground pl-1">25 Items im Projekt erwartet</div>
                          </div>
                        )}

                        {activeMode === 'inventur' && (
                          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                            Inventur ändert keine Status — es wird nur protokolliert was gescannt wurde.
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button onClick={goBack} className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={goNext} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium">
                            Weiter – Scanner öffnen <ArrowRight className="h-3.5 w-3.5" />
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
                              <span className="text-muted-foreground">3 / 25</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: '12%', transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        )}

                        {/* Scanner button */}
                        <div className="flex flex-col items-center gap-2 py-5 rounded-xl bg-primary/10 border border-primary/30">
                          {/* Mini QR viewfinder */}
                          <div className="relative w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden border border-border/30">
                            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
                            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr" />
                            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl" />
                            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
                            <div className="scan-line" />
                            <QrCode className="h-6 w-6 text-primary/20" />
                          </div>
                          <p className="font-semibold text-primary text-xs">Weiteren scannen</p>
                          <p className="text-[10px] text-muted-foreground">3 Items gescannt</p>
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
                          <button onClick={goBack} className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={goNext} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium">
                            Zur Zusammenfassung (3) <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP: summary */}
                    {demoStep === 'summary' && (
                      <div className="space-y-3">
                        {/* Action summary card */}
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aktion</p>
                          <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${mode.colorClass} ${mode.activeCls}`}>
                            <div className="p-1.5 rounded-md bg-white/10"><ModeIcon className="h-3.5 w-3.5" /></div>
                            <div>
                              <p className="font-semibold text-xs">{mode.label}</p>
                              {activeMode === 'aufbau' && <p className="text-[10px] text-muted-foreground">Projekt: Open Air Berlin 2026</p>}
                              {activeMode === 'verleih' && <p className="text-[10px] text-muted-foreground">An: Max Mustermann · bis 20.05.2026</p>}
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="rounded-lg border border-border/50 overflow-hidden">
                          <div className="px-3 py-2 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            3 Items
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
                                    {['✓ OK', '! Defekt', '? Fehlt'].map((l, j) => (
                                      <button key={j} className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors
                                        ${j === 0 ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/40' : 'border-border/50 text-muted-foreground'}`}>
                                        {l}
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
                          <button onClick={goBack} className="flex items-center gap-1 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDemoStep('mode')} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md h-8 hover:bg-primary/90 transition-colors font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />Bestätigen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Hint */}
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Wähle links einen Modus – der Wizard rechts zeigt den echten App-Flow.
                </p>
              </div>
            </div>
          </div>

          {/* ── Feature Details ── */}
          <div ref={ref2} className={`sub-reveal ${vis2 ? 'sub-vis' : ''} space-y-5`}>
            <h2 className="text-xl font-bold">Vier Modi, ein Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Truck,       color: 'text-blue-400',    bg: 'bg-blue-400/10',
                  title: 'Verleih',
                  desc: 'Nach angabe der Person und des Verleihdatums wird das Gerät als Verliehen markiert. Gut geeignet für Verleihbetrieb und externe Ausleihen.',
                },
                {
                  icon: Package,     color: 'text-primary',     bg: 'bg-primary/10',
                  title: 'Aufbau',
                  desc: 'Prüfe ob alle Geräte für ein Event schon gepackt sind. Die gescannten Items werden dann direkt als "Im Einsatz" markiert, so weißt du immer, wo dein Equipment ist.',
                },
                {
                  icon: RotateCcw,   color: 'text-emerald-400', bg: 'bg-emerald-400/10',
                  title: 'Abbau / Rückgabe',
                  desc: 'Direkt beim Abbauen den Zustand deiner Geräte dokumentieren: OK, Defekt oder Fehlt. So kannst du besser Ersatzteile und Reparaturen planen.',
                },
                {
                  icon: ClipboardList, color: 'text-muted-foreground', bg: 'bg-muted/20',
                  title: 'Inventur',
                  desc: 'Der Scan öffnet die Detailansicht eines Items. So kannst du nicht nur sehen, wo ein Gerät gelagert ist, sondern auch direkt den Zustand prüfen und protokollieren – ideal für regelmäßige Bestandschecks.',
                },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <Card key={i} className="glass-card p-5 space-y-3 border border-border/50">
                    <div className={`h-9 w-9 rounded-lg ${f.bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${f.color}`} />
                    </div>
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ── Projekt-Integration ── */}
          <div ref={ref3} className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-5`}>
            <h2 className="text-xl font-bold">Eng verzahnt mit deinen Projekten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: FolderKanban, title: 'Projekt-Check',      desc: 'Beim Aufbau oder Abbau direkt gegen ein laufendes Projekt scannen – scanned Items werden automatisch als "gepackt" markiert.' },
                { icon: AlertTriangle, title: 'Nicht im Set?',     desc: 'Gescannte Items die nicht im Projekt-Package sind werden sofort markiert".' },
                { icon: Users,         title: 'Location-Update',   desc: 'Beim Aufbau mit Projekt wird der Standort des Geräts automatisch auf den Projektnamen gesetzt.' },
              ].map((b, i) => (
                <Card key={i} className="glass-card p-5 space-y-3 border border-border/50">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{b.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">Scannen statt tippen – ab heute.</h2>
            <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
              Kostenlos starten <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">© 2026 RigFlow</p>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
              <a href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
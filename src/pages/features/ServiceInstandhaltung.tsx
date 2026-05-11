import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wrench, Shield, Bell, CheckCheck, Sparkles, Search,
  ChevronRight, CheckCircle2, Clock, AlertTriangle, Plus, ImageIcon, Trash2,
  FileClock
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
  @keyframes overduePulse { 0%,100%{opacity:1;}50%{opacity:0.72;} }
  .overdue-pulse { animation: overduePulse 2.2s ease-in-out infinite; }
  @keyframes entryPopIn {
    0%   { opacity:0; transform: translateX(-10px) scale(0.97); }
    55%  { transform: translateX(2px) scale(1.01); }
    100% { opacity:1; transform: translateX(0) scale(1); }
  }
  .entry-new { animation: entryPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

type MStatus = 'geprüft' | 'fällig' | 'Mangel' | 'geplant';
type MType   = 'check' | 'reparatur' | 'reinigung' | 'inspektion';

const TYPE_ICONS: Record<MType, React.ReactNode> = {
  check:      <CheckCheck className="h-3.5 w-3.5" />,
  reparatur:  <Wrench     className="h-3.5 w-3.5" />,
  reinigung:  <Sparkles   className="h-3.5 w-3.5" />,
  inspektion: <Search     className="h-3.5 w-3.5" />,
};
const TYPE_LABELS: Record<MType, string> = {
  check:      'Prüfung',
  reparatur:  'Reparatur',
  reinigung:  'Reinigung',
  inspektion: 'Inspektion',
};
const TYPE_DOT: Record<MType, string> = {
  check:      '#6366f1',
  reparatur:  '#f59e0b',
  reinigung:  '#22c55e',
  inspektion: '#3b82f6',
};

const records: Array<{ type: MType; label: string; ago: string; notes: string; cost?: string }> = [
  { type: 'check',      label: 'Prüfung',    ago: 'Heute',         notes: 'DGUV V3 bestanden, kein Befund.' },
  { type: 'reparatur',  label: 'Reparatur',  ago: 'Vor 12 Tagen',  notes: 'Lager getauscht, läuft wieder ruhig.', cost: '34.90' },
  { type: 'reinigung',  label: 'Reinigung',  ago: 'Vor 1 Monat',   notes: 'Innenreinigung, Lüfter gereinigt.' },
  { type: 'inspektion', label: 'Inspektion', ago: 'Vor 3 Monaten', notes: 'Saisoncheck vor der Festivalsaison.' },
];

const statusCases = [
  {
    label: 'SM58 Mikrofon #3',
    interval: '180d',
    status: 'geprüft' as MStatus,
    text: 'Letzte Wartung vor 3 Tagen',
    cls: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    pulse: false,
  },
  {
    label: 'Endstufe Crown XLS',
    interval: '180d',
    status: 'fällig' as MStatus,
    text: 'Wartung bald fällig – letzte vor 138 Tagen',
    cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: <Clock className="h-4 w-4 shrink-0" />,
    pulse: false,
  },
  {
    label: 'FOH-Pult Yamaha CL5',
    interval: '365d',
    status: 'Mangel' as MStatus,
    text: 'Wartung überfällig – noch keine Wartung erfasst',
    cls: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    pulse: true,
  },
];

// Fake "active type" for the pill demo
const PILL_TYPES: MType[] = ['check', 'reparatur', 'reinigung', 'inspektion'];

function TypePill({ type, isActive, onClick }: { type: MType; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
        ${isActive
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'}`}
    >
      {TYPE_ICONS[type]}
      {TYPE_LABELS[type]}
    </button>
  );
}

export default function ServiceInstandhaltung() {
  const navigate = useNavigate();
  const [activePill, setActivePill] = useState<MType>('check');
  const [ref1, vis1] = useScrollReveal();
  const [ref2, vis2] = useScrollReveal();
  const [ref3, vis3] = useScrollReveal();

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

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-16">

          {/* Hero */}
          <div className="space-y-5 max-w-2xl">
            <div className="du-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <Wrench className="h-3.5 w-3.5" />Service &amp; Instandhaltung
            </div>
            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              Professionelles<br /><span className="gradient-text">Wartungsmanagement</span>
            </h1>
            <p className="du-2 text-lg text-muted-foreground">
              Dokumentiere Wartungen, setze Reminder für die nächste Prüfung und lade
              Schadensfotos direkt aus der App hoch. Für jedes Gerät gibt es eine
              eigene Maintenance-Timeline – mit Typ, Datum, Notizen und Kosten.
            </p>
            <div className="du-2">
              <Button onClick={() => navigate('/register')} className="gap-2">
                Jetzt testen <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* App Mockup: Status-Banner + Formular + Timeline */}
          <div ref={ref1} className={`sub-reveal ${vis1 ? 'sub-vis' : ''} space-y-6`}>

            {/* Drei Status-Banner für verschiedene Geräte */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Status-Banner pro Gerät
            </h3>
            <div className="space-y-2.5">
              {statusCases.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs text-muted-foreground pl-1">{s.label} · Intervall: {s.interval}</div>
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium
                      ${s.cls} ${s.pulse ? 'overdue-pulse' : ''}`}
                  >
                    {s.icon}
                    <span className="flex-1 min-w-0 text-sm">{s.text}</span>
                    <span className="text-xs font-normal opacity-60 shrink-0">Intervall: {s.interval}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Aktionszeile – Quick Confirm + Eintrag */}
            <div className="flex gap-2 mt-2">
              <button className="flex-1 flex items-center justify-center gap-2 text-sm font-medium h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <CheckCheck className="h-4 w-4" />Wartung heute bestätigt
              </button>
              <button className="flex items-center gap-1.5 text-sm font-medium h-9 px-4 rounded-md border border-border hover:bg-muted/50 transition-colors">
                <Plus className="h-4 w-4" />Eintrag
              </button>
            </div>

            {/* Inline-Formular Demo */}
            <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
              <div className="text-xs text-muted-foreground font-medium mb-1">Neuer Wartungseintrag</div>
              {/* Typ-Pills */}
              <div className="flex flex-wrap gap-2">
                {PILL_TYPES.map(t => (
                  <TypePill key={t} type={t} isActive={activePill === t} onClick={() => setActivePill(t)} />
                ))}
              </div>
              {/* Felder */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Datum</div>
                  <div className="h-9 rounded-md border border-border bg-background/80 px-3 flex items-center text-xs text-muted-foreground">
                    15.05.2026
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Kosten (optional)</div>
                  <div className="h-9 rounded-md border border-border bg-background/80 px-3 flex items-center text-xs text-muted-foreground">
                    € —
                  </div>
                </div>
              </div>
              <div className="h-16 rounded-md border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                Notizen (optional)…
              </div>
              <div className="flex justify-between items-center pt-1">
                <button className="flex items-center gap-1.5 text-xs border border-border rounded-md px-3 h-8 hover:bg-muted/50 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />Foto hinzufügen
                </button>
                <div className="flex gap-2">
                  <button className="text-xs px-3 h-8 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground">Abbrechen</button>
                  <button className="text-xs px-3 h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Speichern</button>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Maintenance-Timeline
            </h3>
            <div>
              {records.map((rec, idx) => (
                <div key={idx} className={`flex gap-3 ${idx === 0 ? 'entry-new' : ''}`}>
                  {/* Dot + Linie */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-[1.1rem] shrink-0" />
                    <div
                      className={`w-3 h-3 rounded-full ring-2 ring-background shrink-0 z-10 ${idx === 0 ? 'scale-125' : ''} transition-transform`}
                      style={{ backgroundColor: TYPE_DOT[rec.type] }}
                    />
                    {idx < records.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[0.75rem]" />}
                  </div>
                  {/* Card */}
                  <div className={`flex-1 min-w-0 ${idx < records.length - 1 ? 'pb-3' : 'pb-1'}`}>
                    <div className={`group rounded-lg border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all
                      ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{TYPE_LABELS[rec.type]}</span>
                            <span className="text-xs text-muted-foreground">{rec.ago}</span>
                            {rec.cost && (
                              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">€ {rec.cost}</span>
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
            <h2 className="text-xl font-bold">Was du damit dokumentierst</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: FileClock,    title: 'Geräte-Historie',          desc: 'Jeder technische Eingriff ist chronologisch und nachvollziehbar dokumentiert.' },
                { icon: Bell,         title: 'Überfälligkeits-Anzeige',  desc: 'Status-Banner pro Gerät: grün / amber / rot – sofort sichtbar welches Gerät dran ist.' },
                { icon: ImageIcon,    title: 'Schadensfotos',            desc: 'Fotos direkt aus der App aufnehmen und am Wartungseintrag speichern.' },
                { icon: CheckCircle2, title: 'Quick-Confirm',            desc: '"Wartung heute bestätigt" mit einem Tap – ohne Formular für schnelle Bestätigungen.' },
              ].map((b, i) => (
                <Card key={i} className="glass-card p-5 space-y-3 border border-border/50">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Was genau trackt wird */}
          <div ref={ref3} className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-4`}>
            <h2 className="text-xl font-bold">Alles was dokumentiert wird</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Wartungstyp: Prüfung, Reparatur, Reinigung, Inspektion',
                'Datum der Wartung (eigener Date-Picker)',
                'Freitext-Notizen pro Eintrag',
                'Kosten in Euro optional erfassbar',
                'Schadensfotos direkt aus der App',
                'Konfigurierbare Intervalle pro Gerät',
                'Status-Banner: OK / bald fällig / überfällig',
                'Quick-Confirm "Heute geprüft" mit 1 Tap',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-muted/20 border border-border/30">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">Gear in Top-Zustand – immer.</h2>
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
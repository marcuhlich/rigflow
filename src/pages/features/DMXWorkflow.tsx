import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, SlidersHorizontal, AlertTriangle, Download,
  ChevronRight, LayoutGrid, List, FileText, Printer, CheckCircle2, Zap
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
`;

const universeData = [
  { id: 1, used: 380, max: 512 },
  { id: 2, used: 96,  max: 512 },
];

const patchRows = [
  { ch: '001', name: 'Moving Head A',      instance: '#1', mode: '16ch', conflict: false },
  { ch: '017', name: 'Moving Head B',      instance: '#2', mode: '16ch', conflict: false },
  { ch: '033', name: 'Wash Chauvet',       instance: '#1', mode: '11ch', conflict: false },
  { ch: '044', name: 'Hazer Look Sol.',    instance: '#1', mode: '4ch',  conflict: false },
  { ch: '048', name: 'Stroboskop Elation', instance: '#1', mode: '4ch',  conflict: true  },
  { ch: '048', name: 'PAR LED RGB',        instance: '#1', mode: '3ch',  conflict: true  },
];

function UniverseBar({ used, max, delay = 0 }: { used: number; max: number; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((used / max) * 100), delay + 200);
    return () => clearTimeout(t);
  }, [used, max, delay]);
  const col = w > 90 ? '#ef4444' : w > 70 ? '#eab308' : 'hsl(var(--primary))';
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: col, transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

export default function DMXWorkflow() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('table');
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
              <SlidersHorizontal className="h-3.5 w-3.5" />DMX-Workflow &amp; Patching
            </div>
            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              Schluss mit<br /><span className="gradient-text">Patch-Chaos.</span>
            </h1>
            <p className="du-2 text-lg text-muted-foreground">
              Weise deinem Equipment DMX-Startadressen und Modi direkt am Gerät zu.
              RigFlow erkennt Adresskonflikte automatisch und exportiert fertige Listen
              für dein Lichtpult – als CSV, PDF oder zum Drucken.
            </p>
            <div className="du-2">
              <Button onClick={() => navigate('/register')} className="gap-2">
                Jetzt testen <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* App Mockup: Universe bars + conflict alert + patch table */}
          <div ref={ref1} className={`sub-reveal ${vis1 ? 'sub-vis' : ''} space-y-4`}>

            {/* Universe-Auslastung – exakt wie in der App */}
            <div className="grid grid-cols-2 gap-3">
              {universeData.map((u, i) => (
                <div key={u.id} className="glass-card p-3 border border-border/50 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Universe {u.id}</div>
                  <div className="mt-2 space-y-1">
                    <UniverseBar used={u.used} max={u.max} delay={i * 120} />
                    <div className="text-xs text-muted-foreground">{u.used}/512 Kanäle</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Konflikt-Alert */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-destructive">DMX-Adresskonflikte erkannt!</div>
                <ul className="mt-1 text-xs text-destructive/80 space-y-0.5">
                  <li>• <strong>Stroboskop Elation</strong> #1 (048–051) überschneidet sich mit <strong>PAR LED RGB</strong> #1 (048–050)</li>
                </ul>
              </div>
            </div>

            {/* Patchplan-Tabelle */}
            <Card className="glass-card overflow-hidden border border-border/50">
              {/* Toolbar */}
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">DMX Patchplan</span>
                  <span className="text-xs text-muted-foreground">6 Kanal-Zuweisungen</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* View-Toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden h-7">
                    {(['timeline', 'table'] as const).map((m, idx) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`px-2 flex items-center transition-all ${idx > 0 ? 'border-l border-border' : ''} ${viewMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                        title={m === 'timeline' ? 'Timeline-Ansicht' : 'Tabellenansicht'}
                      >
                        {m === 'timeline' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                  {/* Export */}
                  <button className="h-7 px-2.5 text-xs flex items-center gap-1.5 border border-border rounded-md text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Download className="h-3 w-3" />Export
                  </button>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/10 border-b border-border/20">
                <span className="col-span-2">Adresse</span>
                <span className="col-span-5">Gerät</span>
                <span className="col-span-2">Inst.</span>
                <span className="col-span-3">Modus</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/15">
                {patchRows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-12 items-center px-4 py-2.5 text-xs transition-colors
                      ${row.conflict ? 'bg-destructive/8 border-l-2 border-destructive/60' : 'hover:bg-muted/10'}`}
                  >
                    <span className="col-span-2 font-mono text-primary/80 font-medium">{row.ch}</span>
                    <span className={`col-span-5 truncate ${row.conflict ? 'text-destructive/80' : ''}`}>{row.name}</span>
                    <span className="col-span-2 text-muted-foreground">{row.instance}</span>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="text-muted-foreground">{row.mode}</span>
                      {row.conflict && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-destructive/15 text-destructive font-medium">Konflikt</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Export Optionen */}
          <div ref={ref2} className={`sub-reveal ${vis2 ? 'sub-vis' : ''} space-y-4`}>
            <h2 className="text-xl font-bold">Export &amp; Druck</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: FileText, label: 'CSV-Export',    desc: 'Startadressen, Modi und Gerätenamen als Spreadsheet – kompatibel mit Excel und Google Sheets.' },
                { icon: FileText, label: 'PDF-Export',    desc: 'Druckfertiger Patchplan als PDF mit Universe-Übersicht und Konflikt-Markierungen.' },
                { icon: Printer,  label: 'Direkt drucken', desc: 'Browser-Druckdialog mit optimiertem A4-Layout – direkt für die Technik-Mappe.' },
              ].map((e, i) => (
                <Card key={i} className="glass-card p-4 space-y-2 border border-border/50">
                  <e.icon className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-sm">{e.label}</div>
                  <div className="text-xs text-muted-foreground">{e.desc}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div ref={ref3} className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-4`}>
            <h2 className="text-xl font-bold">Was dir das bringt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Zap,           title: 'Kein manuelles Zählen',  desc: 'CH + Kanalanzahl → Endadresse wird automatisch berechnet.' },
                { icon: AlertTriangle, title: 'Konflikte vor dem Gig',  desc: 'Überschneidungen werden rot markiert, bevor du das erste Fixture einschaltest.' },
                { icon: CheckCircle2,  title: 'Timeline oder Tabelle',  desc: 'Visuelle Timeline pro Universe – oder kompakte Tabelle für schnellen Überblick.' },
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

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">Konfliktfreies Patchen ab heute.</h2>
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
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Zap, Shield, Wifi, QrCode,
  SlidersHorizontal, Wrench, Package, Github,
  Mail, ExternalLink, ChevronRight, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ── App version – hier anpassen ─────────────────────────────────────────────
const APP_VERSION = '1.0.0-beta';
const BUILD_DATE  = '2026';

const CSS = `
  @keyframes pageSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  .page-enter { animation: pageSlideIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .au-0 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0ms;   }
  .au-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 80ms;  }
  .au-2 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 160ms; }
  .au-3 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 240ms; }
  .au-4 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 320ms; }
  .au-5 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 400ms; }

  @keyframes logoPulse {
    0%,100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.25); }
    50%      { box-shadow: 0 0 0 14px hsl(var(--primary) / 0); }
  }
  .logo-pulse { animation: logoPulse 3s ease-in-out infinite; }

  .about-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border) / 0.4);
    font-size: 0.875rem;
    transition: background 0.15s ease;
  }
  .about-row:last-child { border-bottom: none; }
  .about-row:hover { background: hsl(var(--muted) / 0.3); }
  .about-row.no-hover:hover { background: transparent; }

  .tech-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 500;
    border: 1px solid hsl(var(--border) / 0.6);
    background: hsl(var(--muted) / 0.3);
    color: hsl(var(--muted-foreground));
    transition: border-color 0.15s, background 0.15s;
  }
  .tech-pill:hover {
    border-color: hsl(var(--primary) / 0.4);
    background: hsl(var(--primary) / 0.06);
    color: hsl(var(--foreground));
  }
`;

// Kernwerte
const VALUES = [
  { icon: Wifi,             label: 'Offline-First',      desc: 'Funktioniert überall – mit und ohne Netz.' },
  { icon: QrCode,           label: 'QR-Workflow',        desc: 'Ein Scan = Status aktualisiert, Projekt gebucht.' },
  { icon: SlidersHorizontal,label: 'DMX-Management',     desc: 'Konflikte erkennen, bevor sie auf der Bühne entstehen.' },
  { icon: Wrench,           label: 'Wartung',            desc: 'Prüfintervalle und Wartungshistorie pro Gerät.' },
  { icon: Package,          label: 'Projekt-Packages',   desc: 'Set-Listen, Fortschritt, Echtzeit-Verfügbarkeit.' },
  { icon: Shield,           label: 'Deine Daten',        desc: 'MFA, DSGVO-konform, Export jederzeit möglich.' },
];

// Tech Stack
const STACK = [
  'React', 'TypeScript', 'Vite', 'Tailwind CSS',
  'Supabase', 'Capacitor', 'shadcn/ui', 'Lucide',
];

export default function UeberRigflow() {
  const navigate = useNavigate();

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 page-enter">

        {/* ── Header ── */}
        <header className="border-b border-border/50 bg-background/60 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-semibold">Über RigFlow</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

          {/* ── Hero: Logo + Version ── */}
          <div className="au-0 flex flex-col items-center text-center gap-4 pt-2 pb-4">
            <div className="relative">
              <div className="logo-pulse rounded-2xl">
                <img
                  src="/logo-transparent.png"
                  alt="RigFlow"
                  className="h-20 w-20 object-contain drop-shadow-xl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold gradient-text">RigFlow</div>
              <div className="text-xs text-muted-foreground font-mono">
                Version {APP_VERSION}
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Inventar-Management für Veranstaltungstechniker –
              gebaut für den Alltag auf der Bühne.
            </p>
          </div>

          {/* ── Was ist RigFlow ── */}
          <div className="au-1 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Was ist RigFlow?
            </h2>
            <Card className="glass-card border border-border/50 p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                RigFlow ist eine progressive Web-App (PWA) für Verleiher, DJs und
                kleine Event-Teams, die den Überblick über ihr Equipment behalten wollen –
                ohne Excel-Chaos und manuelle Listen.
              </p>
              <p>
                Von der QR-Code-Erfassung über DMX-Patching bis zur
                Wartungsdokumentation: RigFlow deckt den kompletten Lebenszyklus deines
                Gears ab – offline-fähig, nativ installierbar und immer synchronisiert.
              </p>
            </Card>
          </div>

          {/* ── Kernwerte ── */}
          <div className="au-2 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Kern-Features
            </h2>
            <Card className="glass-card border border-border/50 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0 divide-border/40">
                {VALUES.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 border-b border-border/30 last:border-b-0 sm:last:border-b sm:[&:nth-child(even)]:border-b-0"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <v.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{v.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Tech Stack ── */}
          <div className="au-3 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Gebaut mit
            </h2>
            <Card className="glass-card border border-border/50 p-4">
              <div className="flex flex-wrap gap-2">
                {STACK.map((t, i) => (
                  <span key={i} className="tech-pill">{t}</span>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Footer ── */}
          <div className="au-5 flex flex-col items-center gap-2 pt-4 pb-8 text-center">
            <div className="text-xs text-muted-foreground/40 font-mono">
              © {BUILD_DATE} RigFlow · v{APP_VERSION}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CheckCircle2,
  Download,
  Smartphone,
  Zap,
  Lock,
  ChevronRight,
  Wifi,
  HardDrive,
  Apple,
  Chrome,
  Share2,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const features = [
  {
    icon: Zap,
    title: 'Blitzschnell',
    desc: 'Startet direkt vom Startbildschirm ohne Ladezeit.',
  },
  {
    icon: Wifi,
    title: 'Offline-Ready',
    desc: 'Funktioniert ohne Internetverbindung und synchronisiert automatisch.',
  },
  {
    icon: Lock,
    title: 'Sicher',
    desc: 'Deine Daten bleiben lokal gespeichert bis zur Synchronisierung.',
  },
  {
    icon: HardDrive,
    title: 'Kompakt',
    desc: 'Unter 5 MB – funktioniert wie eine native App.',
  },
];

const completeFeatures = [
  {
    icon: Smartphone,
    title: 'Startbildschirm',
    desc: 'Tippe auf das RigFlow-Icon, um die App sofort zu starten.',
  },
  {
    icon: Zap,
    title: 'Sofort bereit',
    desc: 'Keine Wartezeit, kein Browser – direkt einsatzbereit.',
  },
  {
    icon: Wifi,
    title: 'Offline-fähig',
    desc: 'Arbeite überall, auch ohne aktive Internetverbindung.',
  },
];

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [step, setStep] = useState<'intro' | 'complete'>('intro');
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setStep('complete');
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setStep('complete');
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">

      {/* ── Intro ── */}
      {step === 'intro' && (
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
              <Download className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">App installieren</h1>
            <p className="text-muted-foreground text-sm">
              Installiere RigFlow für das vollständige Erlebnis.
            </p>
          </div>

          {/* Feature List */}
          <Card className="glass-card divide-y divide-border/50 p-0 overflow-hidden">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 px-5 py-4">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </Card>

          {/* Install Button or Manual Instructions */}
          {deferredPrompt ? (
            <Button onClick={handleInstall} size="lg" className="w-full gap-2">
              <Download className="h-4 w-4" />
              Jetzt installieren
            </Button>
          ) : (
            <Card className="glass-card p-0 overflow-hidden divide-y divide-border/50">
              <div className="px-5 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Manuelle Installation
                </p>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Apple className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">iOS / Safari</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                    Tippe auf <Share2 className="h-3.5 w-3.5 inline" /> Share
                    → <span className="font-medium text-foreground">„Zum Homebildschirm"</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Chrome className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Android / Chrome</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                    Tippe auf <MoreVertical className="h-3.5 w-3.5 inline" /> Menü
                    → <span className="font-medium text-foreground">„Zum Startbildschirm"</span>
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-muted-foreground">
            Später
          </Button>
        </div>
      )}

      {/* ── Complete ── */}
      {step === 'complete' && (
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Bereit</h1>
            <p className="text-muted-foreground text-sm">
              RigFlow ist installiert und einsatzbereit.
            </p>
          </div>

          {/* Feature list */}
          <Card className="glass-card divide-y divide-border/50 p-0 overflow-hidden">
            {completeFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 px-5 py-4">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </Card>

          {/* Hint */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Tipp:</span> Aktiviere Benachrichtigungen
              in den Einstellungen, um über Synchronisierungen informiert zu werden.
            </p>
          </div>

          <Button onClick={() => navigate('/')} size="lg" className="w-full gap-2">
            Zur App
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
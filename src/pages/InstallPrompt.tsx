import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Download, Smartphone, Zap, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [step, setStep] = useState<'intro' | 'install' | 'complete'>('intro');
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setStep('complete');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
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

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Intro Step */}
      {step === 'intro' && (
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Fast geschafft! 🎉</h1>
            <p className="text-xl text-muted-foreground">
              Jetzt das volle App-Erlebnis freischalten
            </p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Warum RigFlow als App installieren?
              </h2>
              <ul className="space-y-4">
                {[
                  {
                    icon: '⚡',
                    title: 'Blitzschnell',
                    desc: 'Startet in Millisekunden direkt vom Startbildschirm',
                  },
                  {
                    icon: '📡',
                    title: 'Offline-Ready',
                    desc: 'Arbeite überall, ohne Internet. Synchronisiert sich automatisch.',
                  },
                  {
                    icon: '🔐',
                    title: 'Sicher gespeichert',
                    desc: 'Deine Daten bleiben auf deinem Gerät, bis du synchronisierst.',
                  },
                  {
                    icon: '💾',
                    title: 'Keine zusätzlichen Downloads',
                    desc: 'Kleiner als 5MB. Funktioniert wie eine native App.',
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {deferredPrompt && (
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                RigFlow jetzt installieren
              </Button>
            )}

            {!deferredPrompt && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Manuelle Installation:</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">🍎 iOS:</p>
                      <p>Safari → Share-Symbol → Zum Homebildschirm</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">🤖 Android:</p>
                      <p>Chrome Menü (⋮) → Zum Startbildschirm hinzufügen</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full"
            >
              Später erinnern
            </Button>
          </Card>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-4xl font-bold">Du bist bereit! 🚀</h1>
            <p className="text-xl text-muted-foreground">
              RigFlow ist installiert und wartet auf dich
            </p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Smartphone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">Startet vom Startbildschirm</p>
                  <p className="text-sm text-muted-foreground">
                    Tippe auf das RigFlow-Icon um die App zu starten
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">Blitzschnell geladen</p>
                  <p className="text-sm text-muted-foreground">
                    Sofort einsatzbereit, ohne Wartezeit
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">Offline-fähig</p>
                  <p className="text-sm text-muted-foreground">
                    Arbeite überall, auch ohne Internet
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 rounded-lg p-4 text-left">
              <p className="text-sm text-muted-foreground mb-2">
                💡 <strong>Tipp:</strong> Aktiviere auch Benachrichtigungen in der App,
                damit du immer über Synchronisierungen und Konflikte informiert wirst.
              </p>
            </div>

            <Button onClick={() => navigate('/')} size="lg" className="w-full gap-2">
              Zur App
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
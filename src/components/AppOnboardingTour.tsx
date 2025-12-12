import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ChevronRight, Zap, Smartphone, Wifi, QrCode } from 'lucide-react';

type TourStep = 'welcome' | 'add-item' | 'qr-scan' | 'offline' | 'complete';

interface AppOnboardingTourProps {
  onComplete: () => void;
}

export function AppOnboardingTour({ onComplete }: AppOnboardingTourProps) {
  const [step, setStep] = useState<TourStep>('welcome');
  const [deviceSize, setDeviceSize] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setAnimate(true);
    
    // Load onboarding answers from landing page
    const answers = localStorage.getItem('onboarding_answers');
    if (answers) {
      const { deviceSize: size } = JSON.parse(answers);
      setDeviceSize(size);
    }
  }, []);

  const handleNext = () => {
    setAnimate(false);
    setTimeout(() => {
      switch (step) {
        case 'welcome':
          setStep('add-item');
          break;
        case 'add-item':
          setStep('qr-scan');
          break;
        case 'qr-scan':
          setStep('offline');
          break;
        case 'offline':
          setStep('complete');
          break;
        case 'complete':
          onComplete();
          break;
      }
      setAnimate(true);
    }, 300);
  };

  const getRecommendation = () => {
    switch (deviceSize) {
      case 'small':
        return 'Für dein Setup empfehlen wir, mit Kategorien zu arbeiten um schnell den Überblick zu behalten.';
      case 'medium':
        return 'Mit 50-200 Geräten sind Event-Pakete dein bester Freund. Speichere häufig verwendete Setups!';
      case 'large':
        return 'Bei 200+ Geräten: Nutze Standort-Filter und QR-Codes für effizientes Management.';
      default:
        return '';
    }
  };

  const progressSteps = ['welcome', 'add-item', 'qr-scan', 'offline', 'complete'];
  const currentProgress = progressSteps.indexOf(step) + 1;

  // Welcome Step
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className={`glass-card max-w-lg w-full p-0 overflow-hidden transition-all duration-300 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Close Button */}
          <button
            onClick={onComplete}
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Gradient Header */}
          <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <Zap className="h-16 w-16 text-primary animate-bounce" />
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Willkommen! 🚀</h1>
              <p className="text-muted-foreground">
                Du bist eingeloggt und RigFlow ist bereit für offline-Nutzung
              </p>
            </div>

            {deviceSize && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">
                  💡 <span className="font-bold">Personalisiert für dich:</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {getRecommendation()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                In dieser kurzen Tour lernst du die wichtigsten Features:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1</span>
                  <span className="text-muted-foreground">Items hinzufügen</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2</span>
                  <span className="text-muted-foreground">QR-Code Scanning</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3</span>
                  <span className="text-muted-foreground">Offline-Funktionen</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onComplete}
                className="flex-1"
              >
                Selbst erkunden
              </Button>
              <Button onClick={handleNext} className="flex-1 gap-2">
                Tour starten
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-muted/30 flex">
            <div
              className="bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(currentProgress / progressSteps.length) * 100}%` }}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Add Item Step
  if (step === 'add-item') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <Card className={`glass-card max-w-lg w-full p-0 overflow-hidden transition-all duration-300 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header with Icon */}
          <div className="h-24 bg-gradient-to-br from-primary/20 to-transparent flex items-center px-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary rounded-full blur-3xl opacity-20" />
            <div className="relative">
              <div className="text-4xl">1️⃣</div>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-2xl font-bold">Dein erstes Item</h2>
              <p className="text-sm text-muted-foreground">Starte mit einem Equipment</p>
            </div>
            <button
              onClick={onComplete}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Visual */}
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-8 aspect-video flex flex-col items-center justify-center border border-dashed border-primary/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-2 right-2 w-20 h-20 bg-primary rounded-full blur-2xl" />
              </div>
              <div className="relative text-center space-y-3">
                <Zap className="h-12 w-12 text-primary mx-auto" />
                <p className="text-sm font-medium">+ Neues Item Button</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">So geht's:</p>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">1</span>
                  <span className="text-muted-foreground">Klick auf "+ Neues Item" oben rechts</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">2</span>
                  <span className="text-muted-foreground">Fülle Name, Kategorie, Menge ein</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">3</span>
                  <span className="text-muted-foreground">Speicher ab - fertig!</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">💡</span>
                  <span className="text-muted-foreground"><strong>Tipp:</strong> QR-Code wird automatisch generiert</span>
                </li>
              </ol>
            </div>

            <Button onClick={handleNext} className="w-full gap-2">
              Verstanden - Weiter
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="h-1 bg-muted/30 flex">
            <div
              className="bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(currentProgress / progressSteps.length) * 100}%` }}
            />
          </div>
        </Card>
      </div>
    );
  }

  // QR Scan Step
  if (step === 'qr-scan') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <Card className={`glass-card max-w-lg w-full p-0 overflow-hidden transition-all duration-300 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header */}
          <div className="h-24 bg-gradient-to-br from-accent/20 to-transparent flex items-center px-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-accent rounded-full blur-3xl opacity-20" />
            <div className="relative">
              <div className="text-4xl">2️⃣</div>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-2xl font-bold">QR-Code Scanning</h2>
              <p className="text-sm text-muted-foreground">Schnelles Erfassen</p>
            </div>
            <button
              onClick={onComplete}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Visual */}
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-8 aspect-video flex flex-col items-center justify-center border border-dashed border-accent/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-2 right-2 w-20 h-20 bg-accent rounded-full blur-2xl" />
              </div>
              <div className="relative text-center space-y-3">
                <QrCode className="h-12 w-12 text-accent mx-auto" />
                <p className="text-sm font-medium">QR Scanner</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">Workflow:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span className="text-muted-foreground">Klick auf QR-Icon oben</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span className="text-muted-foreground">Scanne einen QR-Code</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span className="text-muted-foreground">Item wird gefunden und angezeigt</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">⚡</span>
                  <span className="text-muted-foreground"><strong>Auch offline!</strong> Keine Internetverbindung nötig</span>
                </li>
              </ul>
            </div>

            <Button onClick={handleNext} className="w-full gap-2">
              Verstanden - Weiter
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="h-1 bg-muted/30 flex">
            <div
              className="bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(currentProgress / progressSteps.length) * 100}%` }}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Offline Step
  if (step === 'offline') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <Card className={`glass-card max-w-lg w-full p-0 overflow-hidden transition-all duration-300 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header */}
          <div className="h-24 bg-gradient-to-br from-success/20 to-transparent flex items-center px-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-success rounded-full blur-3xl opacity-20" />
            <div className="relative">
              <div className="text-4xl">3️⃣</div>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-2xl font-bold">Offline-Mode</h2>
              <p className="text-sm text-muted-foreground">Arbeite überall</p>
            </div>
            <button
              onClick={onComplete}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Visual */}
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-8 aspect-video flex flex-col items-center justify-center border border-dashed border-success/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-2 right-2 w-20 h-20 bg-success rounded-full blur-2xl" />
              </div>
              <div className="relative text-center space-y-3">
                <Wifi className="h-12 w-12 text-success mx-auto" />
                <p className="text-sm font-medium">Offline-Ready ✓</p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground">
                🔒 Deine Daten sind offline-sicher!
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                RigFlow funktioniert vollständig ohne Internet. Alle Änderungen werden lokal gespeichert und später synchronisiert.
              </p>
            </div>

            {/* What happens */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">Das passiert automatisch:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold">🔴</span>
                  <span className="text-muted-foreground"><strong>Offline:</strong> Alle Änderungen werden lokal gespeichert</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-success font-bold">🟢</span>
                  <span className="text-muted-foreground"><strong>Online:</strong> Automatische Synchronisierung</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-warning font-bold">⚠️</span>
                  <span className="text-muted-foreground"><strong>Konflikte:</strong> Wir helfen dir zu mergen</span>
                </li>
              </ul>
            </div>

            <Button onClick={handleNext} className="w-full gap-2">
              Verstanden - Fertig!
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="h-1 bg-muted/30 flex">
            <div
              className="bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(currentProgress / progressSteps.length) * 100}%` }}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Complete Step
  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className={`glass-card max-w-lg w-full p-0 overflow-hidden transition-all duration-300 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Gradient Header */}
          <div className="h-40 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="relative text-center">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <h1 className="text-3xl font-bold">Du bist bereit!</h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <p className="text-center text-muted-foreground">
              Du kennst jetzt die wichtigsten Features. Viel Spaß bei der Nutzung! 🎉
            </p>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">⚡ Pro-Tipps für dich:</p>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">💡</span>
                  <span>Aktiviere Benachrichtigungen in den App-Einstellungen</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">📦</span>
                  <span>Event-Pakete sparen dir viel Zeit bei wiederholten Setups</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">🔍</span>
                  <span>Nutze Filter und Suche um schnell Items zu finden</span>
                </li>
              </ul>
            </div>

            <Button onClick={onComplete} size="lg" className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Zur App
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
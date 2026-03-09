import { useState } from 'react';
import { ChevronRight, Zap, Lock, Smartphone, Gauge, ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type OnboardingStep = 'landing' | 'questions' | 'features' | 'cta';
type DeviceSize = 'small' | 'medium' | 'large';
type EventType = 'festivals' | 'weddings' | 'corporate' | 'theatre';

export default function Landing() {
  const [step, setStep] = useState<OnboardingStep>('landing');
  const [deviceSize, setDeviceSize] = useState<DeviceSize | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const navigate = useNavigate();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  const handleInstallApp = async () => {
    if (canInstall) {
      await install();
    } else {
      navigate('/install');
    }
  };

  const handleStart = () => {
    setStep('questions');
  };

  const handleDeviceSize = (size: DeviceSize) => {
    setDeviceSize(size);
  };

  const handleEventType = (type: EventType) => {
    setEventType(type);
  };

  const handleNext = () => {
    if (deviceSize && eventType) {
      // Speichere die Antworten
      localStorage.setItem(
        'onboarding_answers',
        JSON.stringify({ deviceSize, eventType })
      );
      setStep('features');
    }
  };

  const handleRegister = () => {
    navigate('/auth?step=register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold gradient-text">RigFlow</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/auth?step=login')}>
              Anmelden
            </Button>
            <Button onClick={handleRegister}>
              Registrieren
            </Button>
          </div>
        </div>
      </header>

      {/* Landing Section */}
      {step === 'landing' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
          {/* Hero */}
          <div className="text-center space-y-6">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              Deine Event-Gear
              <br />
              <span className="gradient-text">vollständig im Griff</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Verwalte dein Inventar offline, synchronisiere automatisch, und behalte den
              Überblick über jeden Gig. Gebaut für Veranstaltungstechniker von
              Veranstaltungstechnikern.
            </p>

            {/* Value Props */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-12">
              <Card className="glass-card p-6 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Schnell & Mobil</h3>
                <p className="text-sm text-muted-foreground">
                  Offline-First, lädt in Millisekunden
                </p>
              </Card>

              <Card className="glass-card p-6 text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Deine Daten</h3>
                <p className="text-sm text-muted-foreground">
                  Sichere Cloud-Synchronisierung
                </p>
              </Card>

              <Card className="glass-card p-6 text-center">
                <Smartphone className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">App-Like</h3>
                <p className="text-sm text-muted-foreground">
                  Native App-Erfahrung, keine Installation
                </p>
              </Card>
            </div>

            <Button size="lg" onClick={handleStart} className="gap-2">
              Jetzt entdecken
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">QR-Code Scanning</h2>
              <p className="text-muted-foreground text-lg">
                Erfasse dein Equipment mit einem Scan. Einfach. Schnell. Offline.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>QR-Codes für alle Geräte generieren</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Status in Echtzeit aktualisieren</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Auch ohne Internet arbeiten</span>
                </li>
              </ul>
            </div>
            <Card className="glass-card p-8 aspect-square flex items-center justify-center">
              <div className="text-center">
                <Gauge className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">QR Scanner Mockup</p>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Questions Section */}
      {step === 'questions' && (
        <section className="max-w-2xl mx-auto px-4 py-20 space-y-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Lass uns dich kennenlernen
          </h2>

          {/* Question 1: Device Size */}
          <Card className="glass-card p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Wie viele Geräte verwaltest du?
              </h3>
              <p className="text-muted-foreground">
                Das hilft uns, die App für deine Bedürfnisse zu optimieren.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'small' as const, label: 'Klein', desc: 'Bis 50 Geräte' },
                { value: 'medium' as const, label: 'Mittel', desc: '50-200 Geräte' },
                { value: 'large' as const, label: 'Groß', desc: '200+ Geräte' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => handleDeviceSize(value)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    deviceSize === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Question 2: Event Type */}
          <Card className="glass-card p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Welche Events managest du?</h3>
              <p className="text-muted-foreground">
                Damit können wir die Standardeinstellungen anpassen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'festivals' as const, label: '🎪 Festivals' },
                { value: 'weddings' as const, label: '💍 Hochzeiten' },
                { value: 'corporate' as const, label: '🏢 Corporate' },
                { value: 'theatre' as const, label: '🎭 Theater' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleEventType(value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    eventType === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleNext}
            disabled={!deviceSize || !eventType}
            size="lg"
            className="w-full gap-2"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </section>
      )}

      {/* Features Section */}
      {step === 'features' && (
        <section className="max-w-4xl mx-auto px-4 py-20 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">Das bekommst du mit RigFlow</h2>
            <p className="text-muted-foreground text-lg">
              Alles, was du für professionelles Inventory-Management brauchst
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'Offline-Funktionen',
                description: 'Arbeite überall, auch ohne Internet. Alles synchronisiert sich automatisch.',
                icon: '📡',
              },
              {
                title: 'QR-Code Management',
                description: 'Generiere und scanne QR-Codes. Schnelle Erfassung deiner Ausrüstung.',
                icon: '📱',
              },
              {
                title: 'Event-Checklisten',
                description: 'Plane deine Gigs mit intelligenten Checklisten und Equipment-Paketen.',
                icon: '✅',
              },
              {
                title: 'Echtzeit-Sync',
                description: 'Alle deine Geräte sind immer aktuell. Cloud-sicher und schnell.',
                icon: '⚡',
              },
              {
                title: 'DMX-Konfiguration',
                description: 'Verwalte deine DMX-Kanäle und Universe direkt in der App.',
                icon: '🎛️',
              },
              {
                title: 'Audit-Log',
                description: 'Nachverfolgung aller Änderungen. Wer hat was und wann gemacht?',
                icon: '📋',
              },
            ].map((feature, i) => (
              <Card key={i} className="glass-card p-6 space-y-3">
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center space-y-4 pt-8">
            <p className="text-lg text-muted-foreground">
              Bereit, dein Inventar zu revolutionieren?
            </p>
            <Button size="lg" onClick={handleRegister} className="gap-2">
              Konto erstellen & loslegen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-muted-foreground">
          <p>© 2025 RigFlow. Gebaut für Veranstaltungstechniker.</p>
        </div>
      </footer>
    </div>
  );
}
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
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { isNative } from '@/services/platform';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [step, setStep] = useState<'intro' | 'complete'>('intro');

  const navigate = useNavigate();
  const { isMobile, os } = useDeviceDetection();
  const { t } = useTranslation();

  const isAndroid = isMobile && os === 'android';

  useEffect(() => {
    if (isNative()) {
      navigate('/');
    }
  }, [navigate]);

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

  const handleAndroidInstall = () => {
    if (deferredPrompt) {
      handleInstall();
    } else {
      alert(t("install.android_fallback"));
    }
  };

  const features = [
    {
      icon: Zap,
      title: t("install.features.fast.title"),
      desc: t("install.features.fast.desc"),
    },
    {
      icon: Wifi,
      title: t("install.features.offline.title"),
      desc: t("install.features.offline.desc"),
    },
    {
      icon: Lock,
      title: t("install.features.secure.title"),
      desc: t("install.features.secure.desc"),
    },
    {
      icon: HardDrive,
      title: t("install.features.light.title"),
      desc: t("install.features.light.desc"),
    },
  ];

  const completeFeatures = [
    {
      icon: Smartphone,
      title: t("install.complete.startscreen.title"),
      desc: t("install.complete.startscreen.desc"),
    },
    {
      icon: Zap,
      title: t("install.complete.ready.title"),
      desc: t("install.complete.ready.desc"),
    },
    {
      icon: Wifi,
      title: t("install.complete.offline.title"),
      desc: t("install.complete.offline.desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">

      {step === 'intro' && (
        <div className="w-full max-w-lg space-y-6">

          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
              <Download className="h-7 w-7 text-primary" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              {t("install.title")}
            </h1>

            <p className="text-muted-foreground text-sm">
              {t("install.subtitle")}
            </p>
          </div>

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

          {(deferredPrompt || isAndroid) ? (
            <Button
              onClick={isAndroid ? handleAndroidInstall : handleInstall}
              size="lg"
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              {t("install.button")}
            </Button>
          ) : (
            <Card className="glass-card p-0 overflow-hidden divide-y divide-border/50">
              <div className="px-5 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("install.manual_title")}
                </p>
              </div>

              <div className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Apple className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">iOS / Safari</p>
                  <p className="text-sm text-muted-foreground">
                    {t("install.ios_instructions")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Chrome className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Android / Chrome</p>
                  <p className="text-sm text-muted-foreground">
                    {t("install.android_instructions")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-muted-foreground">
            {t("common.later")}
          </Button>
        </div>
      )}

      {step === 'complete' && (
        <div className="w-full max-w-lg space-y-6">

          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              {t("install.complete_title")}
            </h1>

            <p className="text-muted-foreground text-sm">
              {t("install.complete_subtitle")}
            </p>
          </div>

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

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              {t("install.tip")}
            </p>
          </div>

          <Button onClick={() => navigate('/')} size="lg" className="w-full gap-2">
            {t("install.go_app")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
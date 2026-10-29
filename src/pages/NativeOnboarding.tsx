import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart2, Bell, Camera as CameraIcon, Check, Loader2, type LucideIcon } from "lucide-react";
import posthog from "posthog-js";
import { useTranslation } from "react-i18next";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Camera } from "@capacitor/camera";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { requestNativeNotificationPermission } from "@/services/native/notifications";
import { requestCameraPermission } from "@/services/native/index";
import { ONBOARDING_DONE_KEY, ANALYTICS_CONSENT_KEY } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface Screen {
  icon: LucideIcon;
  title: string;
  description: string;
  allowLabel: string;
  onAllow: () => Promise<void>;
  onSkip?: () => void;
}

const FINISH_DELAY_MS = 600;

export default function NativeOnboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const screens: Screen[] = [
    {
      icon: Bell,
      title: t("onboarding.notifications_title"),
      description: t("onboarding.notifications_description"),
      allowLabel: t("onboarding.notifications_allow"),
      onAllow: async () => {
        await requestNativeNotificationPermission();
      },
    },
    {
      icon: CameraIcon,
      title: t("onboarding.camera_title"),
      description: t("onboarding.camera_description"),
      allowLabel: t("onboarding.camera_allow"),
      onAllow: async () => {
        await requestCameraPermission();
      },
    },
    {
      icon: BarChart2,
      title: t("onboarding.analytics_title"),
      description: t("onboarding.analytics_description"),
      allowLabel: t("onboarding.analytics_allow"),
      onAllow: async () => {
        localStorage.setItem(ANALYTICS_CONSENT_KEY, "true");
        posthog.opt_in_capturing();
      },
      onSkip: () => {
        localStorage.setItem(ANALYTICS_CONSENT_KEY, "false");
        posthog.opt_out_capturing();
      },
    },
  ];
  const total = screens.length;

  // Skip permission screens that are already granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [notif, cam] = await Promise.all([LocalNotifications.checkPermissions(), Camera.checkPermissions()]);
        if (cancelled) return;
        const firstOpen = notif.display !== "granted" ? 0 : cam.camera !== "granted" ? 1 : 2;
        // Never move the user backwards if they already advanced.
        setStep((s) => Math.max(s, firstOpen));
      } catch {
        // Permission APIs unavailable: start at the first screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => navigate("/", { replace: true }), FINISH_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [done, navigate]);

  const advance = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem(ONBOARDING_DONE_KEY, "1");
      setDone(true);
    }
  };

  const handleAllow = async () => {
    setLoading(true);
    try {
      await screens[step].onAllow();
    } catch (e) {
      logger.warn("Permission request failed", e);
    } finally {
      setLoading(false);
    }
    advance();
  };

  const handleSkip = () => {
    screens[step].onSkip?.();
    advance();
  };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card">
          <Check className="h-5 w-5 text-success" />
        </div>
      </div>
    );
  }

  const screen = screens[step];
  const Icon = screen.icon;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 pb-safe pt-safe">
      <div className="flex h-16 items-center justify-between">
        <Logo />
        <span className="tech text-xs text-muted-foreground">
          {t("onboarding.step_indicator", { current: step + 1, total })}
        </span>
      </div>

      <div className="flex gap-1" aria-hidden="true">
        {screens.map((_, i) => (
          <div key={i} className={cn("h-0.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-end pb-6" key={step}>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{screen.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{screen.description}</p>

        <div className="mt-10 flex flex-col gap-2">
          <Button size="lg" className="h-11 w-full" onClick={handleAllow} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {screen.allowLabel}
          </Button>
          <Button variant="ghost" size="lg" className="h-11 w-full text-muted-foreground" onClick={handleSkip} disabled={loading}>
            {t("onboarding.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}

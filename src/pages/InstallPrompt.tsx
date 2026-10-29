import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Download, HardDrive, Loader2, Lock, MoreVertical, Share, Smartphone, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { isNative } from "@/services/platform";
import { logger } from "@/lib/logger";
import { InfoList, OnboardingHeading, OnboardingShell } from "@/components/onboarding/OnboardingShell";

/** Shown once after login: offers to install the PWA, or confirms it is installed. */
export default function InstallPrompt() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isMobile, os } = useDeviceDetection();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);
  const isAndroid = isMobile && os === "android";

  useEffect(() => {
    if (isNative()) navigate("/", { replace: true });
  }, [navigate]);

  const handleInstall = async () => {
    if (!canInstall) {
      // Android without a captured prompt: explain the manual way inline.
      setShowAndroidHint(true);
      return;
    }
    setInstalling(true);
    try {
      await install();
    } catch (err) {
      logger.error("Install prompt failed", err);
    } finally {
      setInstalling(false);
    }
  };

  if (isInstalled) {
    return (
      <OnboardingShell>
        <OnboardingHeading title={t("install.complete_title")} description={t("install.complete_subtitle")} />
        <InfoList
          items={[
            { icon: Smartphone, title: t("install.complete.startscreen.title"), desc: t("install.complete.startscreen.desc") },
            { icon: Zap, title: t("install.complete.ready.title"), desc: t("install.complete.ready.desc") },
            { icon: Wifi, title: t("install.complete.offline.title"), desc: t("install.complete.offline.desc") },
          ]}
        />
        <p className="mt-4 text-[13px] text-muted-foreground">{t("install.tip")}</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/")}>
          {t("install.go_app")}
          <ArrowRight />
        </Button>
      </OnboardingShell>
    );
  }

  const showInstallButton = canInstall || isAndroid;

  return (
    <OnboardingShell>
      <OnboardingHeading title={t("install.title")} description={t("install.subtitle")} />

      <InfoList
        items={[
          { icon: Zap, title: t("install.features.fast.title"), desc: t("install.features.fast.desc") },
          { icon: Wifi, title: t("install.features.offline.title"), desc: t("install.features.offline.desc") },
          { icon: Lock, title: t("install.features.secure.title"), desc: t("install.features.secure.desc") },
          { icon: HardDrive, title: t("install.features.light.title"), desc: t("install.features.light.desc") },
        ]}
      />

      <div className="mt-6 space-y-3">
        {showInstallButton ? (
          <>
            <Button size="lg" className="w-full" onClick={handleInstall} disabled={installing}>
              {installing ? <Loader2 className="animate-spin" /> : <Download />}
              {t("install.button")}
            </Button>
            {showAndroidHint && (
              <p className="rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-[13px] text-muted-foreground">
                {t("install.android_fallback")}
              </p>
            )}
          </>
        ) : (
          <div className="surface">
            <p className="eyebrow border-b border-border px-4 py-2.5">{t("install.manual_title")}</p>
            <InfoList
              className="rounded-none border-0"
              items={[
                { icon: Share, title: "iOS / Safari", desc: t("install.ios_instructions") },
                { icon: MoreVertical, title: "Android / Chrome", desc: t("install.android_instructions") },
              ]}
            />
          </div>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/")}>
          {t("common.later")}
        </Button>
      </div>
    </OnboardingShell>
  );
}

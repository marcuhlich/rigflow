import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, Bell, Check, Download, ExternalLink, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushService } from "@/lib/pushService";
import { logger } from "@/lib/logger";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useLatestRelease, formatFileSize } from "@/hooks/useLatestRelease";
import { isNative } from "@/services/platform";
import { OnboardingHeading, OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { tArray } from "@/components/landing/tArray";
import { cn } from "@/lib/utils";

const RELEASES_URL = "https://github.com/marcuhlich/rigflow-desktop/releases";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return isOnline;
}

function ConnectionRow({ online, onlineText, offlineText }: { online: boolean; onlineText: string; offlineText: string }) {
  const Icon = online ? Wifi : WifiOff;
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Icon className={cn("h-4 w-4", online ? "text-success" : "text-warning")} />
      {online ? onlineText : offlineText}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px]",
        tone === "error" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-warning/30 bg-warning/5 text-warning"
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function DesktopInstall() {
  const { t } = useTranslation();
  const { os } = useDeviceDetection();
  const { release, loading, error } = useLatestRelease();
  const isOnline = useOnlineStatus();

  const osLabel =
    os === "windows" ? t("install.os_windows")
    : os === "macos" ? t("install.os_macos")
    : os === "linux" ? t("install.os_linux")
    : t("install.os_unknown");

  return (
    <>
      <OnboardingHeading title={t("install.desktop_title")} description={t("install.desktop_subtitle", { osLabel })} />

      <div className="surface divide-y divide-border">
        <div className="px-4 py-3">
          <ConnectionRow online={isOnline} onlineText={t("install.online_download")} offlineText={t("install.offline_download")} />
        </div>
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("install.checking_updates")}
            </div>
          ) : error ? (
            <Notice tone="error">{error}</Notice>
          ) : release?.downloadUrl ? (
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="tech font-medium">{t("install.version_label", { version: release.version })}</span>
                {release.fileSize != null && (
                  <span className="tech text-muted-foreground">{formatFileSize(release.fileSize)}</span>
                )}
              </div>
              {release.fileName && (
                <p className="tech mt-1 truncate text-xs text-muted-foreground">{release.fileName}</p>
              )}
            </div>
          ) : (
            <Notice tone="warning">{t("install.no_installer")}</Notice>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {release?.downloadUrl && (
          <Button size="lg" asChild>
            <a href={release.downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download />
              {t("install.download_installer")}
            </a>
          </Button>
        )}
        <Button variant="outline" asChild>
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {t("install.github_releases")}
          </a>
        </Button>
      </div>
    </>
  );
}

function MobileInstall() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const isOnline = useOnlineStatus();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    "Notification" in window ? Notification.permission : "default"
  );
  const [requesting, setRequesting] = useState(false);
  const [installing, setInstalling] = useState(false);

  const requestNotifications = async () => {
    setRequesting(true);
    try {
      const result = await PushService.requestNotificationPermission();
      setPermission(result);
      if (result === "granted") {
        await PushService.showNotification("RigFlow", { body: t("install.notification_welcome_body"), tag: "welcome" });
      }
    } catch (err) {
      logger.error("Notification permission request failed", err);
    } finally {
      setRequesting(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } catch (err) {
      logger.error("Install prompt failed", err);
    } finally {
      setInstalling(false);
    }
  };

  const features = tArray<string>(t, "install.mobile_features");

  return (
    <>
      <OnboardingHeading title={t("install.mobile_title")} description={t("install.mobile_subtitle")} />

      <div className="surface divide-y divide-border">
        <div className="px-4 py-3">
          <ConnectionRow online={isOnline} onlineText={t("install.online_full")} offlineText={t("install.offline_limited")} />
        </div>

        <div className="px-4 py-4">
          <p className="eyebrow mb-3">{t("install.installation_heading").replace(/:$/, "")}</p>
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[13px]">
                <Check className="h-4 w-4 text-muted-foreground" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {t("settings.notifications")}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{t("install.notifications_description")}</p>
            </div>
            {permission === "default" && (
              <Button size="sm" variant="outline" onClick={requestNotifications} disabled={requesting} className="shrink-0">
                {requesting && <Loader2 className="animate-spin" />}
                {requesting ? t("install.notifications_activating") : t("install.notifications_enable")}
              </Button>
            )}
          </div>
          {permission === "granted" && (
            <p className="flex items-center gap-2 text-[13px] text-success">
              <Check className="h-4 w-4" />
              {t("install.notifications_enabled")}
            </p>
          )}
          {permission === "denied" && <Notice tone="error">{t("install.notifications_disabled")}</Notice>}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isInstalled ? (
          <>
            <p className="flex items-center gap-2 text-[13px] text-success">
              <Check className="h-4 w-4" />
              {t("install.already_installed")}
            </p>
            <Button size="lg" className="w-full" onClick={() => navigate("/")}>
              {t("install.go_app")}
            </Button>
          </>
        ) : canInstall ? (
          <Button size="lg" className="w-full" onClick={handleInstall} disabled={installing}>
            {installing ? <Loader2 className="animate-spin" /> : <Download />}
            {t("install.button")}
          </Button>
        ) : (
          <>
            <div className="rounded-md border border-border bg-surface-sunken px-4 py-3 text-[13px]">
              <p className="font-medium">{t("install.browser_menu_hint")}</p>
              <p className="mt-1.5 text-muted-foreground">
                <span className="font-medium text-foreground">iOS</span> — {t("install.ios_browser")}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                <span className="font-medium text-foreground">Android</span> — {t("install.android_browser")}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              {t("install.continue_to_app")}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

export default function Install() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDesktop } = useDeviceDetection();

  useEffect(() => {
    if (isNative()) navigate("/", { replace: true });
  }, [navigate]);

  return (
    <OnboardingShell
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft />
          {t("common.back")}
        </Button>
      }
    >
      {isDesktop ? <DesktopInstall /> : <MobileInstall />}
    </OnboardingShell>
  );
}

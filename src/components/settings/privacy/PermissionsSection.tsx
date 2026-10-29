import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Camera } from "@capacitor/camera";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import { ExternalLink } from "lucide-react";
import { isNative } from "@/services/platform";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsRow, SettingsSection } from "../SettingsSection";

type PermState = PermissionState | "unsupported";
type PermKey = "camera" | "notifications";

const KEYS: PermKey[] = ["camera", "notifications"];

function mapCapacitor(s: string | undefined): PermState {
  if (s === "granted") return "granted";
  if (s === "denied") return "denied";
  if (s === "prompt" || s === "prompt-with-rationale") return "prompt";
  return "unsupported";
}

async function readPermissions(): Promise<Record<PermKey, PermState>> {
  if (isNative()) {
    const [notif, cam] = await Promise.all([
      LocalNotifications.checkPermissions().then((r) => r.display as string).catch(() => undefined),
      Camera.checkPermissions().then((r) => r.camera as string).catch(() => undefined),
    ]);
    return { notifications: mapCapacitor(notif), camera: mapCapacitor(cam) };
  }

  const notifications: PermState =
    "Notification" in window
      ? Notification.permission === "default"
        ? "prompt"
        : (Notification.permission as PermState)
      : "unsupported";

  let camera: PermState = "unsupported";
  if (navigator.permissions?.query) {
    camera = await navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((r) => r.state)
      .catch((): PermState => "unsupported");
  }
  return { notifications, camera };
}

async function openPermissionSettings(t: (k: string) => string) {
  if (isNative()) {
    try {
      await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    } catch {
      toast({ title: t("privacy.permissions.toast_title"), description: t("privacy.permissions.toast_android_pwa") });
    }
    return;
  }

  const ua = navigator.userAgent;
  if (/Electron/.test(ua)) {
    if (/Windows/.test(ua)) window.open("ms-settings:privacy-webcam");
    else if (/Macintosh|Mac OS X/.test(ua)) {
      window.open("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera");
    } else {
      toast({ title: t("privacy.permissions.toast_title"), description: t("privacy.permissions.toast_linux") });
    }
    return;
  }

  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const descKey =
    isAndroid && isPWA
      ? "privacy.permissions.toast_android_pwa"
      : isAndroid
        ? "privacy.permissions.toast_android_web"
        : isIOS
          ? "privacy.permissions.toast_ios"
          : "privacy.permissions.toast_desktop";
  toast({ title: t("privacy.permissions.toast_title"), description: t(descKey), duration: 6000 });
}

export function PermissionsSection() {
  const { t } = useTranslation();
  const [perms, setPerms] = useState<Record<PermKey, PermState> | null>(null);

  useEffect(() => {
    let cancelled = false;
    readPermissions()
      .then((p) => {
        if (!cancelled) setPerms(p);
      })
      .catch((e) => {
        console.error("Permission check error:", e);
        if (!cancelled) setPerms({ camera: "unsupported", notifications: "unsupported" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stateBadge = (s: PermState | undefined) => {
    if (s === undefined) return <Badge variant="outline">{t("common.loading")}</Badge>;
    if (s === "granted") return <Badge variant="available">{t("privacy.permissions.state_granted")}</Badge>;
    if (s === "denied") return <Badge variant="defect">{t("privacy.permissions.state_denied")}</Badge>;
    if (s === "prompt") return <Badge variant="outline">{t("privacy.permissions.state_prompt")}</Badge>;
    return <Badge variant="secondary">{t("privacy.permissions.state_unsupported")}</Badge>;
  };

  return (
    <SettingsSection
      title={t("privacy.permissions.section_title")}
      description={t("privacy.permissions.section_description")}
    >
      {KEYS.map((key) => (
        <SettingsRow
          key={key}
          label={t(`privacy.permissions.${key}_label`)}
          description={t(`privacy.permissions.${key}_description`)}
          control={stateBadge(perms?.[key])}
        />
      ))}
      <div className="px-4 py-2.5">
        <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => void openPermissionSettings(t)}>
          <ExternalLink />
          {isNative() ? t("privacy.permissions.open_native") : t("privacy.permissions.open_web")}
        </Button>
      </div>
    </SettingsSection>
  );
}

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isNative } from "@/services/platform";
import {
  checkNativeNotificationPermission,
  requestNativeNotificationPermission,
} from "@/services/native/notifications";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";

interface NotificationPrefs {
  loanReminders: boolean;
  checklistUpdates: boolean;
  newMembers: boolean;
  securityAlerts: boolean;
}

type PrefKey = keyof NotificationPrefs;

const DEFAULTS: NotificationPrefs = {
  loanReminders: true,
  checklistUpdates: true,
  newMembers: false,
  securityAlerts: true,
};

const ROWS: { key: PrefKey; i18n: string }[] = [
  { key: "loanReminders", i18n: "loan_reminders" },
  { key: "checklistUpdates", i18n: "checklist_updates" },
  { key: "newMembers", i18n: "new_members" },
  { key: "securityAlerts", i18n: "security_alerts" },
];

/** "unsupported": no notification API at all (e.g. iOS Safari outside a PWA). */
type PushState = "loading" | "granted" | "blocked" | "unsupported";

function readPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return DEFAULTS;
  const r = raw as Partial<Record<PrefKey, unknown>>;
  const pick = (k: PrefKey) => (typeof r[k] === "boolean" ? (r[k] as boolean) : DEFAULTS[k]);
  return {
    loanReminders: pick("loanReminders"),
    checklistUpdates: pick("checklistUpdates"),
    newMembers: pick("newMembers"),
    securityAlerts: pick("securityAlerts"),
  };
}

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readPrefs(user?.user_metadata?.notification_prefs));
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);
  const [push, setPush] = useState<PushState>("loading");
  const [requesting, setRequesting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const savedPrefs = user?.user_metadata?.notification_prefs;
  useEffect(() => {
    setPrefs(readPrefs(savedPrefs));
  }, [savedPrefs]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      let next: PushState;
      if (isNative()) {
        const p = await checkNativeNotificationPermission();
        next = p === "granted" ? "granted" : "blocked";
      } else if ("Notification" in window) {
        next = Notification.permission === "granted" ? "granted" : "blocked";
      } else {
        next = "unsupported";
      }
      if (!cancelled) setPush(next);
    };
    check().catch(() => {
      if (!cancelled) setPush("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestPushPermission = async () => {
    setRequesting(true);
    try {
      if (isNative()) {
        const result = await requestNativeNotificationPermission();
        if (!mounted.current) return;
        setPush(result === "granted" ? "granted" : "blocked");
        if (result !== "granted") {
          toast({
            title: t("notifications.push_blocked_title"),
            description:
              result === "denied"
                ? t("notifications.push_blocked_native_denied")
                : t("notifications.push_blocked_native_other"),
            variant: "destructive",
          });
        }
        return;
      }
      if (!("Notification" in window)) return;
      const result = await Notification.requestPermission();
      if (!mounted.current) return;
      setPush(result === "granted" ? "granted" : "blocked");
      if (result !== "granted") {
        toast({
          title: t("notifications.push_blocked_title"),
          description: t("notifications.push_blocked_web"),
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t("notifications.push_blocked_title"), variant: "destructive" });
    } finally {
      if (mounted.current) setRequesting(false);
    }
  };

  const handleToggle = async (key: PrefKey, value: boolean) => {
    const previous = prefs;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSavingKey(key);

    const { error } = await supabase.auth.updateUser({ data: { notification_prefs: updated } });
    if (!mounted.current) return;
    setSavingKey(null);

    if (error) {
      setPrefs(previous);
      toast({ title: t("common.error"), description: t("notifications.toast_error"), variant: "destructive" });
      return;
    }
    toast({
      title: value ? t("notifications.toast_enabled") : t("notifications.toast_disabled"),
      description: t("notifications.toast_saved"),
    });
  };

  const pushOff = push === "blocked" || push === "unsupported";

  return (
    <SettingsPage>
      <PageHeader title={t("settings.notifications")} description={t("notifications.footer_hint")} />

      {push === "blocked" && (
        <div className="surface flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
          <BellOff className="hidden h-4 w-4 shrink-0 text-warning sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("notifications.push_banner_title")}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{t("notifications.push_banner_description")}</p>
          </div>
          <Button size="sm" onClick={() => void requestPushPermission()} disabled={requesting}>
            {requesting && <Loader2 className="animate-spin" />}
            {t("notifications.push_allow")}
          </Button>
        </div>
      )}

      {push === "unsupported" && (
        <div className="surface flex items-start gap-3 px-4 py-3.5">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">{t("notifications.push_unsupported")}</p>
        </div>
      )}

      <SettingsSection>
        {ROWS.map(({ key, i18n }) => {
          const id = `notif-${key}`;
          return (
            <SettingsRow
              key={key}
              htmlFor={id}
              disabled={pushOff}
              label={t(`notifications.${i18n}_label`)}
              description={
                pushOff ? t("notifications.push_disabled_reason") : t(`notifications.${i18n}_description`)
              }
              control={
                <Switch
                  id={id}
                  checked={prefs[key]}
                  disabled={pushOff || push === "loading" || savingKey !== null}
                  onCheckedChange={(v) => void handleToggle(key, v)}
                />
              }
            />
          );
        })}
      </SettingsSection>
    </SettingsPage>
  );
};

export default Notifications;

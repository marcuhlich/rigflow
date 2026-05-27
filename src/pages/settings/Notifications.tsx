import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Bell,
  Package,
  CheckSquare,
  Users,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isNative } from '@/services/platform';
import {
  checkNativeNotificationPermission,
  requestNativeNotificationPermission,
} from '@/services/native/notifications';
import { useTranslation } from 'react-i18next';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  loanReminders: boolean;
  checklistUpdates: boolean;
  newMembers: boolean;
  securityAlerts: boolean;
}

const DEFAULTS: NotificationPrefs = {
  loanReminders: true,
  checklistUpdates: true,
  newMembers: false,
  securityAlerts: true,
};

// ─── Toggle Component ─────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
}

const Toggle = ({ checked, onChange, disabled, saving }: ToggleProps) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled || saving}
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      disabled:cursor-not-allowed
      transition-colors duration-300
      ${checked ? "bg-primary border-primary" : "bg-muted border-border"}
      ${saving ? "opacity-80" : "opacity-100"}
    `}
  >
    {saving && (
      <span className={`
        absolute inset-0 rounded-full animate-ping opacity-30
        ${checked ? "bg-primary" : "bg-muted-foreground"}
      `} />
    )}
    <span
      className={`
        pointer-events-none relative inline-block h-4 w-4 rounded-full shadow-md
        transition-all duration-300 ease-in-out
        ${checked ? "translate-x-5" : "translate-x-0.5"}
        ${saving
          ? "scale-90 bg-white/80"
          : checked
            ? "scale-100 bg-primary-foreground"
            : "scale-100 bg-muted-foreground/60"
        }
      `}
    >
      {saving && (
        <span className="absolute inset-1 rounded-full bg-primary/60 animate-pulse" />
      )}
    </span>
  </button>
);

// ─── Notification Row ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
  saving?: boolean;
}

const NotificationRow = ({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
  disabledReason,
  saving,
}: NotificationRowProps) => (
  <div className={`flex items-start gap-4 py-4 ${disabled ? "opacity-60" : ""}`}>
    <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${checked && !disabled ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"} transition-colors duration-300`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
        {disabled && disabledReason ? disabledReason : description}
      </p>
    </div>
    <div className="shrink-0 flex items-center mt-0.5">
      <Toggle checked={checked} onChange={onChange} disabled={disabled} saving={saving} />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [savingKey, setSavingKey] = useState<keyof NotificationPrefs | null>(null);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = user?.user_metadata?.notification_prefs;
    if (saved) setPrefs({ ...DEFAULTS, ...saved });
  }, [user]);

  useEffect(() => {
    const check = async () => {
      if (isNative()) {
        const p = await checkNativeNotificationPermission();
        setPushGranted(p === 'granted');
      } else if ('Notification' in window) {
        setPushGranted(Notification.permission === 'granted');
      } else {
        setPushGranted(false);
      }
    };
    check();
  }, []);

  const requestPushPermission = async () => {
    if (isNative()) {
      const result = await requestNativeNotificationPermission();
      setPushGranted(result === 'granted');
      if (result !== 'granted') {
        toast({
          title: t('notifications.push_blocked_title'),
          description: result === 'denied'
            ? t('notifications.push_blocked_native_denied')
            : t('notifications.push_blocked_native_other'),
          variant: 'destructive',
        });
      }
      return;
    }

    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPushGranted(result === 'granted');
    if (result !== 'granted') {
      toast({
        title: t('notifications.push_blocked_title'),
        description: t('notifications.push_blocked_web'),
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSavingKey(key);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { notification_prefs: updated },
      });
      if (error) throw error;

      toast({
        title: value ? t('notifications.toast_enabled') : t('notifications.toast_disabled'),
        description: t('notifications.toast_saved'),
      });
    } catch {
      setPrefs(prefs);
      toast({
        title: t('common.error'),
        description: t('notifications.toast_error'),
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const pushDisabled = pushGranted === false;

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Push permission banner */}
        {pushGranted === false && (
          <button
            onClick={requestPushPermission}
            className="w-full glass-card p-4 flex items-start gap-3 text-left border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
          >
            <Bell className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-accent">
                {t('notifications.push_banner_title')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('notifications.push_banner_description')}
              </p>
            </div>
          </button>
        )}

        {/* Main toggles */}
        <div className="glass-card px-4 divide-y divide-border/50">
          <NotificationRow
            icon={<Package className="h-4 w-4" />}
            label={t('notifications.loan_reminders_label')}
            description={t('notifications.loan_reminders_description')}
            checked={prefs.loanReminders}
            onChange={(v) => handleToggle("loanReminders", v)}
            disabled={pushDisabled}
            disabledReason={t('notifications.push_disabled_reason')}
            saving={savingKey === "loanReminders"}
          />
          <NotificationRow
            icon={<CheckSquare className="h-4 w-4" />}
            label={t('notifications.checklist_updates_label')}
            description={t('notifications.checklist_updates_description')}
            checked={prefs.checklistUpdates}
            onChange={(v) => handleToggle("checklistUpdates", v)}
            disabled={pushDisabled}
            disabledReason={t('notifications.push_disabled_reason')}
            saving={savingKey === "checklistUpdates"}
          />
          <NotificationRow
            icon={<Users className="h-4 w-4" />}
            label={t('notifications.new_members_label')}
            description={t('notifications.new_members_description')}
            checked={prefs.newMembers}
            onChange={(v) => handleToggle("newMembers", v)}
            disabled={pushDisabled}
            disabledReason={t('notifications.push_disabled_reason')}
            saving={savingKey === "newMembers"}
          />
          <NotificationRow
            icon={<ShieldAlert className="h-4 w-4" />}
            label={t('notifications.security_alerts_label')}
            description={t('notifications.security_alerts_description')}
            checked={prefs.securityAlerts}
            onChange={(v) => handleToggle("securityAlerts", v)}
            disabled={pushDisabled}
            disabledReason={t('notifications.push_disabled_reason')}
            saving={savingKey === "securityAlerts"}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center px-4">
          {t('notifications.footer_hint')}
        </p>
      </div>
    </div>
  );
};

export default Notifications;
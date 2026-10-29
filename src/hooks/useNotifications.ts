import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPrefs {
  loanReminders: boolean;
  checklistUpdates: boolean;
  newMembers: boolean;
  securityAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  loanReminders:    true,
  checklistUpdates: true,
  newMembers:       false,
  securityAlerts:   true,
};

/**
 * Wrapper around usePushNotifications that respects the user's
 * notification preferences saved in user_metadata.notification_prefs.
 *
 * Usage:
 *   const { notifyLoanReminder, notifyChecklistDone, ... } = useNotifications();
 *   await notifyLoanReminder("Funkmikro Sennheiser", 3);
 */
export function useNotifications() {
  const { user } = useAuth();
  const push = usePushNotifications();
  const { sendNotification } = push;

  const rawPrefs = user?.user_metadata?.notification_prefs as Partial<NotificationPrefs> | undefined;
  const prefsKey = JSON.stringify(rawPrefs ?? {});
  const prefs = useMemo<NotificationPrefs>(() => ({
    ...DEFAULT_PREFS,
    ...(JSON.parse(prefsKey) as Partial<NotificationPrefs>),
  }), [prefsKey]);

  // Stable callbacks (consumers use them in effect deps – e.g. useOverdueReminder)
  const send = useCallback((
    enabled: boolean,
    ...args: Parameters<typeof sendNotification>
  ) => {
    if (!enabled) return;
    return sendNotification(...args);
  }, [sendNotification]);

  const notifyLoanReminder = useCallback((itemName: string, days: number) =>
    send(prefs.loanReminders, {
      title: "⏰ Ausleih-Erinnerung",
      body: `„${itemName}" ist seit ${days} Tag${days === 1 ? "" : "en"} nicht zurückgegeben worden.`,
      tag: "loan-reminder",
      requireInteraction: true,
    }), [send, prefs.loanReminders]);

  const notifyLoanReminderMultiple = useCallback((itemNames: string[]) => {
    const count = itemNames.length;
    const preview = itemNames.slice(0, 3).join(", ");
    const suffix = count > 3 ? ` und ${count - 3} weitere` : "";
    return send(prefs.loanReminders, {
      title: `⏰ ${count} überfällige Rückgaben`,
      body: `${preview}${suffix} – bitte Rückgabe prüfen.`,
      tag: "loan-reminder",
      requireInteraction: true,
    });
  }, [send, prefs.loanReminders]);

  const notifyChecklistDone = useCallback((checklistName: string) =>
    send(prefs.checklistUpdates, {
      title: "✅ Checkliste abgeschlossen",
      body: `„${checklistName}" wurde vollständig abgehakt.`,
      tag: "checklist-done",
    }), [send, prefs.checklistUpdates]);

  const notifyNewMember = useCallback((userName: string) =>
    send(prefs.newMembers, {
      title: "👤 Neues Teammitglied",
      body: `${userName} ist deiner Organisation beigetreten.`,
      tag: "new-member",
    }), [send, prefs.newMembers]);

  const notifyNewDeviceSignIn = useCallback(() =>
    send(prefs.securityAlerts, {
      title: "🔐 Neues Gerät",
      body: "Dein Konto wurde von einem neuen Gerät geöffnet. Warst das du?",
      tag: "security-alert",
      requireInteraction: true,
    }), [send, prefs.securityAlerts]);

  return useMemo(() => ({
    ...push,
    notifyLoanReminder,
    notifyLoanReminderMultiple,
    notifyChecklistDone,
    notifyNewMember,
    notifyNewDeviceSignIn,
  }), [push, notifyLoanReminder, notifyLoanReminderMultiple, notifyChecklistDone, notifyNewMember, notifyNewDeviceSignIn]);
}

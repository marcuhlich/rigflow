import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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

  const prefs = {
    loanReminders:    true,
    checklistUpdates: true,
    newMembers:       false,
    securityAlerts:   true,
    ...(user?.user_metadata?.notification_prefs ?? {}),
  };

  const send = (
    enabled: boolean,
    ...args: Parameters<typeof push.sendNotification>
  ) => {
    if (!enabled) return;
    return push.sendNotification(...args);
  };

  const notifyLoanReminder = (itemName: string, days: number) =>
    send(prefs.loanReminders, {
      title: "⏰ Ausleih-Erinnerung",
      body: `„${itemName}" ist seit ${days} Tag${days === 1 ? "" : "en"} nicht zurückgegeben worden.`,
      tag: "loan-reminder",
      requireInteraction: true,
    });

  const notifyLoanReminderMultiple = (itemNames: string[]) => {
    const count = itemNames.length;
    const preview = itemNames.slice(0, 3).join(", ");
    const suffix = count > 3 ? ` und ${count - 3} weitere` : "";
    return send(prefs.loanReminders, {
      title: `⏰ ${count} überfällige Rückgaben`,
      body: `${preview}${suffix} – bitte Rückgabe prüfen.`,
      tag: "loan-reminder",
      requireInteraction: true,
    });
  };

  const notifyChecklistDone = (checklistName: string) =>
    send(prefs.checklistUpdates, {
      title: "✅ Checkliste abgeschlossen",
      body: `„${checklistName}" wurde vollständig abgehakt.`,
      tag: "checklist-done",
    });

  const notifyNewMember = (userName: string) =>
    send(prefs.newMembers, {
      title: "👤 Neues Teammitglied",
      body: `${userName} ist deiner Organisation beigetreten.`,
      tag: "new-member",
    });

  const notifyNewDeviceSignIn = () =>
    send(prefs.securityAlerts, {
      title: "🔐 Neues Gerät",
      body: "Dein Konto wurde von einem neuen Gerät geöffnet. Warst das du?",
      tag: "security-alert",
      requireInteraction: true,
    });

  return {
    ...push,
    notifyLoanReminder,
    notifyLoanReminderMultiple,
    notifyChecklistDone,
    notifyNewMember,
    notifyNewDeviceSignIn,
  };
}
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";

/**
 * TEMPORÄRE TEST-SEITE – nach dem Testen löschen!
 * Route: /dev/notifications
 */
export default function NotificationTest() {
  const {
    isSupported,
    permission,
    requestPermission,
    notifyLoanReminder,
    notifyLoanReminderMultiple,
    notifyChecklistDone,
    notifyNewMember,
    notifyNewDeviceSignIn,
    notifySync,
    notifyOffline,
    notifyOnline,
  } = useNotifications();

  return (
    <div className="min-h-screen bg-background p-8 space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold mb-1">🔔 Notification Testbench</h1>
        <p className="text-sm text-muted-foreground">
          Unterstützt: <strong>{isSupported ? "✅ Ja" : "❌ Nein"}</strong>
          &nbsp;·&nbsp;
          Permission: <strong>{permission}</strong>
        </p>
      </div>

      {permission !== "granted" && (
        <Button onClick={requestPermission} className="w-full">
          Permission anfordern
        </Button>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan Reminders</p>
        <Button variant="outline" className="w-full" onClick={() => notifyLoanReminder("Funkmikro Sennheiser EW100", 3)}>
          Einzelner Artikel (3 Tage)
        </Button>
        <Button variant="outline" className="w-full" onClick={() => notifyLoanReminder("Kabel XLR 10m", 1)}>
          Einzelner Artikel (1 Tag)
        </Button>
        <Button variant="outline" className="w-full" onClick={() =>
          notifyLoanReminderMultiple(["Funkmikro", "Stativ", "DMX-Interface", "Nebelmaschine", "Followspot"])
        }>
          5 Artikel (→ „und 2 weitere")
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sonstige</p>
        <Button variant="outline" className="w-full" onClick={() => notifyChecklistDone("Open Air Nagold 2025")}>
          Checkliste abgeschlossen
        </Button>
        <Button variant="outline" className="w-full" onClick={() => notifyNewMember("max@beispiel.de")}>
          Neues Teammitglied
        </Button>
        <Button variant="outline" className="w-full" onClick={notifyNewDeviceSignIn}>
          Neues Gerät (Security)
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bestehende (pass-through)</p>
        <Button variant="outline" className="w-full" onClick={() => notifySync(12)}>
          Sync OK (12 Artikel)
        </Button>
        <Button variant="outline" className="w-full" onClick={() => notifySync(8, 2)}>
          Sync mit 2 Konflikten
        </Button>
        <Button variant="outline" className="w-full" onClick={notifyOffline}>
          Offline
        </Button>
        <Button variant="outline" className="w-full" onClick={notifyOnline}>
          Online
        </Button>
      </div>
    </div>
  );
}
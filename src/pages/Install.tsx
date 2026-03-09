import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Wifi, WifiOff, Bell, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PushService } from "@/lib/pushService";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function Install() {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isRequestingNotification, setIsRequestingNotification] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    await install();
  };

  const handleRequestNotificationPermission = async () => {
    setIsRequestingNotification(true);
    try {
      const permission = await PushService.requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        // Show test notification
        await PushService.showNotification("RigFlow", {
          body: "Benachrichtigungen sind aktiviert! 🎉",
          tag: "welcome",
        });
      }
    } catch (error) {
      console.error("Failed to request notification permission:", error);
    } finally {
      setIsRequestingNotification(false);
    }
  };

  const hasNotificationPermission = notificationPermission === "granted";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">RigFlow einrichten</CardTitle>
          <CardDescription>
            Optimiere deine App für offline Nutzung und Benachrichtigungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Online Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Online - Alle Funktionen verfügbar</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Offline - Eingeschränkte Funktionen</span>
              </>
            )}
          </div>

          {/* Installation Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">App-Installation:</h3>
            <ul className="space-y-2">
              {[
                "Schneller Zugriff vom Homescreen",
                "Funktioniert offline",
                "Automatische Updates",
                "Vollbildmodus ohne Browser-UI",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Notifications Section */}
          <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-foreground">Benachrichtigungen</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Erhalte Updates, wenn deine Items synchronisiert werden oder Konflikte aufgelöst werden müssen.
            </p>

            {notificationPermission === "default" && (
              <Button
                size="sm"
                onClick={handleRequestNotificationPermission}
                disabled={isRequestingNotification}
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                {isRequestingNotification ? "Wird aktiviert..." : "Benachrichtigungen aktivieren"}
              </Button>
            )}

            {hasNotificationPermission && (
              <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Benachrichtigungen aktiviert</span>
              </div>
            )}

            {notificationPermission === "denied" && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Benachrichtigungen sind deaktiviert. Aktiviere sie in den Browser-Einstellungen.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Install Button */}
          {isInstalled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 text-green-500">
                <Check className="w-5 h-5" />
                <span className="font-medium text-sm">App ist bereits installiert</span>
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>
                Zur App
              </Button>
            </div>
          ) : deferredPrompt ? (
            <Button className="w-full" size="lg" onClick={handleInstall}>
              <Download className="w-5 h-5 mr-2" />
              Jetzt installieren
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Installation über Browser-Menü:
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>iOS:</strong> Teilen → Zum Homebildschirm
                  <br />
                  <strong>Android:</strong> Menü (Drei Punkte) → Zum Startbildschirm hinzufügen
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                Weiter zur App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Rigflow App installieren</CardTitle>
          <CardDescription>
            Installiere die App auf deinem Gerät für schnellen Zugriff und Offline-Funktionalität
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

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Vorteile der Installation:</h3>
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

          {/* Install Button */}
          {isInstalled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 text-green-500">
                <Check className="w-5 h-5" />
                <span className="font-medium">App ist bereits installiert</span>
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

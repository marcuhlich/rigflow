import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Wifi, WifiOff, Bell, AlertCircle, Monitor, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PushService } from "@/lib/pushService";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useLatestRelease, formatFileSize } from "@/hooks/useLatestRelease";
import { isNative } from "@/services/platform";

export default function Install() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const { isMobile, isDesktop, os } = useDeviceDetection();
  const { release, loading, error } = useLatestRelease();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isRequestingNotification, setIsRequestingNotification] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (isNative()) navigate('/');
  }, [navigate]);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if ("Notification" in window) setNotificationPermission(Notification.permission);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => { await install(); };

  const handleRequestNotificationPermission = async () => {
    setIsRequestingNotification(true);
    try {
      const permission = await PushService.requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        await PushService.showNotification("RigFlow", {
          body: t('install.notification_welcome_body'),
          tag: "welcome",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRequestingNotification(false);
    }
  };

  const hasNotificationPermission = notificationPermission === "granted";

  const osLabel =
    os === "windows" ? t('install.os_windows') :
    os === "macos"   ? t('install.os_macos')   :
    os === "linux"   ? t('install.os_linux')   :
                       t('install.os_unknown');

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Monitor className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('install.desktop_title')}</CardTitle>
            <CardDescription>
              {t('install.desktop_subtitle', { osLabel })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">{t('install.online_download')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-muted-foreground">{t('install.offline_download')}</span>
                </>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t('install.checking_updates')}</span>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ) : release?.downloadUrl ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {t('install.version_label', { version: release.version })}
                    </span>
                    {release.fileSize && (
                      <span className="text-xs text-muted-foreground">{formatFileSize(release.fileSize)}</span>
                    )}
                  </div>
                  {release.fileName && (
                    <p className="text-xs text-muted-foreground truncate">{release.fileName}</p>
                  )}
                </div>
                <Button className="w-full" size="lg" onClick={() => window.open(release.downloadUrl!, "_blank")}>
                  <Download className="w-5 h-5 mr-2" />
                  {t('install.download_installer')}
                </Button>
              </div>
            ) : (
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">{t('install.no_installer')}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://github.com/marcuhlich/rigflow-desktop/releases", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('install.github_releases')}
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  const mobileFeatures = t('install.mobile_features', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('install.mobile_title')}</CardTitle>
          <CardDescription>{t('install.mobile_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">{t('install.online_full')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">{t('install.offline_limited')}</span>
              </>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">{t('install.installation_heading')}</h3>
            <ul className="space-y-2">
              {mobileFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-foreground">{t('settings.notifications')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t('install.notifications_description')}</p>

            {notificationPermission === "default" && (
              <Button
                size="sm"
                onClick={handleRequestNotificationPermission}
                disabled={isRequestingNotification}
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                {isRequestingNotification
                  ? t('install.notifications_activating')
                  : t('install.notifications_enable')}
              </Button>
            )}

            {hasNotificationPermission && (
              <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">{t('install.notifications_enabled')}</span>
              </div>
            )}

            {notificationPermission === "denied" && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{t('install.notifications_disabled')}</AlertDescription>
              </Alert>
            )}
          </div>

          {isInstalled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 text-green-500">
                <Check className="w-5 h-5" />
                <span className="font-medium text-sm">{t('install.already_installed')}</span>
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>{t('install.go_app')}</Button>
            </div>
          ) : canInstall ? (
            <Button className="w-full" size="lg" onClick={handleInstall}>
              <Download className="w-5 h-5 mr-2" />
              {t('install.button')}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-2">{t('install.browser_menu_hint')}</p>
                <p className="text-xs text-muted-foreground">
                  <strong>iOS:</strong> {t('install.ios_browser')}
                  <br />
                  <strong>Android:</strong> {t('install.android_browser')}
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                {t('install.continue_to_app')}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
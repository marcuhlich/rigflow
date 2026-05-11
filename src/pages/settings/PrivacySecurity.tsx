import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isNative } from '@/services/platform';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera } from '@capacitor/camera';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import {
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  LogOut,
  Smartphone,
  Camera as CameraIcon,
  MapPin,
  Bell,
  Download,
  Trash2,
  ChevronRight,
  ExternalLink,
  Loader2,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  LifeBuoy,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast, useToast } from "@/hooks/use-toast";
import { ANALYTICS_CONSENT_KEY } from "@/lib/constants";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import { useExportUserData } from "@/hooks/useExportUserData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  settingsHint: string;
  state: PermissionState | "unsupported";
}

// ─── Security Score ───────────────────────────────────────────────────────────

function useSecurityScore(hasMfa: boolean) {
  const { user } = useAuth();
  const [pushGranted, setPushGranted] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }
  }, []);

  const checks = [
    { label: "E-Mail bestätigt",        done: !!user?.email_confirmed_at },
    { label: "Passwort gesetzt",         done: true },
    { label: "2FA aktiviert",            done: hasMfa },
    { label: "Push-Benachrichtigungen",  done: pushGranted },
  ];

  const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return { score, checks };
}

function ScoreBadge({ score }: { score: number }) {
  const { color, Icon, label } =
    score >= 80
      ? { color: "text-primary border-primary/30 bg-primary/10", Icon: ShieldCheck, label: "Sicher" }
      : score >= 50
      ? { color: "text-accent border-accent/30 bg-accent/10", Icon: ShieldAlert, label: "Ausbaufähig" }
      : { color: "text-destructive border-destructive/30 bg-destructive/10", Icon: ShieldOff, label: "Schwach" };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
      <Icon className="h-6 w-6 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold">Sicherheits-Check: {score}%</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-current/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-current transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium shrink-0">{label}</span>
    </div>
  );
}

// ─── Recovery Codes Overlay ───────────────────────────────────────────────────

interface RecoveryCodesOverlayProps {
  codes: string[];
  onClose: () => void;
  isRegeneration?: boolean;
}

function RecoveryCodesOverlay({ codes, onClose, isRegeneration = false }: RecoveryCodesOverlayProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="glass-card w-full max-w-sm p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold">
              {isRegeneration ? "Neue Recovery-Codes" : "Recovery-Codes einrichten"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRegeneration
              ? "Deine alten Codes wurden ungültig. Speichere diese neuen Codes jetzt sicher."
              : "Diese Codes ermöglichen dir den Zugang, falls du keinen Zugriff mehr auf deine Authenticator-App hast."}
            {" "}<span className="text-foreground/70 font-medium">Sie werden nur jetzt angezeigt.</span>
          </p>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            Jeden Code kannst du <strong>nur einmal</strong> verwenden.
            Bewahre sie in einem Passwort-Manager auf.
          </p>
        </div>

        {/* Code grid with reveal toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">8 Recovery-Codes</span>
            <button
              onClick={() => setRevealed(!revealed)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {revealed ? "Verbergen" : "Anzeigen"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {codes.map((code, i) => (
              <div
                key={i}
                className="font-mono text-xs bg-muted/40 rounded-lg px-3 py-2.5 text-center tracking-widest border border-border/40 select-all transition-all duration-200"
              >
                {revealed ? code : "•••••-•••••"}
              </div>
            ))}
          </div>
        </div>

        {/* Copy all button */}
        <button
          onClick={copyAll}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border/50 text-sm hover:bg-muted/30 active:scale-[0.98] transition-all"
        >
          {copied
            ? <CheckCircle2 className="h-4 w-4 text-primary" />
            : <Copy className="h-4 w-4 text-muted-foreground" />
          }
          <span className={copied ? "text-primary" : "text-foreground"}>
            {copied ? "In Zwischenablage kopiert" : "Alle kopieren"}
          </span>
        </button>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="sr-only"
            />
            <div
              onClick={() => setSaved(!saved)}
              className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                saved
                  ? "bg-primary border-primary"
                  : "border-border group-hover:border-primary/50"
              }`}
            >
              {saved && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors">
            Ich habe alle 8 Codes an einem sicheren Ort gespeichert und verstehe, dass sie nur einmal angezeigt werden.
          </span>
        </label>

        <Button onClick={onClose} disabled={!saved} className="w-full gap-2">
          <ShieldCheck className="h-4 w-4" />
          Fertig – Codes gesichert
        </Button>
      </div>
    </div>,
    document.body!
  );
}

// ─── Recovery Codes Badge ─────────────────────────────────────────────────────

function RecoveryCodesBadge({ count }: { count: number | null }) {
  if (count === null) return null;

  const { color, bg, label } =
    count === 0
      ? { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Keine Codes" }
      : count <= 2
      ? { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: `Noch ${count}` }
      : { color: "text-primary", bg: "bg-primary/10 border-primary/20", label: `${count} verfügbar` };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${bg} ${color}`}>
      <LifeBuoy className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── 2FA + Recovery Section ───────────────────────────────────────────────────

function TwoFactorSection({ onStatusChange }: { onStatusChange: (v: boolean) => void }) {
  const { toast } = useToast();

  // 2FA state
  const [status, setStatus] = useState<"loading" | "disabled" | "enrolling" | "enabled">("loading");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Recovery codes state
  const [unusedCount, setUnusedCount] = useState<number | null>(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [overlayData, setOverlayData] = useState<{ codes: string[]; isRegen: boolean } | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // ── Fetch 2FA status ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setStatus("enabled");
        onStatusChange(true);
        fetchCodeCount();
      } else {
        setStatus("disabled");
        onStatusChange(false);
      }
    });
  }, []);

  // ── Recovery codes helpers ────────────────────────────────────────────────
  // Direkt fetch statt supabase.functions.invoke – umgeht SDK-Header-Probleme
  const invokeWithAuth = useCallback(async (action: string, extra?: object) => {
    const { data: { session } } = await supabase.auth.getSession();

    // Key direkt aus dem Client holen – funktioniert immer, egal welche Env-Vars gesetzt sind
    const supabaseUrl = (supabase as any).supabaseUrl as string;
    const supabaseKey = (supabase as any).supabaseKey as string;

    const res = await fetch(`${supabaseUrl}/functions/v1/mfa-recovery-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ action, ...extra }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const fetchCodeCount = useCallback(async () => {
    try {
      const data = await invokeWithAuth("count");
      if (data?.count !== undefined) setUnusedCount(data.count as number);
    } catch (e) {
      console.error("fetchCodeCount:", e);
    }
  }, [invokeWithAuth]);

  const generateCodes = useCallback(async (isRegen = false) => {
    setGeneratingCodes(true);
    try {
      const data = await invokeWithAuth("generate");
      if (!data?.codes) throw new Error("Keine Codes erhalten");
      setUnusedCount(data.codes.length);
      setOverlayData({ codes: data.codes as string[], isRegen });
      setConfirmRegen(false);
    } catch (e) {
      toast({ title: "Fehler beim Generieren", description: "Codes konnten nicht erstellt werden.", variant: "destructive" });
    } finally {
      setGeneratingCodes(false);
    }
  }, [invokeWithAuth, toast]);

  // ── Enroll 2FA ────────────────────────────────────────────────────────────
  const startEnroll = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "RigFlow",
    });
    if (error || !data) {
      toast({ title: "Fehler", description: error?.message, variant: "destructive" });
      return;
    }
    setFactorId(data.id);
    const uri = data.totp.uri;
    setQrUri(uri);
    const img = await QRCode.toDataURL(uri, { width: 180, margin: 1 });
    setQrImage(img);
    setStatus("enrolling");
  };

  // ── Verify TOTP → enable 2FA + auto-generate codes ───────────────────────
  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
    if (!challenge) { setVerifying(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setVerifying(false);
    if (error) {
      toast({ title: "Falscher Code", description: "Bitte erneut versuchen.", variant: "destructive" });
    } else {
      setStatus("enabled");
      onStatusChange(true);
      toast({ title: "2FA aktiviert", description: "Recovery-Codes werden jetzt generiert…" });
      // Auto-generate recovery codes on first enable
      await generateCodes(false);
    }
  };

  // ── Disable 2FA ───────────────────────────────────────────────────────────
  const disable = async () => {
    if (!factorId) return;
    setDisabling(true);
    
    // Prüfen ob wir AAL2 haben
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aal?.currentLevel === "aal2") {
        // Normal unenroll
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        setDisabling(false);
        if (error) {
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } else {
        setFactorId(null);
        setStatus("disabled");
        setUnusedCount(null);
        onStatusChange(false);
        toast({ title: "2FA deaktiviert" });
        }
    } else {
        // AAL1 (nach Recovery-Login) → über Edge Function
        try {
        const currentFactorId = factorId;
        const data = await invokeWithAuth("unenroll", { factorId: currentFactorId });
        setDisabling(false);
        if (data?.success) {
            setFactorId(null);
            setStatus("disabled");
            setUnusedCount(null);
            onStatusChange(false);
            toast({ title: "2FA deaktiviert", description: "Du kannst 2FA jetzt neu einrichten." });
        }
        } catch {
        setDisabling(false);
        toast({ title: "Fehler", description: "Deaktivierung fehlgeschlagen.", variant: "destructive" });
        }
    }
    };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Recovery Codes Overlay */}
      {overlayData && (
        <RecoveryCodesOverlay
          codes={overlayData.codes}
          isRegeneration={overlayData.isRegen}
          onClose={() => setOverlayData(null)}
        />
      )}

      <div className="space-y-4">

        {/* 2FA Status Row */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${status === "enabled" ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Zwei-Faktor-Authentifizierung</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Schützt dein Konto mit einem zweiten Faktor per Authenticator-App (z.B. Google Authenticator).
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${status === "enabled" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {status === "enabled" ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        {/* Disabled state */}
        {status === "disabled" && (
          <Button size="sm" variant="outline" className="w-full" onClick={startEnroll}>
            2FA einrichten
          </Button>
        )}

        {/* Enrolling state */}
        {status === "enrolling" && (
          <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scanne den QR-Code mit deiner Authenticator-App, dann gib den 6-stelligen Code ein.
            </p>
            {qrImage && (
              <div className="flex justify-center">
                <img
                  src={qrImage}
                  alt="2FA QR Code"
                  className="rounded-lg border border-border/50"
                  width={180}
                  height={180}
                />
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 glass-input h-9 text-sm text-center tracking-[0.4em] font-mono"
              />
              <Button
                size="sm"
                onClick={verify}
                disabled={verifying || code.length !== 6}
                className="shrink-0"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setStatus("disabled")}
            >
              Abbrechen
            </Button>
          </div>
        )}

        {/* Enabled state with recovery codes */}
        {status === "enabled" && (
          <div className="space-y-3">

            {/* Recovery Codes Card */}
            <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Recovery-Codes</span>
                </div>
                <RecoveryCodesBadge count={unusedCount} />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {unusedCount === 0
                  ? "Du hast keine Codes mehr. Generiere neue, bevor du dein Gerät verlierst."
                  : unusedCount !== null && unusedCount <= 2
                  ? "Nur noch wenige Codes übrig – bald neue generieren."
                  : "Einmalcodes für den Notfallzugang, falls deine Authenticator-App nicht verfügbar ist."}
              </p>

              {/* Confirm regeneration or just show button */}
              {confirmRegen ? (
                <div className="space-y-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      Alle bisherigen Recovery-Codes werden <strong>sofort ungültig</strong>.
                      Stelle sicher, dass du danach die neuen Codes speicherst.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
                      onClick={() => setConfirmRegen(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => generateCodes(true)}
                      disabled={generatingCodes}
                    >
                      {generatingCodes
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />
                      }
                      Ja, neu generieren
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRegen(true)}
                  disabled={generatingCodes}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Neue Codes generieren
                </button>
              )}
            </div>

            {/* Disable 2FA */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={disable}
              disabled={disabling}
            >
              {disabling
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <XCircle className="h-4 w-4 mr-2" />
              }
              2FA deaktivieren
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Permissions Dashboard ────────────────────────────────────────────────────

function PermissionsDashboard() {
  const [perms, setPerms] = useState<Permission[]>([
    {
      key: 'camera',
      label: 'Kamera',
      description: 'Für QR-Code-Scanner und Foto-Upload',
      icon: <CameraIcon className="h-4 w-4" />,
      settingsHint: 'Einstellungen → Apps → RigFlow → Berechtigungen',
      state: 'unsupported',
    },
    {
      key: 'notifications',
      label: 'Benachrichtigungen',
      description: 'Für Ausleih-Erinnerungen und Hinweise',
      icon: <Bell className="h-4 w-4" />,
      settingsHint: 'Einstellungen → Apps → RigFlow → Benachrichtigungen',
      state: 'unsupported',
    },
  ]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (isNative()) {
          // ── Native: Capacitor APIs ──
          const [notif, cam] = await Promise.all([
            LocalNotifications.checkPermissions().catch(() => ({ display: 'unsupported' })),
            Camera.checkPermissions().catch(() => ({ camera: 'unsupported' })),
          ]);

          const mapCapacitor = (s: string): Permission['state'] => {
            if (s === 'granted') return 'granted';
            if (s === 'denied') return 'denied';
            if (s === 'prompt' || s === 'prompt-with-rationale') return 'prompt';
            return 'unsupported';
          };

          setPerms(prev => prev.map(p => {
            if (p.key === 'notifications') return { ...p, state: mapCapacitor((notif as any).display) };
            if (p.key === 'camera')        return { ...p, state: mapCapacitor((cam as any).camera) };
            return p;
          }));
        } else {
          // ── Web: Browser Permissions API ──
          const notifState: Permission['state'] =
            'Notification' in window
              ? (Notification.permission as PermissionState)
              : 'unsupported';

          const camState = await navigator.permissions
            .query({ name: 'camera' as PermissionName })
            .then(r => r.state)
            .catch((): Permission['state'] => 'unsupported');

          setPerms(prev => prev.map(p => {
            if (p.key === 'notifications') return { ...p, state: notifState };
            if (p.key === 'camera')        return { ...p, state: camState };
            return p;
          }));
        }
      } catch (e) {
        console.error('Permission check error:', e);
      }
    };

    checkPermissions();
  }, []);

  const stateLabel = (s: Permission['state']) => {
    if (s === 'granted')     return { text: 'Erlaubt',        color: 'text-primary' };
    if (s === 'denied')      return { text: 'Blockiert',      color: 'text-destructive' };
    if (s === 'prompt')      return { text: 'Nicht gefragt',  color: 'text-muted-foreground' };
    return                          { text: 'Nicht verfügbar', color: 'text-muted-foreground' };
  };

  const openPermissionSettings = async () => {
    if (isNative()) {
      // Android → direkt zu den App-Einstellungen
      await NativeSettings.openAndroid({
        option: AndroidSettings.ApplicationDetails,
      });
      return;
    }

    // Electron Desktop App erkennen
    const isElectron = /Electron/.test(navigator.userAgent);
    const isWindows = /Windows/.test(navigator.userAgent);
    const isMac = /Macintosh|Mac OS X/.test(navigator.userAgent);

    if (isElectron) {
      // ── Electron Desktop App ──────────────────────────────────────────────
      if (isWindows) {
        // Windows: Datenschutz-Einstellungen (Kamera / Mikro / Standort)
        window.open("ms-settings:privacy-webcam");
      } else if (isMac) {
        // macOS: Systemeinstellungen → Datenschutz & Sicherheit
        window.open("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera");
      } else {
        // Linux: kein Standard-URI-Schema vorhanden
        toast({
          title: "Berechtigungen verwalten",
          description: "Öffne deine Systemeinstellungen und suche nach 'Datenschutz' oder 'Anwendungsberechtigungen'.",
        });
      }
      return;
    }

    // Web – Browser Permissions API
    const ua = navigator.userAgent;
    const isAndroid = /Android/.test(ua);
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
                   (navigator as any).standalone === true;

    if (isAndroid && isPWA) {
      toast({ title: "Berechtigungen verwalten", description: "Öffne Einstellungen → Apps → RigFlow → Berechtigungen.", duration: 6000 });
    } else if (isAndroid) {
      toast({ title: "Berechtigungen verwalten", description: "Tippe auf das Schloss-Symbol in der Adressleiste → Website-Einstellungen.", duration: 6000 });
    } else if (isIOS) {
      toast({ title: "Berechtigungen verwalten", description: "Öffne Einstellungen → Datenschutz & Sicherheit.", duration: 6000 });
    } else {
      toast({ title: "Berechtigungen verwalten", description: "Klicke auf das Schloss-Symbol in der Adressleiste.", duration: 6000 });
    }
  };

  return (
    <div className="divide-y divide-border/50">
      {perms.map((p) => {
        const { text, color } = stateLabel(p.state);
        return (
          <div key={p.key} className="flex items-center gap-3 py-3.5">
            <div className={`p-2 rounded-lg shrink-0 ${p.state === 'granted' ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
            <span className={`text-xs font-medium shrink-0 ${color}`}>{text}</span>
          </div>
        );
      })}
      <div className="pt-3">
        <button
          onClick={openPermissionSettings}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {isNative() ? 'App-Einstellungen öffnen' : 'Systemeinstellungen öffnen'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrivacySecurity() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasMfa, setHasMfa] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const { score, checks } = useSecurityScore(hasMfa);
  const { exportData, isExporting } = useExportUserData();

  useEffect(() => {
    const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    setAnalyticsEnabled(consent === 'true');
  }, []);

  const toggleAnalytics = () => {
    const posthog = (window as any).posthog;
    if (!posthog) return;

    const newState = !analyticsEnabled;
    setAnalyticsEnabled(newState);
    localStorage.setItem(ANALYTICS_CONSENT_KEY, newState ? 'true' : 'false');

    if (newState) {
      posthog.opt_in_capturing();
      toast({ title: "Analytics aktiviert", description: "Deine Daten helfen uns, die App zu verbessern." });
    } else {
      posthog.opt_out_capturing();
      toast({ title: "Analytics deaktiviert", description: "Wir erfassen keine Daten mehr über deine Nutzung." });
    }
  };

  const handleRemoteLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      setLoggingOut(false);
    } else {
      toast({ title: "Überall abgemeldet" });
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Security Score */}
        <div className="glass-card p-4 space-y-3">
          <ScoreBadge score={score} />
          <div className="space-y-1.5 pt-1">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                {c.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <span className={`text-xs ${c.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2FA + Recovery */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Authentifizierung
          </p>
          <TwoFactorSection onStatusChange={setHasMfa} />
        </div>

        {/* Permissions */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            App-Berechtigungen
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Worauf RigFlow auf diesem Gerät zugreift.
          </p>
          <PermissionsDashboard />
        </div>

        {/* Session */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sitzung
          </p>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground shrink-0 mt-0.5">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Überall abmelden</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Beendet alle aktiven Sitzungen auf allen Geräten – auch dieses hier.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleRemoteLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <LogOut className="h-4 w-4" />
            }
            Auf allen Geräten abmelden
          </Button>
        </div>

        {/* Data */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Meine Daten
          </p>

          {/* Analytics Toggle */}
          <div className="flex items-start gap-3 py-2">
            <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground shrink-0 mt-0.5">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Analytics</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Hilf uns durch anonyme Nutzungsdaten, die App zu verbessern.
              </p>
            </div>
            <button
              onClick={toggleAnalytics}
              className={`w-10 h-6 rounded-full transition-all shrink-0 mt-0.5 ${
                analyticsEnabled
                  ? 'bg-primary'
                  : 'bg-muted border border-border/50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  analyticsEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={exportData}
            disabled={isExporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting
              ? <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
              : <Download className="h-4 w-4 text-primary shrink-0" />
            }
            <div className="flex-1">
              <p className="text-sm font-medium">Daten exportieren</p>
              <p className="text-xs text-muted-foreground">
                {isExporting ? "Wird vorbereitet…" : "Inventar, Events und Logs als JSON-Datei"}
              </p>
            </div>
            {!isExporting && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>

          <Link
            to="/settings"
            state={{ openDeleteDialog: true }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Konto löschen</p>
              <p className="text-xs text-muted-foreground">Permanent – kann nicht rückgängig gemacht werden</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-destructive/60 shrink-0" />
          </Link>
        </div>

      </div>
    </div>
  );
}
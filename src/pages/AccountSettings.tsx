import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogOut,
  Trash2,
  User,
  AlertTriangle,
  Loader2,
  Zap,
  Download,
  Settings,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  FileText,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isDemoAccount = user?.email === "demo@rigflow.app";

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Benutzer";

  const memberSince = new Date(user?.created_at || "").toLocaleDateString(
    "de-DE",
    { year: "numeric", month: "long" }
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({ title: "Abgemeldet", description: "Du wurdest erfolgreich abgemeldet." });
      navigate("/auth");
    } catch {
      toast({ title: "Fehler", description: "Abmeldung fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

const location = useLocation();

useEffect(() => {
  if (location.state?.openDeleteDialog) {
    setShowDeleteDialog(true);
  }
}, [location.state]);

const handleDeleteAccount = async () => {
  if (deleteConfirmEmail !== user?.email) {
    toast({
      title: "E-Mail stimmt nicht überein",
      description: "Bitte gib deine korrekte E-Mail-Adresse ein.",
      variant: "destructive",
    });
    return;
  }

  setIsDeleting(true);

  try {
    const { data, error } = await supabase.functions.invoke("delete-account");

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Sofortiger Logout nach erfolgreicher Löschung
    await signOut();

    toast({
      title: "Konto gelöscht",
      description: "Dein Konto wurde permanent gelöscht.",
    });

    // replace verhindert "zurück"-Navigation
    navigate("/auth", { replace: true });

  } catch (error) {
    toast({
      title: "Fehler",
      description:
        error instanceof Error
          ? error.message
          : "Konto konnte nicht gelöscht werden",
      variant: "destructive",
    });
  } finally {
    setIsDeleting(false);
    setShowDeleteDialog(false);
    setDeleteConfirmEmail("");
  }
};

  return (
    <div className="space-y-4 pb-20">

      {/* ── Profile Header ── */}
      <div className="flex flex-col items-center pt-6 pb-2 gap-3">
        {/* Avatar Circle */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
            style={{ background: "hsl(var(--primary))" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* ── Nav Menu Items ── */}
      <Card className="glass-card overflow-hidden p-0">
        {[
          { icon: Settings, label: "Kontoinformationen", to: "/settings/account-info" },
          { icon: Bell, label: "Benachrichtigungen", to: "/settings/notifications" },
          { icon: Shield, label: "Datenschutz & Sicherheit", to: "/settings/privacy-security" },
          {
            icon: Palette,
            label: "Erscheinungsbild",
            to: null,
            trailing: (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
                <Sun className="h-3.5 w-3.5" />
              </span>
            ),
          },
        ].map((item, idx, arr) => (
            <div key={item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </Link>
              ) : (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                  onClick={() =>
                    toast({ title: item.label, description: "Diese Funktion kommt bald." })
                  }
                >
                  <item.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              )}
              {idx < arr.length - 1 && <div className="h-px bg-border/50 mx-4" />}
            </div>
          ))}
      </Card>

      {/* ── General Settings Info Box ── */}
      <Card className="glass-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Allgemein
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Mitglied seit: <span className="text-foreground font-medium">{memberSince}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Konto-ID: <span className="text-foreground font-mono text-xs">{user?.id?.slice(0, 8)}…</span>
          </p>
        </div>
      </Card>

      {/* ── Support & Legal ── */}
      <Card className="glass-card overflow-hidden p-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
          Support & Rechtliches
        </p>
        {[
          { icon: FileText, label: "Nutzungsbedingungen", to: null },
          { icon: FileText, label: "Anleitung öffnen", to: "/help" },
          { icon: FileText, label: "Informationen zur App", to: "https://github.com/marcuhlich/rigflow", external: true },
        ].map((item, idx, arr) => (
          <div key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-primary">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ) : (
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                onClick={() =>
                  toast({ title: item.label, description: "Diese Funktion kommt bald." })
                }
              >
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-primary">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {idx < arr.length - 1 && <div className="h-px bg-border/50 mx-4" />}
          </div>
        ))}
      </Card>

      {/* ── App installieren ── */}
      <Card className="glass-card overflow-hidden p-0">
        <Link
          to="/install"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <Download className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 text-sm font-medium">App installieren</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Card>

      {/* ── Abmelden ── */}
      <Card className="glass-card overflow-hidden p-0">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 text-sm font-medium">
            {isLoggingOut ? "Wird abgemeldet…" : "Abmelden"}
          </span>
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </Card>

      {/* ── Danger Zone ── */}
      {isDemoAccount ? (
        <Card className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Demo-Konto
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Dieses Konto steht anderen Nutzern als Testaccount zur Verfügung und kann nicht gelöscht werden.
          </p>
          <Button disabled variant="ghost" className="w-full gap-2 opacity-40">
            <Trash2 className="h-4 w-4" />
            Konto löschen (nicht verfügbar)
          </Button>
        </Card>
      ) : (
        <Card className="glass-card p-4 border-destructive/30 bg-destructive/5">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Gefahrenzone
          </p>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Konto löschen
          </Button>
        </Card>
      )}

      {/* ── Delete Dialog ── */}
      {!isDemoAccount && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Konto wirklich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 mt-4">
                  <p>
                    Diese Aktion löscht dein Konto und <strong>alle deine Daten</strong> permanent:
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
                    <li>Alle Inventar-Items</li>
                    <li>Alle Event-Checklisten</li>
                    <li>Alle DMX-Konfigurationen</li>
                    <li>Alle Audit-Logs</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Dies kann <strong>nicht rückgängig gemacht</strong> werden.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-email" className="text-sm font-medium">
                      E-Mail zur Bestätigung eingeben:
                    </Label>
                    <Input
                      id="confirm-email"
                      type="email"
                      placeholder="deine@email.com"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      className="glass-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      E-Mail: <span className="font-mono text-foreground">{user?.email}</span>
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmEmail !== user?.email}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird gelöscht…
                  </>
                ) : (
                  "Ja, löschen"
                )}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
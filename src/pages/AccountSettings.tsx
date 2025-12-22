import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { LogOut, Trash2, User, Mail, AlertTriangle, Loader2, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Debug: Log SW state on mount (hilfreich beim Debuggen)
  useEffect(() => {
    const checkSWState = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('[Settings] SW State:', {
            active: registration.active?.state,
            waiting: registration.waiting?.state,
            installing: registration.installing?.state,
            hasController: !!navigator.serviceWorker.controller,
          });
        }
      }
    };
    checkSWState();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: "Abgemeldet",
        description: "Du wurdest erfolgreich abgemeldet.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

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
      // Delete user data from profiles
      await supabase.from("profiles").delete().eq("user_id", user?.id);

      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user?.id || "");

      if (error) throw error;

      toast({
        title: "Konto gelöscht",
        description: "Dein Konto wurde permanent gelöscht.",
      });

      navigate("/auth");
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Konto konnte nicht gelöscht werden",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmEmail("");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
        <p className="text-muted-foreground text-sm mt-1">Verwalte dein Konto</p>
      </div>

      {/* Account Info */}
      <Card className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Kontoinformationen
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">E-Mail</Label>
              <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Benutzername</Label>
              <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.display_name || "Nicht gesetzt"}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Registriert seit</Label>
              <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium">
                  {new Date(user?.created_at || "").toLocaleDateString("de-DE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Card className="glass-card p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Abmelden
          </h3>
          <p className="text-sm text-muted-foreground">
            Melde dich von diesem Gerät ab. Du kannst dich jederzeit wieder anmelden.
          </p>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            className="w-full gap-2"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird abgemeldet...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Jetzt abmelden
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="glass-card p-6 border-destructive/30 bg-destructive/5">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Gefahrenzone
          </h3>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden.
              Alle deine Daten werden permanent gelöscht.
            </p>
          </div>

          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Konto löschen
          </Button>
        </div>
      </Card>

      {/* Delete Account Dialog */}
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
                  Diese Aktion wird dein Konto und <strong>alle deine Daten</strong> permanent löschen:
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
                    Gib deine E-Mail ein um zu bestätigen:
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
            <AlertDialogCancel disabled={isDeleting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmEmail !== user?.email}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Wird gelöscht...
                </>
              ) : (
                "Ja, löschen"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
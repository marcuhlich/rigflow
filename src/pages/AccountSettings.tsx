import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isNative } from "@/services/platform";
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
  LogOut, Trash2, Info, AlertTriangle, Loader2, Zap,
  Download, Settings, Bell, Shield, Palette, ChevronRight,
  FileText, Moon, Sun, Gavel, LockKeyhole, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isDemoAccount = user?.email === "demo@rigflow.app";

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    t("user_menu.default_name");

  const memberSince = new Date(user?.created_at || "").toLocaleDateString(
    i18n.language.startsWith("de") ? "de-DE" : "en-US",
    { year: "numeric", month: "long" }
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: t("user_menu.logout_success_title"),
        description: t("user_menu.logout_success_description"),
      });
      navigate("/auth");
    } catch {
      toast({
        title: t("common.error"),
        description: t("user_menu.logout_error"),
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openDeleteDialog === true) {
      setShowDeleteDialog(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      toast({
        title: t("account.email_mismatch_title"),
        description: t("account.email_mismatch_description"),
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await signOut();

      toast({
        title: t("account.deleted_title"),
        description: t("account.deleted_description"),
      });

      navigate("/auth", { replace: true });

    } catch {
      toast({
        title: t("common.error"),
        description: t("account.delete_error_description"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmEmail("");
    }
  };

  const navMenuItems = [
    { icon: Settings,    label: t("settings.account_info"), to: "/settings/account-info"     },
    { icon: Bell,        label: t("settings.notifications"), to: "/settings/notifications"   },
    { icon: LockKeyhole, label: t("settings.privacy"),      to: "/settings/privacy-security" },
    {
      icon: Palette,
      label: t("settings.appearance"),
      to: "/settings/appearance",
      trailing: (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Moon className="h-3.5 w-3.5" />
          <Sun className="h-3.5 w-3.5" />
        </span>
      ),
    },
  ];

  const legalItems = [
    { icon: Info,     label: t("settings.about_rigflow"),       to: "/settings/about"       },
    { icon: FileText, label: t("settings.imprint_link"),         to: "/impressum"            },
    { icon: Shield,   label: t("settings.privacy_policy_link"), to: "/datenschutz"          },
    { icon: Gavel,    label: t("settings.terms_link"),           to: "/nutzungsbedingungen"  },
  ];

  return (
    <div className="space-y-4 pb-20">

      {/* ── Profile Header ── */}
      <div className="flex items-center gap-4 px-6 py-5 md:flex-col md:items-center md:gap-3 md:pt-6 md:pb-2 md:px-0 md:py-0">
        <div className="relative shrink-0">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
            style={{ background: "hsl(var(--primary))" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex flex-col justify-center min-w-0 md:text-center">
          <h2 className="text-xl font-bold tracking-tight truncate">{displayName}</h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* ── Nav Menu Items (mobile) ── */}
      <Card className="glass-card overflow-hidden p-0 lg:hidden">
        {navMenuItems.map((item, idx, arr) => (
          <div key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <item.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Link>
            {idx < arr.length - 1 && <div className="h-px bg-border/50 mx-4" />}
          </div>
        ))}
      </Card>

      {/* ── General info (desktop) ── */}
      <Card className="hidden md:block glass-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("settings.general")}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {t("account.member_since_label")}{" "}
            <span className="text-foreground font-medium">{memberSince}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("account.account_id_label")}{" "}
            <span className="text-foreground font-mono text-xs">{user?.id?.slice(0, 8)}…</span>
          </p>
        </div>
      </Card>

      {/* ── Wunschliste ── */}
      <Card className="glass-card overflow-hidden p-0 border-primary/25 bg-primary/5 active:scale-95 transition-all">
        <Link
          to="/settings/wunschliste"
          className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block">{t("account.wishlist_title")}</span>
            <span className="text-xs text-muted-foreground">{t("account.wishlist_description")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </Card>

      {/* ── Support & Legal (mobile) ── */}
      <Card className="glass-card overflow-hidden p-0 lg:hidden">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
          {t("account.support_legal")}
        </p>
        {legalItems.map((item, idx, arr) => (
          <div key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <item.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="flex-1 text-sm font-medium text-primary">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            {idx < arr.length - 1 && <div className="h-px bg-border/50 mx-4" />}
          </div>
        ))}
      </Card>

      {/* ── App installieren ── */}
      {!isNative() && (
        <Card className="glass-card overflow-hidden p-0">
          <Link
            to="/install"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
          >
            <Download className="h-5 w-5 text-primary shrink-0" />
            <span className="flex-1 text-sm font-medium">{t("account.install_app")}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Card>
      )}

      {/* ── Abmelden (mobile) ── */}
      <Card className="glass-card overflow-hidden p-0 lg:hidden">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 text-sm font-medium">
            {isLoggingOut ? t("account.logging_out") : t("auth.logout")}
          </span>
          {isLoggingOut
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </Card>

      {/* ── Danger Zone ── */}
      {isDemoAccount ? (
        <Card className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> {t("demo.badge")}
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            {t("account.demo_cannot_delete")}
          </p>
          <Button disabled variant="ghost" className="w-full gap-2 opacity-40">
            <Trash2 className="h-4 w-4" />
            {t("account.delete_unavailable")}
          </Button>
        </Card>
      ) : (
        <Card className="glass-card p-4 border-destructive/30 bg-destructive/5">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("account.danger_zone")}
          </p>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("account.delete_account")}
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
                {t("account.confirm_delete_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 mt-4">
                  <p>{t("account.confirm_delete_intro")}</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
                    <li>{t("account.delete_data_inventory")}</li>
                    <li>{t("account.delete_data_checklists")}</li>
                    <li>{t("account.delete_data_dmx")}</li>
                    <li>{t("account.delete_data_audit")}</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {t("account.confirm_delete_warning")}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-email" className="text-sm font-medium">
                      {t("account.confirm_email_label")}
                    </Label>
                    <Input
                      id="confirm-email"
                      type="email"
                      placeholder={t("account.confirm_email_placeholder")}
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={() => setDeleteConfirmEmail("")}
              >
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmEmail !== user?.email}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("account.deleting")}
                  </>
                ) : (
                  t("account.confirm_delete_button")
                )}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
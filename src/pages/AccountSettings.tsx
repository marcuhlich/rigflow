import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, FileText, Gavel, HelpCircle, Lightbulb, Loader2, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { SettingsMobileNav } from "@/components/layout/SettingsLayout";
import { SettingsLinkRow, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { isNative } from "@/services/platform";

const DEMO_EMAIL = "demo@rigflow.app";

const LEGAL_LINKS = [
  { to: "/help", labelKey: "settings.help_link", icon: HelpCircle },
  { to: "/impressum", labelKey: "settings.imprint_link", icon: FileText },
  { to: "/datenschutz", labelKey: "settings.privacy_policy_link", icon: Shield },
  { to: "/nutzungsbedingungen", labelKey: "settings.terms_link", icon: Gavel },
];

interface LocationState {
  openDeleteDialog?: boolean;
}

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isDemoAccount = user?.email === DEMO_EMAIL;
  const displayName: string =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || t("user_menu.default_name");

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const memberSince =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString(i18n.language.startsWith("de") ? "de-DE" : "en-US", {
          year: "numeric",
          month: "long",
        })
      : "—";

  // Other pages (e.g. Privacy & Security) can deep-link into the delete dialog.
  const openDeleteFromState = (location.state as LocationState | null)?.openDeleteDialog === true;
  useEffect(() => {
    if (!openDeleteFromState) return;
    setShowDeleteDialog(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [openDeleteFromState, navigate, location.pathname]);

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
      setIsLoggingOut(false);
      toast({ title: t("common.error"), description: t("user_menu.logout_error"), variant: "destructive" });
    }
  };

  return (
    <SettingsPage>
      <PageHeader
        title={
          <>
            <span className="lg:hidden">{t("settings.title")}</span>
            <span className="hidden lg:inline">{t("settings.general")}</span>
          </>
        }
      />

      {/* Profile */}
      <section className="surface divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-base font-semibold text-foreground"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-[13px] text-muted-foreground">{user?.email}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings/account-info">{t("common.edit")}</Link>
          </Button>
        </div>
        <SettingsRow
          label={t("settings.member_since")}
          control={<span className="text-[13px] text-muted-foreground">{memberSince}</span>}
        />
        <SettingsRow
          label={t("settings.account_id")}
          control={
            <span className="tech text-[13px] text-muted-foreground" title={user?.id}>
              {user?.id ? `${user.id.slice(0, 8)}…` : "—"}
            </span>
          }
        />
      </section>

      {/* Mobile: section index */}
      <SettingsMobileNav />

      <SettingsSection title={t("nav.more")}>
        <SettingsLinkRow
          to="/settings/wunschliste"
          icon={Lightbulb}
          label={t("account.wishlist_title")}
          description={t("account.wishlist_description")}
        />
        {!isNative() && <SettingsLinkRow to="/install" icon={Download} label={t("account.install_app")} />}
      </SettingsSection>

      {/* Mobile: support & legal (desktop shows these in the section nav footer) */}
      <SettingsSection title={t("account.support_legal")} className="lg:hidden">
        {LEGAL_LINKS.map(({ to, labelKey, icon }) => (
          <SettingsLinkRow key={to} to={to} icon={icon} label={t(labelKey)} />
        ))}
      </SettingsSection>

      {/* Mobile: sign out (desktop has it in the section nav) */}
      <Button
        variant="outline"
        className="w-full lg:hidden"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
        {isLoggingOut ? t("account.logging_out") : t("auth.logout")}
      </Button>

      {/* Danger zone */}
      <SettingsSection title={t("account.danger_zone")} tone="danger">
        <SettingsRow
          stack
          label={t("account.delete_account")}
          description={isDemoAccount ? t("account.demo_cannot_delete") : t("privacy.data.delete_description")}
          control={
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
              disabled={isDemoAccount}
              onClick={() => setShowDeleteDialog(true)}
            >
              {t("account.delete_account")}
            </Button>
          }
        />
      </SettingsSection>

      {!isDemoAccount && <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />}
    </SettingsPage>
  );
}

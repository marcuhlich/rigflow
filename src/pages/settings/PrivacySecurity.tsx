import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useExportUserData } from "@/hooks/useExportUserData";
import { hasAnalyticsConsent, setAnalyticsConsent } from "@/lib/consentUtils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { SecurityScore } from "@/components/settings/privacy/SecurityScore";
import { TwoFactorSection } from "@/components/settings/privacy/TwoFactorSection";
import { PermissionsSection } from "@/components/settings/privacy/PermissionsSection";

const DEMO_EMAIL = "demo@rigflow.app";

export default function PrivacySecurity() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { exportData, isExporting } = useExportUserData();

  const [hasMfa, setHasMfa] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(hasAnalyticsConsent);
  const [showDelete, setShowDelete] = useState(false);

  const isDemoAccount = user?.email === DEMO_EMAIL;

  const toggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    try {
      setAnalyticsConsent(enabled);
    } catch (e) {
      // Consent is persisted before PostHog is touched; a tracking error must not break the toggle.
      console.error("analytics consent:", e);
    }
    toast(
      enabled
        ? { title: t("privacy.data.analytics_enabled_title"), description: t("privacy.data.analytics_enabled_description") }
        : { title: t("privacy.data.analytics_disabled_title"), description: t("privacy.data.analytics_disabled_description") }
    );
  };

  const handleRemoteLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setLoggingOut(false);
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("privacy.session.toast_logout_success") });
    navigate("/auth", { replace: true });
  };

  return (
    <SettingsPage>
      <PageHeader title={t("settings.privacy")} />

      <SecurityScore hasMfa={hasMfa} />

      <TwoFactorSection onStatusChange={setHasMfa} />

      <PermissionsSection />

      <SettingsSection title={t("privacy.session.section_title")}>
        <SettingsRow
          stack
          label={t("privacy.session.logout_all_title")}
          description={t("privacy.session.logout_all_description")}
          control={
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => void handleRemoteLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              {t("privacy.session.logout_all_button")}
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("privacy.data.section_title")}>
        <SettingsRow
          htmlFor="analytics-consent"
          label={t("privacy.data.analytics_title")}
          description={t("privacy.data.analytics_description")}
          control={<Switch id="analytics-consent" checked={analyticsEnabled} onCheckedChange={toggleAnalytics} />}
        />
        <SettingsRow
          stack
          label={t("privacy.data.export_title")}
          description={isExporting ? t("privacy.data.export_loading") : t("privacy.data.export_description")}
          control={
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => void exportData()}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
              {t("common.export")}
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("account.danger_zone")} tone="danger">
        <SettingsRow
          stack
          label={t("privacy.data.delete_title")}
          description={isDemoAccount ? t("account.demo_cannot_delete") : t("privacy.data.delete_description")}
          control={
            <Button
              variant="outline"
              size="sm"
              disabled={isDemoAccount}
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
              onClick={() => setShowDelete(true)}
            >
              {t("account.delete_account")}
            </Button>
          }
        />
      </SettingsSection>

      {!isDemoAccount && <DeleteAccountDialog open={showDelete} onOpenChange={setShowDelete} />}
    </SettingsPage>
  );
}

import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { SettingsPage, SettingsSection } from "@/components/settings/SettingsSection";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { PasswordChangeRow } from "@/components/settings/PasswordChangeRow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AccountInfo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const displayName: string = user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? "";
  const email = user?.email ?? "";
  const pendingEmail = user?.new_email ?? null;

  const saveName = async (value: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: value } });
    if (error) return error.message;
    toast({ title: t("account_info.toast.name_saved") });
    return null;
  };

  const saveEmail = async (value: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: value });
    if (error) return error.message;
    toast({
      title: t("account_info.toast.email_confirm_title"),
      description: t("account_info.toast.email_confirm_desc", { email: value }),
    });
    return null;
  };

  const emailHint = pendingEmail ? (
    <span className="inline-flex flex-wrap items-center gap-1 text-xs text-warning">
      <Clock className="h-3 w-3 shrink-0" />
      {t("account_info.pending_hint")}
      <span className="font-medium">{pendingEmail}</span>
    </span>
  ) : null;

  return (
    <SettingsPage>
      <PageHeader title={t("settings.account_info")} />

      <SettingsSection title={t("account_info.personal_data")}>
        <InlineEditRow
          id="account-name"
          label={t("fields.name")}
          value={displayName}
          autoComplete="name"
          validate={(v) => (v.trim().length < 2 ? t("account_info.validate.name_too_short") : null)}
          onSave={saveName}
        />
        <InlineEditRow
          id="account-email"
          label={t("account_info.email_label")}
          value={email}
          type="email"
          autoComplete="email"
          validate={(v) => (EMAIL_RE.test(v) ? null : t("auth.errors.invalid_email"))}
          onSave={saveEmail}
          hint={emailHint}
        />
      </SettingsSection>

      <SettingsSection title={t("account_info.security_title")}>
        <PasswordChangeRow />
      </SettingsSection>
    </SettingsPage>
  );
};

export default AccountInfo;

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { AuthStatus, Field, FormError } from "@/components/auth/FormFields";

const EMAIL_RE = /\S+@\S+\.\S+/;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setFormError(null);
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setFieldError(t("auth.errors.invalid_email"));
      return;
    }
    setFieldError(undefined);

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (!mounted.current) return;
      if (error) setFormError(t("auth.reset_email_error"));
      else setSent(true);
    } catch {
      if (mounted.current) setFormError(t("auth.reset_email_error"));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  return (
    <AuthShell back={{ to: "/auth", label: t("auth.back_to_login") }}>
      {sent ? (
        <AuthStatus
          icon={<MailCheck className="h-[18px] w-[18px] text-success" strokeWidth={1.75} />}
          title={t("auth.reset_email_sent_title")}
          description={t("auth.reset_email_sent_description", { email: email.trim() })}
        >
          <Button variant="outline" className="w-full" asChild>
            <Link to="/auth">{t("auth.back_to_login")}</Link>
          </Button>
        </AuthStatus>
      ) : (
        <>
          <AuthHeading title={t("auth.forgot_password_title")} description={t("auth.forgot_password_description")} />
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormError>{formError}</FormError>
            <Field id="email" label={t("auth.email")} error={fieldError}>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("auth.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? "email-error" : undefined}
                disabled={isLoading}
                autoFocus
              />
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              {isLoading ? t("auth.sending") : t("auth.send_reset_link")}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;

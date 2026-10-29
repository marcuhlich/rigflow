import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/services/platform";
import { AuthHeading } from "./AuthShell";
import { Field, FormError, PasswordInput } from "./FormFields";
import { captureIfConsented, getAuthErrorMessage } from "./authUtils";

interface LoginFormProps {
  onMfaRequired: () => void;
  onSuccess: () => void;
}

type FieldErrors = { email?: string; password?: string };

export function LoginForm({ onMfaRequired, onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const validate = () => {
    const schema = z.object({
      email: z.string().trim().email(t("auth.errors.invalid_email")),
      password: z.string().min(6, t("auth.errors.password_too_short")),
    });
    const result = schema.safeParse({ email, password });
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      if (issue.path[0] === "email") next.email ??= issue.message;
      if (issue.path[0] === "password") next.password ??= issue.message;
    }
    setErrors(next);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setFormError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (mounted.current) setFormError(getAuthErrorMessage(error.message, t));
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const has2FA = (factors?.totp?.length ?? 0) > 0;

      if (has2FA) {
        onMfaRequired();
        return;
      }

      captureIfConsented("user_logged_in");
      toast({ title: t("auth.login.welcome_back"), description: t("auth.login.success_description") });
      onSuccess();
    } catch {
      if (mounted.current) setFormError(t("auth.errors.unexpected"));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("auth.login.title")} description={t("auth.login.subtitle")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError>{formError}</FormError>

        <Field id="email" label={t("auth.email")} error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("auth.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isLoading}
            autoFocus
          />
        </Field>

        <Field
          id="password"
          label={t("auth.password")}
          error={errors.password}
          labelAction={
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              {t("auth.login.forgot_password")}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={isLoading}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin" />}
          {isLoading ? t("common.please_wait") : t("auth.login.title")}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-6 text-sm">
        <Link to="/register" className="font-medium text-foreground hover:underline underline-offset-4">
          {t("auth.login.no_account")}
        </Link>
        {!isNative() && (
          <Link
            to="/install"
            className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            {t("auth.login.install_app")}
          </Link>
        )}
      </div>
    </>
  );
}

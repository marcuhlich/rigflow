import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/services/platform";
import { AuthHeading } from "./AuthShell";
import { Field, FormError, PasswordInput } from "./FormFields";
import { PasswordChecks } from "./PasswordChecks";
import { EMAIL_REDIRECT_NATIVE, captureIfConsented, getAuthErrorMessage } from "./authUtils";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  warehouse: string;
}

type FieldKey = keyof RegisterData;
type FieldErrors = Partial<Record<FieldKey, string>>;

interface RegisterFormProps {
  onRegistered: (email: string) => void;
}

const EMAIL_RE = /\S+@\S+\.\S+/;

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<RegisterData>({ name: "", email: "", password: "", warehouse: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const set = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!data.name.trim()) next.name = t("register.error_required");
    if (!data.email.trim()) next.email = t("register.error_required");
    else if (!EMAIL_RE.test(data.email.trim())) next.email = t("register.error_invalid_email");
    if (!data.password) next.password = t("register.error_required");
    else if (data.password.length < 8) next.password = t("register.error_password_too_short");
    if (!data.warehouse.trim()) next.warehouse = t("register.error_required");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const email = data.email.trim();
      const { error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          emailRedirectTo: isNative() ? EMAIL_REDIRECT_NATIVE : `${window.location.origin}/auth/callback`,
          data: { full_name: data.name.trim(), warehouse_name: data.warehouse.trim() },
        },
      });
      if (error) {
        const mapped = getAuthErrorMessage(error.message, t);
        if (mounted.current) {
          setFormError(mapped === t("auth.errors.unknown") ? error.message || t("register.error_signup_failed") : mapped);
        }
        return;
      }
      captureIfConsented("user_signed_up");
      onRegistered(email);
    } catch {
      if (mounted.current) setFormError(t("register.error_signup_failed"));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const fieldProps = (key: FieldKey) => ({
    id: `register-${key}`,
    value: data[key],
    onChange: set(key),
    disabled: loading,
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `register-${key}-error` : undefined,
  });

  return (
    <>
      <AuthHeading title={t("register.title")} description={t("register.subtitle")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError>{formError}</FormError>

        <Field id="register-name" label={t("register.label_name")} error={errors.name}>
          <Input {...fieldProps("name")} autoComplete="name" placeholder={t("register.form_name_placeholder")} autoFocus />
        </Field>

        <Field id="register-email" label={t("auth.email")} error={errors.email}>
          <Input
            {...fieldProps("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("auth.email_placeholder")}
          />
        </Field>

        <Field
          id="register-password"
          label={t("auth.password")}
          error={errors.password}
          hint={<PasswordChecks password={data.password} />}
        >
          <PasswordInput
            {...fieldProps("password")}
            autoComplete="new-password"
            placeholder={t("register.form_password_placeholder")}
          />
        </Field>

        <Field id="register-warehouse" label={t("register.label_warehouse")} error={errors.warehouse}>
          <Input {...fieldProps("warehouse")} autoComplete="organization" placeholder={t("register.form_warehouse_placeholder")} />
        </Field>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? t("register.form_creating") : t("register.submit")}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          <Trans
            i18nKey="register.terms_notice"
            components={{
              terms: <Link to="/nutzungsbedingungen" className="text-foreground underline underline-offset-4" />,
              privacy: <Link to="/datenschutz" className="text-foreground underline underline-offset-4" />,
            }}
          />
        </p>
      </form>

      <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">
        {t("register.already_registered")}{" "}
        <Link to="/auth?step=login" className="font-medium text-foreground hover:underline underline-offset-4">
          {t("register.login_link")}
        </Link>
      </p>
    </>
  );
}

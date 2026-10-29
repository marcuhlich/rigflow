import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Link2Off, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/QueryState";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { AuthStatus, Field, FormError, PasswordInput } from "@/components/auth/FormFields";

type LinkState = "verifying" | "ready" | "invalid";
type FieldErrors = { password?: string; confirm?: string };

/** How long we wait for Supabase to establish the recovery session from the link. */
const LINK_TIMEOUT_MS = 10_000;
const REDIRECT_DELAY_MS = 3000;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState>("verifying");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The recovery link signs the user in. The PASSWORD_RECOVERY event can fire
  // before this page mounts, so also accept an already existing session.
  useEffect(() => {
    let settled = false;
    const markReady = () => {
      settled = true;
      setLinkState("ready");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event !== "SIGNED_OUT")) markReady();
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) markReady();
      })
      .catch(() => undefined);

    const timeout = window.setTimeout(() => {
      if (!settled) setLinkState("invalid");
    }, LINK_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  // Redirect to login a few seconds after success.
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => navigate("/auth", { replace: true }), REDIRECT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [done, navigate]);

  const validate = () => {
    const schema = z
      .object({ password: z.string().min(6, t("auth.errors.password_too_short")), confirm: z.string() })
      .refine((d) => d.password === d.confirm, { message: t("auth.passwords_dont_match"), path: ["confirm"] });
    const result = schema.safeParse({ password, confirm });
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      if (issue.path[0] === "password") next.password ??= issue.message;
      if (issue.path[0] === "confirm") next.confirm ??= issue.message;
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
      const { error } = await supabase.auth.updateUser({ password });
      if (!mounted.current) return;
      if (error) setFormError(t("auth.change_password_error"));
      else setDone(true);
    } catch {
      if (mounted.current) setFormError(t("auth.change_password_error"));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  let content: React.ReactNode;
  if (done) {
    content = (
      <AuthStatus
        icon={<CheckCircle2 className="h-[18px] w-[18px] text-success" strokeWidth={1.75} />}
        title={t("auth.password_changed_title")}
        description={t("auth.password_changed_description")}
      />
    );
  } else if (linkState === "verifying") {
    content = (
      <div className="text-center">
        <PageLoader className="min-h-0 py-6" />
        <p className="text-sm text-muted-foreground">{t("auth.verifying_link")}</p>
      </div>
    );
  } else if (linkState === "invalid") {
    content = (
      <AuthStatus
        icon={<Link2Off className="h-[18px] w-[18px] text-destructive" strokeWidth={1.75} />}
        title={t("auth.callback_error")}
      >
        <Button className="w-full" asChild>
          <Link to="/forgot-password">{t("auth.request_new_link")}</Link>
        </Button>
      </AuthStatus>
    );
  } else {
    content = (
      <>
        <AuthHeading title={t("auth.reset_password_title")} description={t("auth.reset_password_description")} />
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError>{formError}</FormError>
          <Field id="password" label={t("auth.new_password_label")} error={errors.password}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isLoading}
              autoFocus
            />
          </Field>
          <Field id="confirm" label={t("auth.confirm_password_label")} error={errors.confirm}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? "confirm-error" : undefined}
              disabled={isLoading}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            {isLoading ? t("common.please_wait") : t("auth.save_password")}
          </Button>
        </form>
      </>
    );
  }

  return <AuthShell back={{ to: "/auth", label: t("auth.back_to_login") }}>{content}</AuthShell>;
};

export default ResetPassword;

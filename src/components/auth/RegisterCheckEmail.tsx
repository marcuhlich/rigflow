import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { tArray } from "@/components/landing/tArray";
import { AuthStatus, FormError } from "./FormFields";

const RESEND_RESET_MS = 4000;

/** Shown after sign-up: confirm-your-email instructions plus resend. */
export function RegisterCheckEmail({ email }: { email: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const mounted = useRef(true);
  const timer = useRef<number>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const handleResend = async () => {
    setState("sending");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (!mounted.current) return;
      if (error) {
        setState("error");
        return;
      }
      setState("sent");
      timer.current = window.setTimeout(() => mounted.current && setState("idle"), RESEND_RESET_MS);
    } catch {
      if (mounted.current) setState("error");
    }
  };

  const steps = tArray<string>(t, "register.confirmation_steps");

  return (
    <AuthStatus
      icon={<Mail className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />}
      title={t("register.finale_email_title")}
      description={
        <>
          {t("register.finale_email_sent_to")} <span className="font-medium text-foreground">{email}</span>{" "}
          {t("register.finale_email_instructions")}
        </>
      }
    >
      <ol className="divide-y divide-border rounded-md border border-border">
        {steps.map((text, idx) => (
          <li key={text} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
            <span className="tech text-xs text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
            {text}
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-3">
        <Button className="w-full" asChild>
          <Link to="/auth?step=login">{t("register.go_to_login")}</Link>
        </Button>
        {state === "error" && <FormError>{t("auth.reset_email_error")}</FormError>}
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleResend}
          disabled={state === "sending" || state === "sent"}
        >
          {state === "sending" && <Loader2 className="animate-spin" />}
          {state === "sending"
            ? t("register.finale_resend_loading")
            : state === "sent"
              ? t("register.finale_resend_done")
              : t("register.finale_resend_prompt")}
        </Button>
      </div>
    </AuthStatus>
  );
}

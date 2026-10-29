import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AuthHeading } from "./AuthShell";
import { FormError } from "./FormFields";

interface MfaFormProps {
  onSuccess: (method: "totp" | "recovery") => void;
  onBack: () => void;
}

const TOTP_LENGTH = 6;
const RECOVERY_LENGTH = 11; // XXXXX-XXXXX

export function MfaForm({ onSuccess, onBack }: MfaFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const lastAutoSubmitted = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const isComplete = useRecovery ? code.length >= RECOVERY_LENGTH : code.length === TOTP_LENGTH;

  const fail = useCallback((message: string, clear: boolean) => {
    if (!mounted.current) return;
    setError(message);
    if (clear) {
      setCode("");
      inputRef.current?.focus();
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (inFlight.current || !isComplete) return;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (useRecovery) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/mfa-recovery-codes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ action: "verify", code }),
        });
        const data: { valid?: boolean } = await res.json().catch(() => ({}));
        if (!res.ok || !data.valid) {
          fail(t("auth.mfa.recovery_invalid"), true);
          return;
        }
        toast({ title: t("auth.mfa.recovery_accepted_title"), description: t("auth.mfa.recovery_accepted_description") });
        onSuccess("recovery");
        return;
      }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (factorsError || !totpFactor) {
        fail(t("auth.mfa.no_factor"), false);
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError || !challenge) {
        fail(t("auth.mfa.challenge_failed"), true);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        fail(t("auth.mfa.totp_invalid"), true);
        return;
      }
      toast({ title: t("auth.login.welcome_back"), description: t("auth.login.success_description") });
      onSuccess("totp");
    } catch {
      fail(t("auth.errors.unexpected"), false);
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsLoading(false);
    }
  }, [isComplete, useRecovery, code, fail, onSuccess, t, toast]);

  // Auto-submit a complete TOTP code exactly once per entered value.
  useEffect(() => {
    if (useRecovery || code.length !== TOTP_LENGTH) {
      lastAutoSubmitted.current = null;
      return;
    }
    if (lastAutoSubmitted.current === code) return;
    lastAutoSubmitted.current = code;
    void handleVerify();
  }, [code, useRecovery, handleVerify]);

  // Focus the code input when the step opens or the mode changes.
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [useRecovery]);

  const switchMode = () => {
    setUseRecovery((v) => !v);
    setCode("");
    setError(null);
  };

  const handleChange = (raw: string) => {
    setError(null);
    if (!useRecovery) {
      setCode(raw.replace(/\D/g, "").slice(0, TOTP_LENGTH));
      return;
    }
    let val = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (val.length === 5 && !val.includes("-") && raw.length > code.length) val += "-";
    setCode(val.slice(0, RECOVERY_LENGTH));
  };

  return (
    <>
      <AuthHeading
        title={useRecovery ? t("auth.mfa.recovery_title") : t("auth.mfa.totp_title")}
        description={useRecovery ? t("auth.mfa.recovery_subtitle") : t("auth.mfa.totp_subtitle")}
      />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify();
        }}
      >
        <FormError>{error}</FormError>

        <Input
          ref={inputRef}
          type="text"
          autoComplete="one-time-code"
          inputMode={useRecovery ? "text" : "numeric"}
          maxLength={useRecovery ? RECOVERY_LENGTH : TOTP_LENGTH}
          placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={useRecovery ? t("auth.mfa.recovery_title") : t("auth.mfa.totp_title")}
          aria-invalid={!!error}
          disabled={isLoading}
          className={cn(
            "h-11 text-center font-mono text-lg tabular-nums",
            useRecovery ? "tracking-widest uppercase" : "tracking-[0.5em]"
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading || !isComplete}>
          {isLoading && <Loader2 className="animate-spin" />}
          {isLoading ? t("auth.mfa.verifying") : t("auth.mfa.confirm")}
        </Button>
      </form>

      <div className="mt-6 space-y-2 border-t border-border pt-6 text-[13px]">
        <button
          type="button"
          onClick={switchMode}
          disabled={isLoading}
          className="block text-foreground hover:underline underline-offset-4 disabled:opacity-50"
        >
          {useRecovery ? t("auth.mfa.back_to_totp") : t("auth.mfa.use_recovery")}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="block text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {t("auth.mfa.back_to_login")}
        </button>
      </div>
    </>
  );
}

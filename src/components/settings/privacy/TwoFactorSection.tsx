import { useCallback, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsRow, SettingsSection } from "../SettingsSection";
import { RecoveryCodesDialog } from "./RecoveryCodesDialog";

type Status = "loading" | "error" | "disabled" | "enrolling" | "enabled";

interface RecoveryResponse {
  count?: number;
  codes?: string[];
  success?: boolean;
}

/** Calls the mfa-recovery-codes edge function with the current session token. */
async function callRecoveryFunction(action: string, extra?: Record<string, unknown>): Promise<RecoveryResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-recovery-codes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as RecoveryResponse;
}

const btnDanger = "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive";

export function TwoFactorSection({ onStatusChange }: { onStatusChange: (enabled: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [unusedCount, setUnusedCount] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [overlay, setOverlay] = useState<{ codes: string[]; isRegen: boolean } | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Parent passes a stable state setter, so this doesn't re-trigger the load effect.
  const setEnabled = onStatusChange;

  const fetchCodeCount = useCallback(async () => {
    try {
      const data = await callRecoveryFunction("count");
      if (mounted.current && typeof data.count === "number") setUnusedCount(data.count);
    } catch (e) {
      console.error("fetchCodeCount:", e);
    }
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!mounted.current) return;
    if (error) {
      setLoadError(error);
      setStatus("error");
      return;
    }
    const totp = data?.totp?.find((f) => f.status === "verified");
    if (totp) {
      setFactorId(totp.id);
      setStatus("enabled");
      setEnabled(true);
      void fetchCodeCount();
    } else {
      setFactorId(null);
      setStatus("disabled");
      setEnabled(false);
    }
  }, [fetchCodeCount, setEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateCodes = async (isRegen: boolean) => {
    setGenerating(true);
    try {
      const data = await callRecoveryFunction("generate");
      if (!data.codes?.length) throw new Error("no codes");
      if (!mounted.current) return;
      setUnusedCount(data.codes.length);
      setOverlay({ codes: data.codes, isRegen });
      setConfirmRegen(false);
    } catch {
      toast({
        title: t("privacy.two_factor.toast_regen_error_title"),
        description: t("privacy.two_factor.toast_regen_error_description"),
        variant: "destructive",
      });
    } finally {
      if (mounted.current) setGenerating(false);
    }
  };

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "RigFlow" });
      if (error || !data) {
        toast({ title: t("common.error"), description: error?.message, variant: "destructive" });
        return;
      }
      const img = await QRCode.toDataURL(data.totp.uri, { width: 180, margin: 1 });
      if (!mounted.current) return;
      setFactorId(data.id);
      setQrImage(img);
      setCode("");
      setStatus("enrolling");
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      if (mounted.current) setEnrolling(false);
    }
  };

  const cancelEnroll = () => {
    // Remove the unverified factor so a later setup starts clean.
    if (factorId) void supabase.auth.mfa.unenroll({ factorId });
    setFactorId(null);
    setQrImage(null);
    setCode("");
    setStatus("disabled");
  };

  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        toast({ title: t("common.error"), description: challengeError?.message, variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (error) {
        toast({
          title: t("privacy.two_factor.toast_wrong_code_title"),
          description: t("privacy.two_factor.toast_wrong_code_description"),
          variant: "destructive",
        });
        return;
      }
      if (!mounted.current) return;
      setStatus("enabled");
      setQrImage(null);
      setCode("");
      setEnabled(true);
      toast({
        title: t("privacy.two_factor.toast_enabled_title"),
        description: t("privacy.two_factor.toast_enabled_description"),
      });
      await generateCodes(false);
    } finally {
      if (mounted.current) setVerifying(false);
    }
  };

  const markDisabled = () => {
    setFactorId(null);
    setStatus("disabled");
    setUnusedCount(null);
    setEnabled(false);
  };

  const disable = async () => {
    if (!factorId) return;
    setDisabling(true);
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) {
          toast({ title: t("common.error"), description: error.message, variant: "destructive" });
          return;
        }
        if (mounted.current) markDisabled();
        toast({ title: t("privacy.two_factor.toast_disabled_title") });
      } else {
        // Session is only aal1 (e.g. signed in via recovery code): unenroll server-side.
        const data = await callRecoveryFunction("unenroll", { factorId });
        if (!data.success) throw new Error("unenroll failed");
        if (mounted.current) markDisabled();
        toast({
          title: t("privacy.two_factor.toast_disabled_title"),
          description: t("privacy.two_factor.toast_disabled_description"),
        });
      }
    } catch {
      toast({
        title: t("common.error"),
        description: t("privacy.two_factor.toast_disable_error"),
        variant: "destructive",
      });
    } finally {
      if (mounted.current) setDisabling(false);
    }
  };

  const recoveryHint =
    unusedCount === 0
      ? t("privacy.two_factor.recovery_hint_empty")
      : unusedCount !== null && unusedCount <= 2
        ? t("privacy.two_factor.recovery_hint_few")
        : t("privacy.two_factor.recovery_hint_normal");

  const countBadge =
    unusedCount === null ? null : unusedCount === 0 ? (
      <Badge variant="defect">{t("privacy.recovery_badge.none")}</Badge>
    ) : unusedCount <= 2 ? (
      <Badge variant="lent">{t("privacy.recovery_badge.few", { count: unusedCount })}</Badge>
    ) : (
      <Badge variant="outline" className="tabular-nums">
        {t("privacy.recovery_badge.available", { count: unusedCount })}
      </Badge>
    );

  if (status === "error") {
    return (
      <SettingsSection title={t("privacy.auth_section_title")}>
        <ErrorState error={loadError} onRetry={() => void load()} className="border-0" />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={t("privacy.auth_section_title")}>
      <SettingsRow
        stack
        label={t("privacy.two_factor.title")}
        description={t("privacy.two_factor.description")}
        control={
          status === "loading" ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant={status === "enabled" ? "available" : "secondary"}>
                {status === "enabled" ? t("privacy.two_factor.status_active") : t("privacy.two_factor.status_inactive")}
              </Badge>
              {status === "disabled" && (
                <Button size="sm" variant="outline" onClick={() => void startEnroll()} disabled={enrolling}>
                  {enrolling && <Loader2 className="animate-spin" />}
                  {t("privacy.two_factor.setup_button")}
                </Button>
              )}
              {status === "enabled" && (
                <Button size="sm" variant="outline" className={btnDanger} onClick={() => void disable()} disabled={disabling}>
                  {disabling && <Loader2 className="animate-spin" />}
                  {t("privacy.two_factor.disable_button")}
                </Button>
              )}
            </div>
          )
        }
      >
        {status === "enrolling" && (
          <form
            className="mt-4 space-y-4 rounded-md border border-border bg-surface-sunken p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">{t("privacy.two_factor.qr_hint")}</p>
            {qrImage && (
              <img
                src={qrImage}
                alt={t("privacy.two_factor.qr_alt")}
                width={180}
                height={180}
                className="mx-auto rounded-md border border-border bg-white sm:mx-0"
              />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                aria-label={t("privacy.two_factor.title")}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono tracking-[0.4em] sm:w-40"
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={cancelEnroll} className="flex-1 sm:flex-none">
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={verifying || code.length !== 6} className="flex-1 sm:flex-none">
                  {verifying && <Loader2 className="animate-spin" />}
                  {t("common.confirm")}
                </Button>
              </div>
            </div>
          </form>
        )}
      </SettingsRow>

      {status === "enabled" && (
        <SettingsRow
          stack
          label={
            <span className="inline-flex items-center gap-2">
              {t("privacy.two_factor.recovery_codes_title")}
              {countBadge}
            </span>
          }
          description={recoveryHint}
          control={
            <Button size="sm" variant="outline" onClick={() => setConfirmRegen(true)} disabled={generating}>
              {generating && <Loader2 className="animate-spin" />}
              {t("privacy.two_factor.regen_button")}
            </Button>
          }
        />
      )}

      <AlertDialog open={confirmRegen} onOpenChange={(o) => !generating && setConfirmRegen(o)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("privacy.two_factor.regen_button")}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans i18nKey="privacy.two_factor.regen_confirm_warning" components={{ strong: <strong /> }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>{t("common.cancel")}</AlertDialogCancel>
            <Button onClick={() => void generateCodes(true)} disabled={generating}>
              {generating && <Loader2 className="animate-spin" />}
              {t("privacy.two_factor.regen_confirm_yes")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecoveryCodesDialog
        codes={overlay?.codes ?? null}
        isRegeneration={overlay?.isRegen}
        onClose={() => setOverlay(null)}
      />
    </SettingsSection>
  );
}

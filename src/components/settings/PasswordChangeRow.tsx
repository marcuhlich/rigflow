import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SettingsRow } from "./SettingsSection";

type Field = "currentPassword" | "newPassword" | "confirm";
type Errors = Partial<Record<Field, string>>;

/** Password row: collapsed shows "Change", expanded shows the change form. */
export function PasswordChangeRow() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const mounted = useRef(true);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(doneTimer.current);
    };
  }, []);

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t("account_info.password.error_required")),
          newPassword: z.string().min(8, t("account_info.password.error_min_length")),
          confirm: z.string(),
        })
        .refine((d) => d.newPassword === d.confirm, {
          message: t("account_info.password.error_mismatch"),
          path: ["confirm"],
        })
        .refine((d) => d.currentPassword !== d.newPassword, {
          message: t("account_info.password.error_same"),
          path: ["newPassword"],
        }),
    [t]
  );

  const reset = () => {
    setValues({ currentPassword: "", newPassword: "", confirm: "" });
    setErrors({});
    setShowPw(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const setField = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = async () => {
    const result = schema.safeParse(values);
    if (!result.success) {
      const next: Errors = {};
      result.error.errors.forEach((issue) => {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      });
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate with the current password before changing it.
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? "",
        password: values.currentPassword,
      });
      if (reAuthError) {
        if (mounted.current) setErrors({ currentPassword: t("account_info.password.wrong_current") });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: values.newPassword });
      if (updateError) {
        toast({ title: t("common.error"), description: updateError.message, variant: "destructive" });
        return;
      }

      toast({
        title: t("account_info.password.updated_title"),
        description: t("account_info.password.updated_desc"),
      });
      if (!mounted.current) return;
      close();
      setDone(true);
      clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => setDone(false), 3000);
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : t("common.unknown_error"),
        variant: "destructive",
      });
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const inputType = showPw ? "text" : "password";

  return (
    <SettingsRow
      label={t("account_info.password.label")}
      description={
        !open &&
        (done ? (
          <span className="inline-flex items-center gap-1 text-success">
            <Check className="h-3.5 w-3.5" />
            {t("account_info.password.changed_badge")}
          </span>
        ) : (
          <span className="tracking-widest">••••••••</span>
        ))
      }
      control={
        !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t("account_info.password.change_action")}
          </Button>
        )
      }
    >
      {open && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">{t("account_info.password.current_label")}</Label>
            <Input
              id="pw-current"
              autoFocus
              autoComplete="current-password"
              type={inputType}
              placeholder={t("account_info.password.current_placeholder")}
              value={values.currentPassword}
              aria-invalid={!!errors.currentPassword}
              onChange={(e) => setField("currentPassword", e.target.value)}
              className={errors.currentPassword ? "border-destructive" : undefined}
            />
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pw-new">{t("account_info.password.new_label")}</Label>
            <Input
              id="pw-new"
              autoComplete="new-password"
              type={inputType}
              placeholder={t("account_info.password.new_placeholder")}
              value={values.newPassword}
              aria-invalid={!!errors.newPassword}
              onChange={(e) => setField("newPassword", e.target.value)}
              className={errors.newPassword ? "border-destructive" : undefined}
            />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
            <Input
              id="pw-confirm"
              autoComplete="new-password"
              type={inputType}
              aria-label={t("account_info.password.confirm_placeholder")}
              placeholder={t("account_info.password.confirm_placeholder")}
              value={values.confirm}
              aria-invalid={!!errors.confirm}
              onChange={(e) => setField("confirm", e.target.value)}
              className={errors.confirm ? "border-destructive" : undefined}
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPw((v) => !v)}>
              {showPw ? <EyeOff /> : <Eye />}
              {showPw ? t("account_info.password.hide") : t("account_info.password.show")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={close} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !values.currentPassword || values.newPassword.length < 8}
              >
                {saving && <Loader2 className="animate-spin" />}
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </SettingsRow>
  );
}

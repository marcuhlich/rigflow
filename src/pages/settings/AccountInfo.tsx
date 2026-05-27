import { useState, useRef, useEffect, useMemo } from "react";
import {
  Check, X, Pencil, Loader2, Mail, User, Lock,
  Eye, EyeOff, ShieldCheck, Clock,
} from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth }  from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim()[0].toUpperCase();
  if (email)        return email[0].toUpperCase();
  return "?";
}

// ─── Inline-Edit Field ────────────────────────────────────────────────────────

interface InlineFieldProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  type?: string;
  validate?: (v: string) => string | null;
  onSave: (v: string) => Promise<string | null>;
  disabled?: boolean;
  disabledReason?: string;
  hint?: React.ReactNode;
}

const InlineField = ({
  label, value, icon, type = "text",
  validate, onSave, disabled, disabledReason, hint,
}: InlineFieldProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const handleEdit = () => {
    if (disabled) return;
    setDraft(value); setError(null); setEditing(true);
  };
  const handleCancel = () => { setEditing(false); setError(null); };
  const handleChange = (v: string) => {
    setDraft(v);
    if (validate) setError(validate(v));
  };
  const handleSave = async () => {
    if (validate) { const err = validate(draft); if (err) { setError(err); return; } }
    if (draft.trim() === value.trim()) { setEditing(false); return; }
    setSaving(true);
    const err = await onSave(draft.trim());
    setSaving(false);
    if (err) setError(err); else setEditing(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="group">
      <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {icon}{label}
      </Label>

      {editing ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type={type}
              value={draft}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="glass-input h-9 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saving || !!error}
              className="shrink-0 p-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary disabled:opacity-40 transition-colors"
              aria-label={t('common.save')}
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Check   className="h-4 w-4" />}
            </button>
            <button
              onClick={handleCancel}
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-xs text-destructive pl-0.5">{error}</p>}
        </div>
      ) : (
        <button
          onClick={handleEdit}
          disabled={disabled}
          title={disabled ? disabledReason : t('account_info.click_to_edit')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-input/30 hover:bg-input/60 hover:border-primary/30 transition-all text-sm text-left group disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value || "—"}
          </span>
          {!disabled && (
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
      )}

      {!editing && hint && <div className="mt-1.5">{hint}</div>}
    </div>
  );
};

// ─── Password Change Section ──────────────────────────────────────────────────

const PasswordSection = () => {
  const { t } = useTranslation();
  const [open,            setOpen]            = useState(false);
  const [showPw,          setShowPw]          = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirm,         setConfirm]         = useState("");
  const [errors, setErrors] = useState<{
    currentPassword?: string; newPassword?: string; confirm?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const { user }  = useAuth();
  const { toast } = useToast();

  // Schema mit übersetzten Fehlermeldungen — wird bei Sprachwechsel neu gebaut
  const passwordSchema = useMemo(() =>
    z.object({
      currentPassword: z.string().min(1, t('account_info.password.error_required')),
      newPassword:     z.string().min(8, t('account_info.password.error_min_length')),
      confirm:         z.string(),
    })
    .refine(d => d.newPassword === d.confirm, {
      message: t('account_info.password.error_mismatch'),
      path:    ["confirm"],
    })
    .refine(d => d.currentPassword !== d.newPassword, {
      message: t('account_info.password.error_same'),
      path:    ["newPassword"],
    }),
  [t]);

  const handleSave = async () => {
    const result = passwordSchema.safeParse({ currentPassword, newPassword, confirm });
    if (!result.success) {
      const e: typeof errors = {};
      result.error.errors.forEach(x => {
        const key = x.path[0] as keyof typeof e;
        if (!e[key]) e[key] = x.message;
      });
      setErrors(e);
      return;
    }

    setSaving(true);
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "", password: currentPassword,
    });
    if (reAuthError) {
      setSaving(false);
      setErrors({ currentPassword: t('account_info.password.wrong_current') });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) {
      toast({ title: t('common.error'), description: updateError.message, variant: "destructive" });
    } else {
      setOpen(false);
      setCurrentPassword(""); setNewPassword(""); setConfirm(""); setErrors({});
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      toast({
        title:       t('account_info.password.updated_title'),
        description: t('account_info.password.updated_desc'),
      });
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setCurrentPassword(""); setNewPassword(""); setConfirm(""); setErrors({});
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5 ml-1">
        <Lock className="h-3.5 w-3.5" />
        {t('account_info.password.label')}
      </Label>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 bg-input/30 hover:bg-input/60 hover:border-primary/30 transition-all text-sm text-left group"
        >
          <span className="text-muted-foreground tracking-widest">••••••••</span>
          <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 translate-x-2 group-hover:translate-x-0">
            {done ? (
              <><Check className="h-3.5 w-3.5" /> {t('account_info.password.changed_badge')}</>
            ) : (
              <><Pencil className="h-3.5 w-3.5" /> {t('account_info.password.change_action')}</>
            )}
          </span>
        </button>
      ) : (
        <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Aktuelles Passwort */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70 ml-1">
              {t('account_info.password.current_label')}
            </Label>
            <Input
              autoFocus
              type={showPw ? "text" : "password"}
              placeholder={t('account_info.password.current_placeholder')}
              value={currentPassword}
              onChange={e => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors(p => ({ ...p, currentPassword: undefined }));
              }}
              className={`glass-input h-9 text-sm ${errors.currentPassword ? "border-destructive/50" : ""}`}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive animate-in slide-in-from-left-1">
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div className="h-px w-full bg-border/20" />

          {/* Neues Passwort */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70 ml-1">
              {t('account_info.password.new_label')}
            </Label>
            <div className="space-y-2">
              <div>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder={t('account_info.password.new_placeholder')}
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors(p => ({ ...p, newPassword: undefined }));
                  }}
                  className="glass-input h-9 text-sm"
                />
                {errors.newPassword && (
                  <p className="text-xs text-destructive mt-1 animate-in slide-in-from-left-1">
                    {errors.newPassword}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder={t('account_info.password.confirm_placeholder')}
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors(p => ({ ...p, confirm: undefined }));
                  }}
                  className="glass-input h-9 text-sm"
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive mt-1 animate-in slide-in-from-left-1">
                    {errors.confirm}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted/50"
            >
              {showPw
                ? <><EyeOff className="h-3.5 w-3.5" /> {t('account_info.password.hide')}</>
                : <><Eye    className="h-3.5 w-3.5" /> {t('account_info.password.show')}</>}
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={handleCancel}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs shadow-lg shadow-primary/20"
                onClick={handleSave}
                disabled={saving || !currentPassword || newPassword.length < 8}
              >
                {saving
                  ? <Loader2    className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountInfo = () => {
  const { user }  = useAuth();
  const { toast } = useToast();
  const { t }     = useTranslation();

  const displayName  = user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? "";
  const email        = user?.email  ?? "";
  const pendingEmail = (user as any)?.new_email ?? null;

  const saveName = async (value: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: value } });
    if (error) return error.message;
    toast({ title: t('account_info.toast.name_saved') });
    return null;
  };

  const saveEmail = async (value: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: value });
    if (error) return error.message;
    toast({
      title:       t('account_info.toast.email_confirm_title'),
      description: t('account_info.toast.email_confirm_desc', { email: value }),
    });
    return null;
  };

  const emailHint = pendingEmail ? (
    <p className="text-xs text-amber-400/90 flex items-center gap-1.5 px-0.5 animate-in fade-in duration-300">
      <Clock className="h-3 w-3 shrink-0" />
      {t('account_info.pending_hint')}{" "}
      <span className="font-medium text-amber-300">{pendingEmail}</span>
    </p>
  ) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Avatar Card */}
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {getInitials(displayName, email)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {displayName || (
                <span className="text-muted-foreground italic">
                  {t('account_info.no_name')}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{email}</p>
            {pendingEmail && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {pendingEmail} {t('account_info.pending_suffix')}
              </p>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t('account_info.personal_data')}
            </h2>
          </div>

          <InlineField
            label={t('fields.name')}
            value={displayName}
            icon={<User className="h-3.5 w-3.5" />}
            validate={v => v.trim().length < 2 ? t('account_info.validate.name_too_short') : null}
            onSave={saveName}
          />

          <InlineField
            label={t('account_info.email_label')}
            value={email}
            icon={<Mail className="h-3.5 w-3.5" />}
            type="email"
            validate={v =>
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : t('auth.errors.invalid_email')
            }
            onSave={saveEmail}
            hint={emailHint}
          />
        </div>

        {/* Password Section */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t('account_info.security_title')}
            </h2>
          </div>
          <PasswordSection />
        </div>

      </div>
    </div>
  );
};

export default AccountInfo;
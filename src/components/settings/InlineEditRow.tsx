import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsRow } from "./SettingsSection";

interface Props {
  id: string;
  label: string;
  value: string;
  type?: string;
  autoComplete?: string;
  validate?: (v: string) => string | null;
  /** Returns an error message, or null on success */
  onSave: (v: string) => Promise<string | null>;
  hint?: ReactNode;
}

/** Settings row showing a value with an "edit" action that expands into an input. */
export function InlineEditRow({ id, label, value, type = "text", autoComplete, validate, onSave, hint }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const start = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const next = draft.trim();
    const validationError = validate?.(next) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    let err: string | null;
    try {
      err = await onSave(next);
    } catch (e) {
      err = e instanceof Error ? e.message : t("common.unknown_error");
    }
    if (!mounted.current) return;
    setSaving(false);
    if (err) setError(err);
    else setEditing(false);
  };

  return (
    <SettingsRow
      label={editing ? <label htmlFor={id}>{label}</label> : label}
      description={
        editing ? undefined : (
          <>
            <span className={value ? "break-all text-foreground" : undefined}>{value || "—"}</span>
            {hint && <div className="mt-1">{hint}</div>}
          </>
        )
      }
      control={
        !editing && (
          <Button variant="outline" size="sm" onClick={start}>
            {t("common.edit")}
          </Button>
        )
      }
    >
      {editing && (
        <form
          className="mt-3 space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id={id}
              type={type}
              autoComplete={autoComplete}
              value={draft}
              aria-invalid={!!error}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancel();
              }}
              className="sm:flex-1"
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={cancel} disabled={saving} className="flex-1 sm:flex-none">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                {saving && <Loader2 className="animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      )}
    </SettingsRow>
  );
}

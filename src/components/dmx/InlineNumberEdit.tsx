import { KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineNumberEditProps {
  value: number;
  display: string;
  /** Returns an error message for invalid values, or null. */
  validate: (n: number) => string | null;
  onCommit: (n: number) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
}

/**
 * Mono value that turns into a small number input on click.
 * Enter saves, Escape cancels.
 */
export function InlineNumberEdit({
  value,
  display,
  validate,
  onCommit,
  onError,
  disabled,
  className,
  inputClassName,
  ariaLabel,
}: InlineNumberEditProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cancel = () => setDraft(null);

  const save = async () => {
    if (draft === null) return;
    if (!/^\d+$/.test(draft.trim())) {
      onError(t("dmx_table.error.invalid_input"));
      return;
    }
    const n = parseInt(draft, 10);
    const err = validate(n);
    if (err) {
      onError(err);
      return;
    }
    if (n === value) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onCommit(n);
      setDraft(null);
    } catch {
      onError(t("dmx_table.error.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (draft !== null) {
    return (
      <div className="flex items-center gap-0.5">
        <Input
          aria-label={ariaLabel}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          className={cn("h-7 px-1.5 font-mono text-[13px] tabular-nums", inputClassName)}
          disabled={saving}
          autoFocus
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => void save()}
          disabled={saving}
          aria-label={t("common.save")}
        >
          <Check />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel} disabled={saving} aria-label={t("common.cancel")}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${t("common.edit")}: ${ariaLabel}`}
      onClick={() => setDraft(String(value))}
      className={cn(
        "-mx-1.5 rounded-[4px] border border-transparent px-1.5 py-0.5 font-mono tabular-nums transition-colors",
        "hover:border-border-strong hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none",
        className
      )}
    >
      {display}
    </button>
  );
}

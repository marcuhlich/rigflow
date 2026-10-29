import { FormEvent, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseScanCode } from "./parseScanCode";

interface ManualCodeEntryProps {
  /** Receives the raw entered text (same contract as a camera scan). */
  onSubmit: (raw: string) => void;
  onCancel?: () => void;
}

/** Fallback when the camera can't read a label: paste or type the item id. */
export function ManualCodeEntry({ onSubmit, onCancel }: ManualCodeEntryProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const isValid = parseScanCode(trimmed) !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="scanner-manual-code">{t("qr_scanner.manual_label")}</Label>
        <Input
          id="scanner-manual-code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("qr_scanner.manual_placeholder")}
          className="font-mono text-[13px]"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
        />
        <p className="flex h-4 items-center gap-1 text-xs" aria-live="polite">
          {trimmed &&
            (isValid ? (
              <span className="flex items-center gap-1 text-success">
                <Check className="h-3 w-3" />
                {t("qr_scanner.valid_id")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {t("qr_scanner.invalid_format")}
              </span>
            ))}
        </p>
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            {t("qr_scanner.method_camera")}
          </Button>
        )}
        <Button type="submit" disabled={!isValid} className="flex-1">
          {t("common.confirm")}
        </Button>
      </div>
    </form>
  );
}

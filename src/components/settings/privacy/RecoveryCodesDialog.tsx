import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AlertTriangle, Check, Copy, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Props {
  codes: string[] | null;
  isRegeneration?: boolean;
  onClose: () => void;
}

/**
 * Shows freshly generated recovery codes once. Can only be dismissed after
 * the user confirms they saved them.
 */
export function RecoveryCodesDialog({ codes, isRegeneration = false, onClose }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();

  const open = !!codes;

  useEffect(() => {
    if (open) {
      setSaved(false);
      setCopied(false);
      setRevealed(false);
    }
  }, [open]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copyAll = async () => {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context, permissions) – reveal so the user can copy manually.
      setRevealed(true);
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saved) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-sm overflow-y-auto"
        onEscapeKeyDown={(e) => !saved && e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isRegeneration ? t("privacy.recovery_overlay.title_regen") : t("privacy.recovery_overlay.title_setup")}
          </DialogTitle>
          <DialogDescription>
            {isRegeneration
              ? t("privacy.recovery_overlay.description_regen")
              : t("privacy.recovery_overlay.description_setup")}{" "}
            <span className="font-medium text-foreground">{t("privacy.recovery_overlay.shown_once")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-foreground">
            <Trans i18nKey="privacy.recovery_overlay.warning" components={{ strong: <strong /> }} />
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("privacy.recovery_overlay.code_count")}</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRevealed((v) => !v)}>
              {revealed ? <EyeOff /> : <Eye />}
              {revealed ? t("privacy.recovery_overlay.hide") : t("privacy.recovery_overlay.show")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(codes ?? []).map((code) => (
              <div
                key={code}
                className="select-all rounded-md border border-border bg-surface-sunken px-2 py-2 text-center font-mono text-xs tracking-wider tabular-nums"
              >
                {revealed ? code : "•••••-•••••"}
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => void copyAll()}>
          {copied ? <Check className="text-success" /> : <Copy />}
          {copied ? t("privacy.recovery_overlay.copied") : t("privacy.recovery_overlay.copy_all")}
        </Button>

        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox className="mt-0.5" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
          <span className="text-xs leading-relaxed text-muted-foreground">
            {t("privacy.recovery_overlay.confirm_label")}
          </span>
        </label>

        <DialogFooter>
          <Button onClick={onClose} disabled={!saved} className="w-full">
            {t("privacy.recovery_overlay.done_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { ReactNode, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CameraViewport } from "./CameraViewport";
import { ManualCodeEntry } from "./ManualCodeEntry";

interface ScannerOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Raw code from camera or manual entry. */
  onCode: (raw: string) => void;
  title?: string;
  subtitle?: ReactNode;
  /** Number shown in the top bar (e.g. items scanned in this session). */
  count?: number;
  /** Stop reporting codes, e.g. while a result needs confirmation. */
  paused?: boolean;
  /** Bottom sheet content, usually the last scan result. */
  result?: ReactNode;
}

/**
 * Full-screen scanner: camera viewport with reticle, top bar and a bottom
 * sheet for results or manual code entry. Built for one-handed use in a dark venue.
 */
export function ScannerOverlay({
  open, onClose, onCode, title, subtitle, count, paused = false, result,
}: ScannerOverlayProps) {
  const { t } = useTranslation();
  const [manual, setManual] = useState(false);

  // Fresh state on every open
  useEffect(() => {
    if (!open) setManual(false);
  }, [open]);

  const handleManualSubmit = (raw: string) => {
    setManual(false);
    onCode(raw);
  };

  const showManual = manual && !result;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-black text-white outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {/* Top bar */}
          <div className="relative z-10 border-b border-white/10 bg-black pt-safe">
            <div className="flex h-14 items-center gap-2 px-2">
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.close")}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <X className="!size-5" />
                </Button>
              </DialogPrimitive.Close>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="truncate text-sm font-semibold leading-tight">
                  {title ?? t("qr_scanner.title")}
                </DialogPrimitive.Title>
                {subtitle && <p className="truncate text-xs text-white/60">{subtitle}</p>}
              </div>
              {count !== undefined && (
                <span
                  className="mr-1 inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-white/15 px-2 font-mono text-[13px] tabular-nums"
                  aria-label={t("scanner.scan.scanned_count", { count })}
                >
                  {count}
                </span>
              )}
              {!result && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setManual((v) => !v)}
                  aria-label={t("scanner.manual.toggle")}
                  aria-pressed={manual}
                  className={cn(
                    "text-white hover:bg-white/10 hover:text-white",
                    manual && "bg-white/15"
                  )}
                >
                  <Keyboard className="!size-5" />
                </Button>
              )}
            </div>
          </div>

          <CameraViewport
            enabled={open}
            paused={paused || showManual}
            onDecode={onCode}
            onManualEntry={() => setManual(true)}
            className="flex-1"
          />

          {/* Bottom sheet */}
          {(result || showManual) && (
            <div className="relative z-10 rounded-t-xl border-t border-border bg-background pb-safe text-foreground">
              <div className="mx-auto w-full max-w-md px-4 pb-4 pt-4">
                {result ?? (
                  <ManualCodeEntry onSubmit={handleManualSubmit} onCancel={() => setManual(false)} />
                )}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

import { CameraOff, Loader2, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCameraScanner } from "./useCameraScanner";

interface CameraViewportProps {
  enabled: boolean;
  paused?: boolean;
  onDecode: (raw: string) => void;
  onManualEntry?: () => void;
  className?: string;
}

const CORNER = "absolute h-8 w-8 border-primary";

/** Full-bleed camera image with a square reticle. Handles start/error states. */
export function CameraViewport({ enabled, paused, onDecode, onManualEntry, className }: CameraViewportProps) {
  const { t } = useTranslation();
  const { videoRef, status, error, retry } = useCameraScanner({ enabled, paused, onDecode });

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
          status === "scanning" ? "opacity-100" : "opacity-0"
        )}
        autoPlay
        muted
        playsInline
        aria-hidden
      />

      {status !== "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
          {/* Reticle: the surrounding shadow dims everything outside the frame */}
          <div
            className={cn(
              "relative aspect-square w-[min(68vw,17rem)] rounded-lg",
              "shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]",
              paused && "opacity-50"
            )}
          >
            <span className={cn(CORNER, "left-0 top-0 rounded-tl-lg border-l-[3px] border-t-[3px]")} />
            <span className={cn(CORNER, "right-0 top-0 rounded-tr-lg border-r-[3px] border-t-[3px]")} />
            <span className={cn(CORNER, "bottom-0 left-0 rounded-bl-lg border-b-[3px] border-l-[3px]")} />
            <span className={cn(CORNER, "bottom-0 right-0 rounded-br-lg border-b-[3px] border-r-[3px]")} />
          </div>
          <p className="relative flex items-center gap-2 text-[13px] font-medium text-white/85" aria-live="polite">
            {status === "scanning" ? (
              t("scanner.camera.hint")
            ) : (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("qr_scanner.scanner_starting")}
              </>
            )}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center" role="alert">
          <CameraOff className="h-6 w-6 text-white/70" />
          <div className="max-w-xs">
            <p className="text-sm font-medium text-white">{t("scanner.camera.error_title")}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/65">
              {t(`scanner.camera.error.${error ?? "unknown"}`)}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {error !== "unsupported" && (
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <RotateCw />
                {t("common.retry")}
              </Button>
            )}
            {onManualEntry && (
              <Button size="sm" onClick={onManualEntry}>
                {t("scanner.manual.toggle")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

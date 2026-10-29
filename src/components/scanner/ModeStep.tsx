import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import { SCAN_MODES, type ScanMode } from "./types";

/** Step 1: pick the workflow. One dense list, each row is a single tap target. */
export function ModeStep({ onSelect }: { onSelect: (mode: ScanMode) => void }) {
  const { t } = useTranslation();

  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {SCAN_MODES.map(({ id, Icon, targetStatus, changesStatus }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 active:bg-muted"
        >
          <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t(`scanner.mode.${id}.label`)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              {t(`scanner.mode.${id}.description`)}
            </p>
          </div>
          {changesStatus && (
            <span className="hidden shrink-0 sm:inline-flex">
              <StatusBadge condition={targetStatus} />
            </span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

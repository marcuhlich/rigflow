import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { DMX_UNIVERSE_SIZE, countPatchedChannels, groupByUniverse } from "@/components/dmx/dmxFormat";

interface UniverseSummaryProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
}

/** One line per universe: patched channels, usage bar, device + conflict counts. */
export function UniverseSummary({ rows, conflicts }: UniverseSummaryProps) {
  const { t } = useTranslation();

  const universes = useMemo(
    () =>
      groupByUniverse(rows).map(([universe, list]) => ({
        universe,
        used: countPatchedChannels(list),
        devices: list.length,
        conflicts: conflicts.filter((c) => c.universe === universe).length,
      })),
    [rows, conflicts]
  );

  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {universes.map(({ universe, used, devices, conflicts: c }) => {
        const ratio = used / DMX_UNIVERSE_SIZE;
        return (
          <div key={universe} className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
            <span className="w-24 shrink-0 text-[13px] font-medium sm:w-28">
              {t("dmx.universe_number", { number: universe })}
            </span>
            <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  ratio > 0.9 ? "bg-destructive" : ratio > 0.7 ? "bg-warning" : "bg-foreground/60"
                )}
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
              />
            </div>
            <span className="w-[90px] shrink-0 text-right font-mono text-[12px] tabular-nums text-muted-foreground sm:w-[120px]">
              {t("dmx_patchplan.channels_used", { used })}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
              {t("dmx_timeline.device_count", { count: devices })}
            </span>
            <span
              className={cn(
                "hidden w-24 shrink-0 text-right text-[12px] sm:block",
                c > 0 ? "font-medium text-destructive" : "text-muted-foreground/60"
              )}
            >
              {c > 0 ? t("dmx.badge_conflicts", { count: c }) : "–"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

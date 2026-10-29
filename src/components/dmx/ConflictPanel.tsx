import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";
import { padAddress } from "@/components/dmx/dmxFormat";

const LIMIT = 5;

interface ConflictPanelProps {
  conflicts: DMXConflict[];
  title?: string;
  onHover?: (row: PatchplanRow | null) => void;
}

function Side({ row }: { row: PatchplanRow }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 font-mono tabular-nums">
        {padAddress(row.startAddress)}–{padAddress(row.endAddress)}
      </span>
      <span className="truncate font-medium text-foreground">{row.itemName}</span>
      {row.totalInstances > 1 && (
        <span className="shrink-0 font-mono text-muted-foreground">#{row.instanceNumber}</span>
      )}
    </span>
  );
}

/** Lists overlapping address ranges. */
export function ConflictPanel({ conflicts, title, onHover }: ConflictPanelProps) {
  const { t } = useTranslation();
  if (conflicts.length === 0) return null;

  return (
    <section role="alert" className="rounded-lg border border-destructive/40 bg-destructive/[0.04]">
      <header className="flex items-center gap-2 border-b border-destructive/20 px-4 py-2.5 text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <h2 className="text-[13px] font-semibold">{title ?? t("dmx_patchplan.conflicts_title")}</h2>
        <span className="ml-auto font-mono text-[12px] tabular-nums">{conflicts.length}</span>
      </header>
      <ul className="divide-y divide-destructive/15">
        {conflicts.slice(0, LIMIT).map((c) => (
          <li
            key={`${c.row1.id}|${c.row2.id}`}
            className="flex flex-col gap-0.5 px-4 py-2 text-[13px] text-destructive sm:flex-row sm:items-center sm:gap-3"
            onMouseEnter={() => onHover?.(c.row1)}
            onMouseLeave={() => onHover?.(null)}
          >
            <span className="shrink-0 text-[12px] text-muted-foreground sm:w-24">
              {t("dmx.universe_number", { number: c.universe })}
            </span>
            <Side row={c.row1} />
            <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:inline">
              {t("dmx_patchplan.conflicts_overlaps_with")}
            </span>
            <Side row={c.row2} />
          </li>
        ))}
      </ul>
      {conflicts.length > LIMIT && (
        <p className="border-t border-destructive/20 px-4 py-2 text-[12px] text-muted-foreground">
          {t("dmx.conflicts_more", { count: conflicts.length - LIMIT })}
        </p>
      )}
    </section>
  );
}

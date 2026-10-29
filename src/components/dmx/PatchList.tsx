import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { groupByUniverse, padAddress } from "@/components/dmx/dmxFormat";

interface PatchListProps {
  rows: PatchplanRow[];
  conflictIndex: Map<string, PatchplanRow[]>;
  /** Undefined = read-only. */
  onEdit?: (row: PatchplanRow) => void;
}

/** Compact patch list for small screens, grouped by universe. Tap a row to edit. */
export function PatchList({ rows, conflictIndex, onEdit }: PatchListProps) {
  const { t } = useTranslation();

  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {groupByUniverse(rows).map(([universe, universeRows]) => (
        <section key={universe}>
          <div className="flex items-center justify-between bg-surface-sunken px-3 py-1.5">
            <span className="eyebrow">{t("dmx.universe_number", { number: universe })}</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{universeRows.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {universeRows.map((row) => {
              const others = conflictIndex.get(row.id);
              const conflict = !!others?.length;
              const content = (
                <>
                  <div className={cn("w-[74px] shrink-0 font-mono tabular-nums", conflict && "text-destructive")}>
                    <div className="text-[14px] font-medium leading-tight">
                      {row.universe}.{padAddress(row.startAddress)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      –{padAddress(row.endAddress)} · {t("dmx_table.channels_value", { count: row.channels })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {conflict && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />}
                      <span className="truncate text-[13px] font-medium">{row.itemName}</span>
                      {row.totalInstances > 1 && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          #{row.instanceNumber}
                        </span>
                      )}
                    </div>
                    {conflict ? (
                      <p className="truncate text-[12px] text-destructive">
                        {t("dmx_table.conflict_message", {
                          name: others[0].itemName,
                          start: padAddress(others[0].startAddress),
                          end: padAddress(others[0].endAddress),
                        })}
                      </p>
                    ) : (
                      row.location && <p className="truncate text-[12px] text-muted-foreground">{row.location}</p>
                    )}
                  </div>
                  {onEdit && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                </>
              );
              const cls = cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                conflict && "shadow-[inset_2px_0_0_hsl(var(--destructive))]"
              );
              return (
                <li key={row.id}>
                  {onEdit ? (
                    <button type="button" className={cn(cls, "active:bg-muted/60")} onClick={() => onEdit(row)}>
                      {content}
                    </button>
                  ) : (
                    <div className={cls}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

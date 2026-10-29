import { useState } from "react";
import { AlertTriangle, Download, LayoutGrid, List } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tArray } from "../tArray";

type PatchRow = { ch: string; name: string; instance: string; mode: string; conflict: boolean };
type ViewMode = "timeline" | "table";

const UNIVERSES = [
  { id: 1, used: 380, max: 512 },
  { id: 2, used: 96, max: 512 },
];
const DMX_CHANNELS = 512;

function usageTone(pct: number) {
  if (pct > 90) return "bg-destructive";
  if (pct > 70) return "bg-warning";
  return "bg-foreground/70";
}

function UniverseUsage() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
      {UNIVERSES.map((u) => {
        const pct = (u.used / u.max) * 100;
        return (
          <div key={u.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium">{t("landing.features.dmxWorkflow.universe.title", { id: u.id })}</span>
              <span className="tech text-xs text-muted-foreground">
                {t("landing.features.dmxWorkflow.universe.channels", { used: u.used, max: u.max })}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full", usageTone(pct))} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatchTable({ rows }: { rows: PatchRow[] }) {
  const { t } = useTranslation();
  return (
    <table className="w-full text-[13px]">
      <thead className="bg-surface-sunken text-xs text-muted-foreground">
        <tr className="border-b border-border">
          <th className="w-20 px-4 py-2 text-left font-medium">{t("landing.features.dmxWorkflow.table.columns.address")}</th>
          <th className="px-3 py-2 text-left font-medium">{t("landing.features.dmxWorkflow.table.columns.fixture")}</th>
          <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
            {t("landing.features.dmxWorkflow.table.columns.instance")}
          </th>
          <th className="px-4 py-2 text-left font-medium">{t("landing.features.dmxWorkflow.table.columns.mode")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <tr key={`${row.ch}-${row.name}`} className={cn(row.conflict && "bg-destructive/5")}>
            <td className={cn("tech px-4 py-2.5", row.conflict ? "text-destructive" : "text-foreground")}>{row.ch}</td>
            <td className="px-3 py-2.5">
              <span className="truncate">{row.name}</span>
            </td>
            <td className="tech hidden px-3 py-2.5 text-muted-foreground sm:table-cell">{row.instance}</td>
            <td className="px-4 py-2.5">
              <span className="flex items-center gap-2">
                <span className="tech text-muted-foreground">{row.mode}</span>
                {row.conflict && <Badge variant="defect">{t("landing.features.dmxWorkflow.table.conflict")}</Badge>}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Channel strip: each fixture as a bar positioned on the 512-channel universe. */
function PatchTimeline({ rows }: { rows: PatchRow[] }) {
  return (
    <div className="space-y-1.5 px-4 py-4">
      {rows.map((row) => {
        const start = Number.parseInt(row.ch, 10) || 1;
        const width = Number.parseInt(row.mode, 10) || 1;
        return (
          <div key={`${row.ch}-${row.name}`} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs">{row.name}</span>
            <div className="relative h-5 flex-1 rounded-sm border border-border bg-surface-sunken">
              <div
                className={cn(
                  "absolute inset-y-0 flex items-center rounded-sm px-1",
                  row.conflict ? "bg-destructive/20 ring-1 ring-destructive/50" : "bg-foreground/15"
                )}
                style={{ left: `${((start - 1) / DMX_CHANNELS) * 100}%`, width: `${Math.max((width / DMX_CHANNELS) * 100, 1.2)}%` }}
              />
            </div>
            <span className="tech w-8 shrink-0 text-right text-xs text-muted-foreground">{row.ch}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Patch plan mock: universe usage, conflict notice, table/timeline toggle. */
export function DmxPatchMock() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>("table");
  const rows = tArray<PatchRow>(t, "landing.features.dmxWorkflow.patchRows");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-sunken px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{t("landing.features.dmxWorkflow.table.title")}</span>
          <span className="text-xs text-muted-foreground">
            {t("landing.features.dmxWorkflow.table.assignments", { count: rows.length })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 overflow-hidden rounded-md border border-border" role="group">
            {(["timeline", "table"] as const).map((m, idx) => {
              const Icon = m === "timeline" ? LayoutGrid : List;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setView(m)}
                  aria-pressed={view === m}
                  aria-label={t(`landing.features.dmxWorkflow.table.view.${m}`)}
                  title={t(`landing.features.dmxWorkflow.table.view.${m}`)}
                  className={cn(
                    "flex items-center px-2 transition-colors",
                    idx > 0 && "border-l border-border",
                    view === m ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <span className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {t("landing.features.dmxWorkflow.table.export")}
          </span>
        </div>
      </div>

      <UniverseUsage />

      <div className="flex items-start gap-2.5 border-b border-destructive/25 bg-destructive/5 px-4 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="text-xs">
          <div className="font-medium text-destructive">{t("landing.features.dmxWorkflow.conflict.title")}</div>
          <div className="mt-0.5 text-muted-foreground">
            <Trans
              i18nKey="landing.features.dmxWorkflow.conflict.message"
              values={{ fixture1: "Stroboskop Elation #1 (048–051)", fixture2: "PAR LED RGB #1 (048–050)" }}
              components={{ strong: <strong className="font-medium text-foreground" /> }}
            />
          </div>
        </div>
      </div>

      {view === "table" ? <PatchTable rows={rows} /> : <PatchTimeline rows={rows} />}
    </div>
  );
}

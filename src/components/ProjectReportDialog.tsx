/**
 * Project report: on-screen preview (app theme) + printable A4 document
 * (plain black-on-white HTML, opened in a new window).
 */
import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { de as deDateLocale, enUS } from "date-fns/locale";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProjectTodo } from "@/types/project";
import type { EnrichedProjectItem, ItemReturnCondition, ProjectPackageGroup } from "@/hooks/useProjectDetail";
import { cn } from "@/lib/utils";

type Condition = ItemReturnCondition;
interface ConflictInfo { type: "lending" | "project" | "defect"; label: string; }

export interface ProjectReportDialogProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  packageGroups: ProjectPackageGroup[];
  directItems: EnrichedProjectItem[];
  allItems: EnrichedProjectItem[];
  todos: ProjectTodo[];
  conditions: Record<string, Condition>;
  conflicts: Record<string, ConflictInfo>;
  dmxRows?: Array<{
    id: string;
    itemName: string;
    instanceNumber: number;
    totalInstances: number;
    universe: number;
    startAddress: number;
    endAddress: number;
    channels: number;
  }>;
}

type ReportProps = Omit<ProjectReportDialogProps, "open" | "onClose">;

const COND_TEXT: Record<Condition, string> = {
  ok: "text-success",
  damaged: "text-warning",
  missing: "text-destructive",
};

// ── Shared data preparation ───────────────────────────────────────────────────

function prepareReportData(props: ReportProps, t: TFunction, language: string) {
  const { project, allItems, todos, conditions } = props;
  const locale: Locale = language.startsWith("de") ? deDateLocale : enUS;
  const fmt = (d: string | null | undefined) => (d ? format(parseISO(d), t("report.date_format"), { locale }) : null);
  const condOf = (item: EnrichedProjectItem): Condition => conditions[item.id] ?? item.condition ?? "ok";

  const start = fmt(project.event_date_start);
  const end = fmt(project.event_date_end);
  return {
    condOf,
    generatedAt: format(new Date(), t("report.datetime_format"), { locale }),
    period: start ? (end && end !== start ? `${start} – ${end}` : start) : null,
    okCount: allItems.filter(i => condOf(i) === "ok").length,
    damaged: allItems.filter(i => condOf(i) === "damaged"),
    missing: allItems.filter(i => condOf(i) === "missing"),
    doneCount: todos.filter(td => td.done).length,
  };
}

// ── Preview (React) ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}

function ItemTable({ items, condOf }: { items: EnrichedProjectItem[]; condOf: (i: EnrichedProjectItem) => Condition }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium">{t("report.table.article")}</th>
            <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">{t("report.table.category")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("report.table.qty")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("report.table.condition")}</th>
            <th className="px-3 py-2 text-center font-medium">{t("report.table.packed")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map(item => {
            const cond = condOf(item);
            return (
              <tr key={item.id}>
                <td className="px-3 py-2">{item.item_name ?? "–"}</td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{item.item_category ?? "–"}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                <td className={cn("px-3 py-2 text-xs font-medium", COND_TEXT[cond])}>{t(`report.cond.${cond}`)}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">{item.packed ? "✓" : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportPreview(props: ReportProps) {
  const { project, packageGroups, directItems, allItems, todos, dmxRows } = props;
  const { t, i18n } = useTranslation();
  const data = prepareReportData(props, t, i18n.language);

  const stats = [
    { key: "stat_total", value: allItems.length, cls: "" },
    { key: "stat_ok", value: data.okCount, cls: "" },
    { key: "stat_damaged", value: data.damaged.length, cls: data.damaged.length ? "text-warning" : "text-muted-foreground" },
    { key: "stat_missing", value: data.missing.length, cls: data.missing.length ? "text-destructive" : "text-muted-foreground" },
  ];

  const meta = [
    data.period && { label: t("report.meta.period"), value: data.period },
    project.location && { label: t("report.meta.location"), value: project.location },
    { label: t("report.meta.equipment"), value: t("report.meta.equipment_count", { count: allItems.length }) },
    { label: t("report.meta.created_label"), value: data.generatedAt },
  ].filter((m): m is { label: string; value: string } => !!m);

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{t("report.subtitle")}</p>
            <h2 className="mt-1 truncate text-lg font-semibold">{project.name}</h2>
            {project.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{project.description}</p>}
          </div>
          <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {t(`project_status.${project.status}`, { defaultValue: project.status })}
          </span>
        </div>
        <dl className="surface grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
          {meta.map(m => (
            <div key={m.label} className="bg-card px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Section title={t("report.inventory.title")}>
        <div className="surface grid grid-cols-4 gap-px overflow-hidden bg-border">
          {stats.map(s => (
            <div key={s.key} className="bg-card px-3 py-2.5">
              <p className={cn("font-mono text-xl font-semibold tabular-nums leading-none", s.cls)}>{s.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t(`report.inventory.${s.key}`)}</p>
            </div>
          ))}
        </div>

        {data.missing.length === 0 && data.damaged.length === 0 && (
          <p className="text-[13px] text-success">{t("report.inventory.all_ok")}</p>
        )}

        {packageGroups.map(group => (
          <div key={group.instanceId} className="space-y-1.5 pt-1">
            <p className="text-[13px] font-medium">{group.package.name}</p>
            <ItemTable items={group.items} condOf={data.condOf} />
          </div>
        ))}
        {directItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[13px] font-medium">{t("report.inventory.direct_items")}</p>
            <ItemTable items={directItems} condOf={data.condOf} />
          </div>
        )}
      </Section>

      {todos.length > 0 && (
        <Section title={t("report.checklist.title", { done: data.doneCount, total: todos.length })}>
          <ul className="surface divide-y divide-border">
            {todos.map(todo => (
              <li key={todo.id} className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
                <span className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px]",
                  todo.done ? "border-foreground bg-foreground text-background" : "border-border-strong",
                )}>
                  {todo.done && "✓"}
                </span>
                <span className={cn(todo.done && "text-muted-foreground line-through")}>{todo.title}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {dmxRows && dmxRows.length > 0 && (
        <Section title={t("report.dmx.title")}>
          <div className="surface overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">{t("report.dmx.col_device")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("report.dmx.col_universe")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("report.dmx.col_start")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("report.dmx.col_end")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("report.dmx.col_channels")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                {dmxRows.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-sans">
                      {row.itemName}
                      {row.totalInstances > 1 && <span className="ml-1 text-muted-foreground">#{row.instanceNumber}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{row.universe}</td>
                    <td className="px-3 py-2 text-right">{row.startAddress}</td>
                    <td className="px-3 py-2 text-right">{row.endAddress}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.channels}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {project.notes && (
        <Section title={t("report.notes.title")}>
          <p className="surface whitespace-pre-wrap px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">{project.notes}</p>
        </Section>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span>{t("report.footer", { name: project.name })}</span>
        <span>{t("report.meta.generated_at", { date: data.generatedAt })}</span>
      </div>
    </div>
  );
}

// ── Print document (plain HTML, paper styling) ────────────────────────────────

const esc = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string
  ));

const PRINT_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9.5pt;line-height:1.5;color:#111;background:#fff;padding:14mm 13mm}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#777}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:10px;border-bottom:1.5px solid #111;margin-bottom:12px}
h1{font-size:17pt;font-weight:700;letter-spacing:-.2px;margin-top:2px}
.desc{color:#555;margin-top:2px}
.status{border:1px solid #999;border-radius:3px;padding:1px 7px;font-size:8pt;white-space:nowrap}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.meta .v{font-weight:600;margin-top:1px}
section{margin-bottom:18px}
h2{font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #ccc;margin-bottom:10px}
.stats div{padding:6px 8px;border-left:1px solid #ccc}.stats div:first-child{border-left:none}
.stats .n{font-size:15pt;font-weight:700;line-height:1.1}
.note{font-size:9pt;margin-bottom:8px}
.pkg{font-weight:600;margin:10px 0 4px}
table{width:100%;border-collapse:collapse;font-size:8.5pt}
th{text-align:left;font-weight:600;font-size:7pt;text-transform:uppercase;letter-spacing:.05em;color:#555;padding:4px 6px;border-bottom:1px solid #999}
td{padding:4px 6px;border-bottom:1px solid #e2e2e2;vertical-align:top}
tr{break-inside:avoid}
.r{text-align:right}.c{text-align:center}.muted{color:#666}
.damaged{font-weight:600}.missing{font-weight:700;text-decoration:underline}
.todo{display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #eee}
.box{width:10px;height:10px;border:1px solid #555;flex-shrink:0;margin-top:3px;font-size:7pt;line-height:9px;text-align:center}
.done{color:#777;text-decoration:line-through}
.notes{white-space:pre-wrap;color:#333}
footer{margin-top:20px;padding-top:6px;border-top:1px solid #ccc;display:flex;justify-content:space-between;font-size:7.5pt;color:#888}
@page{size:A4;margin:14mm 12mm}
@media print{body{padding:0}}
`;

function buildPrintHTML(props: ReportProps, t: TFunction, language: string, data: ReturnType<typeof prepareReportData>): string {
  const { project, packageGroups, directItems, allItems, todos, dmxRows } = props;

  const itemRow = (item: EnrichedProjectItem) => {
    const cond = data.condOf(item);
    return `<tr>
      <td>${esc(item.item_name ?? "–")}</td>
      <td class="muted">${esc(item.item_category ?? "–")}</td>
      <td class="r mono">${esc(item.quantity)}</td>
      <td class="${cond}">${esc(t(`report.cond.${cond}`))}</td>
      <td class="c">${item.packed ? "✓" : "–"}</td>
    </tr>`;
  };

  const itemTable = (items: EnrichedProjectItem[]) => `<table>
    <thead><tr>
      <th>${esc(t("report.table.article"))}</th>
      <th>${esc(t("report.table.category"))}</th>
      <th class="r" style="width:42px">${esc(t("report.table.qty"))}</th>
      <th style="width:80px">${esc(t("report.table.condition"))}</th>
      <th class="c" style="width:56px">${esc(t("report.table.packed"))}</th>
    </tr></thead>
    <tbody>${items.map(itemRow).join("")}</tbody>
  </table>`;

  const flagged = (items: EnrichedProjectItem[], key: string) => items.length === 0 ? "" :
    `<p class="note"><strong>${esc(t(key, { count: items.length }))}:</strong> ${items
      .map(i => `${esc(i.item_name ?? "–")} (${esc(i.quantity)})`).join(", ")}</p>`;

  const meta = [
    data.period && [t("report.meta.period"), data.period],
    project.location && [t("report.meta.location"), project.location],
    [t("report.meta.equipment"), t("report.meta.equipment_count", { count: allItems.length })],
    [t("report.meta.created_label"), data.generatedAt],
  ].filter(Boolean) as [string, string][];

  return `<!DOCTYPE html><html lang="${esc(language)}"><head>
<meta charset="UTF-8"/><title>${esc(t("report.title"))} – ${esc(project.name)}</title>
<style>${PRINT_CSS}</style></head><body>

<header>
  <div>
    <div class="eyebrow">${esc(t("report.subtitle"))}</div>
    <h1>${esc(project.name)}</h1>
    ${project.description ? `<div class="desc">${esc(project.description)}</div>` : ""}
  </div>
  <span class="status">${esc(t(`project_status.${project.status}`, { defaultValue: project.status }))}</span>
</header>

<div class="meta">
  ${meta.map(([l, v]) => `<div><div class="eyebrow">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join("")}
</div>

<section>
  <h2>${esc(t("report.inventory.title"))}</h2>
  <div class="stats">
    <div><div class="n mono">${allItems.length}</div><div class="eyebrow">${esc(t("report.inventory.stat_total"))}</div></div>
    <div><div class="n mono">${data.okCount}</div><div class="eyebrow">${esc(t("report.inventory.stat_ok"))}</div></div>
    <div><div class="n mono">${data.damaged.length}</div><div class="eyebrow">${esc(t("report.inventory.stat_damaged"))}</div></div>
    <div><div class="n mono">${data.missing.length}</div><div class="eyebrow">${esc(t("report.inventory.stat_missing"))}</div></div>
  </div>
  ${flagged(data.missing, "report.inventory.missing_items")}
  ${flagged(data.damaged, "report.inventory.damaged_items")}
  ${data.missing.length === 0 && data.damaged.length === 0 ? `<p class="note">${esc(t("report.inventory.all_ok"))}</p>` : ""}
  ${packageGroups.map(g => `<div class="pkg">${esc(g.package.name)}</div>${itemTable(g.items)}`).join("")}
  ${directItems.length > 0 ? `<div class="pkg">${esc(t("report.inventory.direct_items"))}</div>${itemTable(directItems)}` : ""}
</section>

${todos.length > 0 ? `<section>
  <h2>${esc(t("report.checklist.title", { done: data.doneCount, total: todos.length }))}</h2>
  ${todos.map(td => `<div class="todo"><span class="box">${td.done ? "✓" : ""}</span><span class="${td.done ? "done" : ""}">${esc(td.title)}</span></div>`).join("")}
</section>` : ""}

${dmxRows && dmxRows.length > 0 ? `<section>
  <h2>${esc(t("report.dmx.title"))}</h2>
  <table>
    <thead><tr>
      <th>${esc(t("report.dmx.col_device"))}</th>
      <th class="r" style="width:60px">${esc(t("report.dmx.col_universe"))}</th>
      <th class="r" style="width:54px">${esc(t("report.dmx.col_start"))}</th>
      <th class="r" style="width:54px">${esc(t("report.dmx.col_end"))}</th>
      <th class="r" style="width:40px">${esc(t("report.dmx.col_channels"))}</th>
    </tr></thead>
    <tbody>${dmxRows.map(r => `<tr>
      <td>${esc(r.itemName)}${r.totalInstances > 1 ? ` <span class="muted">#${esc(r.instanceNumber)}</span>` : ""}</td>
      <td class="r mono">${esc(r.universe)}</td>
      <td class="r mono">${esc(r.startAddress)}</td>
      <td class="r mono">${esc(r.endAddress)}</td>
      <td class="r mono muted">${esc(r.channels)}</td>
    </tr>`).join("")}</tbody>
  </table>
</section>` : ""}

${project.notes ? `<section><h2>${esc(t("report.notes.title"))}</h2><div class="notes">${esc(project.notes)}</div></section>` : ""}

<footer>
  <span>${esc(t("report.footer", { name: project.name }))}</span>
  <span>${esc(t("report.meta.generated_at", { date: data.generatedAt }))}</span>
</footer>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body></html>`;
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export function ProjectReportDialog({ open, onClose, ...rest }: ProjectReportDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const data = prepareReportData(rest, t, i18n.language);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=920,height=780");
    if (!w) {
      toast({ title: t("project_detail.report.popup_blocked"), variant: "destructive" });
      return;
    }
    w.document.write(buildPrintHTML(rest, t, i18n.language, data));
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 pb-4 pt-5">
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>{t("report.preview_hint")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {open && <ReportPreview {...rest} />}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{t("common.close")}</Button>
          <Button onClick={handlePrint}>
            <Printer />
            {t("report.print_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

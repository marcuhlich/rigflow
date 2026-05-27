/**
 * ProjectReportDialog.tsx — i18n
 */

import { format } from "date-fns";
import type { Locale } from "date-fns";
import { de as deDateLocale, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer, X, CheckCircle2, AlertTriangle, XCircle,
  Package, ClipboardList, Sliders,
} from "lucide-react";
import { Project, ProjectTodo } from "@/types/project";
import { EnrichedProjectItem, ProjectPackageGroup } from "@/hooks/useProjectDetail";
import { cn } from "@/lib/utils";

// ── Typen ─────────────────────────────────────────────────────────────────────
type Condition = "ok" | "damaged" | "missing";
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

// ── Statische Stil-Konfiguration (Labels werden per t() aufgelöst) ────────────
const COND_STYLE = {
  ok:      { color: "#16a34a", bg: "#f0fdf4", icon: "✓" },
  damaged: { color: "#d97706", bg: "#fffbeb", icon: "⚠" },
  missing: { color: "#dc2626", bg: "#fef2f2", icon: "✗" },
} as const;

// ── Datum-Hilfsfunktion ───────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined, dateFormat: string, locale: Locale) {
  return d ? format(new Date(d), dateFormat, { locale }) : null;
}

// ── Hilfskomponenten ──────────────────────────────────────────────────────────
function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
        <span className="text-primary opacity-80">{icon}</span>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ItemTable({
  items, conditions,
}: {
  items: EnrichedProjectItem[];
  conditions: Record<string, Condition>;
}) {
  const { t } = useTranslation();
  if (!items.length) return null;

  const headers = [
    { label: t('report.table.article'),   cls: "text-left"   },
    { label: t('report.table.category'),  cls: "text-center hidden sm:table-cell" },
    { label: t('report.table.qty'),       cls: "text-center" },
    { label: t('report.table.condition'), cls: "text-center" },
    { label: t('report.table.packed'),    cls: "text-center" },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border/60">
            {headers.map(h => (
              <th key={h.label} className={cn(
                "px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide",
                h.cls,
              )}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map(item => {
            const cond  = conditions[item.id] ?? "ok";
            const style = COND_STYLE[cond];
            return (
              <tr key={item.id} className="bg-card hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-medium">{item.item_name ?? "–"}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                  {item.item_category ?? "–"}
                </td>
                <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ color: style.color, background: style.bg + "55" }}
                  >
                    {style.icon} {t(`report.cond.${cond}`)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {item.packed
                    ? <span className="text-green-400 font-bold">✓</span>
                    : <span className="text-muted-foreground/40 text-xs">–</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── ReportPreview (React, dark-theme-aware) ───────────────────────────────────
type ReportProps = Omit<ProjectReportDialogProps, "open" | "onClose">;

function ReportPreview(props: ReportProps) {
  const { project, packageGroups, directItems, allItems, todos, conditions, dmxRows } = props;
  const { t, i18n: i18nInst } = useTranslation();

  const dateLocale     = i18nInst.language.startsWith('de') ? deDateLocale : enUS;
  const dateFormat     = t('report.date_format');
  const dateTimeFormat = t('report.datetime_format');

  const generatedAt = format(new Date(), dateTimeFormat, { locale: dateLocale });
  const dateStart   = fmtDate(project.event_date_start, dateFormat, dateLocale);
  const dateEnd     = fmtDate(project.event_date_end,   dateFormat, dateLocale);

  const okItems      = allItems.filter(i => (conditions[i.id] ?? "ok") === "ok");
  const damagedItems = allItems.filter(i => (conditions[i.id] ?? "ok") === "damaged");
  const missingItems = allItems.filter(i => (conditions[i.id] ?? "ok") === "missing");
  const doneCount    = todos.filter(td => td.done).length;

  const stats = [
    { key: 'stat_total',   value: allItems.length,     cls: "bg-muted/40 border-border/60 text-foreground" },
    { key: 'stat_ok',      value: okItems.length,      cls: "bg-green-500/10 border-green-500/25 text-green-400" },
    { key: 'stat_damaged', value: damagedItems.length, cls: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
    { key: 'stat_missing', value: missingItems.length, cls: "bg-destructive/10 border-destructive/25 text-destructive" },
  ];

  return (
    <div className="space-y-6 text-sm pb-2">

      {/* ── Kopfdaten ── */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              {t('report.subtitle')}
            </p>
            <h2 className="text-lg font-bold leading-tight truncate">{project.name}</h2>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
            )}
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-border bg-muted/50 text-muted-foreground">
            {t(`project_status.${project.status}`, { defaultValue: project.status })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/40">
          {dateStart && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                {t('report.meta.period')}
              </p>
              <p className="text-xs font-medium">
                {dateStart}
                {dateEnd && dateEnd !== dateStart && (
                  <><br /><span className="text-muted-foreground text-[10px]">{t('report.meta.until')} {dateEnd}</span></>
                )}
              </p>
            </div>
          )}
          {project.location && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                {t('report.meta.location')}
              </p>
              <p className="text-xs font-medium">{project.location}</p>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              {t('report.meta.equipment')}
            </p>
            <p className="text-xs font-medium">
              {t('report.meta.equipment_count', { count: allItems.length })}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              {t('report.meta.created_label')}
            </p>
            <p className="text-xs font-medium">{generatedAt}</p>
          </div>
        </div>
      </div>

      {/* ── Inventar-Bilanz ── */}
      <Section icon={<Package className="h-3.5 w-3.5" />} title={t('report.inventory.title')}>

        <div className="grid grid-cols-4 gap-2">
          {stats.map(s => (
            <div key={s.key} className={cn("rounded-lg border p-3 text-center", s.cls)}>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t(`report.inventory.${s.key}`)}</p>
            </div>
          ))}
        </div>

        {missingItems.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              {t('report.inventory.missing_items', { count: missingItems.length })}
            </p>
            {missingItems.map(i => (
              <p key={i.id} className="text-xs text-muted-foreground pl-1">
                · <span className="font-medium text-foreground/80">{i.item_name ?? "–"}</span> ×{i.quantity}
                {i.item_category && <span className="text-muted-foreground/60"> ({i.item_category})</span>}
              </p>
            ))}
          </div>
        )}

        {damagedItems.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('report.inventory.damaged_items', { count: damagedItems.length })}
            </p>
            {damagedItems.map(i => (
              <p key={i.id} className="text-xs text-muted-foreground pl-1">
                · <span className="font-medium text-foreground/80">{i.item_name ?? "–"}</span> ×{i.quantity}
                {i.item_category && <span className="text-muted-foreground/60"> ({i.item_category})</span>}
              </p>
            ))}
          </div>
        )}

        {missingItems.length === 0 && damagedItems.length === 0 && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-xs font-medium text-green-400">{t('report.inventory.all_ok')}</p>
          </div>
        )}

        {packageGroups.map(group => (
          <div key={group.instanceId} className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-0.5">
              {group.package.name}
            </p>
            <ItemTable items={group.items} conditions={conditions} />
          </div>
        ))}

        {directItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-0.5">
              {t('report.inventory.direct_items')}
            </p>
            <ItemTable items={directItems} conditions={conditions} />
          </div>
        )}
      </Section>

      {/* ── Checkliste ── */}
      {todos.length > 0 && (
        <Section
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          title={t('report.checklist.title', { done: doneCount, total: todos.length })}
        >
          <div className="rounded-lg border border-border divide-y divide-border/40 overflow-hidden">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 px-3 py-2 bg-card">
                <div className={cn(
                  "h-4 w-4 rounded border shrink-0 flex items-center justify-center text-[9px] font-bold",
                  todo.done
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "border-border/60 bg-muted/20",
                )}>
                  {todo.done && "✓"}
                </div>
                <span className={cn("text-xs flex-1", todo.done && "line-through text-muted-foreground")}>
                  {todo.title}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── DMX-Patchplan ── */}
      {dmxRows && dmxRows.length > 0 && (
        <Section icon={<Sliders className="h-3.5 w-3.5" />} title={t('report.dmx.title')}>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border/60">
                  {[
                    { key: 'col_device',   cls: "text-left"   },
                    { key: 'col_universe', cls: "text-center" },
                    { key: 'col_start',    cls: "text-center" },
                    { key: 'col_end',      cls: "text-center" },
                    { key: 'col_channels', cls: "text-center" },
                  ].map(h => (
                    <th key={h.key} className={cn(
                      "px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide",
                      h.cls,
                    )}>
                      {t(`report.dmx.${h.key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {dmxRows.map(row => (
                  <tr key={row.id} className="bg-card">
                    <td className="px-3 py-2 font-medium">
                      {row.itemName}
                      {row.totalInstances > 1 && (
                        <span className="text-muted-foreground ml-1 text-[10px]">#{row.instanceNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.universe}</td>
                    <td className="px-3 py-2 text-center font-mono">{row.startAddress}</td>
                    <td className="px-3 py-2 text-center font-mono">{row.endAddress}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.channels}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Notizen ── */}
      {project.notes && (
        <Section icon={<span className="text-sm">📝</span>} title={t('report.notes.title')}>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {project.notes}
            </p>
          </div>
        </Section>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-border/50 pt-3 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {t('report.footer', { name: project.name })}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t('report.meta.generated_at', { date: generatedAt })}
        </span>
      </div>
    </div>
  );
}

// ── Print-HTML ─────────────────────────────────────────────────────────────────
function buildPrintHTML(props: ReportProps): string {
  const { project, packageGroups, directItems, allItems, todos, conditions, dmxRows } = props;

  const tf          = i18n.t.bind(i18n);
  const dateLocale  = i18n.language.startsWith('de') ? deDateLocale : enUS;
  const dateFormat  = tf('report.date_format');
  const dtFormat    = tf('report.datetime_format');

  const generatedAt = format(new Date(), dtFormat, { locale: dateLocale });
  const ds          = fmtDate(project.event_date_start, dateFormat, dateLocale);
  const de_         = fmtDate(project.event_date_end,   dateFormat, dateLocale);

  const okCount      = allItems.filter(i => (conditions[i.id] ?? "ok") === "ok").length;
  const damagedItems = allItems.filter(i => (conditions[i.id] ?? "ok") === "damaged");
  const missingItems = allItems.filter(i => (conditions[i.id] ?? "ok") === "missing");
  const doneCount    = todos.filter(t => t.done).length;

  const trRow = (item: EnrichedProjectItem) => {
    const cond  = conditions[item.id] ?? "ok";
    const style = COND_STYLE[cond];
    return `<tr>
      <td>${item.item_name ?? "–"}</td>
      <td style="color:#666">${item.item_category ?? "–"}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:center">
        <span style="color:${style.color};background:${style.bg};padding:1px 6px;border-radius:4px;font-size:8.5pt;font-weight:600">
          ${style.icon} ${tf(`report.cond.${cond}`)}
        </span>
      </td>
      <td style="text-align:center;color:${item.packed ? "#16a34a" : "#aaa"};font-weight:600">
        ${item.packed ? "✓" : "–"}
      </td>
    </tr>`;
  };

  const tbl = (rows: string) => `<table>
    <thead><tr>
      <th>${tf('report.table.article')}</th>
      <th>${tf('report.table.category')}</th>
      <th style="width:48px">${tf('report.table.qty')}</th>
      <th style="width:88px">${tf('report.table.condition')}</th>
      <th style="width:62px">${tf('report.table.packed')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  return `<!DOCTYPE html><html lang="${i18n.language}"><head>
<meta charset="UTF-8"/><title>${tf('report.title')} – ${project.name}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;font-size:10pt;line-height:1.55;color:#111;background:#fff;padding:16mm 15mm}
.header{border:1.5px solid #ddd;border-radius:8px;padding:14px 16px;margin-bottom:20px;position:relative}
.label{font-size:7.5pt;font-weight:800;text-transform:uppercase;letter-spacing:0.9px;color:#999;margin-bottom:2px}
h1{font-size:19pt;font-weight:800;letter-spacing:-0.3px;margin-bottom:3px}
.subtitle{font-size:9.5pt;color:#666;margin-bottom:10px}
.status-pill{position:absolute;top:14px;right:16px;padding:3px 10px;border-radius:20px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ccc;background:#f5f5f5;color:#555}
.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding-top:10px;border-top:1px solid #eee;margin-top:10px}
.meta-val{font-size:9.5pt;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.stat{border:1px solid #ddd;border-radius:6px;padding:9px;text-align:center}
.stat-n{font-size:19pt;font-weight:800;line-height:1}
.stat-l{font-size:7.5pt;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:0.4px}
.ok{color:#16a34a;border-color:#86efac;background:#f0fdf4}
.damaged{color:#d97706;border-color:#fcd34d;background:#fffbeb}
.missing{color:#dc2626;border-color:#fca5a5;background:#fef2f2}
.alert{border-radius:6px;padding:9px 11px;margin-bottom:10px}
.alert.miss{border:1px solid #fca5a5;background:#fef2f2}
.alert.dmg{border:1px solid #fcd34d;background:#fffbeb}
.alert.good{border:1px solid #86efac;background:#f0fdf4}
.alert-title{font-size:9.5pt;font-weight:700;margin-bottom:4px}
.miss .alert-title{color:#dc2626}.dmg .alert-title{color:#d97706}.good .alert-title{color:#16a34a}
.alert li{font-size:9pt;color:#555;margin-left:1em}
.section{margin-bottom:20px;break-inside:avoid}
h2{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:0.9px;color:#888;border-bottom:1px solid #e8e8e8;padding-bottom:5px;margin-bottom:10px}
.pkg-label{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#777;margin:10px 0 5px}
table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:2px}
th{background:#f5f5f5;font-weight:700;text-align:left;padding:5px 8px;border:1px solid #e0e0e0;font-size:7.5pt;text-transform:uppercase;letter-spacing:0.3px;color:#666}
td{padding:5px 8px;border:1px solid #ebebeb;vertical-align:middle}
tr:nth-child(even) td{background:#fafafa}
.todo-list{border:1px solid #ebebeb;border-radius:6px;overflow:hidden}
.todo-row{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:9.5pt}
.todo-row:last-child{border-bottom:none}
.chk{width:13px;height:13px;border:1.5px solid #ccc;border-radius:3px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:8pt}
.chk.done{background:#16a34a;border-color:#16a34a;color:#fff}
.done-txt{text-decoration:line-through;color:#bbb}
.notes{background:#fafafa;border:1px solid #ebebeb;border-radius:6px;padding:9px 11px;font-size:9.5pt;color:#555;white-space:pre-wrap;line-height:1.6}
.footer{margin-top:22px;padding-top:8px;border-top:1px solid #e8e8e8;display:flex;justify-content:space-between;font-size:8pt;color:#bbb}
@page{size:A4;margin:16mm 13mm}
@media print{body{padding:0}.section{break-inside:avoid}}
</style></head><body>

<div class="header">
  <div class="status-pill">${tf(`project_status.${project.status}`, { defaultValue: project.status })}</div>
  <div class="label">${tf('report.subtitle')}</div>
  <h1>${project.name}</h1>
  ${project.description ? `<div class="subtitle">${project.description}</div>` : ""}
  <div class="meta-grid">
    ${ds ? `<div><div class="label">${tf('report.meta.period')}</div><div class="meta-val">${ds}${de_ && de_ !== ds ? ` – ${de_}` : ""}</div></div>` : ""}
    ${project.location ? `<div><div class="label">${tf('report.meta.location')}</div><div class="meta-val">${project.location}</div></div>` : ""}
    <div><div class="label">${tf('report.meta.equipment')}</div><div class="meta-val">${tf('report.meta.equipment_count', { count: allItems.length })}</div></div>
    <div><div class="label">${tf('report.meta.created_label')}</div><div class="meta-val">${generatedAt}</div></div>
  </div>
</div>

<div class="section">
  <h2>📦 ${tf('report.inventory.title')}</h2>
  <div class="stats">
    <div class="stat">         <div class="stat-n">${allItems.length}</div>    <div class="stat-l">${tf('report.inventory.stat_total')}</div></div>
    <div class="stat ok">      <div class="stat-n">${okCount}</div>             <div class="stat-l">${tf('report.inventory.stat_ok')}</div></div>
    <div class="stat damaged"> <div class="stat-n">${damagedItems.length}</div> <div class="stat-l">${tf('report.inventory.stat_damaged')}</div></div>
    <div class="stat missing"> <div class="stat-n">${missingItems.length}</div> <div class="stat-l">${tf('report.inventory.stat_missing')}</div></div>
  </div>

  ${missingItems.length > 0 ? `<div class="alert miss">
    <div class="alert-title">✗ ${tf('report.inventory.missing_items', { count: missingItems.length })}</div>
    <ul>${missingItems.map(i => `<li>${i.item_name ?? "–"} ×${i.quantity}${i.item_category ? ` (${i.item_category})` : ""}</li>`).join("")}</ul>
  </div>` : ""}

  ${damagedItems.length > 0 ? `<div class="alert dmg">
    <div class="alert-title">⚠ ${tf('report.inventory.damaged_items', { count: damagedItems.length })}</div>
    <ul>${damagedItems.map(i => `<li>${i.item_name ?? "–"} ×${i.quantity}${i.item_category ? ` (${i.item_category})` : ""}</li>`).join("")}</ul>
  </div>` : ""}

  ${missingItems.length === 0 && damagedItems.length === 0 ? `<div class="alert good">
    <div class="alert-title">✓ ${tf('report.inventory.all_ok')}</div>
  </div>` : ""}

  ${packageGroups.map(g => `
    <div class="pkg-label">${g.package.name}</div>
    ${tbl(g.items.map(trRow).join(""))}
  `).join("")}

  ${directItems.length > 0
    ? `<div class="pkg-label">${tf('report.inventory.direct_items')}</div>${tbl(directItems.map(trRow).join(""))}`
    : ""}
</div>

${todos.length > 0 ? `<div class="section">
  <h2>☑ ${tf('report.checklist.title', { done: doneCount, total: todos.length })}</h2>
  <div class="todo-list">
    ${todos.map(todo => `<div class="todo-row">
      <div class="chk ${todo.done ? "done" : ""}">${todo.done ? "✓" : ""}</div>
      <span class="${todo.done ? "done-txt" : ""}">${todo.title}</span>
    </div>`).join("")}
  </div>
</div>` : ""}

${dmxRows && dmxRows.length > 0 ? `<div class="section">
  <h2>⚡ ${tf('report.dmx.title')}</h2>
  <table>
    <thead><tr>
      <th>${tf('report.dmx.col_device')}</th>
      <th style="width:66px;text-align:center">${tf('report.dmx.col_universe')}</th>
      <th style="width:60px;text-align:center">${tf('report.dmx.col_start')}</th>
      <th style="width:60px;text-align:center">${tf('report.dmx.col_end')}</th>
      <th style="width:44px;text-align:center">${tf('report.dmx.col_channels')}</th>
    </tr></thead>
    <tbody>
      ${dmxRows.map(r => `<tr>
        <td>${r.itemName}${r.totalInstances > 1 ? ` <span style="color:#aaa">#${r.instanceNumber}</span>` : ""}</td>
        <td style="text-align:center;color:#666">${r.universe}</td>
        <td style="text-align:center;font-family:monospace">${r.startAddress}</td>
        <td style="text-align:center;font-family:monospace">${r.endAddress}</td>
        <td style="text-align:center;color:#666">${r.channels}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

${project.notes ? `<div class="section">
  <h2>📝 ${tf('report.notes.title')}</h2>
  <div class="notes">${project.notes}</div>
</div>` : ""}

<div class="footer">
  <span>${tf('report.footer', { name: project.name })}</span>
  <span>${tf('report.meta.generated_at', { date: generatedAt })}</span>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body></html>`;
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────
export function ProjectReportDialog({ open, onClose, ...rest }: ProjectReportDialogProps) {
  const { t } = useTranslation();

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=920,height=780");
    if (!w) return;
    w.document.write(buildPrintHTML(rest));
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88dvh] flex flex-col p-0 gap-0 overflow-hidden">

        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t('report.title')}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('report.preview_hint')}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ReportPreview {...rest} />
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-1.5" /> {t('common.close')}
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto gap-2">
            <Printer className="h-4 w-4" />
            {t('report.print_button')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
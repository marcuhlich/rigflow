/**
 * ProjectDetail.tsx – i18n-translated
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, Edit2, Trash2, Star, Plus, Sliders,
  ChevronDown, ChevronRight, GripVertical, X,
  Package, FolderKanban, CalendarDays, MapPin, StickyNote,
  Music, Lightbulb, Zap, Wrench, Cable, Box, Layers,
  AlertTriangle, Lock, CheckCircle2, ClipboardList,
  TriangleAlert, Flag, Archive, HelpCircle, ScanLine,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress }  from "@/components/ui/progress";
import { Checkbox }  from "@/components/ui/checkbox";
import { Skeleton }  from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectDetail, EnrichedProjectItem, ProjectPackageGroup } from "@/hooks/useProjectDetail";
import { usePackages } from "@/hooks/usePackages";
import { useToast } from "@/hooks/use-toast";
import { ProjectStatus, ProjectTodo, PackageWithItems } from "@/types/project";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, isWarningJump } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { ProjectDMXTab } from "@/components/ProjectDMXTab";
import { ProjectReportDialog } from "@/components/ProjectReportDialog";

// ─── Phasen-Konstanten ────────────────────────────────────────────────────────

const IN_USE_PHASES:    ProjectStatus[] = ['transit', 'live', 'returning'];
const PACK_PHASES:      ProjectStatus[] = ['packed', 'transit'];
const LOCKED_PHASES:    ProjectStatus[] = ['transit', 'live'];
const CONDITION_PHASES: ProjectStatus[] = ['returning'];
const AUFBAU_PHASES:    ProjectStatus[] = ['planned', 'packed'];
const PHASES_WITH_TEMPLATES = new Set(['planned', 'packed', 'transit', 'live', 'returning']);

// ─── Types ────────────────────────────────────────────────────────────────────

type Condition = 'ok' | 'damaged' | 'missing';

interface ConflictInfo {
  type: 'lending' | 'project' | 'defect';
  label: string;
}

interface FinalizeOptions {
  missingAction: 'lost' | 'found' | null;
  sendDamagedToMaintenance: boolean;
}

type FinalizeStep = 'confirm' | 'actions' | 'done';

interface EditFormData {
  name: string; description: string; location: string;
  dateStart: string | null; dateEnd: string | null; notes: string;
}

// ─── Status-Konfiguration (ohne Label — wird per t() gerendert) ───────────────

const STATUS_CONFIG: Record<string, {
  color: string; bg: string; border: string; dot: string;
}> = {
  draft:     { color: 'text-muted-foreground', bg: 'bg-muted/60',      border: 'border-border',         dot: '#6b7280' },
  planned:   { color: 'text-blue-400',         bg: 'bg-blue-500/10',   border: 'border-blue-500/30',    dot: '#60a5fa' },
  packed:    { color: 'text-amber-400',        bg: 'bg-amber-500/10',  border: 'border-amber-500/30',   dot: '#fbbf24' },
  transit:   { color: 'text-orange-400',       bg: 'bg-orange-500/10', border: 'border-orange-500/30',  dot: '#fb923c' },
  live:      { color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30',     dot: '#34d399' },
  returning: { color: 'text-purple-400',       bg: 'bg-purple-500/10', border: 'border-purple-500/30',  dot: '#a78bfa' },
  archived:  { color: 'text-muted-foreground', bg: 'bg-muted/40',      border: 'border-border/50',      dot: '#374151' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  package: Package, music: Music, lightbulb: Lightbulb, zap: Zap,
  wrench: Wrench, cable: Cable, star: Star, box: Box, layers: Layers,
};
const getPkgIcon = (name: string): React.ElementType => ICON_MAP[name] ?? Package;

// ─── SlidingTabs ──────────────────────────────────────────────────────────────

interface SlidingTabItem { value: string; label: React.ReactNode; }

function SlidingTabsList({ tabs, value, onChange }: {
  tabs: SlidingTabItem[]; value: string; onChange: (v: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs     = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator,  setIndicator] = useState<{ left: number; width: number } | null>(null);
  const activeIdx = tabs.findIndex(t => t.value === value);

  useEffect(() => {
    const el  = itemRefs.current[activeIdx];
    const nav = containerRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const elRect  = el.getBoundingClientRect();
    setIndicator({ left: elRect.left - navRect.left, width: elRect.width });
  }, [activeIdx, tabs]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-1 h-9">
      {indicator && (
        <span
          className="absolute top-1 bottom-1 rounded-md bg-background shadow-sm pointer-events-none"
          style={{ left: indicator.left - 4, width: indicator.width, transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      )}
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          ref={el => { itemRefs.current[i] = el; }}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95",
            value === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >{tab.label}</button>
      ))}
    </div>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({ dateStart, dateEnd, onChangeStart, onChangeEnd }: {
  dateStart: Date | undefined; dateEnd: Date | undefined;
  onChangeStart: (d: Date | undefined) => void;
  onChangeEnd:   (d: Date | undefined) => void;
}) {
  const { t } = useTranslation();
  const [open,     setOpen]     = useState(false);
  const [month,    setMonth]    = useState(dateStart ?? new Date());
  const [hovered,  setHovered]  = useState<Date | null>(null);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const prevMonth  = useRef(dateStart ?? new Date());
  const clickCount = useRef(0);

  const DOW    = t('projects.date_picker.days',   { returnObjects: true }) as string[];
  const MONTHS = t('projects.date_picker.months', { returnObjects: true }) as string[];

  const eq = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const rangeEnd = hovered && dateStart && !dateEnd
    ? (hovered >= dateStart ? hovered : null)
    : dateEnd ?? null;

  const handleMonthChange = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setSlideDir(delta > 0 ? 'left' : 'right');
    prevMonth.current = month;
    setMonth(next);
    setTimeout(() => setSlideDir(null), 220);
  };

  const handleDayClick = (day: Date) => {
    if (clickCount.current === 0 || (dateStart && day < dateStart)) {
      onChangeStart(day); onChangeEnd(undefined); clickCount.current = 1;
    } else {
      onChangeEnd(day); clickCount.current = 0;
      setTimeout(() => setOpen(false), 150);
    }
  };

  const handleOpenChange = (v: boolean) => { setOpen(v); if (v) clickCount.current = 0; };

  const label = (() => {
    if (!dateStart) return null;
    if (dateEnd) {
      if (eq(dateStart, dateEnd)) return format(dateStart, 'dd.MM.yyyy');
      return `${format(dateStart, 'dd.MM.')} – ${format(dateEnd, 'dd.MM.yyyy')}`;
    }
    return format(dateStart, 'dd.MM.yyyy');
  })();

  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayStyle = (day: Date): React.CSSProperties => {
    const isStart = dateStart && eq(day, dateStart);
    const isEnd   = rangeEnd && eq(day, rangeEnd);
    const inRange = dateStart && rangeEnd && day > dateStart && day < rangeEnd;
    const isToday = eq(day, new Date());
    if (isStart && isEnd) return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '9999px' };
    if (isStart) return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '6px 0 0 6px' };
    if (isEnd)   return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '0 6px 6px 0' };
    if (inRange) return { background: 'transparent', color: 'inherit', borderRadius: '0' };
    if (isToday) return { boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary) / 0.5)', borderRadius: '9999px' };
    return {};
  };

  const getTdBackground = (day: Date): string => {
    const isStart = dateStart && eq(day, dateStart);
    const isEnd   = rangeEnd && eq(day, rangeEnd);
    const inRange = dateStart && rangeEnd && day > dateStart && day < rangeEnd;
    if (isStart && isEnd) return 'transparent';
    if (isStart) return `linear-gradient(to right, transparent 50%, hsl(var(--primary) / 0.13) 50%)`;
    if (isEnd)   return `linear-gradient(to left, transparent 50%, hsl(var(--primary) / 0.13) 50%)`;
    if (inRange) return `hsl(var(--primary) / 0.13)`;
    return 'transparent';
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9 gap-1.5", !dateStart && "text-muted-foreground")}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{label ?? t('projects.date_picker.range_placeholder')}</span>
          {(dateStart || dateEnd) && (
            <span role="button" className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={e => { e.stopPropagation(); onChangeStart(undefined); onChangeEnd(undefined); clickCount.current = 0; }}>
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs border-b border-border/40">
          <span className={cn("font-medium transition-colors", !dateStart ? "text-primary" : "text-foreground")}>
            {dateStart ? format(dateStart, 'dd.MM.yyyy') : t('project_detail.date_picker.start_label')}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn("font-medium transition-colors", dateStart && !dateEnd ? "text-primary" : "text-foreground")}>
            {dateEnd ? format(dateEnd, 'dd.MM.yyyy') : t('project_detail.date_picker.end_label')}
          </span>
          {(dateStart || dateEnd) && (
            <button className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { onChangeStart(undefined); onChangeEnd(undefined); clickCount.current = 0; }}>
              {t('projects.date_picker.reset')}
            </button>
          )}
        </div>
        <div className="p-3 select-none" style={{ width: 280 }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => handleMonthChange(-1)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium overflow-hidden" style={{ animation: slideDir ? `cal-${slideDir} .2s ease-out` : undefined }}>
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button onClick={() => handleMonthChange(1)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <style>{`@keyframes cal-left{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}@keyframes cal-right{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}`}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '2px 0 6px' }}>{d}</div>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => (
                    <td key={col} style={{ padding: 0, background: day ? getTdBackground(day) : 'transparent' }}>
                      {day ? (
                        <button
                          onClick={() => handleDayClick(day)}
                          onMouseEnter={() => setHovered(day)}
                          onMouseLeave={() => setHovered(null)}
                          style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', border: 'none', transition: 'background .1s, color .1s', ...getDayStyle(day) }}
                          className={cn("outline-none", !((dateStart && eq(day, dateStart)) || (rangeEnd && eq(day, rangeEnd))) && !(dateStart && rangeEnd && day > dateStart && day < rangeEnd) && "hover:bg-muted rounded-full")}
                        >{day.getDate()}</button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 pb-3 text-[10px] text-muted-foreground">
          {!dateStart ? t('projects.date_picker.hint_start') : !dateEnd ? t('projects.date_picker.hint_end') : ''}
        </p>
      </PopoverContent>
    </Popover>
  );
}

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function PhaseTemplateBanner({ status, onApply, onDismiss }: {
  status: ProjectStatus; onApply: (todos: string[]) => Promise<void>; onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [applying, setApplying] = useState(false);

  const icon  = t(`project_detail.phase_template.phases.${status}.icon`, { defaultValue: '' });
  const label = t(`project_detail.phase_template.phases.${status}.label`, { defaultValue: '' });
  const todos = t(`project_detail.phase_template.phases.${status}.todos`, { returnObjects: true, defaultValue: [] }) as string[];

  if (!icon || todos.length === 0) return null;

  return (
    <div className="rounded-lg border p-3 flex items-start gap-3 bg-blue-500/5 border-blue-500/20">
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{t('project_detail.phase_template.available', { label })}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.phase_template.count_hint', { count: todos.length })}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onDismiss}>
          {t('project_detail.phase_template.dismiss')}
        </Button>
        <Button size="sm" className="h-7 text-xs px-2" disabled={applying}
          onClick={async () => { setApplying(true); try { await onApply(todos); } finally { setApplying(false); } }}>
          {applying ? '...' : t('project_detail.phase_template.apply')}
        </Button>
      </div>
    </div>
  );
}

function ConflictBadge({ conflict }: { conflict: ConflictInfo }) {
  const cls = conflict.type === 'defect'
    ? 'border-destructive/40 text-destructive bg-destructive/10'
    : 'border-amber-500/40 text-amber-400 bg-amber-500/10';
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", cls)}>
      <AlertTriangle className="h-3 w-3" />{conflict.label}
    </Badge>
  );
}

const CONDITION_VALUES = ['ok', 'damaged', 'missing'] as const;
const CONDITION_COLORS: Record<string, string> = {
  ok:      'text-primary',
  damaged: 'text-amber-400',
  missing: 'text-destructive',
};

function ConditionSelect({ value, onChange, disabled }: {
  value: Condition; onChange: (v: Condition) => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={v => onChange(v as Condition)} disabled={disabled}>
      <SelectTrigger className={cn("h-6 text-[10px] w-24 px-2 border-border/60", CONDITION_COLORS[value])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONDITION_VALUES.map(v => (
          <SelectItem key={v} value={v} className={cn("text-xs", CONDITION_COLORS[v])}>
            {t(`report.cond.${v}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusBadgeLocal({ status }: { status: string }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.color, cfg.bg, cfg.border)}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {t(`project_status.${status}`, { defaultValue: status })}
    </span>
  );
}

function StatusPickerLocal({ status, onChangeStatus, disabled }: {
  status: ProjectStatus; onChangeStatus: (s: ProjectStatus) => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (disabled) return <StatusBadgeLocal status={status} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none"><StatusBadgeLocal status={status} /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_ORDER.map((s: ProjectStatus, idx: number) => {
          const cfg = STATUS_CONFIG[s];
          const isCurrent = s === status;
          const isNext = STATUS_ORDER.indexOf(status) + 1 === idx;
          return (
            <DropdownMenuItem key={s} disabled={isCurrent} className={cn(isCurrent && "opacity-40 cursor-default")} onClick={() => onChangeStatus(s)}>
              <span className="h-2 w-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: cfg?.dot }} />
              <span className={cfg?.color}>{t(`project_status.${s}`, { defaultValue: s })}</span>
              {isNext && <span className="ml-auto text-[10px] text-muted-foreground">{t('projects.status_next')}</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Finalisierungs-Dialog ────────────────────────────────────────────────────

function FinalizeProjectDialog({ open, onClose, projectName, allItems, conditions, onFinalize, onOpenReport }: {
  open: boolean; onClose: () => void; projectName: string;
  allItems: EnrichedProjectItem[]; conditions: Record<string, Condition>;
  onFinalize: (options: FinalizeOptions) => Promise<void>;
  onOpenReport: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep]         = useState<FinalizeStep>('confirm');
  const [options, setOptions]   = useState<FinalizeOptions>({ missingAction: null, sendDamagedToMaintenance: true });
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (open) { setStep('confirm'); setOptions({ missingAction: null, sendDamagedToMaintenance: true }); }
  }, [open]);

  const missingItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'missing');
  const damagedItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'damaged');
  const unpackedItems = allItems.filter(i => !i.packed);
  const okCount       = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'ok').length;

  const unknownLabel = t('packages.unknown');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">

        {step === 'confirm' && (<>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              {t('project_detail.finalize.title')}
            </DialogTitle>
            <DialogDescription>{t('project_detail.finalize.description', { name: projectName })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-2xl font-bold text-primary">{okCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.finalize.stat_ok')}</p>
              </div>
              <div className={cn("rounded-lg p-3", damagedItems.length > 0 ? "bg-amber-500/10" : "bg-muted/40")}>
                <p className={cn("text-2xl font-bold", damagedItems.length > 0 ? "text-amber-400" : "text-muted-foreground")}>{damagedItems.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.finalize.stat_damaged')}</p>
              </div>
              <div className={cn("rounded-lg p-3", missingItems.length > 0 ? "bg-destructive/10" : "bg-muted/40")}>
                <p className={cn("text-2xl font-bold", missingItems.length > 0 ? "text-destructive" : "text-muted-foreground")}>{missingItems.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.finalize.stat_missing')}</p>
              </div>
            </div>

            {unpackedItems.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {t('project_detail.finalize.unpacked_warning', { count: unpackedItems.length })}
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {unpackedItems.slice(0, 8).map(i => (
                    <p key={i.id} className="text-xs text-muted-foreground pl-1">· {i.item_name ?? unknownLabel} ×{i.quantity}</p>
                  ))}
                  {unpackedItems.length > 8 && (
                    <p className="text-xs text-muted-foreground pl-1">{t('project_detail.finalize.unpacked_more', { count: unpackedItems.length - 8 })}</p>
                  )}
                </div>
              </div>
            )}

            {missingItems.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('project_detail.finalize.missing_title')}
                </p>
                {missingItems.map(i => (
                  <p key={i.id} className="text-xs text-muted-foreground pl-1">· {i.item_name ?? unknownLabel} ×{i.quantity}</p>
                ))}
              </div>
            )}

            {missingItems.length === 0 && unpackedItems.length === 0 && damagedItems.length === 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-primary font-medium">{t('project_detail.finalize.all_ok')}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">{t('common.cancel')}</Button>
            <Button onClick={() => setStep('actions')} className="w-full sm:w-auto">{t('project_detail.finalize.next')}</Button>
          </DialogFooter>
        </>)}

        {step === 'actions' && (<>
          <DialogHeader>
            <DialogTitle>{t('project_detail.finalize.actions_title')}</DialogTitle>
            <DialogDescription>{t('project_detail.finalize.actions_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(missingItems.length > 0 || unpackedItems.length > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {t('project_detail.finalize.unresolved_title', { count: missingItems.length + unpackedItems.length })}
                </p>
                {([
                  { value: 'lost',  titleKey: 'project_detail.finalize.action_lost_title',  descKey: 'project_detail.finalize.action_lost_desc'  },
                  { value: 'found', titleKey: 'project_detail.finalize.action_found_title', descKey: 'project_detail.finalize.action_found_desc' },
                  { value: null,    titleKey: 'project_detail.finalize.action_skip_title',  descKey: 'project_detail.finalize.action_skip_desc'  },
                ] as const).map(opt => (
                  <label key={String(opt.value)} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    opt.value === null ? "border-border/40 opacity-60" : "border-border hover:bg-muted/30")}>
                    <input type="radio" name="missingAction"
                      checked={options.missingAction === opt.value}
                      onChange={() => setOptions(p => ({ ...p, missingAction: opt.value }))}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{t(opt.titleKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {damagedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t('project_detail.finalize.damaged_title', { count: damagedItems.length })}</p>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 cursor-pointer">
                  <Checkbox checked={options.sendDamagedToMaintenance}
                    onCheckedChange={v => setOptions(p => ({ ...p, sendDamagedToMaintenance: !!v }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-amber-300">{t('project_detail.finalize.damaged_maintenance')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.finalize.damaged_maintenance_desc')}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {damagedItems.map(i => (
                        <p key={i.id} className="text-xs text-amber-400/80">· {i.item_name ?? unknownLabel}</p>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
            )}

            <div className="rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { onClose(); setTimeout(() => onOpenReport(), 50); }}>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t('project_detail.finalize.report_title')}</p>
                <Badge variant="outline" className="text-[10px] ml-auto text-primary border-primary/40">
                  {t('project_detail.finalize.report_preview')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pl-6">{t('project_detail.finalize.report_desc')}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStep('confirm')} className="w-full sm:w-auto">{t('project_detail.finalize.back')}</Button>
            <Button disabled={finalizing} className="w-full sm:w-auto"
              onClick={async () => {
                setFinalizing(true);
                try { await onFinalize(options); setStep('done'); } finally { setFinalizing(false); }
              }}>
              {finalizing ? t('project_detail.finalize.submitting') : t('project_detail.finalize.submit')}
            </Button>
          </DialogFooter>
        </>)}

        {step === 'done' && (<>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              {t('project_detail.finalize.done_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t('project_detail.finalize.done_desc', { name: projectName })}</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose} className="w-full">{t('project_detail.finalize.close')}</Button>
          </DialogFooter>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

// ─── Mengen-Edit Dialog ───────────────────────────────────────────────────────

function EditQuantityDialog({ open, onClose, itemName, currentQty, maxQty, onSave }: {
  open: boolean; onClose: () => void;
  itemName: string; currentQty: number; maxQty: number;
  onSave: (qty: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [qty, setQty]       = useState(currentQty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setQty(currentQty); }, [open, currentQty]);

  const handleSave = async () => {
    if (qty < 1 || qty > maxQty) return;
    setSaving(true);
    try { await onSave(qty); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('project_detail.edit_quantity.title')}</DialogTitle>
          <DialogDescription className="truncate">{itemName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>
              {t('project_detail.edit_quantity.label')}{' '}
              <span className="text-muted-foreground font-normal">{t('project_detail.edit_quantity.max_hint', { max: maxQty })}</span>
            </Label>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 text-lg leading-none active:scale-95 transition-transform"
                onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <Input type="number" min={1} max={maxQty} value={qty}
                onChange={e => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                className="h-8 text-center w-16 tabular-nums" />
              <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 text-lg leading-none active:scale-95 transition-transform"
                onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>+</button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || qty < 1 || qty > maxQty} className="w-full sm:w-auto">
            {saving ? t('project_detail.edit_quantity.saving') : t('project_detail.edit_quantity.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Projekt-Edit Dialog ──────────────────────────────────────────────────────

function ProjectEditDialog({ open, onClose, initial, onSubmit }: {
  open: boolean; onClose: () => void; initial: EditFormData;
  onSubmit: (d: EditFormData) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName]         = useState(initial.name);
  const [desc, setDesc]         = useState(initial.description);
  const [location, setLocation] = useState(initial.location);
  const [dateStart, setDateStart] = useState<Date | undefined>(initial.dateStart ? new Date(initial.dateStart) : undefined);
  const [dateEnd, setDateEnd]     = useState<Date | undefined>(initial.dateEnd   ? new Date(initial.dateEnd)   : undefined);
  const [notes, setNotes]   = useState(initial.notes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial.name); setDesc(initial.description); setLocation(initial.location);
    setDateStart(initial.dateStart ? new Date(initial.dateStart) : undefined);
    setDateEnd(initial.dateEnd     ? new Date(initial.dateEnd)   : undefined);
    setNotes(initial.notes);
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(), description: desc.trim(), location: location.trim(),
        dateStart: dateStart ? format(dateStart, 'yyyy-MM-dd') : null,
        dateEnd:   dateEnd   ? format(dateEnd,   'yyyy-MM-dd') : null,
        notes: notes.trim(),
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('projects.form.title_edit')}</DialogTitle>
          <DialogDescription>{t('projects.form.desc_edit')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('projects.form.name_label')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label>{t('projects.form.description_label')}</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('projects.form.location_label')}</Label>
            <Input placeholder={t('projects.form.location_placeholder')} value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('projects.form.period_label')}</Label>
            <DateRangePicker dateStart={dateStart} dateEnd={dateEnd} onChangeStart={setDateStart} onChangeEnd={setDateEnd} />
          </div>
          <div className="space-y-1">
            <Label>{t('project_detail.edit_dialog.notes_label')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full sm:w-auto">
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Equipment-Picker Dialog ──────────────────────────────────────────────────

function EquipmentPickerDialog({
  open, onClose, packages, inventoryItems,
  addedPackageIds, addedItemIds, conflicts,
  onAddPackage, onAddItem,
}: {
  open: boolean; onClose: () => void;
  packages: PackageWithItems[]; inventoryItems: InventoryItem[];
  addedPackageIds: Set<string>; addedItemIds: Set<string>;
  conflicts: Record<string, ConflictInfo>;
  onAddPackage: (id: string) => Promise<void>;
  onAddItem: (id: string, qty: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [tab,        setTab]    = useState<'packages' | 'items'>('packages');
  const [search,     setSearch] = useState('');
  const [quantities, setQty]    = useState<Record<string, number>>({});
  const [adding,     setAdding] = useState<string | null>(null);

  useEffect(() => { if (open) { setSearch(''); setTab('packages'); } }, [open]);

  const filteredPkgs  = packages.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredItems = inventoryItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>{t('project_detail.picker.title')}</DialogTitle>
          <DialogDescription>{t('project_detail.picker.desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 px-6 shrink-0">
          {(['packages', 'items'] as const).map(tabVal => (
            <button key={tabVal} onClick={() => { setTab(tabVal); setSearch(''); }}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                tab === tabVal ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {tabVal === 'packages'
                ? t('project_detail.picker.tab_packages', { count: packages.length })
                : t('project_detail.picker.tab_items',    { count: inventoryItems.length })}
            </button>
          ))}
        </div>

        <div className="px-6 pb-2 shrink-0">
          <Input
            placeholder={tab === 'packages' ? t('project_detail.picker.search_packages') : t('project_detail.picker.search_items')}
            value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {tab === 'packages' && (filteredPkgs.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">{t('project_detail.picker.no_packages')}</p>
            : filteredPkgs.map(pkg => {
              const already = addedPackageIds.has(pkg.id);
              const IconComp = getPkgIcon(pkg.icon);
              const pkgConflicts = pkg.items.filter(i => conflicts[i.inventory_item_id]).length;
              return (
                <div key={pkg.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  already ? "opacity-50 bg-muted/30 border-border" : "bg-card border-border hover:border-primary/40")}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: pkg.color + '25' }}>
                    <IconComp className="h-4 w-4" style={{ color: pkg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.items.length} {t('packages.item_count_other', { count: pkg.items.length }).replace(/^\d+ /, '')}</p>
                  </div>
                  {pkgConflicts > 0 && !already && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-400 bg-amber-500/10 shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      {t('project_detail.picker.conflict_count', { count: pkgConflicts })}
                    </Badge>
                  )}
                  {already
                    ? <Badge variant="secondary" className="text-[10px] shrink-0">{t('project_detail.picker.already_added')}</Badge>
                    : <Button size="sm" className="h-7 px-3 shrink-0" disabled={adding === pkg.id}
                        onClick={async () => { setAdding(pkg.id); try { await onAddPackage(pkg.id); } finally { setAdding(null); } }}>
                        {adding === pkg.id ? '...' : <><Plus className="h-3 w-3 mr-1" />{t('project_detail.picker.add_btn')}</>}
                      </Button>
                  }
                </div>
              );
            })
          )}

          {tab === 'items' && (filteredItems.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">{t('project_detail.picker.no_items')}</p>
            : filteredItems.map(item => {
              const conflict = conflicts[item.id];
              const already  = addedItemIds.has(item.id);
              return (
                <div key={item.id} className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                  already ? "opacity-50 border-border" : "border-border hover:border-primary/40")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t('project_detail.picker.item_meta', { category: item.category, location: item.location, quantity: item.quantity })}
                    </p>
                    {conflict && <div className="mt-1"><ConflictBadge conflict={conflict} /></div>}
                  </div>
                  {already ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">{t('project_detail.picker.in_project')}</Badge>
                  ) : (
                    <>
                      <Input type="number" min={1} max={item.quantity}
                        value={quantities[item.id] ?? 1}
                        onChange={e => setQty(prev => ({ ...prev, [item.id]: Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        className="w-14 h-7 text-xs text-center"
                      />
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0" disabled={adding === item.id}
                        onClick={async () => { setAdding(item.id); try { await onAddItem(item.id, quantities[item.id] ?? 1); } finally { setAdding(null); } }}>
                        {adding === item.id ? '…' : <Plus className="h-3 w-3" />}
                      </Button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Item-Zeile ───────────────────────────────────────────────────────────────

function ItemRow({
  itemName, itemCategory, packed, showPack, showCond, isLocked, packDisabled,
  conflict, condition, quantity, onTogglePacked, onRemove, onConditionChange, onEdit,
}: {
  itemName?: string; itemCategory?: string;
  packed: boolean; showPack: boolean; showCond: boolean;
  isLocked: boolean; packDisabled: boolean;
  conflict?: ConflictInfo; condition: Condition; quantity: number;
  onTogglePacked: (packed: boolean) => void;
  onRemove: () => void;
  onConditionChange: (c: Condition) => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
      {showPack && (
        <Checkbox checked={packed} disabled={packDisabled} onCheckedChange={v => onTogglePacked(!!v)} className="shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", packed && showPack && "line-through text-muted-foreground")}>
          {itemName ?? t('packages.unknown')}
        </p>
        {itemCategory && <p className="text-xs text-muted-foreground truncate">{itemCategory}</p>}
      </div>
      {conflict && <ConflictBadge conflict={conflict} />}
      <Badge variant="outline" className="text-[10px] shrink-0">×{quantity}</Badge>
      {showCond && <ConditionSelect value={condition} onChange={onConditionChange} disabled={isLocked} />}
      {!isLocked && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onEdit && (
            <button className="p-1 text-muted-foreground hover:text-foreground transition-all active:scale-90"
              onClick={onEdit} title={t('project_detail.edit_quantity.title')}>
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button className="p-1 text-muted-foreground hover:text-destructive transition-all active:scale-90"
            onClick={onRemove} title={t('common.delete')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Paket-Gruppe ─────────────────────────────────────────────────────────────

function PackageGroupSection({ group, status, conflicts, conditions, isReadonly, onRemovePackage, onTogglePacked, onConditionChange }: {
  group: ProjectPackageGroup; status: ProjectStatus; isReadonly: boolean;
  conflicts: Record<string, ConflictInfo>; conditions: Record<string, Condition>;
  onRemovePackage: () => void;
  onTogglePacked: (id: string, packed: boolean) => void;
  onConditionChange: (id: string, c: Condition) => void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const IconComp    = getPkgIcon(group.package.icon);
  const packedCount = group.items.filter(i => i.packed).length;
  const allPacked   = group.items.length > 0 && packedCount === group.items.length;
  const isLocked    = LOCKED_PHASES.includes(status) || isReadonly;
  const showPack    = PACK_PHASES.includes(status) && !isReadonly;
  const showCond    = CONDITION_PHASES.includes(status) && !isReadonly;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
        onClick={() => setCollapsed(v => !v)}>
        <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: group.package.color + '25' }}>
          <IconComp className="h-4 w-4" style={{ color: group.package.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{group.package.name}</p>
          <p className="text-xs text-muted-foreground">
            {showPack
              ? t('project_detail.package_group.packed_count', { packed: packedCount, total: group.items.length })
              : t('project_detail.package_group.item_count',   { count: group.items.length })}
          </p>
        </div>
        {allPacked && showPack && (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] shrink-0">
            {t('project_detail.package_group.all_packed')}
          </Badge>
        )}
        {!isLocked && (
          <button className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            onClick={e => { e.stopPropagation(); onRemovePackage(); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-border/50">
          {group.items.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">{t('project_detail.package_group.empty')}</p>
          )}
          {group.items.map(item => (
            <ItemRow key={item.id}
              itemName={item.item_name} itemCategory={item.item_category}
              packed={item.packed} showPack={showPack} showCond={showCond}
              isLocked={isLocked} packDisabled={status === 'transit'}
              conflict={conflicts[item.inventory_item_id ?? '']}
              condition={conditions[item.id] ?? 'ok'}
              quantity={item.quantity}
              onTogglePacked={p => onTogglePacked(item.id, p)}
              onRemove={() => {}}
              onConditionChange={c => onConditionChange(item.id, c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Direktartikel-Liste ──────────────────────────────────────────────────────

function DirectItemsList({ items, status, conflicts, conditions, isReadonly, onTogglePacked, onRemoveItem, onConditionChange, onEditItem }: {
  items: EnrichedProjectItem[]; status: ProjectStatus; isReadonly: boolean;
  conflicts: Record<string, ConflictInfo>; conditions: Record<string, Condition>;
  onTogglePacked: (id: string, packed: boolean) => void;
  onRemoveItem: (id: string) => void;
  onConditionChange: (id: string, c: Condition) => void;
  onEditItem: (item: EnrichedProjectItem) => void;
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  const isLocked = LOCKED_PHASES.includes(status) || isReadonly;
  const showPack = PACK_PHASES.includes(status) && !isReadonly;
  const showCond = CONDITION_PHASES.includes(status) && !isReadonly;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {t('project_detail.direct_items_title')}
      </p>
      <div className="rounded-lg border border-border divide-y divide-border/50 overflow-hidden">
        {items.map(item => (
          <div key={item.id} className="bg-card">
            <ItemRow
              itemName={item.item_name} itemCategory={item.item_category}
              packed={item.packed} showPack={showPack} showCond={showCond}
              isLocked={isLocked} packDisabled={status === 'transit'}
              conflict={conflicts[item.inventory_item_id ?? '']}
              condition={conditions[item.id] ?? 'ok'}
              quantity={item.quantity}
              onTogglePacked={p => onTogglePacked(item.id, p)}
              onRemove={() => onRemoveItem(item.id)}
              onConditionChange={c => onConditionChange(item.id, c)}
              onEdit={!isLocked ? () => onEditItem(item) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Equipment-Tab ────────────────────────────────────────────────────────────

function EquipmentTab({
  projectId, projectName, packageGroups, directItems, totalItems, packedItems,
  packages, availableInventory, status, conflicts, conditions, isReadonly,
  onConditionChange, addPackageToProject, removePackageFromProject,
  addDirectItem, removeItem, togglePacked, onMarkInUse,
}: {
  projectId: string; projectName: string;
  packageGroups: ProjectPackageGroup[]; directItems: EnrichedProjectItem[];
  totalItems: number; packedItems: number;
  packages: PackageWithItems[]; availableInventory: InventoryItem[];
  status: ProjectStatus; conflicts: Record<string, ConflictInfo>;
  conditions: Record<string, Condition>; isReadonly: boolean;
  onConditionChange: (id: string, c: Condition) => void;
  addPackageToProject: (id: string) => Promise<void>;
  removePackageFromProject: (id: string) => Promise<void>;
  addDirectItem: (id: string, qty: number) => Promise<void>;
  removeItem: (id: string) => void;
  togglePacked: (id: string, packed: boolean) => void;
  onMarkInUse: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [markingInUse, setMarkingInUse] = useState(false);
  const [editingItem,  setEditingItem]  = useState<EnrichedProjectItem | null>(null);

  const { refetch: refetchProject } = useProjectDetail(projectId);

  const addedPackageIds = useMemo(() => new Set(packageGroups.map(g => g.package_id)), [packageGroups]);
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    packageGroups.forEach(g => g.items.forEach(i => { if (i.inventory_item_id) ids.add(i.inventory_item_id); }));
    directItems.forEach(i => { if (i.inventory_item_id) ids.add(i.inventory_item_id); });
    return ids;
  }, [packageGroups, directItems]);

  const handleEditQuantity = useCallback(async (qty: number) => {
    if (!editingItem) return;
    await supabase.from('project_items').update({ quantity: qty } as any).eq('id', editingItem.id);
    await refetchProject();
  }, [editingItem, refetchProject]);

  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
  const isLocked = LOCKED_PHASES.includes(status);
  const showPack = PACK_PHASES.includes(status);
  const showCond = CONDITION_PHASES.includes(status);

  return (
    <div className="space-y-4">

      {/* Aufbau-Banner */}
      {AUFBAU_PHASES.includes(status) && totalItems > 0 && !isReadonly && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-blue-300 flex items-center gap-1.5">
              <ScanLine className="h-4 w-4" />{t('project_detail.equipment.aufbau_title')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.equipment.aufbau_desc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              onClick={() => navigate(`/scanner?mode=aufbau&projectId=${projectId}`)}>
              <ScanLine className="h-3.5 w-3.5" />{t('project_detail.equipment.aufbau_scanner')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              disabled={markingInUse}
              onClick={async () => { setMarkingInUse(true); try { await onMarkInUse(); } finally { setMarkingInUse(false); } }}>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{markingInUse ? t('project_detail.equipment.aufbau_marking') : t('project_detail.equipment.aufbau_all')}</span>
              <span className="sm:hidden">{markingInUse ? '...' : t('project_detail.equipment.aufbau_all_short')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Abbau-Banner */}
      {status === 'returning' && totalItems > 0 && !isReadonly && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
              <ScanLine className="h-4 w-4" />{t('project_detail.equipment.abbau_title')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.equipment.abbau_desc')}</p>
          </div>
          <Button size="sm" className="gap-1.5 w-full bg-purple-600 hover:bg-purple-500 text-white"
            onClick={() => navigate(`/scanner?mode=abbau&projectId=${projectId}`)}>
            <ScanLine className="h-3.5 w-3.5" />{t('project_detail.equipment.abbau_btn')}
          </Button>
        </div>
      )}

      {/* Packfortschritt */}
      {showPack && totalItems > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t('project_detail.equipment.progress_title')}</span>
            <span className="text-muted-foreground">{t('project_detail.equipment.progress_count', { packed: packedItems, total: totalItems })}</span>
          </div>
          <Progress value={progress} className="h-2" />
          {packedItems === totalItems && totalItems > 0 && (
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />{t('project_detail.equipment.all_packed')}
            </p>
          )}
          {status === 'transit' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />{t('project_detail.equipment.transit_locked')}
            </p>
          )}
        </Card>
      )}

      {/* Status-Hinweise */}
      {isLocked && !isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />{t('project_detail.equipment.locked_hint')}
        </div>
      )}
      {isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Archive className="h-3.5 w-3.5 shrink-0" />{t('project_detail.equipment.archived_hint')}
        </div>
      )}
      {showCond && totalItems > 0 && !isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs text-purple-300">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" />{t('project_detail.equipment.condition_hint')}
        </div>
      )}

      {/* Equipment hinzufügen */}
      {!isLocked && !isReadonly && (
        <Button variant="outline" size="sm" className="gap-1.5 w-full active:scale-95" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" />{t('project_detail.equipment.add_btn')}
        </Button>
      )}

      {/* Pakete */}
      {packageGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('project_detail.equipment.packages_section')}
          </p>
          {packageGroups.map(group => (
            <PackageGroupSection key={group.instanceId} group={group} status={status}
              conflicts={conflicts} conditions={conditions} isReadonly={isReadonly}
              onRemovePackage={() => removePackageFromProject(group.instanceId)}
              onTogglePacked={togglePacked} onConditionChange={onConditionChange}
            />
          ))}
        </div>
      )}

      {/* Direktartikel */}
      <DirectItemsList items={directItems} status={status} conflicts={conflicts}
        conditions={conditions} isReadonly={isReadonly}
        onTogglePacked={togglePacked} onRemoveItem={removeItem}
        onConditionChange={onConditionChange} onEditItem={setEditingItem}
      />

      {/* Leer-State */}
      {totalItems === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">{t('project_detail.equipment.empty_title')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('project_detail.equipment.empty_desc')}</p>
          </CardContent>
        </Card>
      )}

      <EditQuantityDialog
        open={!!editingItem} onClose={() => setEditingItem(null)}
        itemName={editingItem?.item_name ?? ''}
        currentQty={editingItem?.quantity ?? 1}
        maxQty={availableInventory.find(i => i.id === editingItem?.inventory_item_id)?.quantity ?? editingItem?.quantity ?? 99}
        onSave={handleEditQuantity}
      />

      <EquipmentPickerDialog
        open={pickerOpen} onClose={() => setPickerOpen(false)}
        packages={packages} inventoryItems={availableInventory}
        addedPackageIds={addedPackageIds} addedItemIds={addedItemIds}
        conflicts={conflicts} onAddPackage={addPackageToProject} onAddItem={addDirectItem}
      />
    </div>
  );
}

// ─── Todos-Tab ────────────────────────────────────────────────────────────────

function SortableTodoItem({ todo, onToggle, onDelete, isReadonly }: {
  todo: ProjectTodo; onToggle: (done: boolean) => void;
  onDelete: () => void; isReadonly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card select-none",
        isDragging && "opacity-30 shadow-xl")}>
      {!isReadonly && (
        <button className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
          {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
      )}
      <Checkbox checked={todo.done} onCheckedChange={v => onToggle(!!v)} className="shrink-0" disabled={isReadonly} />
      <span className={cn("flex-1 text-sm", todo.done && "line-through text-muted-foreground")}>{todo.title}</span>
      {!isReadonly && (
        <button className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0" onClick={onDelete}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TodosTab({ todos, status, isReadonly, onAdd, onToggle, onDelete, onReorder }: {
  todos: ProjectTodo[]; status: ProjectStatus; isReadonly: boolean;
  onAdd: (title: string) => Promise<void>;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (reordered: ProjectTodo[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const [adding,   setAdding]   = useState(false);
  const [templateDismissed, setTemplateDismissed] = useState<ProjectStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = todos.findIndex(t => t.id === active.id);
    const newIdx = todos.findIndex(t => t.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(todos, oldIdx, newIdx));
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try { await onAdd(newTitle.trim()); setNewTitle(''); } finally { setAdding(false); }
  };

  const showBanner = PHASES_WITH_TEMPLATES.has(status) && templateDismissed !== status && !isReadonly && todos.length === 0;
  const doneCount  = todos.filter(t => t.done).length;

  return (
    <div className="space-y-4">
      {showBanner && (
        <PhaseTemplateBanner status={status}
          onApply={async (ts) => { for (const t of ts) await onAdd(t); setTemplateDismissed(status); }}
          onDismiss={() => setTemplateDismissed(status)}
        />
      )}

      {todos.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('project_detail.todos.progress', { done: doneCount, total: todos.length })}</span>
            <span>{Math.round((doneCount / todos.length) * 100)} %</span>
          </div>
          <Progress value={Math.round((doneCount / todos.length) * 100)} className="h-1.5" />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {todos.map(todo => (
              <SortableTodoItem key={todo.id} todo={todo} isReadonly={isReadonly}
                onToggle={done => onToggle(todo.id, done)} onDelete={() => onDelete(todo.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {todos.length === 0 && !showBanner && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium">{t('project_detail.todos.empty_title')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isReadonly ? t('project_detail.todos.empty_archived') : t('project_detail.todos.empty_desc')}
            </p>
          </CardContent>
        </Card>
      )}

      {!isReadonly && (
        <div className="flex gap-2">
          <Input placeholder={t('project_detail.todos.new_placeholder')} value={newTitle}
            onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="h-9" />
          <Button size="sm" className="h-9 shrink-0" disabled={!newTitle.trim() || adding} onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast }  = useToast();
  const { t, i18n } = useTranslation();

  const dateLocale = i18n.language.startsWith('de') ? de : enUS;

  const { packages, refetch: refetchPackages } = usePackages();

  const {
    project, packageGroups, directItems, allItems, todos, loading,
    availableInventory, totalItems, packedItems,
    updateProject, deleteProject, toggleFavorite, updateStatus,
    addPackageToProject, removePackageFromProject,
    addDirectItem, removeItem, togglePacked,
    addTodo, toggleTodo, deleteTodo, reorderTodos,
    refetch: refetchProject, restoreAllProjectItems,
  } = useProjectDetail(id);

  const tab    = (searchParams.get('tab') ?? 'equipment') as 'equipment' | 'todos' | 'dmx';
  const setTab = (v: string) => setSearchParams(v === 'equipment' ? {} : { tab: v }, { replace: true });

  const [editOpen,      setEditOpen]      = useState(false);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [finalizeOpen,  setFinalizeOpen]  = useState(false);
  const [reportOpen,    setReportOpen]    = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ from: ProjectStatus; to: ProjectStatus } | null>(null);

  const [conditions, setConditions] = useState<Record<string, Condition>>({});

  const handleConditionChange = useCallback(async (itemId: string, condition: Condition) => {
    setConditions(prev => ({ ...prev, [itemId]: condition }));
    await supabase.from('project_items').update({ condition } as any).eq('id', itemId);
  }, []);

  const isArchived = project?.status === ('archived' as any);
  const isReadonly = isArchived;

  const conflicts = useMemo<Record<string, ConflictInfo>>(() => {
    const ownInvIds = new Set<string>();
    packageGroups.forEach(g => g.items.forEach(i => { if (i.inventory_item_id) ownInvIds.add(i.inventory_item_id); }));
    directItems.forEach(i => { if (i.inventory_item_id) ownInvIds.add(i.inventory_item_id); });

    const result: Record<string, ConflictInfo> = {};
    availableInventory.forEach(item => {
      if (ownInvIds.has(item.id)) return;
      if (item.condition === 'defekt') {
        result[item.id] = { type: 'defect', label: t('project_detail.conflict.defect') };
      } else if (item.condition === 'verliehen') {
        result[item.id] = {
          type: 'lending',
          label: item.lent_to
            ? t('project_detail.conflict.lending_named', { name: item.lent_to })
            : t('project_detail.conflict.lending'),
        };
      } else if (item.condition === 'in-einsatz') {
        result[item.id] = { type: 'project', label: t('project_detail.conflict.project') };
      }
    });
    return result;
  }, [availableInventory, packageGroups, directItems, t]);

  const markItemsInUse = useCallback(async () => {
    if (!project || !allItems.length) return;
    const invIds = [...new Set(allItems.map(i => i.inventory_item_id).filter(Boolean))] as string[];
    if (!invIds.length) return;

    for (const item of allItems) {
      if (!item.inventory_item_id) continue;
      const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
      if (invItem) {
        await supabase.from('project_items').update({ original_location: invItem.location } as any).eq('id', item.id);
      }
    }
    await supabase.from('inventory_items').update({ condition: 'in-einsatz', location: project.name } as any).in('id', invIds);
    toast({ title: t('project_detail.mark_in_use_toast'), description: t('project_detail.mark_in_use_desc', { name: project.name }) });
    await refetchProject();
  }, [project, allItems, availableInventory, toast, refetchProject, t]);

  const restoreAllItems = useCallback(async () => {
    if (!id || !project) return;
    const { data: currentProjItems } = await supabase.from('project_items').select('inventory_item_id, original_location').eq('project_id', id);
    for (const pi of (currentProjItems ?? []) as any[]) {
      if (!pi.inventory_item_id) continue;
      await supabase.from('inventory_items').update({ condition: 'verfügbar', location: pi.original_location ?? null, lent_to: null, lent_until: null } as any).eq('id', pi.inventory_item_id);
    }
    await supabase.from('inventory_items').update({ condition: 'verfügbar' } as any).eq('location', project.name).eq('condition', 'in-einsatz');
  }, [id, project]);

  const applyStatusChange = async (to: ProjectStatus) => {
    await updateStatus(to);
    if (IN_USE_PHASES.includes(to)) await markItemsInUse();
  };

  const handleStatusChange = async (to: ProjectStatus) => {
    if (!project) return;
    if (isWarningJump(project.status, to)) {
      setPendingStatus({ from: project.status, to });
    } else {
      await applyStatusChange(to);
    }
  };

  const handleAddPackage = useCallback(async (packageId: string) => {
    await addPackageToProject(packageId);
    await refetchPackages();
  }, [addPackageToProject, refetchPackages]);

  const handleFinalize = async (options: FinalizeOptions) => {
    if (!project || !id) return;
    const missingItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'missing');
    const damagedItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'damaged');
    const unpackedItems = allItems.filter(i => !i.packed);

    const unresolvedIds = [...new Set([
      ...missingItems.map(i => i.inventory_item_id),
      ...unpackedItems.map(i => i.inventory_item_id),
    ].filter(Boolean))] as string[];

    if (unresolvedIds.length > 0 && options.missingAction) {
      const newCondition = options.missingAction === 'lost' ? 'defekt' : 'verfügbar';
      await supabase.from('inventory_items').update({ condition: newCondition } as any).in('id', unresolvedIds);
    }

    if (options.sendDamagedToMaintenance && damagedItems.length > 0) {
      for (const item of damagedItems) {
        if (!item.inventory_item_id) continue;
        await supabase.from('inventory_items').update({ condition: 'defekt' } as any).eq('id', item.inventory_item_id);
        await supabase.from('maintenance_records').insert({
          inventory_item_id: item.inventory_item_id, type: 'damage',
          description: `Schaden nach Projekt „${project.name}" festgestellt`,
          recorded_at: new Date().toISOString(),
        } as any); // Fehler hier ist nicht kritisch, Archivierung läuft weiter
      }
    }

    await restoreAllProjectItems();
    await supabase.from('projects').update({ status: 'archived' as any }).eq('id', id);
    toast({ title: t('project_detail.finalize_toast'), description: t('project_detail.finalize_desc', { name: project.name }) });
    setTimeout(() => navigate('/projects'), 1500);
  };

  const handleEdit = async (data: EditFormData) => {
    await updateProject({
      name: data.name, description: data.description || null,
      location: data.location || null,
      event_date_start: data.dateStart, event_date_end: data.dateEnd,
      notes: data.notes || null,
    });
    toast({ title: t('projects.toast.saved_title') });
  };

  const handleDelete = async () => {
    await deleteProject();
    toast({ title: t('projects.toast.deleted_title') });
    navigate('/projects');
  };

  const showPackBadge   = project && PACK_PHASES.includes(project.status);
  const showPackSidebar = project && PACK_PHASES.includes(project.status) && totalItems > 0;

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 pt-4">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="gap-2">
          <ChevronLeft className="h-4 w-4" />{t('common.back')}
        </Button>
        <Card className="p-12 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-medium">{t('project_detail.no_project')}</h3>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes tab-in{from{opacity:0}to{opacity:1}}.tab-in{animation:tab-in 0.18s ease forwards}`}</style>

      <div className="space-y-6 pt-4 pb-24">

        {/* Top-Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/projects')}
            className="group gap-2 self-start hover:-translate-x-0.5 transition-transform">
            <ChevronLeft className="h-4 w-4" />{t('common.back')}
          </Button>
          {!isReadonly && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none active:scale-95 transition-transform"
                onClick={() => setEditOpen(true)}>
                <Edit2 className="h-4 w-4" />{t('common.edit')}
              </Button>
              <Button variant="outline" size="sm"
                className="gap-2 flex-1 sm:flex-none text-destructive hover:text-destructive active:scale-95 transition-transform"
                onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />{t('common.delete')}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">

          {/* Main Column */}
          <div className="md:col-span-2 space-y-4 min-w-0">

            {/* Header-Card */}
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
                  {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <StatusPickerLocal status={project.status} onChangeStatus={handleStatusChange} disabled={isReadonly} />
                    {IN_USE_PHASES.includes(project.status) && !isArchived && (
                      <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-400 bg-orange-500/10">
                        {t('project_detail.in_use_badge')}
                      </Badge>
                    )}
                    {isArchived && (
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        <Archive className="h-3 w-3 mr-1" />{t('project_detail.archived_badge')}
                      </Badge>
                    )}
                  </div>
                </div>
                <button onClick={toggleFavorite} className="p-1.5 shrink-0 mt-0.5 active:scale-90 transition-transform" disabled={isReadonly}>
                  <Star className={cn("h-5 w-5 transition-colors", project.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400")} />
                </button>
              </div>
            </Card>

            {/* Rücklauf-Banner */}
            {project.status === 'returning' && !isReadonly && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                    <Flag className="h-4 w-4" />{t('project_detail.returning_banner.title')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('project_detail.returning_banner.desc')}</p>
                </div>
                <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                  onClick={() => setFinalizeOpen(true)}>
                  <Archive className="h-4 w-4" />{t('project_detail.returning_banner.btn')}
                </Button>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab}>
              <SlidingTabsList
                value={tab} onChange={setTab}
                tabs={[
                  {
                    value: 'equipment',
                    label: (
                      <>
                        <Package className="h-3.5 w-3.5" />{t('projects.tab_packages').replace('Pakete', 'Equipment') /* reuse nav label via dedicated key */}
                        {/* use a dedicated key instead: */}
                        {showPackBadge && totalItems > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">{packedItems}/{totalItems}</Badge>
                        )}
                      </>
                    ),
                  },
                  {
                    value: 'todos',
                    label: (
                      <>
                        <ClipboardList className="h-3.5 w-3.5" />{t('project_detail.tab_todos')}
                        {PHASES_WITH_TEMPLATES.has(project.status) && !isReadonly && todos.length === 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        )}
                        {todos.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {todos.filter(t => t.done).length}/{todos.length}
                          </Badge>
                        )}
                      </>
                    ),
                  },
                  {
                    value: 'dmx',
                    label: <><Sliders className="h-3.5 w-3.5" />{t('project_detail.tab_dmx')}</>,
                  },
                ]}
              />

              <TabsContent value="equipment" className="mt-4 tab-in">
                <EquipmentTab
                  projectId={id!} projectName={project.name}
                  packageGroups={packageGroups} directItems={directItems}
                  totalItems={totalItems} packedItems={packedItems}
                  packages={packages} availableInventory={availableInventory}
                  status={project.status} conflicts={conflicts}
                  conditions={conditions} isReadonly={isReadonly}
                  onConditionChange={handleConditionChange}
                  addPackageToProject={handleAddPackage}
                  removePackageFromProject={removePackageFromProject}
                  addDirectItem={addDirectItem} removeItem={removeItem} togglePacked={togglePacked}
                  onMarkInUse={markItemsInUse}
                />
              </TabsContent>

              <TabsContent value="todos" className="mt-4 tab-in">
                <TodosTab todos={todos} status={project.status} isReadonly={isReadonly}
                  onAdd={addTodo} onToggle={toggleTodo} onDelete={deleteTodo} onReorder={reorderTodos} />
              </TabsContent>

              <TabsContent value="dmx" className="mt-4 min-w-0 overflow-x-hidden tab-in">
                <ProjectDMXTab projectId={id!} projectName={project.name} allItems={allItems} isReadonly={isReadonly} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Projektinfo */}
            <Card className="p-5 space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('project_detail.sidebar.info_title')}
              </p>
              {(project.event_date_start || project.event_date_end) && (
                <div className="flex items-start gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    {project.event_date_start && (
                      <p>{format(new Date(project.event_date_start), 'dd. MMM yyyy', { locale: dateLocale })}</p>
                    )}
                    {project.event_date_end && project.event_date_end !== project.event_date_start && (
                      <p className="text-muted-foreground">
                        {t('project_detail.sidebar.date_until', { date: format(new Date(project.event_date_end), 'dd. MMM yyyy', { locale: dateLocale }) })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{project.location}</span>
                </div>
              )}
              {project.notes && (
                <div className="flex items-start gap-2.5">
                  <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-muted-foreground whitespace-pre-wrap text-xs">{project.notes}</p>
                </div>
              )}
              {!project.event_date_start && !project.location && !project.notes && (
                <p className="text-xs text-muted-foreground">{t('project_detail.sidebar.no_details')}</p>
              )}
              <div className="pt-1 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                <p>{t('project_detail.sidebar.created', { date: format(new Date(project.created_at), 'dd.MM.yyyy', { locale: dateLocale }) })}</p>
                <p>{t('project_detail.sidebar.updated', { date: format(new Date(project.updated_at), 'dd.MM.yyyy', { locale: dateLocale }) })}</p>
              </div>
            </Card>

            {/* Packstatus */}
            {showPackSidebar && (
              <Card className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('project_detail.sidebar.pack_title')}
                </p>
                <div className="flex justify-between text-sm">
                  <span>{packedItems} / {totalItems}</span>
                  <span className="text-muted-foreground">{Math.round((packedItems / totalItems) * 100)} %</span>
                </div>
                <Progress value={Math.round((packedItems / totalItems) * 100)} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div className="rounded-md bg-primary/10 p-2">
                    <p className="text-lg font-bold text-primary">{packedItems}</p>
                    <p className="text-muted-foreground">{t('project_detail.sidebar.packed_label')}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{totalItems - packedItems}</p>
                    <p className="text-muted-foreground">{t('project_detail.sidebar.pending_label')}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Konflikt-Zusammenfassung */}
            {Object.keys(conflicts).length > 0 && !isReadonly && (
              <Card className="p-5 space-y-2 border-amber-500/20 bg-amber-500/5">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TriangleAlert className="h-3.5 w-3.5" />{t('project_detail.sidebar.conflicts_title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('project_detail.sidebar.conflicts_desc', { count: Object.keys(conflicts).length })}
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Dialoge */}
        {!isReadonly && (
          <ProjectEditDialog
            open={editOpen} onClose={() => setEditOpen(false)}
            initial={{ name: project.name, description: project.description ?? '', location: project.location ?? '', dateStart: project.event_date_start, dateEnd: project.event_date_end, notes: project.notes ?? '' }}
            onSubmit={handleEdit}
          />
        )}

        <FinalizeProjectDialog
          open={finalizeOpen} onClose={() => setFinalizeOpen(false)}
          projectName={project.name} allItems={allItems}
          conditions={conditions} onFinalize={handleFinalize}
          onOpenReport={() => setReportOpen(true)}
        />

        <ProjectReportDialog
          open={reportOpen} onClose={() => setReportOpen(false)}
          project={project} packageGroups={packageGroups} directItems={directItems}
          allItems={allItems} todos={todos} conditions={conditions} conflicts={conflicts}
        />

        <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && setPendingStatus(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('projects.status_change.warning_title')}</AlertDialogTitle>
              <AlertDialogDescription
                dangerouslySetInnerHTML={{
                  __html: t('projects.status_change.warning_desc', {
                    from: pendingStatus ? `<strong>${t(`project_status.${pendingStatus.from}`)}</strong>` : '',
                    to:   pendingStatus ? `<strong>${t(`project_status.${pendingStatus.to}`)}</strong>`   : '',
                  })
                }}
              />
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { if (pendingStatus) { await applyStatusChange(pendingStatus.to); setPendingStatus(null); } }}>
                {t('projects.status_change.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('projects.delete.title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('projects.delete.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
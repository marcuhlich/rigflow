/**
 * ProjectDetail.tsx
 *
 * Features:
 * - Pakete in Projekten auto-refresh wenn neue Items hinzugefügt (refetchPackages nach addPackage)
 * - Defekte Artikel als Konflikt markiert (condition='defekt' → ConflictBadge)
 * - Aufbau: 2 Optionen — Scanner-Link ODER direkter "Alle markieren" Button
 * - Abbau: Scanner-first Banner + manuelle Fallback-Übersicht mit ConditionSelect
 * - Archived Status → vollständig readonly (kein Edit, kein Delete, kein Finalize-Banner)
 * - Bereits hinzugefügte Items im Picker blockiert (addedItemIds Set)
 * - Packfortschritt/Badge nur in packed/transit Phasen
 * - Conflict detection direkt aus availableInventory (kein extra DB-Query)
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format, isWithinInterval, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
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
import { Calendar }  from "@/components/ui/calendar";
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
import { DateRange } from "react-day-picker";

// ─── Phasen-Konstanten ────────────────────────────────────────────────────────

const IN_USE_PHASES:    ProjectStatus[] = ['transit', 'live', 'returning'];
const PACK_PHASES:      ProjectStatus[] = ['packed', 'transit'];
const LOCKED_PHASES:    ProjectStatus[] = ['transit', 'live'];
const CONDITION_PHASES: ProjectStatus[] = ['returning'];
const AUFBAU_PHASES:    ProjectStatus[] = ['planned', 'packed'];

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

// ─── SlidingTabs ──────────────────────────────────────────────────────────────
// Ersetzt <Tabs> + <TabsList> mit einem animierten Sliding-Indicator

interface SlidingTabItem {
  value: string;
  label: React.ReactNode;
}

function SlidingTabsList({ tabs, value, onChange }: {
  tabs: SlidingTabItem[];
  value: string;
  onChange: (v: string) => void;
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
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-1 h-9"
    >
      {/* Sliding Highlight */}
      {indicator && (
        <span
          className="absolute top-1 bottom-1 rounded-md bg-background shadow-sm pointer-events-none"
          style={{
            left:      indicator.left - 4, // offset by container padding
            width:     indicator.width,
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          ref={el => { itemRefs.current[i] = el; }}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap",
            value === tab.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── DateRangePicker (custom calendar — kein shadcn-Klassen-Krieg) ────────────
function DateRangePicker({ dateStart, dateEnd, onChangeStart, onChangeEnd }: {
  dateStart: Date | undefined;
  dateEnd:   Date | undefined;
  onChangeStart: (d: Date | undefined) => void;
  onChangeEnd:   (d: Date | undefined) => void;
}) {
  const [open,     setOpen]    = useState(false);
  const [month,    setMonth]   = useState(dateStart ?? new Date());
  const [hovered,  setHovered] = useState<Date | null>(null);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const prevMonth  = useRef(dateStart ?? new Date());
  const clickCount = useRef(0);

  const DOW = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const MONTHS = ['Januar','Februar','März','April','Mai','Juni',
                  'Juli','August','September','Oktober','November','Dezember'];

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
      onChangeStart(day);
      onChangeEnd(undefined);
      clickCount.current = 1;
    } else {
      if (eq(day, dateStart!)) {
        onChangeEnd(day);
      } else {
        onChangeEnd(day);
      }
      clickCount.current = 0;
      setTimeout(() => setOpen(false), 150);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) clickCount.current = 0;
  };

  const label = (() => {
    if (!dateStart) return null;
    if (dateEnd) {
      if (eq(dateStart, dateEnd)) return format(dateStart, 'dd.MM.yyyy', { locale: de });
      return `${format(dateStart, 'dd.MM.', { locale: de })} – ${format(dateEnd, 'dd.MM.yyyy', { locale: de })}`;
    }
    return format(dateStart, 'dd.MM.yyyy', { locale: de });
  })();

  // Tage des aktuellen Monats aufbauen
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), i + 1)
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayStyle = (day: Date): React.CSSProperties & { extraClass?: string } => {
    const isStart = dateStart && eq(day, dateStart);
    const isEnd   = rangeEnd && eq(day, rangeEnd);
    const inRange = dateStart && rangeEnd && day > dateStart && day < rangeEnd;
    const isToday = eq(day, new Date());

    if (isStart && isEnd) {
      return {
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        borderRadius: '9999px',
      };
    }
    if (isStart) return {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderRadius: '6px 0 0 6px',
    };
    if (isEnd) return {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderRadius: '0 6px 6px 0',
    };
    if (inRange) return {
      background: 'transparent',
      color: 'inherit',
      borderRadius: '0',
    };
    if (isToday) return {
      boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary) / 0.5)',
      borderRadius: '9999px',
    };
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
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal text-xs h-9 gap-1.5",
            !dateStart && "text-muted-foreground"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{label ?? 'Zeitraum wählen'}</span>
          {(dateStart || dateEnd) && (
            <span
              role="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={e => {
                e.stopPropagation();
                onChangeStart(undefined);
                onChangeEnd(undefined);
                clickCount.current = 0;
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs border-b border-border/40">
          <span className={cn("font-medium transition-colors",
            !dateStart ? "text-primary" : "text-foreground")}>
            {dateStart ? format(dateStart, 'dd.MM.yyyy') : 'Startdatum'}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn("font-medium transition-colors",
            dateStart && !dateEnd ? "text-primary" : "text-foreground")}>
            {dateEnd ? format(dateEnd, 'dd.MM.yyyy') : 'Enddatum'}
          </span>
          {(dateStart || dateEnd) && (
            <button
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                onChangeStart(undefined);
                onChangeEnd(undefined);
                clickCount.current = 0;
              }}
            >
              Zurücksetzen
            </button>
          )}
        </div>

        {/* Kalender */}
        <div className="p-3 select-none" style={{ width: 280 }}>
          {/* Nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => handleMonthChange(-1)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              className="text-sm font-medium overflow-hidden"
              style={{
                animation: slideDir
                  ? `cal-${slideDir} .2s ease-out`
                  : undefined,
              }}
            >
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <style>{`
            @keyframes cal-left  { from { opacity:0; transform:translateX(10px)  } to { opacity:1; transform:translateX(0) } }
            @keyframes cal-right { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
          `}</style>

          {/* Wochentage */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '2px 0 6px' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Tage */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => (
                    <td
                      key={col}
                      style={{
                        padding: 0,
                        background: day ? getTdBackground(day) : 'transparent',
                      }}
                    >
                      {day ? (
                        <button
                          onClick={() => handleDayClick(day)}
                          onMouseEnter={() => setHovered(day)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: (dateStart && eq(day, dateStart)) || (rangeEnd && eq(day, rangeEnd)) ? 500 : 400,
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'background .1s, color .1s',
                            ...getDayStyle(day),
                            ...(
                              !((dateStart && eq(day, dateStart)) || (rangeEnd && eq(day, rangeEnd)) || (dateStart && rangeEnd && day > dateStart && day < rangeEnd))
                                ? { ':hover': { background: 'hsl(var(--muted))' } }
                                : {}
                            ),
                          }}
                          className={cn(
                            "outline-none",
                            !((dateStart && eq(day, dateStart)) || (rangeEnd && eq(day, rangeEnd))) &&
                            !(dateStart && rangeEnd && day > dateStart && day < rangeEnd) &&
                            "hover:bg-muted rounded-full",
                          )}
                        >
                          {day.getDate()}
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="px-4 pb-3 text-[10px] text-muted-foreground">
          {!dateStart
            ? 'Startdatum wählen'
            : !dateEnd
            ? 'Enddatum wählen'
            : ''}
        </p>
      </PopoverContent>
    </Popover>
  );
}

// ─── Status-Konfiguration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  draft:     { label: 'Entwurf',    color: 'text-muted-foreground', bg: 'bg-muted/60',      border: 'border-border',         dot: '#6b7280' },
  planned:   { label: 'Geplant',    color: 'text-blue-400',         bg: 'bg-blue-500/10',   border: 'border-blue-500/30',    dot: '#60a5fa' },
  packed:    { label: 'Gepackt',    color: 'text-amber-400',        bg: 'bg-amber-500/10',  border: 'border-amber-500/30',   dot: '#fbbf24' },
  transit:   { label: 'Unterwegs',  color: 'text-orange-400',       bg: 'bg-orange-500/10', border: 'border-orange-500/30',  dot: '#fb923c' },
  live:      { label: 'Live',       color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30',     dot: '#34d399' },
  returning: { label: 'Rücklauf',  color: 'text-purple-400',       bg: 'bg-purple-500/10', border: 'border-purple-500/30',  dot: '#a78bfa' },
  archived:  { label: 'Archiviert', color: 'text-muted-foreground', bg: 'bg-muted/40',      border: 'border-border/50',      dot: '#374151' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  package: Package, music: Music, lightbulb: Lightbulb, zap: Zap,
  wrench: Wrench, cable: Cable, star: Star, box: Box, layers: Layers,
};
const getPkgIcon = (name: string): React.ElementType => ICON_MAP[name] ?? Package;

// ─── Phasen-Templates ────────────────────────────────────────────────────────

const PHASE_TEMPLATES: Partial<Record<ProjectStatus, { label: string; icon: string; todos: string[] }>> = {
  planned: { label: 'Vorbereitung', icon: '🔧', todos: ['Alle Equipment-Items checken', 'Beschädigte Geräte reparieren / ersetzen', 'Batterien & Akkus aufladen', 'Kabel und Adapter überprüfen', 'DMX-Konfiguration testen', 'Dokumentation ausdrucken', 'Team briefen'] },
  packed:  { label: 'Einladen',     icon: '📦', todos: ['Equipment nach Packliste verladen', 'Vollständigkeit prüfen', 'Cases beschriften', 'Fahrzeug-Check (Beleuchtung, Ladungssicherung)', 'Routenplanung & ETA kommunizieren'] },
  transit: { label: 'Aufbau',       icon: '🚛', todos: ['Ankunft am Veranstaltungsort', 'Venue-Check & Einweisung durch Location', 'Equipment ausladen & sortieren', 'Bühne / Stage aufbauen', 'Verkabelung & Patching', 'Licht einleuchten', 'Soundcheck durchführen'] },
  live:    { label: 'Show',         icon: '🎤', todos: ['Ablaufplan final prüfen', 'Notfallkontakte überprüfen', 'Crew-Positionen zuweisen', 'Publikumseinlass koordinieren', 'Showbeginn bestätigen'] },
  returning: { label: 'Abbau & Rücklauf', icon: '🏠', todos: ['Alle Equipment-Items zurück zum Lagerplatz', 'Inventur durchführen', 'Beschädigte Items dokumentieren', 'Schmutziges Equipment reinigen', 'Wartungs-Notizen hinzufügen', 'Abrechnung durchführen', 'Besitztümer überprüfen'] },
};

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function PhaseTemplateBanner({ status, onApply, onDismiss }: {
  status: ProjectStatus; onApply: (todos: string[]) => Promise<void>; onDismiss: () => void;
}) {
  const template = PHASE_TEMPLATES[status];
  if (!template) return null;
  const [applying, setApplying] = useState(false);
  return (
    <div className="rounded-lg border p-3 flex items-start gap-3 bg-blue-500/5 border-blue-500/20">
      <span className="text-xl shrink-0 mt-0.5">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Checkliste „{template.label}" verfügbar</p>
        <p className="text-xs text-muted-foreground mt-0.5">{template.todos.length} Standard-Aufgaben hinzufügen?</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onDismiss}>Nein</Button>
        <Button size="sm" className="h-7 text-xs px-2" disabled={applying}
          onClick={async () => { setApplying(true); try { await onApply(template.todos); } finally { setApplying(false); } }}>
          {applying ? '...' : 'Hinzufügen'}
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

const CONDITION_OPTIONS = [
  { value: 'ok',      label: 'OK',         color: 'text-primary'     },
  { value: 'damaged', label: 'Beschädigt', color: 'text-amber-400'   },
  { value: 'missing', label: 'Fehlt',      color: 'text-destructive' },
] as const;

function ConditionSelect({ value, onChange, disabled }: {
  value: Condition; onChange: (v: Condition) => void; disabled?: boolean;
}) {
  const opt = CONDITION_OPTIONS.find(o => o.value === value) ?? CONDITION_OPTIONS[0];
  return (
    <Select value={value} onValueChange={v => onChange(v as Condition)} disabled={disabled}>
      <SelectTrigger className={cn("h-6 text-[10px] w-24 px-2 border-border/60", opt.color)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONDITION_OPTIONS.map(o => (
          <SelectItem key={o.value} value={o.value} className={cn("text-xs", o.color)}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusBadgeLocal({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.color, cfg.bg, cfg.border)}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function StatusPickerLocal({ status, onChangeStatus, disabled }: {
  status: ProjectStatus; onChangeStatus: (s: ProjectStatus) => void; disabled?: boolean;
}) {
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
            <DropdownMenuItem key={s} disabled={isCurrent}
              className={cn(isCurrent && "opacity-40 cursor-default")}
              onClick={() => onChangeStatus(s)}>
              <span className="h-2 w-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: cfg?.dot }} />
              <span className={cfg?.color}>{cfg?.label}</span>
              {isNext && <span className="ml-auto text-[10px] text-muted-foreground">→ nächster</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Finalisierungs-Dialog ────────────────────────────────────────────────────

function FinalizeProjectDialog({ open, onClose, projectName, allItems, conditions, onFinalize }: {
  open: boolean; onClose: () => void; projectName: string;
  allItems: EnrichedProjectItem[]; conditions: Record<string, Condition>;
  onFinalize: (options: FinalizeOptions) => Promise<void>;
}) {
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">

        {/* Schritt 1: Übersicht */}
        {step === 'confirm' && (<>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-primary" /> Projekt abschließen</DialogTitle>
            <DialogDescription>„{projectName}" wird archiviert. Aktueller Stand:</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-2xl font-bold text-primary">{okCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">OK</p>
              </div>
              <div className={cn("rounded-lg p-3", damagedItems.length > 0 ? "bg-amber-500/10" : "bg-muted/40")}>
                <p className={cn("text-2xl font-bold", damagedItems.length > 0 ? "text-amber-400" : "text-muted-foreground")}>{damagedItems.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Beschädigt</p>
              </div>
              <div className={cn("rounded-lg p-3", missingItems.length > 0 ? "bg-destructive/10" : "bg-muted/40")}>
                <p className={cn("text-2xl font-bold", missingItems.length > 0 ? "text-destructive" : "text-muted-foreground")}>{missingItems.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Fehlen</p>
              </div>
            </div>

            {unpackedItems.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />{unpackedItems.length} Artikel nicht als „zurück" markiert
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {unpackedItems.slice(0, 8).map(i => (
                    <p key={i.id} className="text-xs text-muted-foreground pl-1">· {i.item_name ?? 'Unbekannt'} ×{i.quantity}</p>
                  ))}
                  {unpackedItems.length > 8 && (
                    <p className="text-xs text-muted-foreground pl-1">… und {unpackedItems.length - 8} weitere</p>
                  )}
                </div>
              </div>
            )}

            {missingItems.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Als „fehlt" markiert
                </p>
                {missingItems.map(i => (
                  <p key={i.id} className="text-xs text-muted-foreground pl-1">· {i.item_name ?? 'Unbekannt'} ×{i.quantity}</p>
                ))}
              </div>
            )}

            {missingItems.length === 0 && unpackedItems.length === 0 && damagedItems.length === 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-primary font-medium">Alles vollständig und in Ordnung.</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Abbrechen</Button>
            <Button onClick={() => setStep('actions')} className="w-full sm:w-auto">Weiter →</Button>
          </DialogFooter>
        </>)}

        {/* Schritt 2: Aktionen */}
        {step === 'actions' && (<>
          <DialogHeader>
            <DialogTitle>Abschluss-Aktionen</DialogTitle>
            <DialogDescription>Was soll mit den offenen Punkten passieren?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(missingItems.length > 0 || unpackedItems.length > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Ungeklärte Artikel ({missingItems.length + unpackedItems.length})</p>
                {([
                  { value: 'lost',  title: 'Als „verloren" markieren',          desc: 'Items erhalten Condition „defekt" und fallen aus der Verfügbarkeit.' },
                  { value: 'found', title: 'Als „im Lager vorhanden" markieren', desc: 'Items werden als verfügbar zurückgebucht.' },
                  { value: null,    title: 'Jetzt überspringen',                  desc: 'Items bleiben unverändert.' },
                ] as const).map(opt => (
                  <label key={String(opt.value)} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    opt.value === null ? "border-border/40 opacity-60" : "border-border hover:bg-muted/30")}>
                    <input type="radio" name="missingAction"
                      checked={options.missingAction === opt.value}
                      onChange={() => setOptions(p => ({ ...p, missingAction: opt.value }))}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {damagedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Beschädigte Artikel ({damagedItems.length})</p>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 cursor-pointer">
                  <Checkbox checked={options.sendDamagedToMaintenance}
                    onCheckedChange={v => setOptions(p => ({ ...p, sendDamagedToMaintenance: !!v }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-amber-300">In Wartung einplanen</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Wartungseintrag wird automatisch erstellt.</p>
                    <div className="mt-1.5 space-y-0.5">
                      {damagedItems.map(i => (
                        <p key={i.id} className="text-xs text-amber-400/80">· {i.item_name ?? 'Unbekannt'}</p>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
            )}

            <div className="rounded-lg border border-border/50 p-3 opacity-50">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Projektbericht als PDF</p>
                <Badge variant="outline" className="text-[10px] ml-auto">Bald verfügbar</Badge>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStep('confirm')} className="w-full sm:w-auto">← Zurück</Button>
            <Button disabled={finalizing} className="w-full sm:w-auto"
              onClick={async () => {
                setFinalizing(true);
                try { await onFinalize(options); setStep('done'); } finally { setFinalizing(false); }
              }}>
              {finalizing ? 'Wird abgeschlossen...' : 'Abschließen & archivieren'}
            </Button>
          </DialogFooter>
        </>)}

        {/* Schritt 3: Fertig */}
        {step === 'done' && (<>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-primary" /> Projekt archiviert</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              „{projectName}" wurde abgeschlossen. Alle Items wurden zurückgebucht.
            </p>
          </div>
          <DialogFooter><Button onClick={onClose} className="w-full">Schließen</Button></DialogFooter>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

// ─── Projekt-Edit Dialog ──────────────────────────────────────────────────────

function ProjectEditDialog({ open, onClose, initial, onSubmit }: {
  open: boolean; onClose: () => void; initial: EditFormData;
  onSubmit: (d: EditFormData) => Promise<void>;
}) {
  const [name, setName]         = useState(initial.name);
  const [desc, setDesc]         = useState(initial.description);
  const [location, setLocation] = useState(initial.location);
  const [dateStart, setDateStart] = useState<Date | undefined>(
    initial.dateStart ? new Date(initial.dateStart) : undefined
  );
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    initial.dateEnd ? new Date(initial.dateEnd) : undefined
  );
  const [notes, setNotes]   = useState(initial.notes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial.name); setDesc(initial.description); setLocation(initial.location);
    setDateStart(initial.dateStart ? new Date(initial.dateStart) : undefined);
    setDateEnd(initial.dateEnd   ? new Date(initial.dateEnd)   : undefined);
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
          <DialogTitle>Projekt bearbeiten</DialogTitle>
          <DialogDescription>Projektdetails anpassen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1"><Label>Beschreibung</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>Ort / Location</Label>
            <Input placeholder="z.B. Marktplatz Musterhausen" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          {/* Fix 5: Hotel-Style Range-Picker */}
          <div className="space-y-1">
            <Label>Zeitraum</Label>
            <DateRangePicker
              dateStart={dateStart}
              dateEnd={dateEnd}
              onChangeStart={setDateStart}
              onChangeEnd={setDateEnd}
            />
          </div>
          <div className="space-y-1"><Label>Notizen</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full sm:w-auto">
            {saving ? 'Speichern...' : 'Speichern'}
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
  addedPackageIds: Set<string>;
  /** inventory_item_ids already in this project — blocks re-adding */
  addedItemIds: Set<string>;
  conflicts: Record<string, ConflictInfo>;
  onAddPackage: (id: string) => Promise<void>;
  onAddItem: (id: string, qty: number) => Promise<void>;
}) {
  const [tab,     setTab]    = useState<'packages' | 'items'>('packages');
  const [search,  setSearch] = useState('');
  const [quantities, setQty] = useState<Record<string, number>>({});
  const [adding,  setAdding] = useState<string | null>(null);

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
          <DialogTitle>Equipment hinzufügen</DialogTitle>
          <DialogDescription>Pakete oder Einzelartikel zum Projekt hinzufügen.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 px-6 shrink-0">
          {(['packages', 'items'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {t === 'packages' ? `Pakete (${packages.length})` : `Artikel (${inventoryItems.length})`}
            </button>
          ))}
        </div>

        <div className="px-6 pb-2 shrink-0">
          <Input placeholder={tab === 'packages' ? 'Paket suchen...' : 'Artikel suchen...'}
            value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">

          {/* Pakete */}
          {tab === 'packages' && (filteredPkgs.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">Keine Pakete gefunden</p>
            : filteredPkgs.map(pkg => {
              const already = addedPackageIds.has(pkg.id);
              const IconComp = getPkgIcon(pkg.icon);
              const pkgConflicts = pkg.items.filter(i => conflicts[i.inventory_item_id]).length;
              return (
                <div key={pkg.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  already ? "opacity-50 bg-muted/30 border-border" : "bg-card border-border hover:border-primary/40")}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: pkg.color + '25' }}>
                    <IconComp className="h-4 w-4" style={{ color: pkg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.items.length} Artikel</p>
                  </div>
                  {pkgConflicts > 0 && !already && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-400 bg-amber-500/10 shrink-0">
                      <AlertTriangle className="h-3 w-3" />{pkgConflicts} Konflikt{pkgConflicts > 1 ? 'e' : ''}
                    </Badge>
                  )}
                  {already
                    ? <Badge variant="secondary" className="text-[10px] shrink-0">Bereits hinzugefügt</Badge>
                    : <Button size="sm" className="h-7 px-3 shrink-0" disabled={adding === pkg.id}
                        onClick={async () => { setAdding(pkg.id); try { await onAddPackage(pkg.id); } finally { setAdding(null); } }}>
                        {adding === pkg.id ? '...' : <><Plus className="h-3 w-3 mr-1" />Hinzufügen</>}
                      </Button>
                  }
                </div>
              );
            })
          )}

          {/* Einzelartikel */}
          {tab === 'items' && (filteredItems.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">Keine Artikel gefunden</p>
            : filteredItems.map(item => {
              const conflict = conflicts[item.id];
              const already  = addedItemIds.has(item.id);
              return (
                <div key={item.id} className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                  already ? "opacity-50 border-border" : "border-border hover:border-primary/40")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.category} · {item.location} · Bestand: {item.quantity}
                    </p>
                    {conflict && <div className="mt-1"><ConflictBadge conflict={conflict} /></div>}
                  </div>
                  {already ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Im Projekt</Badge>
                  ) : (
                    <>
                      <Input type="number" min={1} max={item.quantity}
                        value={quantities[item.id] ?? 1}
                        onChange={e => setQty(prev => ({
                          ...prev,
                          [item.id]: Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)),
                        }))}
                        className="w-14 h-7 text-xs text-center"
                      />
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0"
                        disabled={adding === item.id}
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

// ─── Item-Zeile (wiederverwendet in Paket + Direktartikel) ───────────────────

function ItemRow({ itemName, itemCategory, packed, showPack, showCond, isLocked, packDisabled, conflict, condition, quantity, onTogglePacked, onRemove, onConditionChange }: {
  itemName?: string; itemCategory?: string;
  packed: boolean; showPack: boolean; showCond: boolean;
  isLocked: boolean; packDisabled: boolean;
  conflict?: ConflictInfo; condition: Condition; quantity: number;
  onTogglePacked: (packed: boolean) => void;
  onRemove: () => void;
  onConditionChange: (c: Condition) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
      {showPack && (
        <Checkbox checked={packed} disabled={packDisabled}
          onCheckedChange={v => onTogglePacked(!!v)} className="shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", packed && showPack && "line-through text-muted-foreground")}>
          {itemName ?? 'Unbekannt'}
        </p>
        {itemCategory && <p className="text-xs text-muted-foreground truncate">{itemCategory}</p>}
      </div>
      {conflict && <ConflictBadge conflict={conflict} />}
      <Badge variant="outline" className="text-[10px] shrink-0">×{quantity}</Badge>
      {showCond && (
        <ConditionSelect value={condition} onChange={onConditionChange} disabled={isLocked} />
      )}
      {!isLocked && (
        <button className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </button>
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
  const [collapsed, setCollapsed] = useState(false);
  const IconComp    = getPkgIcon(group.package.icon);
  const packedCount = group.items.filter(i => i.packed).length;
  const allPacked   = group.items.length > 0 && packedCount === group.items.length;
  const isLocked    = LOCKED_PHASES.includes(status) || isReadonly;
  const showPack    = PACK_PHASES.includes(status) && !isReadonly;
  const showCond    = CONDITION_PHASES.includes(status) && !isReadonly;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setCollapsed(v => !v)}>
        <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: group.package.color + '25' }}>
          <IconComp className="h-4 w-4" style={{ color: group.package.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{group.package.name}</p>
          <p className="text-xs text-muted-foreground">
            {showPack ? `${packedCount}/${group.items.length} gepackt` : `${group.items.length} Artikel`}
          </p>
        </div>
        {allPacked && showPack && (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] shrink-0">✓ Vollständig</Badge>
        )}
        {!isLocked && (
          <button className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            onClick={e => { e.stopPropagation(); onRemovePackage(); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown  className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="divide-y divide-border/50">
          {group.items.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">Paket enthält keine Artikel</p>
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
              onRemove={() => {}} // Paket-Items werden über Paket entfernt
              onConditionChange={c => onConditionChange(item.id, c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Direktartikel-Liste ──────────────────────────────────────────────────────

function DirectItemsList({ items, status, conflicts, conditions, isReadonly, onTogglePacked, onRemoveItem, onConditionChange }: {
  items: EnrichedProjectItem[]; status: ProjectStatus; isReadonly: boolean;
  conflicts: Record<string, ConflictInfo>; conditions: Record<string, Condition>;
  onTogglePacked: (id: string, packed: boolean) => void;
  onRemoveItem: (id: string) => void;
  onConditionChange: (id: string, c: Condition) => void;
}) {
  if (items.length === 0) return null;
  const isLocked = LOCKED_PHASES.includes(status) || isReadonly;
  const showPack = PACK_PHASES.includes(status) && !isReadonly;
  const showCond = CONDITION_PHASES.includes(status) && !isReadonly;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direktartikel</p>
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Equipment-Tab ────────────────────────────────────────────────────────────

function EquipmentTab({
  projectId, projectName,
  packageGroups, directItems, totalItems, packedItems,
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
  const navigate = useNavigate();
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [markingInUse, setMarkingInUse] = useState(false);

  // Sets für den Picker — verhindert Doppel-Hinzufügen
  const addedPackageIds = useMemo(() => new Set(packageGroups.map(g => g.package_id)), [packageGroups]);
  const addedItemIds    = useMemo(() => {
    const ids = new Set<string>();
    packageGroups.forEach(g => g.items.forEach(i => { if (i.inventory_item_id) ids.add(i.inventory_item_id); }));
    directItems.forEach(i => { if (i.inventory_item_id) ids.add(i.inventory_item_id); });
    return ids;
  }, [packageGroups, directItems]);

  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
  const isLocked = LOCKED_PHASES.includes(status);
  const showPack = PACK_PHASES.includes(status);
  const showCond = CONDITION_PHASES.includes(status);

  return (
    <div className="space-y-4">

      {/* ── Aufbau-Banner: 2 Optionen ── */}
      {AUFBAU_PHASES.includes(status) && totalItems > 0 && !isReadonly && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-blue-300 flex items-center gap-1.5">
              <ScanLine className="h-4 w-4" /> Equipment als „Im Einsatz" markieren
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standort → Projektname · Condition → Im Einsatz
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline"
              className="gap-1.5 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              onClick={() => navigate(`/scanner?mode=aufbau&projectId=${projectId}`)}>
              <ScanLine className="h-3.5 w-3.5" /> Per Scanner
            </Button>
            <Button size="sm" variant="outline"
              className="gap-1.5 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              disabled={markingInUse}
              onClick={async () => { setMarkingInUse(true); try { await onMarkInUse(); } finally { setMarkingInUse(false); } }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {markingInUse ? 'Markiere...' : 'Alle direkt markieren'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Abbau-Banner: Scanner-first ── */}
      {status === 'returning' && totalItems > 0 && !isReadonly && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
              <ScanLine className="h-4 w-4" /> Abbau per Scanner (empfohlen)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zustand direkt beim Scannen erfassen. Manuelle Erfassung unten über die Condition-Auswahl möglich.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 w-full bg-purple-600 hover:bg-purple-500 text-white"
            onClick={() => navigate(`/scanner?mode=abbau&projectId=${projectId}`)}>
            <ScanLine className="h-3.5 w-3.5" /> Abbau-Scanner öffnen
          </Button>
        </div>
      )}

      {/* ── Packfortschritt ── */}
      {showPack && totalItems > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Packfortschritt</span>
            <span className="text-muted-foreground">{packedItems} / {totalItems} gepackt</span>
          </div>
          <Progress value={progress} className="h-2" />
          {packedItems === totalItems && totalItems > 0 && (
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Alles gepackt!
            </p>
          )}
          {status === 'transit' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> Unterwegs — Packliste gesperrt
            </p>
          )}
        </Card>
      )}

      {/* ── Status-Hinweise ── */}
      {isLocked && !isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Equipment kann in dieser Phase nicht bearbeitet werden.
        </div>
      )}
      {isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Archive className="h-3.5 w-3.5 shrink-0" />
          Dieses Projekt ist archiviert — Lesemodus.
        </div>
      )}
      {showCond && totalItems > 0 && !isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs text-purple-300">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
          Zustand der zurückgegebenen Artikel erfassen (oder per Scanner oben).
        </div>
      )}

      {/* ── Equipment hinzufügen ── */}
      {!isLocked && !isReadonly && (
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" /> Equipment hinzufügen
        </Button>
      )}

      {/* ── Pakete ── */}
      {packageGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pakete</p>
          {packageGroups.map(group => (
            <PackageGroupSection key={group.instanceId} group={group} status={status}
              conflicts={conflicts} conditions={conditions} isReadonly={isReadonly}
              onRemovePackage={() => removePackageFromProject(group.instanceId)}
              onTogglePacked={togglePacked}
              onConditionChange={onConditionChange}
            />
          ))}
        </div>
      )}

      {/* ── Direktartikel ── */}
      <DirectItemsList items={directItems} status={status} conflicts={conflicts}
        conditions={conditions} isReadonly={isReadonly}
        onTogglePacked={togglePacked} onRemoveItem={removeItem}
        onConditionChange={onConditionChange}
      />

      {/* ── Leer-State ── */}
      {totalItems === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Noch kein Equipment zugewiesen</p>
            <p className="text-xs text-muted-foreground mt-1">Füge Pakete oder Einzelartikel hinzu.</p>
          </CardContent>
        </Card>
      )}

      <EquipmentPickerDialog
        open={pickerOpen} onClose={() => setPickerOpen(false)}
        packages={packages} inventoryItems={availableInventory}
        addedPackageIds={addedPackageIds} addedItemIds={addedItemIds}
        conflicts={conflicts}
        onAddPackage={addPackageToProject} onAddItem={addDirectItem}
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
          {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox checked={todo.done} onCheckedChange={v => onToggle(!!v)} className="shrink-0" disabled={isReadonly} />
      <span className={cn("flex-1 text-sm", todo.done && "line-through text-muted-foreground")}>
        {todo.title}
      </span>
      {!isReadonly && (
        <button className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          onClick={onDelete}>
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
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding]     = useState(false);
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

  const template   = PHASE_TEMPLATES[status];
  const showBanner = !!template && templateDismissed !== status && !isReadonly;
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
            <span>{doneCount} von {todos.length} erledigt</span>
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
                onToggle={done => onToggle(todo.id, done)}
                onDelete={() => onDelete(todo.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {todos.length === 0 && !showBanner && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium">Noch keine Todos</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isReadonly ? 'Dieses Projekt ist archiviert.' : 'Erstelle Aufgaben für dieses Projekt.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!isReadonly && (
        <div className="flex gap-2">
          <Input placeholder="Neue Aufgabe..." value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="h-9"
          />
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

  // refetchPackages sorgt dafür, dass wenn jemand im Packages-Tab neue Items
  // zu einem Paket hinzufügt, das hier im Projekt sofort reflektiert wird.
  const { packages, refetch: refetchPackages } = usePackages();

  const {
    project, packageGroups, directItems, allItems, todos, loading,
    availableInventory, totalItems, packedItems,
    updateProject, deleteProject, toggleFavorite, updateStatus,
    addPackageToProject, removePackageFromProject,
    addDirectItem, removeItem, togglePacked,
    addTodo, toggleTodo, deleteTodo, reorderTodos,
    refetch: refetchProject,
    restoreAllProjectItems,
  } = useProjectDetail(id);

  const tab    = (searchParams.get('tab') ?? 'equipment') as 'equipment' | 'todos' | 'dmx';
  const setTab = (v: string) => setSearchParams(v === 'equipment' ? {} : { tab: v }, { replace: true });

  const [editOpen,      setEditOpen]      = useState(false);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [finalizeOpen,  setFinalizeOpen]  = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ from: ProjectStatus; to: ProjectStatus } | null>(null);

  // Conditions — auf Seiten-Ebene damit FinalizeDialog darauf zugreifen kann
  const [conditions, setConditions] = useState<Record<string, Condition>>({});

  const handleConditionChange = useCallback(async (itemId: string, condition: Condition) => {
    setConditions(prev => ({ ...prev, [itemId]: condition }));
    await supabase.from('project_items').update({ condition } as any).eq('id', itemId);
  }, []);

  // Archived = vollständig readonly
  const isArchived = project?.status === ('archived' as any);
  const isReadonly = isArchived;

  // ── Conflict-Detection via availableInventory (kein extra DB-Query) ──────
  const conflicts = useMemo<Record<string, ConflictInfo>>(() => {
    // Fix 2: Eigene Projekt-Items NIE als Konflikt zeigen
    const ownInvIds = new Set<string>();
    packageGroups.forEach(g => g.items.forEach(i => { if (i.inventory_item_id) ownInvIds.add(i.inventory_item_id); }));
    directItems.forEach(i => { if (i.inventory_item_id) ownInvIds.add(i.inventory_item_id); });

    const result: Record<string, ConflictInfo> = {};
    availableInventory.forEach(item => {
      if (ownInvIds.has(item.id)) return; // eigene Items überspringen
      if (item.condition === 'defekt') {
        result[item.id] = { type: 'defect', label: 'Defekt' };
      } else if (item.condition === 'verliehen') {
        result[item.id] = { type: 'lending', label: item.lent_to ? `Verliehen an ${item.lent_to}` : 'Im Verleih' };
      } else if (item.condition === 'in-einsatz') {
        result[item.id] = { type: 'project', label: 'Im Einsatz' };
      }
    });
    return result;
  }, [availableInventory, packageGroups, directItems]);

  // ── Items als "Im Einsatz" markieren ─────────────────────────────────────
  const markItemsInUse = useCallback(async () => {
    if (!project || !allItems.length) return;
    const invIds = [...new Set(allItems.map(i => i.inventory_item_id).filter(Boolean))] as string[];
    if (!invIds.length) return;

    // Fix 3: Originalstandort sichern — nur wenn noch nicht gesetzt (nicht überschreiben)
    // Originalstandort sichern bevor Location überschrieben wird
    for (const item of allItems) {
      if (!item.inventory_item_id) continue;
      const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
      if (invItem) {
        await supabase
          .from('project_items')
          .update({ original_location: invItem.location } as any)
          .eq('id', item.id);
      }
    }

    await supabase.from('inventory_items')
      .update({ condition: 'in-einsatz', location: project.name } as any)
      .in('id', invIds);

    toast({ title: '📍 Equipment als „Im Einsatz" markiert', description: `Standort → „${project.name}"` });
    await refetchProject();
  }, [project, allItems, availableInventory, toast, refetchProject]);

  // Fix 3+1: Alle Items zurücksetzen — liest original_location aus project_items
  // Pass 2 als Orphan-Cleanup falls original_location nicht gesetzt war
  const restoreAllItems = useCallback(async () => {
    if (!id || !project) return;

    // Pass 1: project_items mit gespeichertem original_location
    const { data: currentProjItems } = await supabase
      .from('project_items')
      .select('inventory_item_id, original_location')
      .eq('project_id', id);

    for (const pi of (currentProjItems ?? []) as any[]) {
      if (!pi.inventory_item_id) continue;
      await supabase.from('inventory_items')
        .update({
          condition:  'verfügbar',
          location:   pi.original_location ?? null,   // Fix 3: Originalstandort
          lent_to:    null,
          lent_until: null,
        } as any)
        .eq('id', pi.inventory_item_id);
    }

    // Pass 2: Orphan-Cleanup — Items die noch Projektname als Standort haben
    await supabase.from('inventory_items')
      .update({ condition: 'verfügbar' } as any)
      .eq('location', project.name)
      .eq('condition', 'in-einsatz');
  }, [id, project]);

  // ── Status-Handler ────────────────────────────────────────────────────────
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

  // ── Pakete auto-refresh: nach addPackage auch Pakete neu laden ────────────
  // (damit neue Items die jemand in der Pakete-Verwaltung hinzugefügt hat sichtbar werden)
  const handleAddPackage = useCallback(async (packageId: string) => {
    await addPackageToProject(packageId);
    await refetchPackages(); // Package-Stammdaten neu laden
  }, [addPackageToProject, refetchPackages]);

  // ── Finalisierung ─────────────────────────────────────────────────────────
  const handleFinalize = async (options: FinalizeOptions) => {
    if (!project || !id) return;

    const missingItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'missing');
    const damagedItems  = allItems.filter(i => (conditions[i.id] ?? 'ok') === 'damaged');
    const unpackedItems = allItems.filter(i => !i.packed);

    // 1. Ungeklärte + fehlende Items
    const unresolvedIds = [...new Set([
      ...missingItems.map(i => i.inventory_item_id),
      ...unpackedItems.map(i => i.inventory_item_id),
    ].filter(Boolean))] as string[];

    if (unresolvedIds.length > 0 && options.missingAction) {
      const newCondition = options.missingAction === 'lost' ? 'defekt' : 'verfügbar';
      await supabase.from('inventory_items')
        .update({ condition: newCondition } as any)
        .in('id', unresolvedIds);
    }

    // 2. Beschädigte Items → Wartung
    if (options.sendDamagedToMaintenance && damagedItems.length > 0) {
      for (const item of damagedItems) {
        if (!item.inventory_item_id) continue;
        await supabase.from('inventory_items')
          .update({ condition: 'defekt' } as any)
          .eq('id', item.inventory_item_id);
        await supabase.from('maintenance_records').insert({
          inventory_item_id: item.inventory_item_id,
          type: 'damage',
          description: `Schaden nach Projekt „${project.name}" festgestellt`,
          recorded_at: new Date().toISOString(),
        } as any).catch(() => {});
      }
    }

    // 3. Alle Items zurückbuchen inkl. Originalstandort (Hook-Funktion)
    await restoreAllProjectItems();

    // 4. Status auf 'archived' setzen — KEIN deleted_at Fallback mehr!
    await supabase
      .from('projects')
      .update({ status: 'archived' as any })
      .eq('id', id);

    toast({ title: 'Projekt abgeschlossen', description: `„${project.name}" wurde archiviert.` });
    setTimeout(() => navigate('/projects'), 1500);
  };

  const handleEdit = async (data: EditFormData) => {
    await updateProject({
      name: data.name, description: data.description || null,
      location: data.location || null,
      event_date_start: data.dateStart, event_date_end: data.dateEnd,
      notes: data.notes || null,
    });
    toast({ title: 'Projekt gespeichert' });
  };

  const handleDelete = async () => {
    await deleteProject();
    toast({ title: 'Projekt gelöscht' });
    navigate('/projects');
  };

  const showPackBadge   = project && PACK_PHASES.includes(project.status);
  const showPackSidebar = project && PACK_PHASES.includes(project.status) && totalItems > 0;

  // ── Loading ───────────────────────────────────────────────────────────────
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
          <ChevronLeft className="h-4 w-4" /> Zurück
        </Button>
        <Card className="p-12 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-medium">Projekt nicht gefunden</h3>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes tab-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .tab-in { animation: tab-in 0.18s ease forwards }
      `}</style>

      <div className="space-y-6 pt-4 pb-24">

        {/* Top-Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/projects')}
            className="gap-2 self-start hover:-translate-x-0.5 transition-transform">
            <ChevronLeft className="h-4 w-4" /> Zurück
          </Button>
          {!isReadonly && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none"
                onClick={() => setEditOpen(true)}>
                <Edit2 className="h-4 w-4" /> Bearbeiten
              </Button>
              <Button variant="outline" size="sm"
                className="gap-2 flex-1 sm:flex-none text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Löschen
              </Button>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* ── Main Column ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Header-Card */}
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <StatusPickerLocal status={project.status} onChangeStatus={handleStatusChange} disabled={isReadonly} />
                    {IN_USE_PHASES.includes(project.status) && !isArchived && (
                      <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-400 bg-orange-500/10">
                        📍 Im Einsatz
                      </Badge>
                    )}
                    {isArchived && (
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        <Archive className="h-3 w-3 mr-1" /> Archiviert
                      </Badge>
                    )}
                  </div>
                </div>
                <button onClick={toggleFavorite} className="p-1.5 shrink-0 mt-0.5" disabled={isReadonly}>
                  <Star className={cn("h-5 w-5 transition-colors",
                    project.is_favorite
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30 hover:text-yellow-400"
                  )} />
                </button>
              </div>
            </Card>

            {/* Rücklauf-Banner — nur wenn NICHT archiviert */}
            {project.status === 'returning' && !isReadonly && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                    <Flag className="h-4 w-4" /> Rücklauf abschließen
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Equipment zurückbuchen, Schäden dokumentieren und das Projekt archivieren.
                  </p>
                </div>
                <Button size="sm"
                  className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                  onClick={() => setFinalizeOpen(true)}>
                  <Archive className="h-4 w-4" /> Projekt abschließen
                </Button>
              </div>
            )}

            {/* Tabs — Fix 4: Sliding Indicator */}
            <Tabs value={tab} onValueChange={setTab}>
              <SlidingTabsList
                value={tab}
                onChange={setTab}
                tabs={[
                  {
                    value: 'equipment',
                    label: (
                      <>
                        <Package className="h-3.5 w-3.5" /> Equipment
                        {showPackBadge && totalItems > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {packedItems}/{totalItems}
                          </Badge>
                        )}
                      </>
                    ),
                  },
                  {
                    value: 'todos',
                    label: (
                      <>
                        <ClipboardList className="h-3.5 w-3.5" /> Todos
                        {PHASE_TEMPLATES[project.status] && !isReadonly && todos.length === 0 && (
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
                    label: <><Sliders className="h-3.5 w-3.5" /> DMX</>,
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

              <TabsContent value="dmx" className="mt-4 tab-in">
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                    <Sliders className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium">DMX-Patchplan</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Der projektgebundene Patchplan wird in einem späteren Update verfügbar sein.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => navigate('/dmx')}>
                      <Sliders className="h-4 w-4" /> Globaler Patchplan
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Projektinfo */}
            <Card className="p-5 space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projektinfo</p>

              {(project.event_date_start || project.event_date_end) && (
                <div className="flex items-start gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    {project.event_date_start && (
                      <p>{format(new Date(project.event_date_start), 'dd. MMM yyyy', { locale: de })}</p>
                    )}
                    {project.event_date_end && project.event_date_end !== project.event_date_start && (
                      <p className="text-muted-foreground">
                        bis {format(new Date(project.event_date_end), 'dd. MMM yyyy', { locale: de })}
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
                <p className="text-xs text-muted-foreground">Keine weiteren Details angegeben.</p>
              )}

              <div className="pt-1 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                <p>Erstellt: {format(new Date(project.created_at), 'dd.MM.yyyy', { locale: de })}</p>
                <p>Geändert: {format(new Date(project.updated_at), 'dd.MM.yyyy', { locale: de })}</p>
              </div>
            </Card>

            {/* Packstatus — nur in Pack-Phasen */}
            {showPackSidebar && (
              <Card className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Packstatus</p>
                <div className="flex justify-between text-sm">
                  <span>{packedItems} von {totalItems}</span>
                  <span className="text-muted-foreground">
                    {Math.round((packedItems / totalItems) * 100)} %
                  </span>
                </div>
                <Progress value={Math.round((packedItems / totalItems) * 100)} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div className="rounded-md bg-primary/10 p-2">
                    <p className="text-lg font-bold text-primary">{packedItems}</p>
                    <p className="text-muted-foreground">Gepackt</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{totalItems - packedItems}</p>
                    <p className="text-muted-foreground">Ausstehend</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Konflikt-Zusammenfassung */}
            {Object.keys(conflicts).length > 0 && !isReadonly && (
              <Card className="p-5 space-y-2 border-amber-500/20 bg-amber-500/5">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TriangleAlert className="h-3.5 w-3.5" /> Equipment-Konflikte
                </p>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(conflicts).length} Artikel sind defekt, verliehen oder anderweitig im Einsatz.
                  Trotzdem buchbar — prüfe die Verfügbarkeit.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* ── Dialoge ── */}
        {!isReadonly && (
          <ProjectEditDialog
            open={editOpen} onClose={() => setEditOpen(false)}
            initial={{
              name:        project.name,
              description: project.description ?? '',
              location:    project.location    ?? '',
              dateStart:   project.event_date_start,
              dateEnd:     project.event_date_end,
              notes:       project.notes       ?? '',
            }}
            onSubmit={handleEdit}
          />
        )}

        <FinalizeProjectDialog
          open={finalizeOpen} onClose={() => setFinalizeOpen(false)}
          projectName={project.name} allItems={allItems}
          conditions={conditions} onFinalize={handleFinalize}
        />

        <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && setPendingStatus(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Status zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Das Projekt ist als{' '}
                <strong>{pendingStatus ? STATUS_CONFIG[pendingStatus.from]?.label : ''}</strong>{' '}
                markiert. Es auf{' '}
                <strong>{pendingStatus ? STATUS_CONFIG[pendingStatus.to]?.label : ''}</strong>{' '}
                zu setzen ist unüblich – bist du sicher?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (pendingStatus) { await applyStatusChange(pendingStatus.to); setPendingStatus(null); }
              }}>
                Ja, Status ändern
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                „{project.name}" wird in den Papierkorb verschoben.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
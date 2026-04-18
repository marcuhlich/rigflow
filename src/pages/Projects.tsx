import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { de } from "date-fns/locale";
import {
  Plus, FolderKanban, Search, Star, CalendarDays, MapPin,
  Edit2, Trash2, ChevronRight, ArrowUpDown, StickyNote, X, ChevronLeft,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar }    from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { useProjects, STATUS_ORDER, isWarningJump } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";
import PackagesPage from "@/pages/Packages";
import { PageHeader } from "@/components/PageHeader";

// ─── SlidingTabs ──────────────────────────────────────────────────────────────

function SlidingTabsList({ tabs, value, onChange }: {
  tabs: { value: string; label: React.ReactNode }[];
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
    <div ref={containerRef} className="relative inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-1 h-9">
      {indicator && (
        <span className="absolute top-1 bottom-1 rounded-md bg-background shadow-sm pointer-events-none"
          style={{ left: indicator.left - 4, width: indicator.width,
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.2s cubic-bezier(0.4,0,0.2,1)' }} />
      )}
      {tabs.map((tab, i) => (
        <button key={tab.value} ref={el => { itemRefs.current[i] = el; }}
          onClick={() => onChange(tab.value)}
          className={cn("relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap",
            value === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Status-Konfiguration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  draft:     { label: 'Entwurf',   color: 'text-muted-foreground', bg: 'bg-muted/60',      border: 'border-border',         dot: '#6b7280' },
  planned:   { label: 'Geplant',   color: 'text-blue-400',         bg: 'bg-blue-500/10',   border: 'border-blue-500/30',    dot: '#60a5fa' },
  packed:    { label: 'Gepackt',   color: 'text-amber-400',        bg: 'bg-amber-500/10',  border: 'border-amber-500/30',   dot: '#fbbf24' },
  transit:   { label: 'Unterwegs', color: 'text-orange-400',       bg: 'bg-orange-500/10', border: 'border-orange-500/30',  dot: '#fb923c' },
  live:      { label: 'Live',      color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30',     dot: '#34d399' },
  returning: { label: 'Rücklauf', color: 'text-purple-400',       bg: 'bg-purple-500/10', border: 'border-purple-500/30',  dot: '#a78bfa' },
  archived:  { label: 'Archiviert', color: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border/50', dot: '#374151' },
};

// ─── Status-Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
      cfg.color, cfg.bg, cfg.border,
    )}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Status-Picker ────────────────────────────────────────────────────────────

function StatusPicker({ project, onChangeStatus }: {
  project: Project;
  onChangeStatus: (id: string, status: ProjectStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none" onClick={e => e.stopPropagation()}>
          <StatusBadge status={project.status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
        {STATUS_ORDER.map((s, idx) => {
          const cfg      = STATUS_CONFIG[s];
          const isCurrent = s === project.status;
          const isNext    = STATUS_ORDER.indexOf(project.status) + 1 === idx;
          return (
            <DropdownMenuItem
              key={s}
              disabled={isCurrent}
              className={cn(isCurrent && "opacity-40 cursor-default")}
              onClick={() => onChangeStatus(project.id, s)}
            >
              <span className="h-2 w-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: cfg.dot }} />
              <span className={cfg.color}>{cfg.label}</span>
              {isNext && <span className="ml-auto text-[10px] text-muted-foreground">→ nächster</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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

// ─── Projekt-Formular ─────────────────────────────────────────────────────────

interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  dateStart: string | null;
  dateEnd: string | null;
  notes: string;
}

function ProjectFormDialog({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initial?: ProjectFormData;
}) {
  const [name,      setName]      = useState(initial?.name ?? '');
  const [desc,      setDesc]      = useState(initial?.description ?? '');
  const [location,  setLocation]  = useState(initial?.location ?? '');
  const [dateStart, setDateStart] = useState<Date | undefined>(
    initial?.dateStart ? new Date(initial.dateStart) : undefined
  );
  const [dateEnd,   setDateEnd]   = useState<Date | undefined>(
    initial?.dateEnd ? new Date(initial.dateEnd) : undefined
  );
  const [notes,   setNotes]   = useState(initial?.notes ?? '');
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name:        name.trim(),
        description: desc.trim(),
        location:    location.trim(),
        dateStart:   dateStart ? format(dateStart, 'yyyy-MM-dd') : null,
        dateEnd:     dateEnd   ? format(dateEnd,   'yyyy-MM-dd') : null,
        notes:       notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      {/* dvh statt vh → berücksichtigt mobile Browser-Leiste */}
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
          <DialogDescription>
            {initial ? 'Projektdetails anpassen.' : 'Erstelle ein neues Projekt für eine Veranstaltung.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              placeholder="z.B. Stadtfest 2026 – Bühne A"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>Beschreibung</Label>
            <Input
              placeholder="Kurze Beschreibung (optional)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Ort / Location</Label>
            <Input
              placeholder="z.B. Marktplatz Musterhausen"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Zeitraum</Label>
            <DateRangePicker
              dateStart={dateStart}
              dateEnd={dateEnd}
              onChangeStart={setDateStart}
              onChangeEnd={setDateEnd}
            />
          </div>

          <div className="space-y-1">
            <Label>Notizen</Label>
            <Textarea
              placeholder="Zusätzliche Informationen..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full sm:w-auto">
            {saving ? 'Speichern...' : initial ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Projekt-Karte ────────────────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onDelete, onStatusChange, onToggleFavorite }: {
  project: Project;
  onEdit:            () => void;
  onDelete:          () => void;
  onStatusChange:    (id: string, status: ProjectStatus) => void;
  onToggleFavorite:  (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card
      className="group relative hover:border-primary/40 transition-colors cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Favorite */}
      <button
        className="absolute top-3 right-3 z-10 p-1"
        onClick={e => { e.stopPropagation(); onToggleFavorite(project.id); }}
      >
        <Star className={cn(
          "h-4 w-4 transition-colors",
          project.is_favorite
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground/30 hover:text-yellow-400"
        )} />
      </button>

      <CardHeader className="pb-2 p-4 pr-10">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{project.name}</CardTitle>
          {/* Edit/Delete — immer sichtbar auf Mobile, hover auf Desktop */}
          <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={e => { e.stopPropagation(); onEdit(); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-2.5">
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        {project.event_date_start && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>
              {format(new Date(project.event_date_start), 'dd.MM.yyyy', { locale: de })}
              {project.event_date_end && ` – ${format(new Date(project.event_date_end), 'dd.MM.yyyy', { locale: de })}`}
            </span>
          </div>
        )}

        {project.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        )}

        {project.notes && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="h-3 w-3 shrink-0" />
            <span className="truncate italic">{project.notes}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <StatusPicker project={project} onChangeStatus={onStatusChange} />
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            Details <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Projekte-Tab ─────────────────────────────────────────────────────────────

type SortKey = 'created' | 'name' | 'date' | 'status';

function ProjectsTab() {
  const {
    projects, loading,
    createProject, updateProject, updateStatus, deleteProject, toggleFavorite,
  } = useProjects();
  const { toast } = useToast();

  const [formOpen,     setFormOpen]     = useState(false);
  const [editProject,  setEditProject]  = useState<Project | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [sortBy,       setSortBy]       = useState<SortKey>('created');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  const [pendingStatus, setPendingStatus] = useState<{
    id: string; from: ProjectStatus; to: ProjectStatus;
  } | null>(null);

  const handleStatusChange = (id: string, to: ProjectStatus) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (isWarningJump(project.status, to)) {
      setPendingStatus({ id, from: project.status, to });
    } else {
      updateStatus(id, to);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    await updateStatus(pendingStatus.id, pendingStatus.to);
    setPendingStatus(null);
  };

  const handleCreate = async (data: ProjectFormData) => {
    await createProject({
      name:             data.name,
      description:      data.description || null,
      location:         data.location    || null,
      event_date_start: data.dateStart,
      event_date_end:   data.dateEnd,
      notes:            data.notes       || null,
    });
    toast({ title: 'Projekt erstellt', description: `"${data.name}" angelegt.` });
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editProject) return;
    await updateProject(editProject.id, {
      name:             data.name,
      description:      data.description || null,
      location:         data.location    || null,
      event_date_start: data.dateStart,
      event_date_end:   data.dateEnd,
      notes:            data.notes       || null,
    });
    toast({ title: 'Projekt gespeichert' });
    setEditProject(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProject(deleteId);
    toast({ title: 'Projekt gelöscht' });
    setDeleteId(null);
  };

  const filtered = useMemo(() => {
    let result = projects;
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.location    ?? '').toLowerCase().includes(q) ||
        (p.notes       ?? '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'date') {
        const da = a.event_date_start ?? '';
        const db = b.event_date_start ?? '';
        return da.localeCompare(db) || a.name.localeCompare(b.name);
      }
      if (sortBy === 'status') return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [projects, search, sortBy, statusFilter]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar — zweizeilig auf Mobile ── */}
      <div className="flex flex-col sm:flex-row gap-2">

        {/* Zeile 1: Neu-Button + Suche */}
        <div className="flex gap-2 flex-1">
          <Button onClick={() => setFormOpen(true)} className="gap-1.5 h-9 shrink-0" size="sm">
            <Plus className="h-4 w-4" />
            <span>Neues Projekt</span>
          </Button>

          {projects.length > 0 && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Projekte durchsuchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm w-full"
              />
            </div>
          )}
        </div>

        {/* Zeile 2 (Mobile) / fortgesetzt (Desktop): Filter + Sort */}
        {projects.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ProjectStatus | 'all')}>
              <SelectTrigger className="h-9 text-xs flex-1 sm:flex-none sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {/* Fix 9: "Status" statt "Alle Status" als Platzhalter */}
                <SelectItem value="all">Status</SelectItem>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-9 text-xs flex-1 sm:flex-none sm:w-[140px]">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Fix 9: "Neueste" statt "Neueste zuerst" */}
                <SelectItem value="created">Neueste</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="date">Datum</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Leer-State */}
      {projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Noch keine Projekte</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Erstelle ein Projekt für jede Veranstaltung – mit Status, Datum, Ort und Equipment-Zuordnung.
            </p>
            <Button className="mt-4 gap-1.5" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Erstes Projekt erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <p className="text-center py-12 text-sm text-muted-foreground">Keine Projekte gefunden.</p>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => setEditProject(project)}
              onDelete={() => setDeleteId(project.id)}
              onStatusChange={handleStatusChange}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* ── Dialoge ── */}
      <ProjectFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      {editProject && (
        <ProjectFormDialog
          open={!!editProject}
          onClose={() => setEditProject(null)}
          onSubmit={handleUpdate}
          initial={{
            name:        editProject.name,
            description: editProject.description      ?? '',
            location:    editProject.location         ?? '',
            dateStart:   editProject.event_date_start,
            dateEnd:     editProject.event_date_end,
            notes:       editProject.notes            ?? '',
          }}
        />
      )}

      <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Status zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Projekt ist als{' '}
              <strong>{pendingStatus ? STATUS_CONFIG[pendingStatus.from].label : ''}</strong>{' '}
              markiert. Es auf{' '}
              <strong>{pendingStatus ? STATUS_CONFIG[pendingStatus.to].label : ''}</strong>{' '}
              zu setzen ist unüblich – bist du sicher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Ja, Status ändern</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Projekt wird in den Papierkorb verschoben. Equipment und Pakete bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'projects') as 'projects' | 'packages';

  const setTab = (value: string) => {
    setSearchParams(value === 'projects' ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <PageHeader
        title="Projekte"
        description="Veranstaltungen planen, Equipment zuweisen, Status tracken"
        icon={FolderKanban}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <SlidingTabsList
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'projects', label: 'Projekte' },
            { value: 'packages', label: 'Pakete'   },
          ]}
        />

        <TabsContent value="projects" className="mt-4">
          <ProjectsTab />
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          {/* embedded=true → kein eigener Seitentitel, Desktop zeigt Sidebar-Info */}
          <PackagesPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
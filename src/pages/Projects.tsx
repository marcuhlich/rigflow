import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { de as deLocale, enUS } from "date-fns/locale";
import { useTranslation, Trans } from "react-i18next";
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
import { getProjectStatusLabel } from '@/i18n/helpers';

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
          className={cn("relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap active:scale-95",
            value === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Status-Konfiguration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, {
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

// ─── Status-Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
      cfg.color, cfg.bg, cfg.border,
    )}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {getProjectStatusLabel(status, t)}
    </span>
  );
}

// ─── Status-Picker ────────────────────────────────────────────────────────────

function StatusPicker({ project, onChangeStatus }: {
  project: Project;
  onChangeStatus: (id: string, status: ProjectStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none" onClick={e => e.stopPropagation()}>
          <StatusBadge status={project.status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
        {STATUS_ORDER.map((s, idx) => {
          const cfg       = STATUS_CONFIG[s];
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
              <span className={cfg.color}>{getProjectStatusLabel(s, t)}</span>
              {isNext && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {t('projects.status_next')}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({ dateStart, dateEnd, onChangeStart, onChangeEnd }: {
  dateStart: Date | undefined;
  dateEnd:   Date | undefined;
  onChangeStart: (d: Date | undefined) => void;
  onChangeEnd:   (d: Date | undefined) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open,     setOpen]    = useState(false);
  const [month,    setMonth]   = useState(dateStart ?? new Date());
  const [hovered,  setHovered] = useState<Date | null>(null);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const prevMonth  = useRef(dateStart ?? new Date());
  const clickCount = useRef(0);

  const DOW    = t('projects.date_picker.days',   { returnObjects: true }) as string[];
  const MONTHS = t('projects.date_picker.months', { returnObjects: true }) as string[];
  const dfLocale = i18n.language.startsWith('de') ? deLocale : enUS;

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
      onChangeEnd(day);
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
      if (eq(dateStart, dateEnd)) return format(dateStart, 'dd.MM.yyyy', { locale: dfLocale });
      return `${format(dateStart, 'dd.MM.', { locale: dfLocale })} – ${format(dateEnd, 'dd.MM.yyyy', { locale: dfLocale })}`;
    }
    return format(dateStart, 'dd.MM.yyyy', { locale: dfLocale });
  })();

  const firstDow   = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), i + 1)
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayStyle = (day: Date): React.CSSProperties => {
    const isStart = dateStart && eq(day, dateStart);
    const isEnd   = rangeEnd  && eq(day, rangeEnd);
    const inRange = dateStart && rangeEnd && day > dateStart && day < rangeEnd;
    const isToday = eq(day, new Date());

    if (isStart && isEnd) return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '9999px' };
    if (isStart)  return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '6px 0 0 6px' };
    if (isEnd)    return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '0 6px 6px 0' };
    if (inRange)  return { background: 'transparent', color: 'inherit', borderRadius: '0' };
    if (isToday)  return { boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary) / 0.5)', borderRadius: '9999px' };
    return {};
  };

  const getTdBackground = (day: Date): string => {
    const isStart = dateStart && eq(day, dateStart);
    const isEnd   = rangeEnd  && eq(day, rangeEnd);
    const inRange = dateStart && rangeEnd && day > dateStart && day < rangeEnd;
    if (isStart && isEnd) return 'transparent';
    if (isStart) return `linear-gradient(to right, transparent 50%, hsl(var(--primary) / 0.13) 50%)`;
    if (isEnd)   return `linear-gradient(to left,  transparent 50%, hsl(var(--primary) / 0.13) 50%)`;
    if (inRange) return `hsl(var(--primary) / 0.13)`;
    return 'transparent';
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal text-xs h-9 gap-1.5", !dateStart && "text-muted-foreground")}
        >
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
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs border-b border-border/40">
          <span className={cn("font-medium transition-colors", !dateStart ? "text-primary" : "text-foreground")}>
            {dateStart ? format(dateStart, 'dd.MM.yyyy') : t('projects.date_picker.start_label')}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn("font-medium transition-colors", dateStart && !dateEnd ? "text-primary" : "text-foreground")}>
            {dateEnd ? format(dateEnd, 'dd.MM.yyyy') : t('projects.date_picker.end_label')}
          </span>
          {(dateStart || dateEnd) && (
            <button className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { onChangeStart(undefined); onChangeEnd(undefined); clickCount.current = 0; }}>
              {t('projects.date_picker.reset')}
            </button>
          )}
        </div>

        {/* Kalender */}
        <div className="p-3 select-none" style={{ width: 280 }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => handleMonthChange(-1)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium overflow-hidden"
              style={{ animation: slideDir ? `cal-${slideDir} .2s ease-out` : undefined }}>
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button onClick={() => handleMonthChange(1)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <style>{`
            @keyframes cal-left  { from { opacity:0; transform:translateX(10px)  } to { opacity:1; transform:translateX(0) } }
            @keyframes cal-right { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
          `}</style>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '2px 0 6px' }}>
                {d}
              </div>
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
                          style={{
                            width: '100%', aspectRatio: '1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: (dateStart && eq(day, dateStart)) || (rangeEnd && eq(day, rangeEnd)) ? 500 : 400,
                            cursor: 'pointer', border: 'none',
                            transition: 'background .1s, color .1s',
                            ...getDayStyle(day),
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
            ? t('projects.date_picker.hint_start')
            : !dateEnd
            ? t('projects.date_picker.hint_end')
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
  const { t } = useTranslation();
  const [name,      setName]      = useState(initial?.name ?? '');
  const [desc,      setDesc]      = useState(initial?.description ?? '');
  const [location,  setLocation]  = useState(initial?.location ?? '');
  const [dateStart, setDateStart] = useState<Date | undefined>(
    initial?.dateStart ? new Date(initial.dateStart) : undefined
  );
  const [dateEnd,   setDateEnd]   = useState<Date | undefined>(
    initial?.dateEnd ? new Date(initial.dateEnd) : undefined
  );
  const [notes,  setNotes]  = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

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
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('projects.form.title_edit') : t('projects.form.title_create')}
          </DialogTitle>
          <DialogDescription>
            {initial ? t('projects.form.desc_edit') : t('projects.form.desc_create')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('projects.form.name_label')}</Label>
            <Input
              placeholder={t('projects.form.name_placeholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>{t('projects.form.description_label')}</Label>
            <Input
              placeholder={t('projects.form.description_placeholder')}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('projects.form.location_label')}</Label>
            <Input
              placeholder={t('projects.form.location_placeholder')}
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('projects.form.period_label')}</Label>
            <DateRangePicker
              dateStart={dateStart}
              dateEnd={dateEnd}
              onChangeStart={setDateStart}
              onChangeEnd={setDateEnd}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('fields.notes')}</Label>
            <Textarea
              placeholder={t('projects.form.notes_placeholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full sm:w-auto">
            {saving
              ? t('common.saving')
              : initial
              ? t('common.save')
              : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Projekt-Karte ────────────────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onDelete, onStatusChange, onToggleFavorite }: {
  project: Project;
  onEdit:           () => void;
  onDelete:         () => void;
  onStatusChange:   (id: string, status: ProjectStatus) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dfLocale = i18n.language.startsWith('de') ? deLocale : enUS;

  return (
    <Card
      className="group relative hover:border-primary/40 hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <button
        className="absolute top-3 right-3 z-10 p-1 active:scale-90 transition-transform"
        onClick={e => { e.stopPropagation(); onToggleFavorite(project.id); }}
      >
        <Star className={cn("h-4 w-4 transition-colors",
          project.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400"
        )} />
      </button>

      <CardHeader className="pb-2 p-4 pr-10">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{project.name}</CardTitle>
          <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" className="h-7 w-7 p-0 active:scale-95 transition-transform"
              onClick={e => { e.stopPropagation(); onEdit(); }}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive active:scale-95 transition-transform"
              onClick={e => { e.stopPropagation(); onDelete(); }}>
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
              {format(new Date(project.event_date_start), 'dd.MM.yyyy', { locale: dfLocale })}
              {project.event_date_end && ` – ${format(new Date(project.event_date_end), 'dd.MM.yyyy', { locale: dfLocale })}`}
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
            {t('projects.card.details_link')} <ChevronRight className="h-3 w-3" />
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
  const { t } = useTranslation();

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
    toast({
      title:       t('projects.toast.created_title'),
      description: t('projects.toast.created_desc', { name: data.name }),
    });
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
    toast({ title: t('projects.toast.saved_title') });
    setEditProject(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProject(deleteId);
    toast({ title: t('projects.toast.deleted_title') });
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <Button onClick={() => setFormOpen(true)} className="gap-1.5 h-9 shrink-0 active:scale-95 transition-transform" size="sm">
            <Plus className="h-4 w-4" />
            <span>{t('projects.list.btn_new')}</span>
          </Button>

          {projects.length > 0 && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('projects.list.search_placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm w-full"
              />
            </div>
          )}
        </div>

        {projects.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ProjectStatus | 'all')}>
              <SelectTrigger className="h-9 text-xs flex-1 sm:flex-none sm:w-[130px]">
                <SelectValue placeholder={t('projects.list.filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('projects.list.filter_status')}</SelectItem>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>{getProjectStatusLabel(s, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-9 text-xs flex-1 sm:flex-none sm:w-[140px]">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">{t('projects.list.sort_newest')}</SelectItem>
                <SelectItem value="name">{t('projects.list.sort_name')}</SelectItem>
                <SelectItem value="date">{t('projects.list.sort_date')}</SelectItem>
                <SelectItem value="status">{t('projects.list.sort_status')}</SelectItem>
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
            <p className="text-sm font-medium">{t('projects.list.empty_title')}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {t('projects.list.empty_desc')}
            </p>
            <Button className="mt-4 gap-1.5" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> {t('projects.list.empty_btn')}
            </Button>
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Search className="h-8 w-8 opacity-20" />
          <p className="text-sm">{t('projects.list.no_results')}</p>
        </div>
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

      {/* Dialoge */}
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

      {/* Status-Warning */}
      <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projects.status_change.warning_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="projects.status_change.warning_desc"
                values={{
                  from: pendingStatus ? getProjectStatusLabel(pendingStatus.from, t) : '',
                  to:   pendingStatus ? getProjectStatusLabel(pendingStatus.to,   t) : '',
                }}
                components={{ strong: <strong /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {t('projects.status_change.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Projekt löschen */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projects.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('projects.delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
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
  const { t } = useTranslation();
  const tab = (searchParams.get('tab') ?? 'projects') as 'projects' | 'packages';

  const setTab = (value: string) => {
    setSearchParams(value === 'projects' ? {} : { tab: value }, { replace: true });
  };

  const [tabVisible, setTabVisible] = useState(true);

  const handleTabChange = (value: string) => {
    setTabVisible(false);
    setTimeout(() => { setTab(value); setTabVisible(true); }, 150);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <PageHeader
        title={t('projects.page_title')}
        description={t('projects.page_description')}
        icon={FolderKanban}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <SlidingTabsList
          value={tab}
          onChange={handleTabChange}
          tabs={[
            { value: 'projects', label: t('projects.tab_projects') },
            { value: 'packages', label: t('projects.tab_packages') },
          ]}
        />

        <div style={{
          opacity:   tabVisible ? 1 : 0,
          transform: tabVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 150ms ease, transform 150ms ease",
        }}>
          <TabsContent value="projects" className="mt-4">
            <ProjectsTab />
          </TabsContent>
          <TabsContent value="packages" className="mt-4">
            <PackagesPage embedded />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
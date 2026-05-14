// src/components/MaintenanceTimeline.tsx
import { useState, useRef, useEffect } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from "@/lib/utils"
import {
  CheckCheck, Wrench, Sparkles, Search,
  Clock, AlertTriangle, CheckCircle2,
  Plus, Loader2, Trash2, ImageIcon, X, CalendarDays,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Card }     from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input }    from '@/components/ui/input';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover';
import {
  MaintenanceRecord, MaintenanceType,
  MAINTENANCE_TYPES, MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_DOT_COLOR,
} from '@/types/maintenance';
import { useMaintenanceRecords } from '@/hooks/useMaintenanceRecords';
import "@/styles/maintenance.css";

const GLOBAL_DEFAULT_INTERVAL = 180;

const TYPE_ICONS: Record<MaintenanceType, React.ReactNode> = {
  check:      <CheckCheck className="h-3.5 w-3.5" />,
  reparatur:  <Wrench     className="h-3.5 w-3.5" />,
  reinigung:  <Sparkles   className="h-3.5 w-3.5" />,
  inspektion: <Search     className="h-3.5 w-3.5" />,
};

function todayIso() { return new Date().toISOString().split('T')[0]; }

interface MaintenanceTimelineProps {
  itemId:                   string;
  maintenanceIntervalDays?: number | null;
  onStatusChange?: (overdue: boolean, warning: boolean) => void;
}

export function MaintenanceTimeline({
  itemId,
  maintenanceIntervalDays,
  onStatusChange,
}: MaintenanceTimelineProps) {
  const {
    records, loading,
    addRecord, updateRecord, deleteRecord, uploadPhoto,
  } = useMaintenanceRecords(itemId);

  const interval      = maintenanceIntervalDays ?? GLOBAL_DEFAULT_INTERVAL;
  const lastRecord    = records[0] ?? null;
  const daysSinceLast = lastRecord
    ? differenceInDays(new Date(), parseISO(lastRecord.performed_at))
    : null;
  const isOverdue = daysSinceLast === null || daysSinceLast > interval;
  const isWarning = !isOverdue && daysSinceLast !== null && daysSinceLast > interval * 0.75;

  useEffect(() => {
    onStatusChange?.(isOverdue, isWarning);
  }, [isOverdue, isWarning]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form-State ─────────────────────────────────────────────────────────────
  const [showForm,      setShowForm]      = useState(false);
  const [formVisible,   setFormVisible]   = useState(false); // steuert CSS-Animation
  const [formType,      setFormType]      = useState<MaintenanceType>('check');
  const [formDate,      setFormDate]      = useState(todayIso);
  const [formNotes,     setFormNotes]     = useState('');
  const [formCost,      setFormCost]      = useState('');
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoUrl,  setFormPhotoUrl]  = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [quickSaving,   setQuickSaving]   = useState(false);
  const [quickSuccess,  setQuickSuccess]  = useState(false);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [newEntryId,    setNewEntryId]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function DatePicker({
    value,
    onChange,
  }: {
    value: Date | undefined;
    onChange: (d: Date | undefined) => void;
  }) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(value ?? new Date());
    const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
    const prevMonth = useRef(value ?? new Date());
  
    const DOW = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const MONTHS = ['Januar','Februar','März','April','Mai','Juni',
                    'Juli','August','September','Oktober','November','Dezember'];
  
    const eq = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  
    const handleMonthChange = (delta: number) => {
      const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
      setSlideDir(delta > 0 ? 'left' : 'right');
      prevMonth.current = month;
      setMonth(next);
      setTimeout(() => setSlideDir(null), 220);
    };
  
    const handleDayClick = (day: Date) => {
      onChange(day);
      setTimeout(() => setOpen(false), 120);
    };
  
    const label = value
      ? format(value, 'dd.MM.yyyy', { locale: de })
      : 'Datum wählen';
  
    // Tage generieren
    const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  
    const cells: (Date | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        new Date(month.getFullYear(), month.getMonth(), i + 1)
      ),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
  
    const getDayStyle = (day: Date): React.CSSProperties => {
      const isSelected = value && eq(day, value);
      const isToday = eq(day, new Date());
  
      if (isSelected) {
        return {
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '9999px',
        };
      }
  
      if (isToday) {
        return {
          boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary) / 0.5)',
          borderRadius: '9999px',
        };
      }
  
      return {};
    };
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal text-xs h-9 gap-1.5",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="flex-1">{label}</span>
  
            {value && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
  
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 select-none" style={{ width: 280 }}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleMonthChange(-1)}>
                ‹
              </button>
  
              <span
                style={{
                  animation: slideDir
                    ? `cal-${slideDir} .2s ease-out`
                    : undefined,
                }}
              >
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </span>
  
              <button onClick={() => handleMonthChange(1)}>
                ›
              </button>
            </div>
  
            {/* Wochentage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DOW.map(d => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'hsl(var(--muted-foreground))',
                    padding: '2px 0 6px'
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
  
            {/* Tage */}
            <table style={{ width: '100%' }}>
              <tbody>
                {Array.from({ length: cells.length / 7 }, (_, row) => (
                  <tr key={row}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, col) => (
                      <td key={col}>
                        {day && (
                          <button
                            onClick={() => handleDayClick(day)}
                            style={{
                              width: '100%',
                              aspectRatio: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              ...getDayStyle(day),
                            }}
                            className="hover:bg-muted rounded-full"
                          >
                            {day.getDate()}
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // ── Formular öffnen mit Enter-Animation ───────────────────────────────────
  function openForm() {
    setShowForm(true);
    // kleiner Delay damit overflow:hidden nicht sofort greift
    requestAnimationFrame(() => requestAnimationFrame(() => setFormVisible(true)));
  }

  // ── Formular schließen mit Squeeze-Animation ───────────────────────────────
  function closeForm(cb?: () => void) {
    setFormVisible(false);
    setTimeout(() => {
      setShowForm(false);
      cb?.();
    }, 280); // muss mit CSS-Transition übereinstimmen
  }

  function resetForm() {
    closeForm(() => {
      setFormType('check');
      setFormDate(todayIso());
      setFormNotes('');
      setFormCost('');
      setFormPhotoFile(null);
      setFormPhotoUrl(null);
    });
  }

  // ── Quick-Confirm mit Erfolgs-Feedback ────────────────────────────────────
  async function handleQuickConfirm() {
    setQuickSaving(true);
    const { data: record } = await addRecord({
      item_id: itemId, performed_at: todayIso(),
      type: 'check', notes: null, cost: null, image_url: null,
    });
    setQuickSaving(false);
    setQuickSuccess(true);
    if (record) setNewEntryId(record.id);
    setTimeout(() => setQuickSuccess(false), 1800);
    setTimeout(() => setNewEntryId(null), 800);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setFormPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    const { data: record } = await addRecord({
      item_id:      itemId,
      performed_at: formDate,
      type:         formType,
      notes:        formNotes.trim() || null,
      cost:         formCost ? parseFloat(formCost) : null,
      image_url:    null,
    });
    if (record && formPhotoFile) {
      const url = await uploadPhoto(formPhotoFile, record.id);
      if (url) await updateRecord(record.id, { image_url: url });
    }
    setSaving(false);
    // Squeeze-Animation: Form schließen, dann neuen Eintrag highlighten
    if (record) setNewEntryId(record.id);
    closeForm(() => {
      setFormType('check');
      setFormDate(todayIso());
      setFormNotes('');
      setFormCost('');
      setFormPhotoFile(null);
      setFormPhotoUrl(null);
    });
    setTimeout(() => setNewEntryId(null), 900);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteRecord(id);
    setDeletingId(null);
  }

  const statusConfig = (() => {
    if (daysSinceLast === null) return {
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      text: 'Noch keine Wartung erfasst',
      cls:  'bg-destructive/10 text-destructive border-destructive/20',
      pulse: true,
    };
    if (isOverdue) return {
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      text: `Wartung überfällig – letzte vor ${daysSinceLast} Tagen`,
      cls:  'bg-destructive/10 text-destructive border-destructive/20',
      pulse: true,
    };
    if (isWarning) return {
      icon: <Clock className="h-4 w-4 shrink-0" />,
      text: `Wartung bald fällig – letzte vor ${daysSinceLast} Tagen`,
      cls:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
      pulse: false,
    };
    return {
      icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
      text: `Letzte Wartung vor ${daysSinceLast} ${daysSinceLast === 1 ? 'Tag' : 'Tagen'}`,
      cls:  'bg-green-500/10 text-green-600 border-green-500/20',
      pulse: false,
    };
  })();

  if (loading) {
    return (
      <div className="space-y-4">

        {/* Status-Banner Skeleton */}
        <Skeleton className="h-12 w-full rounded-lg" />

        {/* Buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        {/* Timeline Skeleton */}
        <div className="space-y-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              
              {/* Dot + Line */}
              <div className="flex flex-col items-center">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="w-px flex-1 mt-1" />
              </div>

              {/* Card */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* Status-Banner */}
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium
            transition-all duration-300
            ${statusConfig.cls}
            ${statusConfig.pulse ? 'status-overdue-pulse' : ''}`}
        >
          <span className={statusConfig.pulse ? 'shrink-0' : 'shrink-0'}>
            {statusConfig.icon}
          </span>
          <span className="flex-1 min-w-0">{statusConfig.text}</span>
          <span className="text-xs font-normal opacity-60 shrink-0">Intervall: {interval}d</span>
        </div>

        {/* Aktionszeile */}
        <div className="flex gap-2">
          <Button
            className={`flex-1 gap-2 transition-all duration-150
              hover:shadow-md hover:-translate-y-px active:translate-y-0
              ${quickSuccess ? 'btn-success' : ''}`}
            size="sm"
            onClick={handleQuickConfirm}
            disabled={quickSaving || saving}
          >
            {quickSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : quickSuccess ? (
              <CheckCheck className="h-4 w-4 text-green-300 transition-all duration-200" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {quickSuccess ? 'Gespeichert ✓' : 'Wartung heute bestätigt'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 transition-all duration-150
              hover:shadow-sm hover:-translate-y-px active:translate-y-0
              ${showForm ? 'bg-muted' : ''}`}
            onClick={() => showForm ? resetForm() : openForm()}
            disabled={saving || quickSaving}
          >
            <Plus
              className={`h-4 w-4 transition-transform duration-250
                ${showForm ? 'rotate-45' : 'rotate-0'}`}
            />
            Eintrag
          </Button>
        </div>

        {/* ── Inline-Formular mit Squeeze-Animation ── */}
        {showForm && (
          <div className={formVisible ? 'form-enter-active' : 'form-exit-active'}>
            <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">

              {/* Typ-Auswahl mit Bounce */}
              <div className="flex flex-wrap gap-2">
                {MAINTENANCE_TYPES.map(type => (
                  <TypePill
                    key={type}
                    type={type}
                    isActive={formType === type}
                    onSelect={() => setFormType(type)}
                  />
                ))}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Datum
                </label>

                <DatePicker
                  value={formDate ? new Date(formDate) : undefined}
                  onChange={(date) =>
                    setFormDate(date ? format(date, "yyyy-MM-dd") : "")
                  }
                />
              </div>

              <Textarea
                placeholder="Notizen (optional)…"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="text-sm min-h-[72px] resize-none transition-shadow duration-150 focus:shadow-md"
              />

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Kosten (optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input
                      type="number" step="0.01" min="0" placeholder="0,00"
                      value={formCost} onChange={e => setFormCost(e.target.value)}
                      className="pl-7 text-sm transition-shadow duration-150 focus:shadow-md"
                    />
                  </div>
                </div>
                <div>
                  <input
                    ref={fileRef} type="file" accept="image/*" capture="environment"
                    className="hidden" onChange={handlePhotoSelect}
                  />
                  <Button
                    type="button"
                    variant={formPhotoFile ? 'default' : 'outline'}
                    size="sm"
                    className={`gap-1.5 h-9 transition-all duration-150
                      hover:shadow-sm hover:-translate-y-px active:translate-y-0
                      ${formPhotoFile ? 'scale-105' : ''}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {formPhotoFile ? '✓ Foto' : 'Foto'}
                  </Button>
                </div>
              </div>

              {formPhotoUrl && (
                <div className="relative inline-block" style={{ animation: 'entry-pop-in 0.25s ease forwards' }}>
                  <img src={formPhotoUrl} alt="Vorschau" className="w-28 h-20 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => { setFormPhotoFile(null); setFormPhotoUrl(null); }}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5
                      transition-transform duration-150 hover:scale-110 active:scale-95"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost" size="sm"
                  onClick={resetForm}
                  className="transition-all duration-150 hover:bg-muted/70 active:scale-95"
                >
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Speichern
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Timeline */}
        {records.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Noch keine Wartungseinträge vorhanden.
          </p>
        ) : (
          <div>
            {records.map((record, idx) => (
              <TimelineEntry
                key={record.id}
                record={record}
                isLast={idx === records.length - 1}
                isDeleting={deletingId === record.id}
                isNew={newEntryId === record.id}
                onDelete={() => handleDelete(record.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Typ-Pill mit Bounce-Effekt ─────────────────────────────────────────────────
function TypePill({
  type, isActive, onSelect,
}: { type: MaintenanceType; isActive: boolean; onSelect: () => void }) {
  const [bouncing, setBouncing] = useState(false);

  function handleClick() {
    if (isActive) return;
    setBouncing(true);
    onSelect();
    setTimeout(() => setBouncing(false), 250);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
        transition-all duration-200 select-none
        ${isActive
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5 hover:scale-105 active:scale-95'
        }
        ${bouncing ? 'pill-bounce' : ''}
      `}
    >
      {TYPE_ICONS[type]}
      {MAINTENANCE_TYPE_LABELS[type]}
    </button>
  );
}

// ── Timeline-Eintrag ───────────────────────────────────────────────────────────
interface EntryProps {
  record:     MaintenanceRecord;
  isLast:     boolean;
  isDeleting: boolean;
  isNew:      boolean;
  onDelete:   () => void;
}

function TimelineEntry({ record, isLast, isDeleting, isNew, onDelete }: EntryProps) {
  const type     = record.type as MaintenanceType;
  const dotColor = MAINTENANCE_TYPE_DOT_COLOR[type] ?? '#6366f1';

  const dateLabel = (() => {
    const d    = parseISO(record.performed_at);
    const days = differenceInDays(new Date(), d);
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7)  return `Vor ${days} Tagen`;
    return format(d, 'dd. MMM yyyy', { locale: de });
  })();

  return (
    <div className={`flex gap-3 ${isNew ? 'entry-new' : ''}`}>
      {/* Dot + Linie */}
      <div className="flex flex-col items-center shrink-0">
        <div className="h-[1.1rem] shrink-0" />
        <div
          className={`w-3 h-3 rounded-full ring-2 ring-background shrink-0 z-10
            transition-transform duration-200
            ${isNew ? 'scale-125' : 'scale-100'}`}
          style={{ backgroundColor: dotColor }}
        />
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[0.75rem]" />}
      </div>

      {/* Card */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3'}`}>
        <div
          className={`group rounded-lg border bg-card px-4 py-3 shadow-sm
            transition-all duration-200 hover:shadow-md hover:border-border/80
            ${isDeleting ? 'opacity-50 scale-98 pointer-events-none' : ''}
            ${isNew ? 'border-primary/30 bg-primary/5' : 'border-border'}
          `}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Kopfzeile */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {MAINTENANCE_TYPE_LABELS[type] ?? record.type}
                </span>
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
                {record.cost != null && (
                  <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono
                    transition-colors duration-150 group-hover:bg-muted/70">
                    € {record.cost.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Notizen */}
              {record.notes && (
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {record.notes}
                </p>
              )}

              {/* Foto */}
              {record.image_url && (
                <img
                  src={record.image_url}
                  alt="Wartungsfoto"
                  className="mt-2 w-32 h-24 object-cover rounded-lg border cursor-pointer
                    transition-all duration-200 hover:opacity-90 hover:scale-105 hover:shadow-md"
                  onClick={() => window.open(record.image_url!, '_blank')}
                />
              )}
            </div>

            {/* Löschen */}
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground/40
                hover:text-destructive hover:bg-destructive/10
                transition-all duration-150 hover:scale-110 active:scale-95
                opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              title="Eintrag löschen"
            >
              {isDeleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2  className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
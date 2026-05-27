import { useState, useMemo, useRef, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format, differenceInDays } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  HandCoins, AlertTriangle, CheckCircle2, Clock, RotateCcw,
  Trash2, Plus, History, Search, Package, CalendarDays, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLendingHistory, LendingRecord } from "@/hooks/useLendingHistory";
import { useInventory } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { hapticFeedback } from "@/lib/utils";

// ── SlidingTabs ───────────────────────────────────────────────────────────────
interface SlidingTabsProps {
  tabs: { value: string; label: string; icon?: ReactNode }[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

function SlidingTabs({ tabs, activeTab, onTabChange }: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeIndex = tabs.findIndex((t) => t.value === activeTab);
    const buttons = container.querySelectorAll<HTMLButtonElement>("[data-tab-btn]");
    const btn = buttons[activeIndex];
    if (btn) setIndicatorStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTab, tabs]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <div
        className="absolute top-1 bottom-1 rounded-md bg-background shadow-sm transition-all duration-300"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width, transitionTimingFunction: "cubic-bezier(0.25,0.1,0.25,1)" }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          data-tab-btn
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── OverdueBadge ──────────────────────────────────────────────────────────────
function OverdueBadge({ dueDate }: { dueDate: string }) {
  const { t } = useTranslation();
  const days = differenceInDays(new Date(), new Date(dueDate));
  if (days <= 0) return null;
  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertTriangle className="h-3 w-3" />
      {t('lending.overdue_badge', { count: days })}
    </Badge>
  );
}

// ── DueSoonBadge ──────────────────────────────────────────────────────────────
function DueSoonBadge({ dueDate }: { dueDate: string }) {
  const { t } = useTranslation();
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0 || days > 3) return null;
  return (
    <Badge variant="outline" className="gap-1 text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
      <Clock className="h-3 w-3" />
      {days === 0 ? t('lending.due_today') : t('lending.due_soon', { count: days })}
    </Badge>
  );
}

// ── LendingCard ───────────────────────────────────────────────────────────────
function LendingCard({
  record, onReturn, onDelete,
}: {
  record: LendingRecord;
  onReturn: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const dateLocale  = i18n.language.startsWith('de') ? de : enUS;
  const dateFormat  = t('lending.date_format');

  const isOverdue = record.due_date && !record.returned_at &&
    record.due_date < new Date().toISOString().split("T")[0];
  const isDueSoon = record.due_date && !record.returned_at && !isOverdue &&
    differenceInDays(new Date(record.due_date), new Date()) <= 3;

  return (
    <Card className={`p-4 transition-all ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{record.item_name}</h3>
            {record.returned_at && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                {t('lending.card.returned_badge')}
              </Badge>
            )}
            {isOverdue && record.due_date && <OverdueBadge dueDate={record.due_date} />}
            {isDueSoon && record.due_date && <DueSoonBadge dueDate={record.due_date} />}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{t('lending.card.lent_to_label')}</span> {record.lent_to}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t('lending.card.lent_at')} {format(new Date(record.lent_at), dateFormat, { locale: dateLocale })}
            </span>
            {record.due_date && (
              <span>
                {t('lending.card.due_date')} {format(new Date(record.due_date), dateFormat, { locale: dateLocale })}
              </span>
            )}
            {record.returned_at && (
              <span>
                {t('lending.card.returned_at')} {format(new Date(record.returned_at), dateFormat, { locale: dateLocale })}
              </span>
            )}
          </div>
          {record.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{record.notes}"</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!record.returned_at && (
            <Button size="sm" variant="outline" onClick={() => onReturn(record.id)} className="gap-1.5 active:scale-95 transition-transform">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('lending.card.return_button')}</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(record.id)} className="text-destructive hover:text-destructive active:scale-95 transition-transform">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── DatePicker ────────────────────────────────────────────────────────────────
function DatePicker({ value, onChange }: { value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  const { t } = useTranslation();
  const [open, setOpen]         = useState(false);
  const [month, setMonth]       = useState(value ?? new Date());
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const prevMonth               = useRef(value ?? new Date());

  const DOW    = t('lending.date_picker.days',   { returnObjects: true }) as string[];
  const MONTHS = t('lending.date_picker.months', { returnObjects: true }) as string[];

  const eq = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

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
    ? format(value, t('lending.date_picker.display_format'))
    : t('lending.date_picker.placeholder');

  const firstDow    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), i + 1)
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayStyle = (day: Date): React.CSSProperties => {
    if (value && eq(day, value))
      return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '9999px' };
    if (eq(day, new Date()))
      return { boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary) / 0.5)', borderRadius: '9999px' };
    return {};
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9 gap-1.5", !value && "text-muted-foreground")}>
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="flex-1">{label}</span>
          {value && (
            <span onClick={(e) => { e.stopPropagation(); onChange(undefined); }}>
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 select-none" style={{ width: 280 }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => handleMonthChange(-1)}>‹</button>
            <span style={{ animation: slideDir ? `cal-${slideDir} .2s ease-out` : undefined }}>
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button onClick={() => handleMonthChange(1)}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '2px 0 6px' }}>
                {d}
              </div>
            ))}
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => (
                    <td key={col}>
                      {day && (
                        <button
                          onClick={() => handleDayClick(day)}
                          style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, ...getDayStyle(day) }}
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

// ── Lending (Page) ────────────────────────────────────────────────────────────
export default function Lending() {
  const { t } = useTranslation();
  const { activeLoans, overdueLoans, completedLoans, records, loading, addRecord, markReturned, deleteRecord } =
    useLendingHistory();
  const { items } = useInventory();
  const [search,     setSearch]     = useState("");
  const [activeTab,  setActiveTab]  = useState("active");
  const [isAddOpen,  setIsAddOpen]  = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [formItemId, setFormItemId] = useState("");
  const [formLentTo, setFormLentTo] = useState("");
  const [formDueDate,setFormDueDate]= useState("");
  const [formNotes,  setFormNotes]  = useState("");
  const [tabVisible, setTabVisible] = useState(true);

  const handleTabChange = (value: string) => {
    setTabVisible(false);
    setTimeout(() => { setActiveTab(value); setTabVisible(true); }, 150);
  };

  const filteredActive = useMemo(() => {
    if (!search) return activeLoans;
    const q = search.toLowerCase();
    return activeLoans.filter(r => r.item_name.toLowerCase().includes(q) || r.lent_to.toLowerCase().includes(q));
  }, [activeLoans, search]);

  const filteredCompleted = useMemo(() => {
    if (!search) return completedLoans;
    const q = search.toLowerCase();
    return completedLoans.filter(r => r.item_name.toLowerCase().includes(q) || r.lent_to.toLowerCase().includes(q));
  }, [completedLoans, search]);

  const handleAdd = async () => {
    const item = items.find(i => i.id === formItemId);
    if (!item || !formLentTo.trim()) return;
    await addRecord({
      item_id:     formItemId,
      item_name:   item.name,
      lent_to:     formLentTo.trim(),
      lent_at:     new Date().toISOString().split("T")[0],
      due_date:    formDueDate || null,
      returned_at: null,
      notes:       formNotes.trim() || null,
    });
    hapticFeedback(50);
    setIsAddOpen(false);
    setFormItemId(""); setFormLentTo(""); setFormDueDate(""); setFormNotes("");
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRecord(deleteId); hapticFeedback(100); setDeleteId(null); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.lending')}
        description={t('lending.description')}
        icon={HandCoins}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button onClick={() => setIsAddOpen(true)} className="gap-2 self-start active:scale-95">
              <Plus className="h-4 w-4" />
              {t('lending.new_loan')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-default">
          <div className="text-2xl font-bold text-primary">{activeLoans.length}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('lending.stat_active')}</p>
        </Card>
        <Card className={`p-4 text-center transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-default ${overdueLoans.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
          <div className={`text-2xl font-bold ${overdueLoans.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {overdueLoans.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('lending.stat_overdue')}</p>
        </Card>
        <Card className="p-4 text-center transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-default">
          <div className="text-2xl font-bold text-muted-foreground">{completedLoans.length}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('lending.stat_returned')}</p>
        </Card>
        <Card className="p-4 text-center transition-all duration-150 hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-default">
          <div className="text-2xl font-bold text-muted-foreground">{records.length}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('lending.stat_total')}</p>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueLoans.length > 0 && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">
                {t('lending.overdue_title', { count: overdueLoans.length })}
              </h3>
              <div className="mt-2 space-y-1">
                {overdueLoans.map(r => (
                  <div key={r.id} className="text-sm flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{r.item_name}</span>
                      <span className="text-muted-foreground"> → {r.lent_to}</span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markReturned(r.id)} className="gap-1 h-7 text-xs">
                      <RotateCcw className="h-3 w-3" />
                      {t('lending.return_action')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('lending.search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <SlidingTabs
        tabs={[
          { value: "active",  label: t('lending.tab_active',  { count: filteredActive.length }),    icon: <Package className="h-4 w-4" /> },
          { value: "history", label: t('lending.tab_history', { count: filteredCompleted.length }), icon: <History className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? "translateY(0)" : "translateY(6px)", transition: "opacity 150ms ease, transform 150ms ease" }}>
        {activeTab === "active" && (
          <div className="space-y-3">
            {filteredActive.length === 0 ? (
              <Card className="p-12 text-center">
                <HandCoins className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-medium">{t('lending.empty_active_title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('lending.empty_active_desc')}</p>
              </Card>
            ) : (
              filteredActive.map(r => <LendingCard key={r.id} record={r} onReturn={markReturned} onDelete={id => setDeleteId(id)} />)
            )}
          </div>
        )}
        {activeTab === "history" && (
          <div className="space-y-3">
            {filteredCompleted.length === 0 ? (
              <Card className="p-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-medium">{t('lending.empty_history_title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('lending.empty_history_desc')}</p>
              </Card>
            ) : (
              filteredCompleted.map(r => <LendingCard key={r.id} record={r} onReturn={markReturned} onDelete={id => setDeleteId(id)} />)
            )}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('lending.add_dialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('lending.add_dialog.item_label')}</Label>
              <Select value={formItemId} onValueChange={setFormItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('lending.add_dialog.item_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {t('lending.item_with_category', {
                        name: item.name,
                        category: t(`categories.${item.category}`, { defaultValue: item.category }),
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('lending.add_dialog.lent_to_label')}</Label>
              <Input
                value={formLentTo}
                onChange={e => setFormLentTo(e.target.value)}
                placeholder={t('lending.add_dialog.lent_to_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('lending.add_dialog.due_date_label')}</Label>
              <DatePicker
                value={formDueDate ? new Date(formDueDate) : undefined}
                onChange={date => setFormDueDate(date ? format(date, "yyyy-MM-dd") : "")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('fields.notes')}</Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={t('item_form.placeholder.notes')}
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleAdd} disabled={!formItemId || !formLentTo.trim()}>
                {t('lending.add_dialog.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('lending.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('lending.delete_description')}</AlertDialogDescription>
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
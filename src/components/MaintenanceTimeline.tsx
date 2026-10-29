import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { AlertTriangle, Check, CheckCheck, CheckCircle2, Clock, Loader2, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyPanel, ErrorState } from '@/components/QueryState';
import { useMaintenanceRecords } from '@/hooks/useMaintenanceRecords';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MaintenanceEntryForm, MaintenanceEntryDraft } from '@/components/item-detail/maintenance/MaintenanceEntryForm';
import { MaintenanceEntryRow } from '@/components/item-detail/maintenance/MaintenanceEntryRow';
import { todayLocalIso } from '@/components/item-detail/maintenance/utils';

const GLOBAL_DEFAULT_INTERVAL = 180;

interface MaintenanceTimelineProps {
  itemId: string;
  maintenanceIntervalDays?: number | null;
  /** Reports the current status once records are loaded (and after every change). */
  onStatusChange?: (overdue: boolean, warning: boolean) => void;
}

export function MaintenanceTimeline({
  itemId,
  maintenanceIntervalDays,
  onStatusChange,
}: MaintenanceTimelineProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const dateLocale = i18n.language.startsWith('de') ? de : enUS;

  const {
    records, loading, error, refresh,
    addRecord, updateRecord, deleteRecord, uploadPhoto,
  } = useMaintenanceRecords(itemId);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSaved, setQuickSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const interval = maintenanceIntervalDays ?? GLOBAL_DEFAULT_INTERVAL;
  const lastRecord = records[0] ?? null;
  const daysSinceLast = lastRecord
    ? differenceInCalendarDays(new Date(), parseISO(lastRecord.performed_at))
    : null;
  const isOverdue = daysSinceLast === null || daysSinceLast > interval;
  const isWarning = !isOverdue && daysSinceLast !== null && daysSinceLast > interval * 0.75;

  useEffect(() => {
    if (loading || error) return;
    onStatusChange?.(isOverdue, isWarning);
  }, [loading, error, isOverdue, isWarning]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!quickSaved) return;
    const id = window.setTimeout(() => setQuickSaved(false), 1800);
    return () => window.clearTimeout(id);
  }, [quickSaved]);

  const saveError = () =>
    toast({ title: t('common.error'), description: t('maintenance.save_error'), variant: 'destructive' });

  async function handleQuickConfirm() {
    setQuickSaving(true);
    const { error: err } = await addRecord({
      item_id: itemId, performed_at: todayLocalIso(),
      type: 'check', notes: null, cost: null, image_url: null,
    });
    setQuickSaving(false);
    if (err) saveError();
    else setQuickSaved(true);
  }

  async function handleSave(draft: MaintenanceEntryDraft) {
    setSaving(true);
    const cost = draft.cost ? parseFloat(draft.cost) : null;
    const { data: record, error: err } = await addRecord({
      item_id:      itemId,
      performed_at: draft.date,
      type:         draft.type,
      notes:        draft.notes.trim() || null,
      cost:         cost !== null && !isNaN(cost) ? cost : null,
      image_url:    null,
    });
    if (err || !record) {
      setSaving(false);
      saveError();
      return;
    }
    if (draft.photo) {
      const url = await uploadPhoto(draft.photo, record.id);
      const patched = url ? await updateRecord(record.id, { image_url: url }) : null;
      if (!url || patched?.error) {
        toast({ title: t('common.error'), description: t('image_upload.error'), variant: 'destructive' });
      }
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeletingId(id);
    const { error: err } = await deleteRecord(id);
    setDeletingId(null);
    if (err) {
      toast({ title: t('common.error'), description: t('maintenance.delete_error'), variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-9 w-full" />
        <div className="surface divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <Skeleton className="h-3.5 w-20" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => void refresh()} />;
  }

  const status = daysSinceLast === null
    ? { Icon: AlertTriangle, tone: 'text-destructive', text: t('maintenance.status.never') }
    : isOverdue
      ? { Icon: AlertTriangle, tone: 'text-destructive', text: t('maintenance.status.overdue', { count: daysSinceLast }) }
      : isWarning
        ? { Icon: Clock, tone: 'text-warning', text: t('maintenance.status.warning', { count: daysSinceLast }) }
        : { Icon: CheckCircle2, tone: 'text-success', text: t('maintenance.status.ok', { count: daysSinceLast }) };

  return (
    <div className="space-y-3">
      {/* Status + actions */}
      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <status.Icon className={cn('h-4 w-4 shrink-0', status.tone)} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{status.text}</p>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {t('maintenance.interval_label', { days: interval })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(s => !s)}
            disabled={saving || quickSaving}
            aria-expanded={showForm}
            className="max-sm:flex-1"
          >
            <Plus />
            {t('maintenance.add_entry')}
          </Button>
          <Button
            size="sm"
            variant={showForm ? 'outline' : 'default'}
            onClick={handleQuickConfirm}
            disabled={quickSaving || saving}
            className="max-sm:flex-1"
          >
            {quickSaving ? <Loader2 className="animate-spin" /> : quickSaved ? <Check /> : <CheckCheck />}
            {quickSaved ? t('common.saved') : t('maintenance.quick_confirm')}
          </Button>
        </div>
      </div>

      {showForm && (
        <MaintenanceEntryForm
          saving={saving}
          onCancel={() => setShowForm(false)}
          onSave={draft => void handleSave(draft)}
        />
      )}

      {records.length === 0 ? (
        <EmptyPanel icon={Wrench} title={t('maintenance.empty')} />
      ) : (
        <div className="surface overflow-hidden">
          <div className="border-b border-border bg-surface-sunken px-3 py-2 sm:px-4">
            <p className="eyebrow">{t('maintenance.timeline.title')}</p>
          </div>
          <ul className="divide-y divide-border">
            {records.map(record => (
              <MaintenanceEntryRow
                key={record.id}
                record={record}
                dateLocale={dateLocale}
                isDeleting={deletingId === record.id}
                onDelete={() => setConfirmDeleteId(record.id)}
              />
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('maintenance.timeline.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('maintenance.delete_confirm_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteId) void handleDelete(confirmDeleteId); }}
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

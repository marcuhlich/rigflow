import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MAINTENANCE_TYPES, MaintenanceType } from '@/types/maintenance';
import { getMaintenanceTypeLabel } from '@/i18n/helpers';
import { cn } from '@/lib/utils';
import { MaintenanceTypeIcon } from './shared';
import { todayLocalIso } from './utils';

export interface MaintenanceEntryDraft {
  type: MaintenanceType;
  date: string;          // yyyy-MM-dd (local)
  notes: string;
  cost: string;
  photo: File | null;
}

interface Props {
  saving: boolean;
  onCancel: () => void;
  onSave: (draft: MaintenanceEntryDraft) => void;
}

export function MaintenanceEntryForm({ saving, onCancel, onSave }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<MaintenanceType>('check');
  const [date, setDate] = useState(todayLocalIso);
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPhotoUrl(null);
  };

  return (
    <form
      className="surface space-y-4 p-4"
      onSubmit={e => {
        e.preventDefault();
        if (!saving && date) onSave({ type, date, notes, cost, photo });
      }}
    >
      <p className="text-sm font-semibold">{t('maintenance.form.title')}</p>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium">{t('maintenance.form.type_label')}</p>
        <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-sunken p-0.5 sm:grid-cols-4">
          {MAINTENANCE_TYPES.map(mt => {
            const active = mt === type;
            return (
              <button
                key={mt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setType(mt)}
                className={cn(
                  'flex h-8 items-center justify-center gap-1.5 rounded-[5px] px-2 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-[0_0_0_1px_hsl(var(--border))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MaintenanceTypeIcon type={mt} />
                <span className="truncate">{getMaintenanceTypeLabel(mt, t)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="maint-date" className="text-[13px]">{t('maintenance.form.date_label')}</Label>
          <Input
            id="maint-date"
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            className="font-mono tabular-nums"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="maint-cost" className="text-[13px]">{t('maintenance.form.cost_label')}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            <Input
              id="maint-cost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="pl-7 font-mono tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="maint-notes" className="text-[13px]">{t('fields.notes')}</Label>
        <Textarea
          id="maint-notes"
          placeholder={t('maintenance.form.notes_placeholder')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="min-h-[72px] resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
        {photoUrl ? (
          <div className="relative">
            <img
              src={photoUrl}
              alt={t('maintenance.photo_preview_alt')}
              className="h-16 w-24 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              aria-label={t('image_upload.remove')}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus />
            {t('maintenance.form.photo')}
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={saving || !date}>
            {saving && <Loader2 className="animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

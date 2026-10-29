import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MaintenanceRecord } from '@/types/maintenance';
import { getMaintenanceTypeLabel } from '@/i18n/helpers';
import { cn } from '@/lib/utils';
import { MaintenanceTypeIcon } from './shared';

interface Props {
  record: MaintenanceRecord;
  dateLocale: Locale;
  isDeleting: boolean;
  onDelete: () => void;
}

export function MaintenanceEntryRow({ record, dateLocale, isDeleting, onDelete }: Props) {
  const { t } = useTranslation();
  const date = parseISO(record.performed_at);
  const valid = !isNaN(date.getTime());
  const days = valid ? differenceInCalendarDays(new Date(), date) : null;

  const relative =
    days === 0 ? t('maintenance.timeline.today')
    : days === 1 ? t('maintenance.timeline.yesterday')
    : days !== null && days > 1 && days < 7 ? t('maintenance.timeline.days_ago', { count: days })
    : null;

  return (
    <li className={cn('flex gap-3 px-3 py-3 sm:px-4', isDeleting && 'pointer-events-none opacity-50')}>
      <div className="w-[5.5rem] shrink-0 pt-px">
        <div className="font-mono text-xs tabular-nums">
          {valid ? format(date, t('maintenance.date_format'), { locale: dateLocale }) : record.performed_at}
        </div>
        {relative && <div className="mt-0.5 text-xs text-muted-foreground">{relative}</div>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MaintenanceTypeIcon type={record.type} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{getMaintenanceTypeLabel(record.type, t)}</span>
          {record.cost != null && (
            <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              € {record.cost.toFixed(2)}
            </span>
          )}
        </div>
        {record.notes && (
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-muted-foreground">{record.notes}</p>
        )}
        {record.image_url && (
          <a
            href={record.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block overflow-hidden rounded-md border border-border transition-colors hover:border-border-strong"
          >
            <img
              src={record.image_url}
              alt={t('maintenance.timeline.photo_alt')}
              loading="lazy"
              className="h-20 w-28 object-cover"
            />
          </a>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isDeleting}
        className="-mr-1 -mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={t('maintenance.timeline.delete_title')}
        title={t('maintenance.timeline.delete_title')}
      >
        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </li>
  );
}

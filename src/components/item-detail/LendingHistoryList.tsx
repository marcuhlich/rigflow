import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyPanel, ListSkeleton } from '@/components/QueryState';
import type { LendingRecord } from '@/hooks/useLendingHistory';

interface Props {
  records: LendingRecord[];
  loading: boolean;
  dateLocale: Locale;
}

function safeFormat(value: string | null, pattern: string, locale: Locale) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : format(d, pattern, { locale });
}

export function LendingHistoryList({ records, loading, dateLocale }: Props) {
  const { t } = useTranslation();

  if (loading && records.length === 0) return <ListSkeleton rows={3} />;
  if (records.length === 0) {
    return <EmptyPanel icon={HandCoins} title={t('item_detail.history_empty')} />;
  }

  return (
    <ul className="surface divide-y divide-border">
      {records.map(record => {
        const lentAt = safeFormat(record.lent_at, 'dd.MM.yyyy', dateLocale);
        const due = safeFormat(record.due_date, 'dd.MM.yyyy', dateLocale);
        const returned = safeFormat(record.returned_at, 'dd.MM.yy', dateLocale);
        return (
          <li key={record.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t('item_detail.history_lent_to', { name: record.lent_to })}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {lentAt}
                {due && t('item_detail.history_due', { date: due })}
              </p>
            </div>
            {record.returned_at ? (
              <Badge variant="secondary" className="shrink-0 font-mono tabular-nums">
                {t('item_detail.history_returned', { date: returned })}
              </Badge>
            ) : (
              <Badge variant="lent" className="shrink-0">{t('item_detail.history_active')}</Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

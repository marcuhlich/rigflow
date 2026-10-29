import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { Check, Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateQRCodeDataUrl } from '@/lib/qrCode';
import type { InventoryItem } from '@/types/inventory';

interface Props {
  item: InventoryItem;
  dateLocale: Locale;
  onOpenQR: () => void;
}

const fmt = (value: string | null | undefined, locale: Locale) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : format(d, 'dd.MM.yyyy HH:mm', { locale });
};

/** Sidebar card: case label (QR + ID) and record metadata. */
export function ItemLabelCard({ item, dateLocale, onOpenQR }: Props) {
  const { t } = useTranslation();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQrFailed(false);
    generateQRCodeDataUrl(item.id, { width: 192 })
      .then(url => { if (!cancelled) setQrUrl(url); })
      .catch(() => { if (!cancelled) setQrFailed(true); });
    return () => { cancelled = true; };
  }, [item.id]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopied(true);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the ID stays selectable.
    }
  };

  const created = fmt(item.created_at, dateLocale);
  const updated = fmt(item.updated_at, dateLocale);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-3 py-2">
        <p className="eyebrow">{t('item_detail.section_label')}</p>
      </div>

      <div className="flex gap-3 p-3">
        <button
          type="button"
          onClick={onOpenQR}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5 transition-colors hover:border-border-strong"
          aria-label={t('item_detail.btn_qr')}
        >
          {qrUrl && !qrFailed ? (
            <img
              src={qrUrl}
              alt=""
              className="h-full w-full [image-rendering:pixelated]"
              onError={() => setQrFailed(true)}
            />
          ) : (
            <QrCode className="h-6 w-6 text-neutral-400" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">{t('item_detail.sidebar_id_title')}</p>
            <div className="mt-0.5 flex items-start gap-1">
              <code className="min-w-0 select-all break-all font-mono text-[11px] leading-4 tabular-nums">
                {item.id}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 h-7 w-7 shrink-0"
                onClick={handleCopy}
                aria-label={t('item_detail.copy_id_title')}
                title={t('item_detail.copy_id_title')}
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={onOpenQR}>
            <QrCode />
            {t('item_detail.btn_qr')}
          </Button>
        </div>
      </div>

      {(created || updated) && (
        <dl className="divide-y divide-border border-t border-border text-[13px]">
          {created && (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{t('item_detail.label_created')}</dt>
              <dd className="font-mono text-xs tabular-nums">{created}</dd>
            </div>
          )}
          {updated && (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{t('item_detail.label_updated')}</dt>
              <dd className="font-mono text-xs tabular-nums">{updated}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

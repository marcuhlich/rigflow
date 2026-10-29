import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, Loader2, Printer, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { downloadQRCode, generateQRCodeDataUrl, printQRCode } from '@/lib/qrCode';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface QRCodeDisplayProps {
  itemId: string;
  itemName: string;
  itemDetails?: {
    quantity?: number;
    location?: string;
    category?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_PX = { sm: 200, md: 260, lg: 300 } as const;

function useIsSmallScreen(breakpoint = 640) {
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = () => setSmall(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return small;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older mobile browsers without the Clipboard API
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(el);
    }
  }
}

type LoadState = 'loading' | 'ready' | 'error';

export function QRCodeDisplay({
  itemId,
  itemName,
  itemDetails,
  isOpen,
  onClose,
  size = 'md',
}: QRCodeDisplayProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isSmall = useIsSmallScreen();
  const px = SIZE_PX[size];

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setState('loading');
    setQrUrl(null);
    // Request at 2x for sharp rendering on high-DPI screens
    generateQRCodeDataUrl(itemId, { width: px * 2 })
      .then(url => {
        if (cancelled) return;
        if (!url) throw new Error(t('qr.errors.empty_url'));
        setQrUrl(attempt > 0 ? `${url}&_r=${attempt}` : url);
      })
      .catch(err => {
        if (cancelled) return;
        logger.error('QRCodeDisplay', 'Error generating QR code', err);
        setState('error');
      });
    return () => { cancelled = true; };
  }, [isOpen, itemId, px, attempt, t]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleDownload = async () => {
    try {
      await downloadQRCode(itemId, itemName);
      toast({ title: t('common.success'), description: t('qr.download_success') });
    } catch (error) {
      logger.error('QRCodeDisplay', 'Error downloading QR code', error);
      toast({ title: t('common.error'), description: t('qr.download_error'), variant: 'destructive' });
    }
  };

  const handlePrint = async () => {
    try {
      await printQRCode(itemId, itemName, itemDetails);
      toast({ title: t('common.success'), description: t('qr.print_success') });
    } catch (error) {
      logger.error('QRCodeDisplay', 'Error printing QR code', error);
      toast({ title: t('common.error'), description: t('qr.print_error'), variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    if (await copyText(itemId)) setCopied(true);
  };

  const categoryLabel = itemDetails?.category
    ? t(`categories.${itemDetails.category}`, { defaultValue: itemDetails.category })
    : null;

  const details: { label: string; value: string; mono?: boolean }[] = [
    ...(categoryLabel ? [{ label: t('fields.category'), value: categoryLabel }] : []),
    ...(itemDetails?.quantity !== undefined && itemDetails.quantity !== null
      ? [{ label: t('fields.quantity'), value: String(itemDetails.quantity), mono: true }]
      : []),
    ...(itemDetails?.location ? [{ label: t('fields.location'), value: itemDetails.location }] : []),
  ];

  const ready = state === 'ready';

  const content = (
    <div className="space-y-4">
      {/* Code */}
      <div className="flex justify-center">
        <div
          className="relative flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-white p-3"
          style={{ maxWidth: px + 26 }}
        >
          {qrUrl && state !== 'error' && (
            <img
              src={qrUrl}
              alt={t('qr.image_alt', { itemName })}
              onLoad={() => setState('ready')}
              onError={() => setState('error')}
              className="h-full w-full object-contain [image-rendering:pixelated]"
            />
          )}
          {state === 'loading' && (
            <Loader2 className="absolute h-5 w-5 animate-spin text-neutral-400" />
          )}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <p className="text-[13px] text-neutral-600">{t('qr.load_error')}</p>
              <p className="text-xs text-neutral-500">{t('qr.errors.connection_hint')}</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt(a => a + 1)} className="mt-1 bg-white text-neutral-900 hover:bg-neutral-100">
                <RotateCw />
                {t('common.retry')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <dl className="surface divide-y divide-border text-[13px]">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <dt className="shrink-0 text-muted-foreground">{t('qr.item_id')}</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <code className="truncate font-mono text-xs tabular-nums">{itemId}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onPointerDown={e => e.preventDefault()}
              onClick={handleCopy}
              aria-label={t('qr.copy_item_id')}
              title={t('qr.copy_item_id')}
            >
              {copied ? <Check className="text-success" /> : <Copy />}
            </Button>
          </dd>
        </div>
        {details.map(d => (
          <div key={d.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="shrink-0 text-muted-foreground">{d.label}</dt>
            <dd className={d.mono ? 'font-mono tabular-nums' : 'min-w-0 truncate font-medium'}>{d.value}</dd>
          </div>
        ))}
      </dl>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleDownload} disabled={!ready}>
          <Download />
          {t('common.download')}
        </Button>
        <Button onClick={handlePrint} disabled={!ready}>
          <Printer />
          {t('common.print')}
        </Button>
      </div>
    </div>
  );

  if (isSmall) {
    return (
      <Drawer open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
        <DrawerContent className="flex max-h-[92dvh] flex-col">
          <DrawerHeader className="shrink-0 px-4 text-left">
            <DrawerTitle className="truncate">{t('qr.title', { itemName })}</DrawerTitle>
            <DrawerDescription className="text-xs">{t('qr.description')}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{t('qr.title', { itemName })}</DialogTitle>
          <DialogDescription className="text-xs">{t('qr.description')}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" aria-label={t('common.close')}>
            <X />
          </Button>
        </DialogClose>
        {content}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  generateQRCodeDataUrl,
  downloadQRCode,
  printQRCode,
} from '@/lib/qrCode';
import { Download, Printer, Copy, Check } from 'lucide-react';
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

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < breakpoint
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);

    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}

export function QRCodeDisplay({
  itemId,
  itemName,
  itemDetails,
  isOpen,
  onClose,
  size = 'md',
}: QRCodeDisplayProps) {
  const { t } = useTranslation();

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  const { toast } = useToast();

  const isMobile = useIsMobile();

  const baseMap = { sm: 200, md: 300, lg: 400 };
  const baseSize = baseMap[size];

  const sizePixels = Math.min(baseSize, (containerWidth - 48) * 0.85);

  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) loadQRCode();
  }, [isOpen, itemId]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      setQrCodeUrl(null);

      const url = await generateQRCodeDataUrl(itemId, {
        width: sizePixels,
      });

      if (!url) {
        throw new Error(t('qr.errors.empty_url'));
      }

      setQrCodeUrl(url);
    } catch (error) {
      logger.error('Error loading QR code:', error);

      toast({
        title: t('qr.errors.title'),
        description: `${
          error instanceof Error
            ? error.message
            : t('common.unknown_error')
        }. ${t('qr.errors.connection_hint')}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadQRCode(itemId, itemName);

      toast({
        title: t('common.success'),
        description: t('qr.download_success'),
      });
    } catch (error) {
      logger.error('Error downloading QR code:', error);

      toast({
        title: t('common.error'),
        description: t('qr.download_error'),
        variant: 'destructive',
      });
    }
  };

  const handlePrint = async () => {
    try {
      await printQRCode(itemId, itemName, itemDetails);

      toast({
        title: t('common.success'),
        description: t('qr.print_success'),
      });
    } catch (error) {
      logger.error('Error printing QR code:', error);

      toast({
        title: t('common.error'),
        description: t('qr.print_error'),
        variant: 'destructive',
      });
    }
  };

  const handleCopyItemId = async () => {
    try {
      await navigator.clipboard.writeText(itemId);

      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback für ältere Mobile-Browser ohne Clipboard API
      const el = document.createElement('textarea');

      el.value = itemId;
      el.style.position = 'fixed';
      el.style.opacity = '0';

      document.body.appendChild(el);

      el.focus();
      el.select();

      try {
        document.execCommand('copy');

        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(el);
      }
    }
  };

  const content = (
    <div className="space-y-4 py-4 w-full">
      {/* QR-Code Anzeige */}
      <div className="flex justify-center w-full">
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ width: sizePixels, height: sizePixels }}
          >
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : qrCodeUrl ? (
          <div
            className="border-2 border-border rounded-lg p-2 bg-white flex items-center justify-center"
            style={{
              width: sizePixels + 16,
              height: sizePixels + 16,
            }}
          >
            <img
              src={qrCodeUrl}
              alt={t('qr.image_alt', { itemName })}
              style={{
                width: sizePixels,
                height: sizePixels,
                display: 'block',
                aspectRatio: '1 / 1',
                objectFit: 'contain',
              }}
              className="rounded"
            />
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            {t('qr.load_error')}
          </div>
        )}
      </div>

      {/* Item-Informationen */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
        <div className="text-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 sm:gap-0">
            <span className="text-muted-foreground">
              {t('fields.name')}:
            </span>

            <span className="font-medium truncate">{itemName}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-start mt-2 gap-1 sm:gap-0">
            <span className="text-muted-foreground">
              {t('qr.item_id')}:
            </span>

            <div className="flex items-center gap-1 overflow-hidden">
              <code className="text-xs bg-background px-2 py-1 rounded font-mono truncate">
                {itemId.slice(0, 8)}...{itemId.slice(-8)}
              </code>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 shrink-0 transition-colors duration-200 ${
                  copied ? 'text-green-500 hover:text-green-500' : ''
                }`}
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleCopyItemId}
                aria-label={t('qr.copy_item_id')}
              >
                {copied ? (
                  <Check className="h-3 w-3 transition-all duration-200" />
                ) : (
                  <Copy className="h-3 w-3 transition-all duration-200" />
                )}
              </Button>
            </div>
          </div>

          {itemDetails?.category && (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
              <span className="text-muted-foreground">
                {t('fields.category')}:
              </span>

              <span className="font-medium truncate">
                {itemDetails.category}
              </span>
            </div>
          )}

          {itemDetails?.quantity && (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
              <span className="text-muted-foreground">
                {t('fields.quantity')}:
              </span>

              <span className="font-medium">
                {itemDetails.quantity}
              </span>
            </div>
          )}

          {itemDetails?.location && (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
              <span className="text-muted-foreground">
                {t('fields.location')}:
              </span>

              <span className="font-medium truncate">
                {itemDetails.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Aktions-Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="flex-1 gap-2 py-4 px-4"
          disabled={loading || !qrCodeUrl}
        >
          <Download className="h-4 w-4 shrink-0" />

          <span>{t('common.download')}</span>
        </Button>

        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex-1 gap-2 py-4 px-4"
          disabled={loading || !qrCodeUrl}
        >
          <Printer className="h-4 w-4 shrink-0" />

          <span>{t('common.print')}</span>
        </Button>
      </div>

      {/* Hinweis */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {t('qr.description')}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
      >
        <DrawerContent className="flex flex-col max-h-[92dvh]">
          <DrawerHeader className="px-4 shrink-0">
            <DrawerTitle>
              {t('qr.title', { itemName })}
            </DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 max-w-[500px] p-6 overflow-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {t('qr.title', { itemName })}
          </DialogTitle>
        </DialogHeader>

        {content}
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateQRCodeDataUrl, downloadQRCode, printQRCode } from '@/lib/qrCode';
import { Download, Printer, Copy } from 'lucide-react';
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

export function QRCodeDisplay({
  itemId,
  itemName,
  itemDetails,
  isOpen,
  onClose,
  size = 'md',
}: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const { toast } = useToast();

  const baseMap = {
    sm: 200,
    md: 300,
    lg: 400,
  };

  const baseSize = baseMap[size];
  // Auf dem Handy: maximal 80% der verfügbaren Breite minus Padding
  // Auf Desktop: die normale Größe
  const sizePixels = Math.min(baseSize, (containerWidth - 48) * 0.85);

  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadQRCode();
    }
  }, [isOpen, itemId]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      setQrCodeUrl(null); // ✅ Reset vor neuem Load
      
      const url = await generateQRCodeDataUrl(itemId, { width: sizePixels });
      
      if (!url) {
        throw new Error('QR-Code URL ist leer');
      }
      
      setQrCodeUrl(url);
    } catch (error) {
      logger.error('Error loading QR code:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unbekannter Fehler';
      
      toast({
        title: 'QR-Code Fehler',
        description: `${errorMessage}. Prüfe deine Internetverbindung.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false); // ✅ MUSS SEIN - auch bei Fehler!
    }
  };

  const handleDownload = async () => {
    try {
      await downloadQRCode(itemId, itemName);
      toast({
        title: 'Erfolg',
        description: 'QR-Code wurde heruntergeladen',
      });
    } catch (error) {
      logger.error('Error downloading QR code:', error);
      toast({
        title: 'Fehler',
        description: 'QR-Code konnte nicht heruntergeladen werden',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = async () => {
    try {
      await printQRCode(itemId, itemName, itemDetails);
      toast({
        title: 'Erfolg',
        description: 'Druck-Dialog geöffnet',
      });
    } catch (error) {
      logger.error('Error printing QR code:', error);
      toast({
        title: 'Fehler',
        description: 'Druck-Dialog konnte nicht geöffnet werden',
        variant: 'destructive',
      });
    }
  };

  const handleCopyItemId = () => {
    navigator.clipboard.writeText(itemId);
    toast({
      title: 'Erfolg',
      description: 'Item-ID kopiert',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 w-[95vw] max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 overflow-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>QR-Code: {itemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 w-full overflow-hidden">
          {/* QR-Code Anzeige */}
          <div className="flex justify-center w-full overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center" style={{ width: sizePixels, height: sizePixels }}>
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : qrCodeUrl ? (
              <div className="border-2 border-border rounded-lg p-2 bg-white flex items-center justify-center" style={{ width: sizePixels + 16, height: sizePixels + 16 }}>
                <img
                  src={qrCodeUrl}
                  alt={`QR-Code für ${itemName}`}
                  style={{ 
                    width: sizePixels, 
                    height: sizePixels,
                    display: 'block',
                    aspectRatio: '1 / 1',
                    objectFit: 'contain'
                  }}
                  className="rounded"
                />
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">QR-Code konnte nicht geladen werden</div>
            )}
          </div>

          {/* Item-Informationen */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-2 overflow-hidden">
            <div className="text-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-muted-foreground">Item-Name:</span>
                <span className="font-medium truncate">{itemName}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-start mt-2 gap-1 sm:gap-0">
                <span className="text-muted-foreground">Item-ID:</span>
                <div className="flex items-center gap-1 overflow-hidden">
                  <code className="text-xs bg-background px-2 py-1 rounded font-mono truncate">
                    {itemId.slice(0, 8)}...{itemId.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={handleCopyItemId}
                    aria-label="Item-ID kopieren"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {itemDetails?.category && (
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
                  <span className="text-muted-foreground">Kategorie:</span>
                  <span className="font-medium truncate">{itemDetails.category}</span>
                </div>
              )}
              {itemDetails?.quantity && (
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
                  <span className="text-muted-foreground">Menge:</span>
                  <span className="font-medium">{itemDetails.quantity}</span>
                </div>
              )}
              {itemDetails?.location && (
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-1 sm:gap-0">
                  <span className="text-muted-foreground">Standort:</span>
                  <span className="font-medium truncate">{itemDetails.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full overflow-hidden">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1 gap-2 truncate py-4 px-4"
              disabled={loading || !qrCodeUrl}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">Herunterladen</span>
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-1 gap-2 truncate py-4 px-4"
              disabled={loading || !qrCodeUrl}
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span className="truncate">Drucken</span>
            </Button>
          </div>

          {/* Hinweis */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            Dieser QR-Code enthält die eindeutige Item-ID und kann zum schnellen Abrufen des Artikels gescannt werden.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

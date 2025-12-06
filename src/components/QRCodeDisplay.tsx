import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateQRCodeDataUrl, downloadQRCode, printQRCode } from '@/lib/qrCode';
import { Download, Printer, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const sizeMap = {
    sm: 200,
    md: 300,
    lg: 400,
  };

  const sizePixels = sizeMap[size];

  useEffect(() => {
    if (isOpen) {
      loadQRCode();
    }
  }, [isOpen, itemId]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      const url = await generateQRCodeDataUrl(itemId, { width: sizePixels });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error loading QR code:', error);
      toast({
        title: 'Fehler',
        description: 'QR-Code konnte nicht geladen werden',
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
        title: 'Erfolg',
        description: 'QR-Code wurde heruntergeladen',
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
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
      console.error('Error printing QR code:', error);
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
      <DialogContent className="glass-card border-border/50 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>QR-Code: {itemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR-Code Anzeige */}
          <div className="flex justify-center">
            {loading ? (
              <div className="flex items-center justify-center" style={{ width: sizePixels, height: sizePixels }}>
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : qrCodeUrl ? (
              <div className="border-2 border-border rounded-lg p-2 bg-white">
                <img
                  src={qrCodeUrl}
                  alt={`QR-Code für ${itemName}`}
                  style={{ width: sizePixels, height: sizePixels }}
                  className="rounded"
                />
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">QR-Code konnte nicht geladen werden</div>
            )}
          </div>

          {/* Item-Informationen */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item-Name:</span>
                <span className="font-medium">{itemName}</span>
              </div>
              <div className="flex justify-between items-start mt-2">
                <span className="text-muted-foreground">Item-ID:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                    {itemId.slice(0, 8)}...{itemId.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCopyItemId}
                    title="ID kopieren"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {itemDetails?.category && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Kategorie:</span>
                  <span className="font-medium">{itemDetails.category}</span>
                </div>
              )}
              {itemDetails?.quantity && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Menge:</span>
                  <span className="font-medium">{itemDetails.quantity}</span>
                </div>
              )}
              {itemDetails?.location && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Standort:</span>
                  <span className="font-medium">{itemDetails.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1 gap-2"
              disabled={loading || !qrCodeUrl}
            >
              <Download className="h-4 w-4" />
              Herunterladen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 gap-2"
              disabled={loading || !qrCodeUrl}
            >
              <Printer className="h-4 w-4" />
              Drucken
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

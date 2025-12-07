/**
 * Enhanced QR Scanner mit Item-Vorschau und direkten Aktionen
 * Zeigt gescannte Item-Details sofort an mit schnellen Aktionen
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Camera, Check, AlertTriangle, Download, Plus, Edit2, Eye,
  Package, MapPin, Calendar, Zap 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { useQRScanner, useQRInput } from '@/hooks/useQRScanner';
import { decodeQRPayload, extractItemId } from '@/lib/qrPayload';
import { logger } from '@/lib/logger';
import { InventoryItem } from '@/types/inventory';
import { StatusBadge } from '@/components/StatusBadge';

interface EnhancedQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemFound?: (itemId: string) => void;
  onNavigateToItem?: (itemId: string) => void;
}

export function EnhancedQRScanner({
  isOpen,
  onClose,
  onItemFound,
  onNavigateToItem,
}: EnhancedQRScannerProps) {
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  const {
    videoRef,
    canvasRef,
    isScanning,
    error: scanError,
    startScanning,
    stopScanning,
    scanFrame,
  } = useQRScanner();

  const { itemId, isValid, handleInputChange, handlePaste, clear } = useQRInput();
  const { toast } = useToast();
  const { items } = useInventory();

  // Start scanning when dialog opens
  useEffect(() => {
    if (isOpen && scanMethod === 'camera') {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, scanMethod, startScanning, stopScanning]);

  // Scanning loop
  useEffect(() => {
    if (isScanning) {
      const handleScanResult = (result: { itemId: string; isValid: boolean }) => {
        if (result.isValid) {
          handleScannedId(result.itemId);
        }
      };

      const startScan = async () => {
        await scanFrame(handleScanResult);
      };

      startScan();
    }
  }, [isScanning, scanFrame]);

  /**
   * Verarbeitet gescannte oder eingegebene Item-ID
   */
  const handleScannedId = async (rawId: string) => {
    try {
      setIsLoadingItem(true);
      
      // Dekodiere Payload (könnte JSON sein oder nur UUID)
      const payload = decodeQRPayload(rawId);
      const itemId = extractItemId(payload);

      // Finde Item in der Liste
      const item = items.find(i => i.id === itemId);

      if (item) {
        setScannedItem(item);
        onItemFound?.(itemId);
      } else {
        toast({
          title: 'Item nicht gefunden',
          description: `Item mit ID ${itemId.slice(0, 8)}... konnte nicht gefunden werden`,
          variant: 'destructive',
        });
        clear();
      }
    } catch (error) {
      logger.error('Error processing scanned ID:', error);
      toast({
        title: 'Fehler',
        description: 'QR-Code konnte nicht verarbeitet werden',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingItem(false);
    }
  };

  const handleManualSubmit = () => {
    if (!isValid) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine gültige Item-ID ein',
        variant: 'destructive',
      });
      return;
    }

    handleScannedId(itemId);
  };

  const handleClose = () => {
    stopScanning();
    clear();
    setScannedItem(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-border/50 w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto px-3 sm:px-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {scannedItem ? 'Item gescannt!' : 'QR-Code Scanner'}
          </DialogTitle>
        </DialogHeader>

        {!scannedItem ? (
          // Scanner Interface
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {/* Methoden-Auswahl */}
            <div className="flex gap-2">
              <Button
                variant={scanMethod === 'camera' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMethod('camera')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Kamera
              </Button>
              <Button
                variant={scanMethod === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMethod('manual')}
                className="flex-1"
              >
                Manuell
              </Button>
            </div>

            {/* Kamera-View */}
            {scanMethod === 'camera' && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg border-2 border-border bg-black"
                  style={{ maxHeight: '400px' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div className="text-center text-sm text-muted-foreground">
                  {isScanning ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full" />
                      Scanner aktiv - Richte einen QR-Code auf die Kamera
                    </div>
                  ) : (
                    'Scanner wird gestartet...'
                  )}
                </div>

                {scanError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {scanError}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
                  <strong>💡 Tipps:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li>Gute Beleuchtung erforderlich</li>
                    <li>QR-Code frontal zur Kamera</li>
                    <li>Langsam bewegen</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Manueller Input */}
            {scanMethod === 'manual' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item-ID eingeben</label>
                  <input
                    type="text"
                    placeholder="Paste gescannten QR-Code oder geben Sie Item-ID ein"
                    value={itemId}
                    onChange={e => handleInputChange(e.target.value)}
                    onPaste={handlePaste}
                    className="w-full px-3 py-2 rounded-lg border border-border font-mono text-sm"
                  />
                  {itemId && (
                    <div className="text-xs">
                      {isValid ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="h-3 w-3" />
                          Gültige Item-ID
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Ungültiges Format
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={clear}
                    className="flex-1"
                    disabled={!itemId}
                  >
                    Löschen
                  </Button>
                  <Button
                    onClick={handleManualSubmit}
                    className="flex-1"
                    disabled={!isValid || isLoadingItem}
                  >
                    {isLoadingItem ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Laden...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Bestätigen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Item Preview with Actions
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg truncate">{scannedItem.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {scannedItem.id.slice(0, 8)}...{scannedItem.id.slice(-8)}
                  </p>
                </div>
                <StatusBadge condition={scannedItem.condition} />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Kategorie:</span>
                  <span className="font-medium">{scannedItem.category}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Standort:</span>
                  <span className="font-medium">{scannedItem.location}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Menge:</span>
                  <Badge variant="outline">{scannedItem.quantity}</Badge>
                </div>

                {scannedItem.dmx_start_address && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">DMX:</span>
                    <span className="font-mono text-xs">
                      U{scannedItem.dmx_universe || 1}/{scannedItem.dmx_start_address}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {scannedItem.notes && (
                <div className="bg-muted/50 rounded p-2 text-xs">
                  <p className="font-medium text-muted-foreground mb-1">Notizen:</p>
                  <p>{scannedItem.notes}</p>
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  onNavigateToItem?.(scannedItem.id);
                  handleClose();
                }}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Details</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Hier könnten weitere Aktionen kommen (z.B. Check-in/out)
                  toast({
                    title: 'Feature kommt bald',
                    description: 'Check-in/Check-out wird in der nächsten Phase hinzugefügt',
                  });
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Check</span>
              </Button>
            </div>

            {/* Close Button */}
            <Button
              onClick={() => {
                setScannedItem(null);
                clear();
              }}
              variant="secondary"
              className="w-full"
            >
              Weiterer QR-Code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

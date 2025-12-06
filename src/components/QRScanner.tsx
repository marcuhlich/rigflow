import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQRScanner, useQRInput } from '@/hooks/useQRScanner';
import { Camera, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemFound: (itemId: string) => void;
}

function QRScannerModal({ isOpen, onClose, onItemFound }: QRScannerModalProps) {
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
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

  useEffect(() => {
    if (isOpen && scanMethod === 'camera') {
      startScanning();
    }

    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isOpen, scanMethod, isScanning, startScanning, stopScanning]);

  // Starte Scanning Loop wenn Kamera läuft
  useEffect(() => {
    if (isScanning) {
      const handleScanResult = (result: { itemId: string; isValid: boolean }) => {
        onItemFound(result.itemId);
        onClose();
      };

      // Starte den Scanning-Prozess
      const startScan = async () => {
        await scanFrame(handleScanResult);
      };

      startScan();
    }
  }, [isScanning, scanFrame, onItemFound, onClose]);

  const handleManualSubmit = () => {
    if (!isValid) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine gültige Item-ID ein',
        variant: 'destructive',
      });
      return;
    }

    onItemFound(itemId);
    clear();
    onClose();
  };

  const handleClose = () => {
    stopScanning();
    clear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-border/50 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR-Code Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              {/* Video-Element */}
              <video
                ref={videoRef}
                className="w-full rounded-lg border-2 border-border bg-black"
                style={{ maxHeight: '400px' }}
              />
              {/* Canvas für Bildverarbeitung */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Status */}
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

              {/* Fehler */}
              {scanError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              )}

              {/* Hinweis */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Tipp:</strong> Sorge für gute Beleuchtung und richte den QR-Code frontal zur Kamera aus.
              </div>
            </div>
          )}

          {/* Manueller Input */}
          {scanMethod === 'manual' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item-ID eingeben</label>
                <Input
                  placeholder="Geben Sie die Item-ID ein oder fügen Sie einen gescannten Code ein"
                  value={itemId}
                  onChange={e => handleInputChange(e.target.value)}
                  onPaste={handlePaste}
                  className="font-mono"
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
                        Ungültige Format
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hinweis */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Tipp:</strong> Du kannst auch einen QR-Code mit deinem Smartphone scannen und den Text hier einfügen (Strg+V).
              </div>
            </div>
          )}

          {/* Aktions-Buttons */}
          <div className="flex gap-2 pt-2">
            {scanMethod === 'manual' && (
              <>
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
                  disabled={!isValid}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Bestätigen
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Export-Komponente mit vereinfachtem Interface für Inventory
 */
interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (itemId: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  return (
    <QRScannerModal
      isOpen={isOpen}
      onClose={onClose}
      onItemFound={onScan}
    />
  );
}

/**
 * Kompakte QR-Scanner Komponente mit eigenem Button
 */
interface QRScannerWidgetProps {
  onItemFound: (itemId: string) => void;
}

export function QRScannerWidget({ onItemFound }: QRScannerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        QR-Code Scannen
      </Button>

      <QRScannerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onItemFound={itemId => {
          onItemFound(itemId);
          setIsOpen(false);
        }}
      />
    </>
  );
}

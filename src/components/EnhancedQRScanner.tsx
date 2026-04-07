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
  Camera, Check, AlertTriangle, Plus, Edit2, Eye,
  Package, MapPin, Calendar, Zap, X, Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { useEventSets } from '@/hooks/useEventSets';
import { useQRScanner, useQRInput } from '@/hooks/useQRScanner';
import { decodeQRPayload, extractItemId } from '@/lib/qrPayload';
import { logger } from '@/lib/logger';
import { InventoryItem } from '@/types/inventory';
import { StatusBadge } from '@/components/StatusBadge';
import { hapticFeedback } from '@/lib/utils';

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
  const [showPositionModal, setShowPositionModal] = useState(false);

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
  const { sets } = useEventSets();

  // Sets, die dieses Item enthalten
  const itemSets = scannedItem
    ? sets.filter(s => s.items.some(si => si.item_id === scannedItem.id))
    : [];

  // Start scanning when dialog opens
  useEffect(() => {
    if (isOpen && scanMethod === 'camera' && !scannedItem) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen, scanMethod, scannedItem, startScanning, stopScanning]);

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

  const handleScannedId = async (rawId: string) => {
    try {
      setIsLoadingItem(true);
      const payload = decodeQRPayload(rawId);
      const itemId = extractItemId(payload);
      const item = items.find(i => i.id === itemId);

      if (item) {
        setScannedItem(item);
        hapticFeedback(50);
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
    setShowPositionModal(false);
    onClose();
  };

  return (
    <>
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
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
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

                  <div className="p-4 rounded-lg bg-muted/20 border border-primary/20 group">
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
                      className="w-full px-3 py-2 rounded-lg border bg-muted/20 border-primary/20 group font-mono text-sm"
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
                  onClick={() => setShowPositionModal(true)}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Position</span>
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

      {/* Position Modal */}
      {scannedItem && (
        <Dialog open={showPositionModal} onOpenChange={setShowPositionModal}>
          <DialogContent className="glass-card border-border/50 w-[95vw] sm:max-w-[480px] max-h-[85vh] overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Position anzeigen
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Item-Name als Kontext */}
              <p className="text-sm text-muted-foreground">
                Wo gehört <span className="font-semibold text-foreground">{scannedItem.name}</span> hin?
              </p>

              {/* ── Sektion 1: Standort ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  📍 Standort
                </p>
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{scannedItem.location}</p>
                      <p className="text-xs text-muted-foreground">Eingelagerter Standort</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Sektion 2: Event-Sets ── */}
              {itemSets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    📦 Event-Sets
                  </p>
                  <div className="space-y-2">
                    {itemSets.map(set => {
                      const setItem = set.items.find(si => si.item_id === scannedItem.id);
                      return (
                        <Card key={set.id} className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                                <Layers className="h-4 w-4 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{set.name}</p>
                                {set.event_date_start && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(set.event_date_start).toLocaleDateString('de-DE')}
                                    {set.event_date_end && set.event_date_end !== set.event_date_start && (
                                      <> – {new Date(set.event_date_end).toLocaleDateString('de-DE')}</>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            {setItem && (
                              <Badge variant="outline" className="shrink-0 text-xs">
                                ×{setItem.quantity}
                              </Badge>
                            )}
                          </div>
                          {set.description && (
                            <p className="text-xs text-muted-foreground mt-2 pl-11 truncate">
                              {set.description}
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Sektion 3: Meta ── */}
              {(scannedItem.notes || scannedItem.dmx_start_address || scannedItem.accessories) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    🗒️ Weitere Infos
                  </p>
                  <Card className="p-3 space-y-2">
                    {scannedItem.notes && (
                      <div className="text-xs">
                        <p className="font-medium text-muted-foreground mb-0.5">Notizen</p>
                        <p>{scannedItem.notes}</p>
                      </div>
                    )}
                    {scannedItem.dmx_start_address && (
                      <div className="flex items-center gap-2 text-xs">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">DMX:</span>
                        <span className="font-mono">
                          Universe {scannedItem.dmx_universe || 1}, Adresse {scannedItem.dmx_start_address}
                          {scannedItem.dmx_channels && ` (${scannedItem.dmx_channels} Ch)`}
                        </span>
                      </div>
                    )}
                    {scannedItem.accessories && (
                      <div className="text-xs">
                        <p className="font-medium text-muted-foreground mb-0.5">Zubehör</p>
                        <p>{scannedItem.accessories}</p>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Schließen */}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowPositionModal(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Schließen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
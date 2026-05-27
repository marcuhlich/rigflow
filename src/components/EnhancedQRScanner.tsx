import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Camera, Check, AlertTriangle, Eye,
  Package, MapPin, Calendar, Zap, X, Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useQRScanner, useQRInput } from '@/hooks/useQRScanner';
import { decodeQRPayload, extractItemId } from '@/lib/qrPayload';
import { logger } from '@/lib/logger';
import { InventoryItem } from '@/types/inventory';
import { StatusBadge } from '@/components/StatusBadge';
import { hapticFeedback } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  const { t, i18n } = useTranslation();
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
  const { projects } = useProjects();
  const [itemProjects, setItemProjects] = useState<typeof projects>([]);

  // Locale-aware date formatter
  const dateLocale = i18n.language.startsWith('de') ? 'de-DE' : 'en-GB';

  useEffect(() => {
    if (!scannedItem) { setItemProjects([]); return; }
    supabase
      .from('project_items')
      .select('project_id')
      .eq('inventory_item_id', scannedItem.id)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((r: any) => r.project_id));
        setItemProjects(projects.filter(p => ids.has(p.id)));
      });
  }, [scannedItem, projects]);

  useEffect(() => {
    if (isOpen && scanMethod === 'camera' && !scannedItem) {
      startScanning();
    }
    return () => { stopScanning(); };
  }, [isOpen, scanMethod, scannedItem, startScanning, stopScanning]);

  useEffect(() => {
    if (isScanning) {
      const handleScanResult = (result: { itemId: string; isValid: boolean }) => {
        if (result.isValid) handleScannedId(result.itemId);
      };
      const startScan = async () => { await scanFrame(handleScanResult); };
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
          title: t('qr_scanner.item_not_found'),
          description: t('qr_scanner.item_not_found_desc', { id: itemId.slice(0, 8) }),
          variant: 'destructive',
        });
        clear();
      }
    } catch (error) {
      logger.error('Error processing scanned ID:', error);
      toast({
        title: t('common.error'),
        description: t('qr_scanner.processing_error'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingItem(false);
    }
  };

  const handleManualSubmit = () => {
    if (!isValid) {
      toast({
        title: t('common.error'),
        description: t('qr_scanner.invalid_id'),
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
              {scannedItem ? t('qr_scanner.title_scanned') : t('qr_scanner.title')}
            </DialogTitle>
          </DialogHeader>

          {!scannedItem ? (
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
                  {t('qr_scanner.method_camera')}
                </Button>
                <Button
                  variant={scanMethod === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScanMethod('manual')}
                  className="flex-1"
                >
                  {t('qr_scanner.method_manual')}
                </Button>
              </div>

              {/* Kamera-View */}
              {scanMethod === 'camera' && (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg border-2 border-border bg-black"
                    style={{ maxHeight: '400px', objectFit: 'cover', opacity: 0, transition: 'opacity 0.2s' }}
                    autoPlay
                    muted
                    playsInline
                    onPlaying={e => (e.currentTarget.style.opacity = '1')}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  <div className="text-center text-sm text-muted-foreground">
                    {isScanning ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full" />
                        {t('qr_scanner.scanner_active')}
                      </div>
                    ) : (
                      t('qr_scanner.scanner_starting')
                    )}
                  </div>

                  {scanError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      {scanError}
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-muted/20 border border-primary/20">
                    <strong>💡 {t('qr_scanner.tips.title')}</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>{t('qr_scanner.tips.lighting')}</li>
                      <li>{t('qr_scanner.tips.angle')}</li>
                      <li>{t('qr_scanner.tips.movement')}</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Manueller Input */}
              {scanMethod === 'manual' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('qr_scanner.manual_label')}</label>
                    <input
                      type="text"
                      placeholder={t('qr_scanner.manual_placeholder')}
                      value={itemId}
                      onChange={e => handleInputChange(e.target.value)}
                      onPaste={handlePaste}
                      className="w-full px-3 py-2 rounded-lg border bg-muted/20 border-primary/20 font-mono text-sm"
                    />
                    {itemId && (
                      <div className="text-xs">
                        {isValid ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" />
                            {t('qr_scanner.valid_id')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {t('qr_scanner.invalid_format')}
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
                      {t('common.clear')}
                    </Button>
                    <Button
                      onClick={handleManualSubmit}
                      className="flex-1"
                      disabled={!isValid || isLoadingItem}
                    >
                      {isLoadingItem ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('common.confirm')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Item Preview
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{scannedItem.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {scannedItem.id.slice(0, 8)}...{scannedItem.id.slice(-8)}
                    </p>
                  </div>
                  <StatusBadge condition={scannedItem.condition} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('fields.category')}:</span>
                    <span className="font-medium">{scannedItem.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('fields.location')}:</span>
                    <span className="font-medium">{scannedItem.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('fields.quantity')}:</span>
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

                {scannedItem.notes && (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <p className="font-medium text-muted-foreground mb-1">{t('fields.notes')}:</p>
                    <p>{scannedItem.notes}</p>
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => { onNavigateToItem?.(scannedItem.id); handleClose(); }}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('qr_scanner.action_details')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPositionModal(true)}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('qr_scanner.action_position')}</span>
                </Button>
              </div>

              <Button
                onClick={() => { setScannedItem(null); clear(); }}
                variant="secondary"
                className="w-full"
              >
                {t('qr_scanner.scan_another')}
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
                {t('qr_scanner.position_modal.title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t('qr_scanner.position_modal.subtitle', { name: scannedItem.name })}
              </p>

              {/* Standort */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  📍 {t('qr_scanner.position_modal.section_location')}
                </p>
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{scannedItem.location}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('qr_scanner.position_modal.stored_location')}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Projekte */}
              {itemProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    📁 {t('qr_scanner.position_modal.section_projects')}
                  </p>
                  <div className="space-y-2">
                    {itemProjects.map(project => (
                      <Card key={project.id} className="p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{project.name}</p>
                            {project.event_date_start && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(project.event_date_start).toLocaleDateString(dateLocale)}
                                {project.event_date_end && ` – ${new Date(project.event_date_end).toLocaleDateString(dateLocale)}`}
                              </p>
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0',
                            project.status === 'live'    ? 'bg-primary/20 text-primary' :
                            project.status === 'packed'  ? 'bg-amber-500/20 text-amber-400' :
                            project.status === 'transit' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-muted/60 text-muted-foreground'
                          )}>
                            {t(`project_status.${project.status}`, { defaultValue: project.status })}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Weitere Infos */}
              {(scannedItem.notes || scannedItem.dmx_start_address || scannedItem.accessories) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    🗒️ {t('qr_scanner.position_modal.section_meta')}
                  </p>
                  <Card className="p-3 space-y-2">
                    {scannedItem.notes && (
                      <div className="text-xs">
                        <p className="font-medium text-muted-foreground mb-0.5">{t('fields.notes')}</p>
                        <p>{scannedItem.notes}</p>
                      </div>
                    )}
                    {scannedItem.dmx_start_address && (
                      <div className="flex items-center gap-2 text-xs">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">DMX:</span>
                        <span className="font-mono">
                          {t('qr_scanner.position_modal.dmx_info', {
                            universe: scannedItem.dmx_universe || 1,
                            address: scannedItem.dmx_start_address,
                            channels: scannedItem.dmx_channels,
                          })}
                        </span>
                      </div>
                    )}
                    {scannedItem.accessories && (
                      <div className="text-xs">
                        <p className="font-medium text-muted-foreground mb-0.5">{t('fields.accessories')}</p>
                        <p>{scannedItem.accessories}</p>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowPositionModal(false)}
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
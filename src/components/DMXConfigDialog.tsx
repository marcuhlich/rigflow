import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, DMX_CATEGORIES } from '@/types/inventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Sliders } from 'lucide-react';

interface DMXConfigDialogProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem, dmxConfig: DMXConfig) => Promise<void>;
  loading?: boolean;
  hasConflict?: boolean;
}

export interface DMXConfig {
  dmx_universe: number;
  dmx_start_address: number;
  dmx_channels: number;
}

export function DMXConfigDialog({
  isOpen,
  item,
  onClose,
  onSave,
  loading = false,
  hasConflict = false,
}: DMXConfigDialogProps) {
  const { t } = useTranslation();

  const [config, setConfig] = useState<DMXConfig>({
    dmx_universe: 1,
    dmx_start_address: 1,
    dmx_channels: 16,
  });

  const isDMXCategory = item && DMX_CATEGORIES.includes(item.category);

  useEffect(() => {
    if (item && isOpen) {
      setConfig({
        dmx_universe: item.dmx_universe || 1,
        dmx_start_address: item.dmx_start_address || 1,
        dmx_channels: item.dmx_channels || 16,
      });
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!item) return;

    if (
      config.dmx_universe < 1 ||
      config.dmx_start_address < 1 ||
      config.dmx_start_address > 512 ||
      config.dmx_channels < 1
    ) {
      alert(t('dmx.invalid_values'));
      return;
    }

    const endAddress = config.dmx_start_address + config.dmx_channels * item.quantity - 1;
    if (endAddress > 512) {
      alert(
        t('dmx.too_many_channels_alert', {
          needed: config.dmx_channels * item.quantity,
          available: 512 - config.dmx_start_address + 1,
        })
      );
      return;
    }

    await onSave(item, config);
  };

  if (!item || !isDMXCategory) return null;

  const endAddress = config.dmx_start_address + config.dmx_channels * item.quantity - 1;
  const totalChannelsNeeded = config.dmx_channels * item.quantity;

  return (
    <Dialog open={isOpen && isDMXCategory} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 w-[95vw] sm:max-w-[400px] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            {t('dmx.title')}
          </DialogTitle>
          <DialogDescription>
            {item.name} ({item.quantity}x)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Konflikt-Warnung */}
          {hasConflict && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2 text-sm">
                {t('dmx.conflict_warning')}
              </AlertDescription>
            </Alert>
          )}

          {/* Universum */}
          <div className="space-y-2">
            <Label htmlFor="dmx_universe">{t('dmx.universe_label')}</Label>
            <Input
              id="dmx_universe"
              type="number"
              min="1"
              value={config.dmx_universe}
              onChange={e =>
                setConfig({ ...config, dmx_universe: Math.max(1, parseInt(e.target.value) || 1) })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{t('dmx.universe_hint')}</p>
          </div>

          {/* Start-Adresse */}
          <div className="space-y-2">
            <Label htmlFor="dmx_start_address">{t('dmx.start_address_label')}</Label>
            <Input
              id="dmx_start_address"
              type="number"
              min="1"
              max="512"
              value={config.dmx_start_address}
              onChange={e =>
                setConfig({
                  ...config,
                  dmx_start_address: Math.max(1, Math.min(512, parseInt(e.target.value) || 1)),
                })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{t('dmx.start_address_hint')}</p>
          </div>

          {/* Kanäle pro Gerät */}
          <div className="space-y-2">
            <Label htmlFor="dmx_channels">{t('dmx.channels_label')}</Label>
            <Input
              id="dmx_channels"
              type="number"
              min="1"
              value={config.dmx_channels}
              onChange={e =>
                setConfig({ ...config, dmx_channels: Math.max(1, parseInt(e.target.value) || 1) })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{t('dmx.channels_hint')}</p>
          </div>

          {/* Zusammenfassung */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border/50 space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dmx.summary.instances')}</span>
                <span className="font-medium">{item.quantity}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dmx.summary.channels_per_instance')}</span>
                <span className="font-mono">{config.dmx_channels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dmx.summary.address_range')}</span>
                <span className="font-mono font-bold">
                  {config.dmx_start_address}–{Math.min(endAddress, 512)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dmx.summary.total_channels')}</span>
                <span
                  className={
                    totalChannelsNeeded > 512 - config.dmx_start_address + 1
                      ? 'text-destructive font-medium'
                      : 'font-mono'
                  }
                >
                  {totalChannelsNeeded}
                </span>
              </div>
            </div>
          </div>

          {/* Warnung zu viele Kanäle */}
          {endAddress > 512 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2 text-sm">
                {t('dmx.too_many_channels_inline', {
                  available: 512 - config.dmx_start_address + 1,
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={loading || endAddress > 512}
          >
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
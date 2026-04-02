import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnhancedQRScanner } from '@/components/EnhancedQRScanner';
import { useInventory } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem, ItemCondition } from '@/types/inventory';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Undo2,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

type CheckoutMode = 'checkout' | 'return' | 'idle';

interface ScannedItem {
  item: InventoryItem;
  scannedAt: Date;
  newStatus?: ItemCondition;
  person?: string;
}

export default function CheckoutReturn() {
  const navigate = useNavigate();
  const { allItems, updateItem } = useInventory();
  const { toast } = useToast();

  const [mode, setMode] = useState<CheckoutMode>('idle');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentPerson, setCurrentPerson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get status color
  const getStatusColor = (status: ItemCondition) => {
    switch (status) {
      case 'verfügbar':
        return 'bg-success/20 text-success border-success/30';
      case 'verliehen':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'in-einsatz':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'defekt':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: ItemCondition): string => {
    switch (status) {
      case 'verfügbar':
        return '✓ Verfügbar';
      case 'verliehen':
        return '↗ Verliehen';
      case 'in-einsatz':
        return '⚡ Im Einsatz';
      case 'defekt':
        return '✗ Defekt';
      default:
        return status;
    }
  };

  const handleQRScan = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId);

    if (!item) {
      toast({
        title: 'Item nicht gefunden',
        description: 'Dieses Item existiert nicht.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already scanned
    if (scannedItems.some((si) => si.item.id === itemId)) {
      toast({
        title: 'Bereits gescannt',
        description: 'Dieses Item wurde bereits hinzugefügt.',
        variant: 'destructive',
      });
      return;
    }

    // Determine new status based on mode
    let newStatus: ItemCondition | undefined;
    if (mode === 'checkout') {
      newStatus = 'in-einsatz';
    } else if (mode === 'return') {
      newStatus = 'verfügbar';
    }

    const scanned: ScannedItem = {
      item,
      scannedAt: new Date(),
      newStatus,
      person: currentPerson || undefined,
    };

    setScannedItems([...scannedItems, scanned]);
    toast({
      title: '✓ Item hinzugefügt',
      description: `${item.name} wurde hinzugefügt.`,
    });
  };

  const removeScannedItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const updateStatusForItem = (index: number, newStatus: ItemCondition) => {
    const updated = [...scannedItems];
    updated[index].newStatus = newStatus;
    setScannedItems(updated);
  };

  const handleConfirm = async () => {
    if (scannedItems.length === 0) {
      toast({
        title: 'Keine Items',
        description: 'Bitte scanne mindestens ein Item.',
        variant: 'destructive',
      });
      return;
    }

    if ((mode === 'checkout' || mode === 'return') && !currentPerson) {
      toast({
        title: 'Person erforderlich',
        description: 'Bitte gib an, wer die Items mitnimmt.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Update all items
      for (const scanned of scannedItems) {
        if (scanned.newStatus) {
          await updateItem(scanned.item.id, {
            ...scanned.item,
            condition: scanned.newStatus,
            lent_to: mode === 'checkout' ? currentPerson : null,
            lent_until: mode === 'checkout' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          });
        }
      }

      toast({
        title: mode === 'checkout' ? '✓ Checkout erfolgreich' : '✓ Return erfolgreich',
        description: `${scannedItems.length} Item(s) aktualisiert.`,
      });

      // Reset
      setScannedItems([]);
      setCurrentPerson('');
      setMode('idle');
      setIsScannerOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Update fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Checkout / Return</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage equipment checkout and returns with QR scanning
        </p>
      </div>

      {/* Mode Selection */}
      {mode === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Checkout Button */}
          <Card
            onClick={() => setMode('checkout')}
            className="glass-card p-6 cursor-pointer hover:bg-primary/5 transition-colors group"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Checkout</h3>
                <p className="text-sm text-muted-foreground">
                  Scanne Items die mitgenommen werden
                </p>
              </div>
              <Button className="w-full gap-2">
                Checkout starten
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Return Button */}
          <Card
            onClick={() => setMode('return')}
            className="glass-card p-6 cursor-pointer hover:bg-success/5 transition-colors group"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 group-hover:bg-success/20 flex items-center justify-center transition-colors">
                <Undo2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Return</h3>
                <p className="text-sm text-muted-foreground">
                  Scanne Items die zurückgebracht werden
                </p>
              </div>
              <Button className="w-full gap-2">
                Return starten
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Checkout/Return Workflow */}
      {mode !== 'idle' && (
        <div className="space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === 'checkout' ? '📤 Checkout' : '📥 Return'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMode('idle');
                  setScannedItems([]);
                  setCurrentPerson('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Person Input (for Checkout) */}
            {mode === 'checkout' && (
              <div className="space-y-2">
                <Label htmlFor="person">Wer nimmt die Items mit?</Label>
                <Input
                  id="person"
                  placeholder="Name der Person"
                  value={currentPerson}
                  onChange={(e) => setCurrentPerson(e.target.value)}
                  className="glass-input"
                />
              </div>
            )}

            {/* Scan Button */}
            <Button
              onClick={() => setIsScannerOpen(true)}
              className="w-full gap-2"
            >
              <QrCode className="h-4 w-4" />
              Item scannen
            </Button>
          </Card>

          {/* Scanned Items */}
          {scannedItems.length > 0 && (
            <Card className="glass-card p-6 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Gescannte Items ({scannedItems.length})
              </h4>

              <div className="space-y-3">
                {scannedItems.map((scanned, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
                  >
                    {/* Item Info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{scanned.item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {scanned.item.category} • Menge: {scanned.item.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {scanned.scannedAt.toLocaleTimeString('de-DE')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScannedItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Current Status */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Aktuell:</span>
                      <Badge className={getStatusColor(scanned.item.condition)}>
                        {getStatusLabel(scanned.item.condition)}
                      </Badge>
                    </div>

                    {/* Status Change */}
                    {scanned.newStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">→</span>
                        <Badge className={getStatusColor(scanned.newStatus)}>
                          {getStatusLabel(scanned.newStatus)}
                        </Badge>
                      </div>
                    )}

                    {/* Override Status */}
                    {mode === 'return' && (
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Status bei Return (optional):
                        </Label>
                        <Select
                          value={scanned.newStatus || 'verfügbar'}
                          onValueChange={(value) =>
                            updateStatusForItem(index, value as ItemCondition)
                          }
                        >
                          <SelectTrigger className="glass-input h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verfügbar">
                              ✓ Verfügbar
                            </SelectItem>
                            <SelectItem value="defekt">✗ Defekt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || (mode === 'checkout' && !currentPerson)}
            size="lg"
            className="w-full gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird aktualisiert...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {mode === 'checkout'
                  ? `${scannedItems.length} Item(s) Checkout`
                  : `${scannedItems.length} Item(s) Return`}
              </>
            )}
          </Button>
        </div>
      )}

      {/* QR Scanner */}
      <EnhancedQRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onItemFound={handleQRScan}
        onNavigateToItem={() => {}}
      />
    </div>
  );
}
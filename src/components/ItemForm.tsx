import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryItem, CATEGORIES, CONDITIONS, CONDITION_LABELS, ItemCategory, ItemCondition, DMX_CATEGORIES } from "@/types/inventory";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editItem?: InventoryItem | null;
}

export function ItemForm({ isOpen, onClose, onSubmit, editItem }: ItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Kabel' as ItemCategory,
    quantity: 1,
    condition: 'verfügbar' as ItemCondition,
    location: '',
    notes: '',
    lent_to: '',
    lent_until: '',
    accessories: '',
    dmx_start_address: '',
    dmx_channels: '',
    dmx_universe: '',
    unit_price: '',
  });

  const showDMXFields = DMX_CATEGORIES.includes(formData.category);
  const showLentFields = formData.condition === 'verliehen';

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        quantity: editItem.quantity,
        condition: editItem.condition,
        location: editItem.location,
        notes: editItem.notes || '',
        lent_to: editItem.lent_to || '',
        lent_until: editItem.lent_until || '',
        accessories: editItem.accessories || '',
        dmx_start_address: editItem.dmx_start_address?.toString() || '',
        dmx_channels: editItem.dmx_channels?.toString() || '',
        dmx_universe: editItem.dmx_universe?.toString() || '',
        unit_price: editItem.unit_price?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Kabel',
        quantity: 1,
        condition: 'verfügbar',
        location: '',
        notes: '',
        lent_to: '',
        lent_until: '',
        accessories: '',
        dmx_start_address: '',
        dmx_channels: '',
        dmx_universe: '',
        unit_price: '',
      });
    }
  }, [editItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit({
        name: formData.name,
        category: formData.category,
        quantity: formData.quantity,
        condition: formData.condition,
        location: formData.location,
        notes: formData.notes || null,
        lent_to: formData.lent_to || null,
        lent_until: formData.lent_until || null,
        accessories: formData.accessories || null,
        dmx_start_address: formData.dmx_start_address ? parseInt(formData.dmx_start_address) : null,
        dmx_channels: formData.dmx_channels ? parseInt(formData.dmx_channels) : null,
        dmx_universe: formData.dmx_universe ? parseInt(formData.dmx_universe) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      });
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 sm:max-w-[550px] max-h-[90vh] p-0 animate-scale-in">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold">
            {editItem ? 'Item bearbeiten' : 'Neues Item hinzufügen'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Moving Head LED"
                required
                className="glass-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v as ItemCategory })}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Menge *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  required
                  className="glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Zustand *</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(v) => setFormData({ ...formData, condition: v as ItemCondition })}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond}>{CONDITION_LABELS[cond]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Standort *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="z.B. Lager A"
                  required
                  className="glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Stückpreis (€)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  placeholder="0.00"
                  className="glass-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessories">Zubehör</Label>
                <Input
                  id="accessories"
                  value={formData.accessories}
                  onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                  placeholder="z.B. Netzteil, Case"
                  className="glass-input"
                />
              </div>
            </div>

            {/* Lent fields */}
            {showLentFields && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="space-y-2">
                  <Label htmlFor="lent_to">Verliehen an</Label>
                  <Input
                    id="lent_to"
                    value={formData.lent_to}
                    onChange={(e) => setFormData({ ...formData, lent_to: e.target.value })}
                    placeholder="Name / Firma"
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lent_until">Verliehen bis</Label>
                  <Input
                    id="lent_until"
                    type="date"
                    value={formData.lent_until}
                    onChange={(e) => setFormData({ ...formData, lent_until: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>
            )}

            {/* DMX fields */}
            {showDMXFields && (
              <div className="space-y-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Label className="text-sm font-medium text-primary">DMX-Konfiguration</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dmx_universe">Universum</Label>
                    <Input
                      id="dmx_universe"
                      type="number"
                      min="1"
                      value={formData.dmx_universe}
                      onChange={(e) => setFormData({ ...formData, dmx_universe: e.target.value })}
                      placeholder="1"
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dmx_start_address">Startadresse</Label>
                    <Input
                      id="dmx_start_address"
                      type="number"
                      min="1"
                      max="512"
                      value={formData.dmx_start_address}
                      onChange={(e) => setFormData({ ...formData, dmx_start_address: e.target.value })}
                      placeholder="1"
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dmx_channels">Kanäle</Label>
                    <Input
                      id="dmx_channels"
                      type="number"
                      min="1"
                      value={formData.dmx_channels}
                      onChange={(e) => setFormData({ ...formData, dmx_channels: e.target.value })}
                      placeholder="z.B. 16"
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optionale Bemerkungen..."
                className="glass-input resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1" disabled={isLoading}>
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : editItem ? (
                  'Speichern'
                ) : (
                  'Hinzufügen'
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

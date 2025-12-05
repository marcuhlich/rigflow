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
import { InventoryItem, CATEGORIES, CONDITIONS, CONDITION_LABELS, ItemCategory, ItemCondition } from "@/types/inventory";

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
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        quantity: editItem.quantity,
        condition: editItem.condition,
        location: editItem.location,
        notes: editItem.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Kabel',
        quantity: 1,
        condition: 'verfügbar',
        location: '',
        notes: '',
      });
    }
  }, [editItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 sm:max-w-[500px] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editItem ? 'Item bearbeiten' : 'Neues Item hinzufügen'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. XLR Kabel 10m"
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
      </DialogContent>
    </Dialog>
  );
}

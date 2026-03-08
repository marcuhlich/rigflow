import { useState } from "react";
import { Plus, Package, Trash2, Edit2, ChevronRight, Search, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useEventSets } from "@/hooks/useEventSets";
import { useToast } from "@/hooks/use-toast";
import { EventSetWithItems } from "@/types/eventSet";
import { InventoryItem } from "@/types/inventory";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function SetForm({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, desc: string) => Promise<void>;
  initial?: { name: string; description: string };
}) {
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim(), desc.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Set bearbeiten" : "Neues Set erstellen"}</DialogTitle>
          <DialogDescription>
            {initial ? "Ändere den Namen oder die Beschreibung." : "Gib einen Namen und optional eine Beschreibung an."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Set-Name (z.B. DJ Setup Hochzeit)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Beschreibung (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? "Speichern..." : initial ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemPicker({ open, onClose, inventoryItems, existingItemIds, onAdd }: {
  open: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  existingItemIds: Set<string>;
  onAdd: (itemId: string, quantity: number) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filtered = inventoryItems.filter(
    (i) =>
      !existingItemIds.has(i.id) &&
      (i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (item: InventoryItem) => {
    const qty = quantities[item.id] || 1;
    await onAdd(item.id, qty);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Artikel hinzufügen</SheetTitle>
          <SheetDescription>Wähle Artikel aus deinem Inventar aus.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Artikel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine passenden Artikel gefunden.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category} · {item.location} · Bestand: {item.quantity}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={quantities[item.id] || 1}
                    onChange={(e) => setQuantities({ ...quantities, [item.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleAdd(item)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetDetailSheet({ set, open, onClose, onUpdateQty, onRemoveItem, onAddItem, inventoryItems }: {
  set: EventSetWithItems | null;
  open: boolean;
  onClose: () => void;
  onUpdateQty: (setItemId: string, qty: number) => Promise<void>;
  onRemoveItem: (setItemId: string) => Promise<void>;
  onAddItem: (setId: string, itemId: string, qty: number) => Promise<void>;
  inventoryItems: InventoryItem[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!set) return null;

  const existingItemIds = new Set(set.items.map((i) => i.item_id));
  const totalItems = set.items.reduce((s, i) => s + i.quantity, 0);
  const allAvailable = set.items.every((i) => (i.available_quantity || 0) >= i.quantity);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {set.name}
            </SheetTitle>
            <SheetDescription>{set.description || "Keine Beschreibung"}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{set.items.length} Artikel</Badge>
                <Badge variant="secondary">{totalItems} Stück gesamt</Badge>
                {allAvailable ? (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    <Check className="h-3 w-3 mr-1" /> Verfügbar
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Nicht komplett
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" /> Artikel hinzufügen
            </Button>

            {set.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Noch keine Artikel in diesem Set.</p>
            ) : (
              <div className="space-y-2">
                {set.items.map((si) => {
                  const insufficient = (si.available_quantity || 0) < si.quantity;
                  return (
                    <div key={si.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{si.item_name || "Unbekannt"}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{si.item_category}</span>
                          {insufficient && (
                            <span className="text-destructive flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Nur {si.available_quantity} verfügbar
                            </span>
                          )}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={si.quantity}
                        onChange={(e) => onUpdateQty(si.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-8 text-xs"
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onRemoveItem(si.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ItemPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        inventoryItems={inventoryItems}
        existingItemIds={existingItemIds}
        onAdd={async (itemId, qty) => {
          await onAddItem(set.id, itemId, qty);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

export default function EventSetsPage() {
  const { sets, loading, inventoryItems, createSet, updateSet, deleteSet, addItemToSet, updateSetItemQuantity, removeItemFromSet } = useEventSets();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editSet, setEditSet] = useState<EventSetWithItems | null>(null);
  const [detailSet, setDetailSet] = useState<EventSetWithItems | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async (name: string, desc: string) => {
    await createSet(name, desc);
    toast({ title: "Set erstellt", description: `"${name}" wurde erstellt.` });
  };

  const handleUpdate = async (name: string, desc: string) => {
    if (!editSet) return;
    await updateSet(editSet.id, name, desc);
    toast({ title: "Set aktualisiert" });
    setEditSet(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSet(deleteId);
    toast({ title: "Set gelöscht" });
    setDeleteId(null);
    if (detailSet?.id === deleteId) setDetailSet(null);
  };

  // Sync detailSet with latest data
  const currentDetail = detailSet ? sets.find((s) => s.id === detailSet.id) || null : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Veranstaltungs-Sets</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {sets.length} {sets.length === 1 ? "Set" : "Sets"} erstellt
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1 h-9 text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Neues Set</span>
          <span className="sm:hidden">Set</span>
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Noch keine Sets erstellt</p>
            <p className="text-xs text-muted-foreground mt-1">Stelle Equipment-Sets für deine Veranstaltungen zusammen.</p>
            <Button className="mt-4 gap-1" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Erstes Set erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sets.map((set) => {
            const totalItems = set.items.reduce((s, i) => s + i.quantity, 0);
            const allAvailable = set.items.length > 0 && set.items.every((i) => (i.available_quantity || 0) >= i.quantity);
            return (
              <Card
                key={set.id}
                className="cursor-pointer hover:border-primary/40 transition-colors group"
                onClick={() => setDetailSet(set)}
              >
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm sm:text-base font-semibold truncate pr-2">{set.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); setEditSet(set); }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(set.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {set.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{set.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{set.items.length} Artikel</Badge>
                    <Badge variant="secondary" className="text-[10px]">{totalItems} Stück</Badge>
                    {set.items.length > 0 && (
                      allAvailable ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                          <Check className="h-2.5 w-2.5 mr-0.5" /> Verfügbar
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Unvollständig
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <span>Details anzeigen</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Set Dialog */}
      <SetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Set Dialog */}
      {editSet && (
        <SetForm
          open={!!editSet}
          onClose={() => setEditSet(null)}
          onSubmit={handleUpdate}
          initial={{ name: editSet.name, description: editSet.description || "" }}
        />
      )}

      {/* Set Detail Sheet */}
      <SetDetailSheet
        set={currentDetail}
        open={!!currentDetail}
        onClose={() => setDetailSet(null)}
        onUpdateQty={updateSetItemQuantity}
        onRemoveItem={removeItemFromSet}
        onAddItem={addItemToSet}
        inventoryItems={inventoryItems}
      />

      {/* Delete Confirmation */}
      <SoftConfirm
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Set löschen?"
        description="Dieses Set wird unwiderruflich gelöscht. Deine Inventarartikel bleiben erhalten."
      />
    </div>
  );
}

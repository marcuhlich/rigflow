import { useState, useMemo, useEffect } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Package, Trash2, Edit2, Search, GripVertical, Layers,
  Music, Lightbulb, Zap, Wrench, Cable, Star, Box, ChevronRight, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePackages } from "@/hooks/usePackages";
import { useToast } from "@/hooks/use-toast";
import { PackageWithItems, PackageItem } from "@/types/project";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Konstanten ───────────────────────────────────────────────────────────────

const COLORS = [
  '#34d399', '#f59e0b', '#3b82f6', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

const ICON_OPTIONS = [
  { value: 'package',   Icon: Package   },
  { value: 'music',     Icon: Music     },
  { value: 'lightbulb', Icon: Lightbulb },
  { value: 'zap',       Icon: Zap       },
  { value: 'wrench',    Icon: Wrench    },
  { value: 'cable',     Icon: Cable     },
  { value: 'star',      Icon: Star      },
  { value: 'box',       Icon: Box       },
  { value: 'layers',    Icon: Layers    },
];

function getIcon(name: string) {
  return ICON_OPTIONS.find(i => i.value === name)?.Icon ?? Package;
}

// ─── Package-Formular Dialog ──────────────────────────────────────────────────

interface PackageFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

function PackageFormDialog({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PackageFormData) => Promise<void>;
  initial?: PackageFormData;
}) {
  const [name,   setName]   = useState(initial?.name ?? '');
  const [desc,   setDesc]   = useState(initial?.description ?? '');
  const [color,  setColor]  = useState(initial?.color ?? '#34d399');
  const [icon,   setIcon]   = useState(initial?.icon ?? 'package');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setDesc(initial?.description ?? '');
    setColor(initial?.color ?? '#34d399');
    setIcon(initial?.icon ?? 'package');
  }, [initial, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), description: desc.trim(), color, icon });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const IconComp = getIcon(icon);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      {/* max-h-[90dvh] + overflow-y-auto → Dialog scrollbar auf kleinen Screens */}
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Paket bearbeiten' : 'Neues Paket erstellen'}</DialogTitle>
          <DialogDescription>
            Pakete sind wiederverwendbare Equipment-Vorlagen für deine Projekte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vorschau */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: color + '28', border: `2px solid ${color}60` }}
            >
              <IconComp className="h-5 w-5" style={{ color }} />
            </div>
            <span className="font-semibold text-sm truncate">{name || 'Paketname'}</span>
          </div>

          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              placeholder="z.B. DJ-Set, Licht-Basic, PA-System"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>Beschreibung</Label>
            <Textarea
              placeholder="Was ist in diesem Paket enthalten?"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-full transition-all hover:scale-110 active:scale-95 focus:outline-none",
                    color === c && "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map(({ value, Icon: I }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center border transition-all active:scale-95",
                    icon === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  )}
                  onClick={() => setIcon(value)}
                >
                  <I className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full sm:w-auto">
            {saving ? 'Speichern...' : initial ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sortierbares Paket-Item ──────────────────────────────────────────────────

function SortablePackageItemRow({ item, onRemove, onQtyChange }: {
  item: PackageItem;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'package-item', item },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card transition-shadow select-none",
        isDragging && "opacity-30 shadow-xl ring-1 ring-primary/30"
      )}
    >
      <button
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.item_name ?? 'Unbekannt'}</p>
        {(item.item_category || item.item_location) && (
          <p className="text-xs text-muted-foreground truncate">
            {[item.item_category, item.item_location].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <Input
        type="number"
        min={1}
        value={item.quantity}
        onChange={e => onQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-14 h-7 text-xs text-center"
        onClick={e => e.stopPropagation()}
      />
      <Button
        size="sm" variant="ghost"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0 active:scale-95 transition-transform"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Ziehbares Inventar-Item ──────────────────────────────────────────────────

function DraggableInventoryRow({ item, alreadyAdded, onAdd }: {
  item: InventoryItem;
  alreadyAdded: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inv-${item.id}`,
    data: { type: 'inventory', item },
    disabled: alreadyAdded,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card transition-all select-none",
        alreadyAdded
          ? "opacity-40 cursor-default"
          : "cursor-grab active:cursor-grabbing hover:border-primary/50",
        isDragging && "opacity-20 shadow-lg"
      )}
    >
      {alreadyAdded
        ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
        : (
          <button
            className="touch-none text-muted-foreground hover:text-foreground shrink-0"
            {...attributes} {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground truncate">{item.category}</p>
      </div>
      {!alreadyAdded && (
        <Button
          size="sm" variant="ghost"
          className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ─── Drop-Zone ────────────────────────────────────────────────────────────────

function PackageDropZone({ pkgId, isOver, children }: {
  pkgId: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `drop-${pkgId}`,
    data: { type: 'package-zone', packageId: pkgId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 rounded-lg p-2 transition-all min-h-[120px]",
        isOver && "bg-primary/5 ring-2 ring-dashed ring-primary/40"
      )}
    >
      {children}
    </div>
  );
}

// ─── Editor Sheet ─────────────────────────────────────────────────────────────

function PackageEditorSheet({ pkg, open, onClose, inventoryItems, onAddItem, onRemoveItem, onQtyChange, onReorder }: {
  pkg: PackageWithItems | null;
  open: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  onAddItem: (invItemId: string, qty?: number) => Promise<void>;
  onRemoveItem: (pkgItemId: string) => Promise<void>;
  onQtyChange: (pkgItemId: string, qty: number) => Promise<void>;
  onReorder: (packageId: string, orderedIds: string[]) => Promise<void>;
}) {
  const [invSearch,   setInvSearch]   = useState('');
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [overId,      setOverId]      = useState<string | null>(null);
  const [localItems,  setLocalItems]  = useState<PackageItem[]>([]);

  useEffect(() => {
    if (pkg) setLocalItems(pkg.items);
  }, [pkg]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  if (!pkg) return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent />
    </Sheet>
  );

  const addedIds   = new Set(localItems.map(i => i.inventory_item_id));
  const filteredInv = inventoryItems.filter(i =>
    i.name.toLowerCase().includes(invSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(invSearch.toLowerCase())
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragOver  = (e: DragOverEvent)  => setOverId(e.over ? String(e.over.id) : null);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = e;
    if (!over) return;

    const activeData = active.data.current as any;
    const overData   = over.data.current as any;

    if (activeData?.type === 'inventory') {
      if (overData?.type === 'package-zone' || overData?.type === 'package-item') {
        try { await onAddItem(activeData.item.id, 1); } catch { /* toast via hook */ }
      }
      return;
    }

    if (activeData?.type === 'package-item' && overData?.type === 'package-item') {
      const oldIdx = localItems.findIndex(i => i.id === active.id);
      const newIdx = localItems.findIndex(i => i.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(localItems, oldIdx, newIdx);
        setLocalItems(reordered);
        await onReorder(pkg.id, reordered.map(i => i.id));
      }
    }
  };

  const isOverPkgZone =
    overId === `drop-${pkg.id}` ||
    (localItems.some(i => i.id === overId) && !!activeId?.startsWith('inv-'));

  const overlayLabel = activeId?.startsWith('inv-')
    ? inventoryItems.find(i => `inv-${i.id}` === activeId)?.name
    : localItems.find(i => i.id === activeId)?.item_name;

  const IconComp = getIcon(pkg.icon);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl flex flex-col overflow-hidden p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: pkg.color + '28', border: `2px solid ${pkg.color}50` }}
            >
              <IconComp className="h-4 w-4" style={{ color: pkg.color }} />
            </div>
            {pkg.name}
            <Badge variant="secondary" className="ml-1 text-xs">{localItems.length} Artikel</Badge>
          </SheetTitle>
          {pkg.description && (
            <SheetDescription>{pkg.description}</SheetDescription>
          )}
        </SheetHeader>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 overflow-hidden">
            {/* Linke Spalte: Inventar (nur Desktop) */}
            <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border overflow-hidden px-4 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Inventar
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Auf das Paket ziehen oder <span className="text-foreground">+</span> klicken
              </p>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredInv.map(item => (
                  <DraggableInventoryRow
                    key={item.id}
                    item={item}
                    alreadyAdded={addedIds.has(item.id)}
                    onAdd={() => onAddItem(item.id, 1)}
                  />
                ))}
                {filteredInv.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Keine Artikel gefunden</p>
                )}
              </div>
            </div>

            {/* Rechte Spalte: Paketinhalt */}
            <div className="flex flex-col flex-1 overflow-hidden px-4 lg:px-6 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 shrink-0">
                Paketinhalt
              </p>

              <SortableContext
                items={localItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <PackageDropZone pkgId={pkg.id} isOver={isOverPkgZone}>
                  {localItems.length === 0 && !isOverPkgZone && (
                    <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-25" />
                      <p className="text-xs">Noch keine Artikel im Paket</p>
                      <p className="text-xs mt-0.5 opacity-70 hidden lg:block">
                        Aus dem Inventar hierher ziehen
                      </p>
                    </div>
                  )}
                  {isOverPkgZone && localItems.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-xs text-primary/80 font-medium">
                      Hier loslassen ↓
                    </div>
                  )}
                  <div className="space-y-1.5 overflow-y-auto">
                    {localItems.map(item => (
                      <SortablePackageItemRow
                        key={item.id}
                        item={item}
                        onRemove={() => onRemoveItem(item.id)}
                        onQtyChange={qty => onQtyChange(item.id, qty)}
                      />
                    ))}
                  </div>
                </PackageDropZone>
              </SortableContext>

              {/* Mobile: Artikel hinzufügen */}
              <div className="lg:hidden mt-4 shrink-0 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Artikel hinzufügen
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={invSearch}
                    onChange={e => setInvSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {filteredInv.filter(i => !addedIds.has(i.id)).map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => onAddItem(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeId && overlayLabel && (
              <div className="px-3 py-2 rounded-lg border border-primary/60 bg-card shadow-2xl text-sm font-medium text-foreground opacity-95 pointer-events-none">
                {overlayLabel}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </SheetContent>
    </Sheet>
  );
}

// ─── Paket-Karte ──────────────────────────────────────────────────────────────

function PackageCard({ pkg, onOpen, onEdit, onDelete }: {
  pkg: PackageWithItems;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const IconComp = getIcon(pkg.icon);
  const totalQty = pkg.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all duration-150 group relative overflow-hidden"
      onClick={onOpen}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: pkg.color }}
      />
      <CardHeader className="pb-2 p-4 pt-5">
        <div className="flex items-start gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: pkg.color + '25' }}
          >
            <IconComp className="h-5 w-5" style={{ color: pkg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">{pkg.name}</CardTitle>
            {pkg.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0 active:scale-95 transition-transform"
              onClick={e => { e.stopPropagation(); onEdit(); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive active:scale-95 transition-transform"
              onClick={e => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {pkg.items.length} Artikel
          </Badge>
          {totalQty > 0 && (
            <Badge variant="secondary" className="text-[10px]">{totalQty} Stück</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <span>Bearbeiten</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

interface PackagesPageProps {
  /** Wenn true: kein eigener Seitentitel (wird als Tab eingebettet) */
  embedded?: boolean;
}

export default function PackagesPage({ embedded = false }: PackagesPageProps) {
  const {
    packages, loading, inventoryItems,
    createPackage, updatePackage, deletePackage,
    addItemToPackage, updatePackageItemQuantity,
    removeItemFromPackage, reorderPackageItems,
  } = usePackages();
  const { toast } = useToast();

  const [formOpen,  setFormOpen]  = useState(false);
  const [editPkg,   setEditPkg]   = useState<PackageWithItems | null>(null);
  const [editorPkg, setEditorPkg] = useState<PackageWithItems | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [search,    setSearch]    = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  }, [packages, search]);

  // Editor immer mit frischen Daten aus dem Hook versorgen
  const editorData = editorPkg ? packages.find(p => p.id === editorPkg.id) ?? null : null;

  const handleCreate = async (data: PackageFormData) => {
    await createPackage(data);
    toast({ title: 'Paket erstellt', description: `"${data.name}" wurde angelegt.` });
  };

  const handleUpdate = async (data: PackageFormData) => {
    if (!editPkg) return;
    await updatePackage(editPkg.id, data);
    toast({ title: 'Paket aktualisiert' });
    setEditPkg(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Erst alle project_packages-Einträge + deren project_items entfernen
    const { data: ppRows } = await supabase
      .from('project_packages')
      .select('id')
      .eq('package_id', deleteId);

    if (ppRows && ppRows.length > 0) {
      const ppIds = ppRows.map((r: any) => r.id);
      await supabase.from('project_items').delete().in('package_instance_id', ppIds);
      await supabase.from('project_packages').delete().eq('package_id', deleteId);
    }

    await deletePackage(deleteId);
    toast({ title: 'Paket gelöscht' });
    if (editorPkg?.id === deleteId) setEditorPkg(null);
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {!embedded && <div className="flex justify-between"><Skeleton className="h-8 w-32" /></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Suchfeld — nur sichtbar wenn Pakete vorhanden */}
        {packages.length > 0 ? (
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pakete durchsuchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        ) : (
          <div /> /* Platzhalter damit Button rechts bleibt */
        )}

        <Button onClick={() => setFormOpen(true)} className="gap-1.5 h-9 shrink-0 active:scale-95 transition-transform">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Neues Paket</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* ── Desktop-Infopanel (nur wenn embedded) + Pakete-Grid ── */}
      <div className={cn(embedded && "lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start")}>

        {/* Haupt-Content */}
        <div className="space-y-4">
          {/* Leer-State */}
          {packages.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <Layers className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Noch keine Pakete erstellt</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Erstelle wiederverwendbare Vorlagen wie „DJ-Set" oder „Licht-Basic" und füge sie dann deinen Projekten hinzu.
                </p>
                <Button className="mt-4 gap-1.5" size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Erstes Paket erstellen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Keine Suchergebnisse */}
          {packages.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Search className="h-8 w-8 opacity-20" />
              <p className="text-sm">Keine Pakete für „{search}"</p>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filtered.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onOpen={() => setEditorPkg(pkg)}
                  onEdit={() => setEditPkg(pkg)}
                  onDelete={() => setDeleteId(pkg.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar-Info (nur Desktop + embedded) */}
        {embedded && (
          <div className="hidden lg:block space-y-3">
            <Card className="border-dashed">
              <CardContent className="p-5 text-center">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold">Was sind Pakete?</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Pakete sind wiederverwendbare Equipment-Vorlagen. Erstelle z.B. ein „DJ-Set" einmal und füge es dann beliebigen Projekten hinzu.
                </p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tipps</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex gap-2"><span className="text-primary shrink-0">→</span> Klicke auf ein Paket um Artikel hinzuzufügen</li>
                  <li className="flex gap-2"><span className="text-primary shrink-0">→</span> Auf Desktop per Drag & Drop befüllen</li>
                  <li className="flex gap-2"><span className="text-primary shrink-0">→</span> Ein Paket kann in beliebig vielen Projekten verwendet werden</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Dialoge & Sheets ── */}
      <PackageFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      {editPkg && (
        <PackageFormDialog
          open={!!editPkg}
          onClose={() => setEditPkg(null)}
          onSubmit={handleUpdate}
          initial={{
            name:        editPkg.name,
            description: editPkg.description ?? '',
            color:       editPkg.color,
            icon:        editPkg.icon,
          }}
        />
      )}

      <PackageEditorSheet
        pkg={editorData}
        open={!!editorPkg}
        onClose={() => setEditorPkg(null)}
        inventoryItems={inventoryItems}
        onAddItem={(id, qty) => editorData ? addItemToPackage(editorData.id, id, qty) : Promise.resolve()}
        onRemoveItem={removeItemFromPackage}
        onQtyChange={updatePackageItemQuantity}
        onReorder={reorderPackageItems}
      />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Paket löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Paket wird unwiderruflich gelöscht. Projekte, die dieses Paket bereits verwenden, behalten ihre Artikel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
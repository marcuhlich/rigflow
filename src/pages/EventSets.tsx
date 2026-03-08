import { useState, useMemo } from "react";
import {
  Plus, Package, Trash2, Edit2, ChevronRight, Search, AlertTriangle, Check,
  Star, CalendarDays, FileText, StickyNote, ArrowUpDown, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { exportEventSetPDF } from "@/lib/exportUtils";

// ─── Set Form Dialog ────────────────────────────────────────────────────────
function SetForm({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; dateStart: string | null; dateEnd: string | null; notes: string | null }) => Promise<void>;
  initial?: { name: string; description: string; dateStart: string | null; dateEnd: string | null; notes: string | null };
}) {
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.description || "");
  const [dateStart, setDateStart] = useState<Date | undefined>(initial?.dateStart ? new Date(initial.dateStart) : undefined);
  const [dateEnd, setDateEnd] = useState<Date | undefined>(initial?.dateEnd ? new Date(initial.dateEnd) : undefined);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial?.name || "");
    setDesc(initial?.description || "");
    setDateStart(initial?.dateStart ? new Date(initial.dateStart) : undefined);
    setDateEnd(initial?.dateEnd ? new Date(initial.dateEnd) : undefined);
    setNotes(initial?.notes || "");
  }, [initial]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: desc.trim(),
        dateStart: dateStart ? format(dateStart, "yyyy-MM-dd") : null,
        dateEnd: dateEnd ? format(dateEnd, "yyyy-MM-dd") : null,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Set bearbeiten" : "Neues Set erstellen"}</DialogTitle>
          <DialogDescription>
            {initial ? "Ändere die Details dieses Sets." : "Gib einen Namen und optional weitere Details an."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="z.B. DJ Setup Hochzeit" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Beschreibung</Label>
            <Input placeholder="Kurze Beschreibung (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Startdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !dateStart && "text-muted-foreground")}>
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    {dateStart ? format(dateStart, "dd.MM.yyyy") : "Wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateStart} onSelect={setDateStart} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Enddatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !dateEnd && "text-muted-foreground")}>
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    {dateEnd ? format(dateEnd, "dd.MM.yyyy") : "Wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateEnd} onSelect={setDateEnd} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notizen</Label>
            <Textarea placeholder="Zusätzliche Notizen..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
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

// ─── Item Picker ────────────────────────────────────────────────────────────
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Artikel hinzufügen</SheetTitle>
          <SheetDescription>Wähle Artikel aus deinem Inventar.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Artikel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine passenden Artikel.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category} · {item.location} · Bestand: {item.quantity}</p>
                  </div>
                  <Input
                    type="number" min={1} max={item.quantity}
                    value={quantities[item.id] || 1}
                    onChange={(e) => setQuantities({ ...quantities, [item.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => onAdd(item.id, quantities[item.id] || 1)}>
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

// ─── Set Detail Sheet ───────────────────────────────────────────────────────
function SetDetailSheet({ set, open, onClose, onUpdateQty, onRemoveItem, onAddItem, inventoryItems, onExportPDF }: {
  set: EventSetWithItems | null;
  open: boolean;
  onClose: () => void;
  onUpdateQty: (setItemId: string, qty: number) => Promise<void>;
  onRemoveItem: (setItemId: string) => Promise<void>;
  onAddItem: (setId: string, itemId: string, qty: number) => Promise<void>;
  inventoryItems: InventoryItem[];
  onExportPDF: (set: EventSetWithItems) => void;
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
            {/* Date range */}
            {(set.event_date_start || set.event_date_end) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {set.event_date_start && format(new Date(set.event_date_start), "dd.MM.yyyy", { locale: de })}
                {set.event_date_start && set.event_date_end && " – "}
                {set.event_date_end && format(new Date(set.event_date_end), "dd.MM.yyyy", { locale: de })}
              </div>
            )}

            {/* Notes */}
            {set.notes && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <StickyNote className="h-3 w-3" />
                  <span className="font-medium">Notizen</span>
                </div>
                <p className="whitespace-pre-wrap">{set.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{set.items.length} Artikel</Badge>
                <Badge variant="secondary">{totalItems} Stück</Badge>
                {allAvailable ? (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    <Check className="h-3 w-3 mr-1" /> Verfügbar
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Nicht vollständig verfügbar
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onExportPDF(set)}>
                <Download className="h-3 w-3" /> PDF
              </Button>
            </div>
            {!allAvailable && (
              <p className="text-xs text-muted-foreground">
                Mindestens ein Artikel ist im selben Zeitraum bereits in anderen Sets eingeplant oder aktuell verliehen.
              </p>
            )}

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
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                          <span>{si.item_category}</span>
                          {si.item_location && <span>· {si.item_location}</span>}
                          {insufficient && (
                            <span className="basis-full text-destructive flex items-start gap-1 leading-tight break-words">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                Nur {si.available_quantity} verfügbar
                                {(si.reserved_by_other_quantity ?? 0) > 0
                                  ? ` – ${si.reserved_by_other_quantity} bereits in anderen Sets im gleichen Zeitraum eingeplant.`
                                  : " – Rest ist bereits eingeplant oder verliehen."}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Input
                        type="number" min={1} value={si.quantity}
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

// ─── Main Page ──────────────────────────────────────────────────────────────
type SortKey = "name" | "date" | "created";

export default function EventSetsPage() {
  const { sets, loading, inventoryItems, createSet, updateSet, deleteSet, toggleFavorite, addItemToSet, updateSetItemQuantity, removeItemFromSet } = useEventSets();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editSet, setEditSet] = useState<EventSetWithItems | null>(null);
  const [detailSet, setDetailSet] = useState<EventSetWithItems | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created");

  const handleCreate = async (data: { name: string; description: string; dateStart: string | null; dateEnd: string | null; notes: string | null }) => {
    await createSet(data.name, data.description, data.dateStart, data.dateEnd, data.notes);
    toast({ title: "Set erstellt", description: `"${data.name}" wurde erstellt.` });
  };

  const handleUpdate = async (data: { name: string; description: string; dateStart: string | null; dateEnd: string | null; notes: string | null }) => {
    if (!editSet) return;
    await updateSet(editSet.id, {
      name: data.name,
      description: data.description,
      event_date_start: data.dateStart,
      event_date_end: data.dateEnd,
      notes: data.notes,
    });
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

  const handleExportPDF = (set: EventSetWithItems) => {
    exportEventSetPDF(set);
    toast({ title: "PDF erstellt", description: "Packliste wurde heruntergeladen." });
  };

  // Filter & sort
  const filteredSets = useMemo(() => {
    let result = sets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q)
      );
    }
    // Favorites first, then sort
    result = [...result].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") {
        const da = a.event_date_start || "";
        const db = b.event_date_start || "";
        return da.localeCompare(db) || a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [sets, searchQuery, sortBy]);

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

      {/* Search & Sort */}
      {sets.length > 0 && (
        <>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sets durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-auto h-9 text-xs gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Neueste zuerst</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="date">Datum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            „Nicht vollständig verfügbar“ / „Teilweise reserviert“ bedeutet: Artikel sind im gleichen Zeitraum bereits in anderen Sets eingeplant oder verliehen. „Nur X verfügbar“ zeigt den noch freien Restbestand.
          </p>
        </>
      )}

      {filteredSets.length === 0 && sets.length === 0 ? (
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
      ) : filteredSets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Keine Sets gefunden für „{searchQuery}"</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredSets.map((set) => {
            const totalItems = set.items.reduce((s, i) => s + i.quantity, 0);
            const allAvailable = set.items.length > 0 && set.items.every((i) => (i.available_quantity || 0) >= i.quantity);
            return (
              <Card
                key={set.id}
                className="cursor-pointer hover:border-primary/40 transition-colors group relative"
                onClick={() => setDetailSet(set)}
              >
                {/* Favorite button */}
                <button
                  className="absolute top-3 right-3 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(set.id); }}
                >
                  <Star className={cn("h-4 w-4 transition-colors", set.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400")} />
                </button>

                <CardHeader className="pb-2 p-4 pr-10">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm sm:text-base font-semibold truncate pr-2">{set.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditSet(set); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(set.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {set.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{set.description}</p>
                  )}

                  {/* Date */}
                  {set.event_date_start && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(set.event_date_start), "dd.MM.yyyy")}
                      {set.event_date_end && ` – ${format(new Date(set.event_date_end), "dd.MM.yyyy")}`}
                    </div>
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
                          <AlertTriangle className="h-2.5 w-2.5" /> Teilweise reserviert
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <span>Details</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create */}
      <SetForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />

      {/* Edit */}
      {editSet && (
        <SetForm
          open={!!editSet}
          onClose={() => setEditSet(null)}
          onSubmit={handleUpdate}
          initial={{
            name: editSet.name,
            description: editSet.description || "",
            dateStart: editSet.event_date_start,
            dateEnd: editSet.event_date_end,
            notes: editSet.notes,
          }}
        />
      )}

      {/* Detail */}
      <SetDetailSheet
        set={currentDetail}
        open={!!currentDetail}
        onClose={() => setDetailSet(null)}
        onUpdateQty={updateSetItemQuantity}
        onRemoveItem={removeItemFromSet}
        onAddItem={addItemToSet}
        inventoryItems={inventoryItems}
        onExportPDF={handleExportPDF}
      />

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set löschen?</AlertDialogTitle>
            <AlertDialogDescription>Dieses Set wird unwiderruflich gelöscht. Deine Inventarartikel bleiben erhalten.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InventoryItem } from "@/types/inventory";
import { PackageItem, PackageWithItems } from "@/types/project";
import { PackageGlyph } from "./PackageGlyph";
import {
  DragData, DraggableInventoryRow, InventoryPickRow, PackageDropZone, SortablePackageItemRow,
} from "./editorRows";

interface Props {
  pkg: PackageWithItems | null;
  open: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  /** All callbacks may reject; errors are already toasted by usePackages. */
  onAddItem: (packageId: string, inventoryItemId: string) => Promise<void>;
  onRemoveItem: (packageItemId: string) => Promise<void>;
  onQtyChange: (packageItemId: string, qty: number) => Promise<void>;
  onReorder: (packageId: string, orderedIds: string[]) => Promise<void>;
}

export function PackageEditorSheet({ pkg, open, onClose, ...rest }: Props) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-4xl">
        {pkg ? (
          <EditorBody key={pkg.id} pkg={pkg} {...rest} />
        ) : (
          <SheetHeader className="px-5 py-4">
            <SheetTitle>{t("packages.package_header")}</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({ pkg, inventoryItems, onAddItem, onRemoveItem, onQtyChange, onReorder }: Omit<Props, "pkg" | "open" | "onClose"> & { pkg: PackageWithItems }) {
  const { t } = useTranslation();
  const [invSearch, setInvSearch]   = useState("");
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [overId, setOverId]         = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<PackageItem[]>(pkg.items);
  const [adding, setAdding]         = useState<Set<string>>(() => new Set());

  // Keep the optimistic order in sync with fresh hook data.
  useEffect(() => { setLocalItems(pkg.items); }, [pkg.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const addedIds = useMemo(() => new Set(localItems.map(i => i.inventory_item_id)), [localItems]);
  const filteredInv = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    if (!q) return inventoryItems;
    return inventoryItems.filter(i =>
      i.name.toLowerCase().includes(q) || (i.category ?? "").toLowerCase().includes(q),
    );
  }, [inventoryItems, invSearch]);
  const addable = useMemo(() => filteredInv.filter(i => !addedIds.has(i.id)), [filteredInv, addedIds]);

  const addItem = async (inventoryItemId: string) => {
    if (adding.has(inventoryItemId) || addedIds.has(inventoryItemId)) return;
    setAdding(prev => new Set(prev).add(inventoryItemId));
    try {
      await onAddItem(pkg.id, inventoryItemId);
    } catch {
      /* toasted by hook */
    } finally {
      setAdding(prev => { const next = new Set(prev); next.delete(inventoryItemId); return next; });
    }
  };

  const removeItem = (id: string) => { onRemoveItem(id).catch(() => undefined); };
  const changeQty = (id: string, qty: number) => { onQtyChange(id, qty).catch(() => undefined); };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragOver  = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);
  const handleDragCancel = () => { setActiveId(null); setOverId(null); };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current as DragData | undefined;
    const overData   = over.data.current as DragData | undefined;

    if (activeData?.type === "inventory") {
      if (overData?.type === "package-zone" || overData?.type === "package-item") void addItem(activeData.item.id);
      return;
    }

    if (activeData?.type === "package-item" && overData?.type === "package-item") {
      const oldIdx = localItems.findIndex(i => i.id === active.id);
      const newIdx = localItems.findIndex(i => i.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(localItems, oldIdx, newIdx);
      setLocalItems(reordered);
      onReorder(pkg.id, reordered.map(i => i.id)).catch(() => setLocalItems(pkg.items));
    }
  };

  const draggingInventory = !!activeId?.startsWith("inv-");
  const isOverZone = draggingInventory && (overId === `drop-${pkg.id}` || localItems.some(i => i.id === overId));
  const overlayLabel = draggingInventory
    ? inventoryItems.find(i => `inv-${i.id}` === activeId)?.name
    : localItems.find(i => i.id === activeId)?.item_name;
  const totalQty = localItems.reduce((s, i) => s + (i.quantity ?? 0), 0);

  return (
    <>
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
        <SheetTitle className="flex items-center gap-3 text-base">
          <PackageGlyph icon={pkg.icon} color={pkg.color} />
          <span className="min-w-0 truncate">{pkg.name}</span>
        </SheetTitle>
        <SheetDescription className="flex flex-wrap gap-x-3 text-xs">
          <span>
            <span className="tech text-foreground">{localItems.length}</span> {t("packages.col_items")}
          </span>
          <span>
            <span className="tech text-foreground">{totalQty}</span> {t("packages.col_quantity")}
          </span>
          {pkg.description && <span className="basis-full pt-1 text-[13px]">{pkg.description}</span>}
        </SheetDescription>
      </SheetHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* Inventory (desktop, draggable) */}
          <section className="hidden w-80 shrink-0 flex-col border-r border-border bg-surface-sunken/40 lg:flex">
            <div className="space-y-2 border-b border-border p-3">
              <p className="eyebrow">{t("packages.inventory_header")}</p>
              <SearchField value={invSearch} onChange={setInvSearch} />
              <p className="text-[11px] text-muted-foreground">{t("packages.inventory_hint")}</p>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {filteredInv.map(item => (
                <DraggableInventoryRow
                  key={item.id}
                  item={item}
                  alreadyAdded={addedIds.has(item.id)}
                  busy={adding.has(item.id)}
                  onAdd={() => void addItem(item.id)}
                />
              ))}
            </ul>
            {filteredInv.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("packages.no_results")}</p>
            )}
          </section>

          {/* Package content */}
          <section className="flex flex-col p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-5">
            <p className="eyebrow mb-2">{t("packages.package_header")}</p>
            <SortableContext items={localItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <PackageDropZone packageId={pkg.id} isOver={isOverZone}>
                {localItems.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-1 px-4 text-center">
                    {isOverZone ? (
                      <p className="text-xs font-medium text-primary">{t("packages.drop_here")}</p>
                    ) : (
                      <>
                        <Package className="mb-1 h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                        <p className="text-[13px] font-medium">{t("packages.package_empty")}</p>
                        <p className="hidden text-xs text-muted-foreground lg:block">{t("packages.package_empty_mobile")}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg">
                    {localItems.map(item => (
                      <SortablePackageItemRow
                        key={item.id}
                        item={item}
                        onRemove={() => removeItem(item.id)}
                        onQtyChange={qty => changeQty(item.id, qty)}
                      />
                    ))}
                  </ul>
                )}
              </PackageDropZone>
            </SortableContext>
          </section>

          {/* Mobile: add items */}
          <section className="space-y-2 border-t border-border p-4 lg:hidden">
            <p className="eyebrow">{t("packages.add_items")}</p>
            <SearchField value={invSearch} onChange={setInvSearch} />
            {addable.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("packages.no_results")}</p>
            ) : (
              <ul className="surface divide-y divide-border overflow-hidden">
                {addable.map(item => (
                  <InventoryPickRow
                    key={item.id}
                    item={item}
                    busy={adding.has(item.id)}
                    onAdd={() => void addItem(item.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeId && overlayLabel ? (
            <div className="pointer-events-none rounded-md border border-border-strong bg-popover px-3 py-2 text-sm font-medium shadow-md">
              {overlayLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={t("common.search")}
        placeholder={t("packages.inventory_search")}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 pl-8 text-[13px]"
      />
    </div>
  );
}

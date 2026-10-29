import { KeyboardEvent, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryItem } from "@/types/inventory";
import { PackageItem } from "@/types/project";
import { cn } from "@/lib/utils";

export type DragData =
  | { type: "package-item"; item: PackageItem }
  | { type: "inventory"; item: InventoryItem }
  | { type: "package-zone"; packageId: string };

/** Quantity field that commits on blur / Enter instead of writing to the DB on every keystroke. */
function QuantityInput({ value, onCommit }: { value: number; onCommit: (qty: number) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const qty = Math.max(1, parseInt(draft, 10) || 1);
    setDraft(String(qty));
    if (qty !== value) onCommit(qty);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") { setDraft(String(value)); e.currentTarget.blur(); }
  };

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      aria-label={t("packages.qty_label")}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPointerDown={e => e.stopPropagation()}
      className="tech h-8 w-16 px-2 text-right"
    />
  );
}

export function SortablePackageItemRow({ item, onRemove, onQtyChange }: {
  item: PackageItem;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "package-item", item } satisfies DragData,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex select-none items-center gap-2 bg-card px-2 py-2",
        isDragging && "relative z-10 opacity-40",
      )}
    >
      <button
        type="button"
        aria-label={t("packages.drag_handle")}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.item_name ?? t("packages.unknown")}</p>
        {(item.item_category || item.item_location) && (
          <p className="truncate text-xs text-muted-foreground">
            {[item.item_category, item.item_location].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <QuantityInput value={item.quantity} onCommit={onQtyChange} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t("packages.remove_item")}
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

export function DraggableInventoryRow({ item, alreadyAdded, busy, onAdd }: {
  item: InventoryItem;
  alreadyAdded: boolean;
  busy: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inv-${item.id}`,
    data: { type: "inventory", item } satisfies DragData,
    disabled: alreadyAdded,
  });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex select-none items-center gap-2 px-2 py-1.5",
        alreadyAdded && "text-muted-foreground",
        isDragging && "opacity-30",
      )}
    >
      {alreadyAdded ? (
        <span className="flex h-7 w-6 shrink-0 items-center justify-center" title={t("packages.already_added")}>
          <Check className="h-3.5 w-3.5 text-success" />
        </span>
      ) : (
        <button
          type="button"
          aria-label={t("packages.drag_handle")}
          className="flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.category}</p>
      </div>
      {!alreadyAdded && <AddButton busy={busy} onAdd={onAdd} />}
    </li>
  );
}

/** Mobile picker row: no drag, just an add button. */
export function InventoryPickRow({ item, busy, onAdd }: { item: InventoryItem; busy: boolean; onAdd: () => void }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.category}</p>
      </div>
      <AddButton busy={busy} onAdd={onAdd} outline />
    </li>
  );
}

function AddButton({ busy, onAdd, outline }: { busy: boolean; onAdd: () => void; outline?: boolean }) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      size="icon"
      variant={outline ? "outline" : "ghost"}
      aria-label={t("packages.add_item")}
      disabled={busy}
      className="h-8 w-8 shrink-0"
      onClick={onAdd}
    >
      <Plus />
    </Button>
  );
}

export function PackageDropZone({ packageId, isOver, children }: {
  packageId: string;
  isOver: boolean;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `drop-${packageId}`,
    data: { type: "package-zone", packageId } satisfies DragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[8rem] rounded-lg border transition-colors",
        isOver ? "border-dashed border-primary bg-primary/5" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

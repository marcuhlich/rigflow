import React, { useState } from "react";
import { Pencil, Trash2, MoreVertical, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { InventoryContextMenu } from "@/components/InventoryContextMenu";
import { EventSetWithItems } from "@/types/eventSet";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  selectionMode?: boolean;

  onUpdateItem?: (
    id: string,
    updates: Partial<Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">>
  ) => Promise<void>;

  onAddItem?: (
    item: Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;

  eventSets?: EventSetWithItems[];

  onAddToSet?: (
    setId: string,
    itemId: string,
    quantity: number
  ) => Promise<void>;

  onFilterCategory?: (category: string) => void;
}

export const InventoryTable = React.memo(function InventoryTable({
  items,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = new Set(),
  onToggleSelection,
  selectionMode = false,
  onUpdateItem,
  onAddItem,
  eventSets,
  onAddToSet,
  onFilterCategory,
}: InventoryTableProps) {
  const [qrItemId, setQrItemId] = useState<string | null>(null);
  const qrItem = items.find((i) => i.id === qrItemId);

  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted/30">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Keine Items gefunden</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Füge dein erstes Item hinzu oder ändere die Filter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              {selectionMode && (
                <TableHead className="w-[40px]" />
              )}
              <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kategorie</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-center">Menge</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Zustand</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Standort</TableHead>
              {!selectionMode && (
                <TableHead className="w-[60px]" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);

              // FIX: InventoryContextMenu wraps the TableRow as children so the
              // ContextMenuTrigger has an element to attach to. No duplicate
              // TableRow inside DropdownMenuTrigger anymore — that was invalid HTML
              // (a <tr> inside a <td>) and broke the entire table layout.
              // The dropdown trigger is now a simple icon Button inside a TableCell.
              // Optional props get no-op fallbacks so InventoryContextMenu always
              // receives the required non-optional props it expects.
              return (
                <InventoryContextMenu
                  key={item.id}
                  item={item}
                  onUpdateItem={onUpdateItem ?? (async () => {})}
                  onAddItem={onAddItem ?? (async () => {})}
                  eventSets={eventSets ?? []}
                  onAddToSet={onAddToSet ?? (async () => {})}
                  onFilterCategory={onFilterCategory ?? (() => {})}
                >
                  <TableRow
                    className={cn(
                      "border-border/30 transition-colors hover:bg-muted/20",
                      isSelected && "bg-primary/5 hover:bg-primary/10",
                      selectionMode && "cursor-pointer"
                    )}
                    onClick={() => selectionMode && onToggleSelection?.(item.id)}
                  >
                    {selectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelection?.(item.id)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                    )}

                    <TableCell
                      className={cn(
                        "font-medium",
                        !selectionMode && "cursor-pointer hover:opacity-70 transition-opacity"
                      )}
                      onClick={(e) => {
                        if (selectionMode) return;
                        e.stopPropagation();
                        onViewDetails?.(item.id);
                      }}
                    >
                      {item.name}
                    </TableCell>

                    <TableCell className="text-muted-foreground">{item.category}</TableCell>

                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-muted/50 font-medium">
                        {item.quantity}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge condition={item.condition} />
                    </TableCell>

                    <TableCell className="text-muted-foreground">{item.location}</TableCell>

                    {!selectionMode && (
                      // stopPropagation so clicking the dropdown doesn't also
                      // trigger the row's onClick (selectionMode guard above).
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-border/50">
                            <DropdownMenuItem onClick={() => setQrItemId(item.id)}>
                              <QrCode className="h-4 w-4 mr-2" /> QR-Code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Pencil className="h-4 w-4 mr-2" /> Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(item.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                </InventoryContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {qrItem && (
        <QRCodeDisplay
          isOpen={!!qrItemId}
          onClose={() => setQrItemId(null)}
          itemId={qrItem.id}
          itemName={qrItem.name}
          itemDetails={{
            category: qrItem.category,
            quantity: qrItem.quantity,
            location: qrItem.location,
          }}
          size="md"
        />
      )}
    </>
  );
});
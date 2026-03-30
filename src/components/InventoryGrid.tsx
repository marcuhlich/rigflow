import React, { useState } from "react";
import { Pencil, Trash2, MapPin, User, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryItem } from "@/types/inventory";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface InventoryGridProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  selectionMode?: boolean;
}

export const InventoryGrid = React.memo(function InventoryGrid({
  items,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = new Set(),
  onToggleSelection,
  selectionMode = false,
}: InventoryGridProps) {
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
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "glass-card group relative flex flex-col overflow-hidden",
                "transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
            >
              {/* Checkbox – nur im selectionMode */}
              {selectionMode && (
                <div className="absolute top-2.5 left-2.5 z-20">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection?.(item.id)}
                    className="h-5 w-5 shadow"
                  />
                </div>
              )}

              {/*
                Hover-Action-Overlay
                – NUR auf Desktop (max-sm:hidden)
                – NUR wenn NICHT selectionMode
                – absolut positioniert → verändert NIE die Kachelhöhe
                – opacity-transition statt translate → kein Layout-Shift
              */}
              {!selectionMode && (
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 z-10 max-sm:hidden",
                    "flex items-center justify-end gap-0.5 px-2 py-1.5",
                    "bg-gradient-to-t from-background/95 via-background/60 to-transparent",
                    "opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setQrItemId(item.id); }}
                    title="QR-Code"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    title="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/60 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    title="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Card Content */}
              <div
                className={cn(
                  "flex flex-col flex-1 p-3 sm:p-4 cursor-pointer",
                  // Auf Desktop genug Abstand unten, damit der Hover-Overlay den Text nicht überlagert.
                  // Dieser Abstand ist immer da (egal ob hover oder nicht) → keine Höhenänderung.
                  !selectionMode && "sm:pb-9"
                )}
                onClick={() =>
                  selectionMode
                    ? onToggleSelection?.(item.id)
                    : onViewDetails?.(item.id)
                }
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-24 object-cover rounded-md mb-2"
                    loading="lazy"
                  />
                )}

                <div className={cn("flex items-start justify-between gap-2 mb-2", selectionMode && "pl-7")}>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate text-sm sm:text-base leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                  </div>
                  <StatusBadge condition={item.condition} />
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[100px]">{item.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3 shrink-0" />
                    {item.quantity}×
                  </span>
                  {item.unit_price != null && (
                    <span className="ml-auto font-medium text-foreground/70">
                      {item.unit_price.toFixed(2)} €
                    </span>
                  )}
                </div>

                {item.condition === "verliehen" && item.lent_to && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-warning">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {item.lent_to}
                      {item.lent_until && (
                        <> bis {format(new Date(item.lent_until), "dd.MM.yy", { locale: de })}</>
                      )}
                    </span>
                  </div>
                )}

                {item.dmx_start_address && (
                  <div className="mt-2 text-xs text-primary/80 bg-primary/10 rounded px-2 py-0.5 inline-block w-fit">
                    DMX U{item.dmx_universe || 1}/{item.dmx_start_address}–
                    {(item.dmx_start_address || 0) + (item.dmx_channels || 1) - 1}
                  </div>
                )}

                {item.notes && (
                  <p className="text-muted-foreground text-xs line-clamp-2 mt-2 pt-2 border-t border-border/30">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
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
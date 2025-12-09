import React, { useState } from "react";
import { Pencil, Trash2, MapPin, User, Package, QrCode, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryItem, CONDITION_LABELS } from "@/types/inventory";
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
  const qrItem = items.find(i => i.id === qrItemId);

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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          
          return (
            <div
              key={item.id}
              className={cn(
                "glass-card p-3 sm:p-4 hover:shadow-md transition-all duration-200 flex flex-col relative",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
            >
              {selectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection?.(item.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}
              
              <div 
                className={cn(
                  "flex items-start justify-between gap-2 mb-3",
                  selectionMode && "pl-7"
                )}
              >
                <div 
                  className="flex-1 min-w-0 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => selectionMode ? onToggleSelection?.(item.id) : onViewDetails?.(item.id)}
                >
                  <h3 className="font-semibold truncate text-sm sm:text-base">{item.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.category}</p>
                </div>
                <StatusBadge condition={item.condition} />
              </div>

              <div className="space-y-2 text-xs sm:text-sm flex-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Menge: {item.quantity}</span>
                  {item.unit_price && (
                    <span className="ml-auto">{item.unit_price.toFixed(2)} €</span>
                  )}
                </div>

                {item.condition === 'verliehen' && item.lent_to && (
                  <div className="flex items-center gap-2 text-warning">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate text-xs">
                      Verliehen: {item.lent_to}
                      {item.lent_until && (
                        <> bis {format(new Date(item.lent_until), "dd.MM.yyyy", { locale: de })}</>
                      )}
                    </span>
                  </div>
                )}

                {item.dmx_start_address && (
                  <div className="text-xs text-primary/80 bg-primary/10 rounded px-2 py-1 inline-block">
                    DMX: U{item.dmx_universe || 1}/{item.dmx_start_address}-{(item.dmx_start_address || 0) + (item.dmx_channels || 1) - 1}
                  </div>
                )}

                {item.notes && (
                  <p className="text-muted-foreground text-xs line-clamp-2 pt-1 border-t border-border/30">
                    {item.notes}
                  </p>
                )}
              </div>

              <div className="flex gap-1 sm:gap-2 mt-4 pt-3 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQrItemId(item.id)}
                  className="flex-1 text-xs sm:text-sm px-1 sm:px-2"
                  title="QR-Code anzeigen"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">QR</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item)}
                  className="flex-1 text-xs sm:text-sm px-1 sm:px-2"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="text-destructive hover:text-destructive px-1 sm:px-2"
                  title="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Display Modal */}
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

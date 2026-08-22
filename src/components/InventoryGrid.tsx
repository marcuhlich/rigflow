import React, { useState, useRef } from "react";
import { Pencil, Trash2, MapPin, User, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryItem } from "@/types/inventory";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { InventoryContextMenu } from "@/components/InventoryContextMenu";
import { hapticFeedback } from "@/lib/utils";
import { hapticStop, hapticLongPress } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from 'react-i18next';

const LONG_PRESS_MS = 1000;

interface InventoryGridProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  selectionMode?: boolean;
  onUpdateItem: (id: string, updates: Partial<Omit<InventoryItem, "id"|"user_id"|"created_at"|"updated_at">>) => Promise<void>;
  onAddItem: (item: Omit<InventoryItem, "id"|"user_id"|"created_at"|"updated_at">) => Promise<void>;
  onFilterCategory: (category: string) => void;
  onEnterSelectionMode?: (firstItemId: string) => void;
  // Empty state
  searchQuery?: string;
  hasActiveFilters?: boolean;
  onAddItemClick?: () => void;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
}

export const InventoryGrid = React.memo(function InventoryGrid({
  items,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = new Set(),
  onToggleSelection,
  selectionMode = false,
  onUpdateItem,
  onAddItem,
  onFilterCategory,
  onEnterSelectionMode,
  searchQuery = "",
  hasActiveFilters = false,
  onAddItemClick,
  onClearFilters,
  onClearSearch,
}: InventoryGridProps) {
  const [qrItemId, setQrItemId] = useState<string | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartPos = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);
  const pressPosRef = useRef<{ x: number; y: number } | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const hapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('de') ? de : enUS;

  const qrItem = items.find((i) => i.id === qrItemId);

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (animTimer.current) clearTimeout(animTimer.current);
    if (hapticTimer.current) { clearTimeout(hapticTimer.current); hapticTimer.current = null; }
    pressTimer.current = null;
    animTimer.current = null;
    pressStartPos.current = null;
    setPressingId(null);
    hapticStop();
  };

  const handlePointerDown = (e: React.PointerEvent, item: InventoryItem) => {
    if (selectionMode) return;
    if (e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    pressPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    didLongPress.current = false;
    pressStartPos.current = { x: e.clientX, y: e.clientY };

    hapticTimer.current = setTimeout(() => {
      hapticLongPress(LONG_PRESS_MS - 150);
    }, 150);

    animTimer.current = setTimeout(() => setPressingId(item.id), 50);

    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      hapticFeedback(80);
      setPressingId(null);
      setCompletingId(item.id);
      setTimeout(() => {
        setCompletingId(null);
        onEnterSelectionMode?.(item.id);
      }, 300);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressStartPos.current) return;
    const dx = Math.abs(e.clientX - pressStartPos.current.x);
    const dy = Math.abs(e.clientY - pressStartPos.current.y);
    if (dx > 8 || dy > 8) cancelPress();
  };

  const handlePointerUp = () => cancelPress();
  const handlePointerLeave = () => cancelPress();

  if (items.length === 0) {
    if (searchQuery.trim()) {
      return (
        <EmptyState
          variant="search"
          searchQuery={searchQuery}
          onClearSearch={onClearSearch}
        />
      );
    }
    if (hasActiveFilters) {
      return (
        <EmptyState
          variant="filtered"
          onClearFilters={onClearFilters}
        />
      );
    }
    return (
      <EmptyState
        variant="empty"
        onAddItem={onAddItemClick}
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isPressing = pressingId === item.id;
          const isCompleting = completingId === item.id;

          return (
            <InventoryContextMenu
              key={item.id}
              item={item}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              onFilterCategory={onFilterCategory}
            >
              <div
                className={cn(
                  "glass-card group relative flex flex-col overflow-hidden select-none",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                )}
                style={{
                  transform: isPressing
                    ? "translateY(-12px) scale(1.04)"
                    : isCompleting
                    ? undefined
                    : "translateY(0) scale(1)",
                  boxShadow: isPressing
                    ? "0 24px 60px rgba(0,0,0,0.35), 0 0 40px hsl(var(--primary) / 0.35)"
                    : isCompleting
                    ? undefined
                    : undefined,
                  transition: isPressing
                    ? `transform 300ms cubic-bezier(0.2, 0, 0, 1), box-shadow 300ms ease`
                    : "transform 150ms ease, box-shadow 200ms ease",
                  animation: isCompleting
                    ? "longpress-bounce 450ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                    : undefined,
                  zIndex: isPressing || isCompleting ? 10 : undefined,
                  position: "relative",
                }}
                onPointerDown={(e) => handlePointerDown(e, item)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerLeave}
              >
                {isPressing && pressPosRef.current && (
                  <>
                    <span
                      className="pointer-events-none absolute z-20 rounded-full"
                      style={{
                        left: pressPosRef.current.x,
                        top: pressPosRef.current.y,
                        width: 0,
                        height: 0,
                        transform: "translate(-50%, -50%)",
                        background: "radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 70%)",
                        animation: `longpress-ripple ${LONG_PRESS_MS - 100}ms ease-out forwards`,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
                      style={{
                        background: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.12) 0%, transparent 75%)",
                        animation: `longpress-glow ${LONG_PRESS_MS - 100}ms ease-out forwards`,
                        opacity: 0,
                      }}
                    />
                  </>
                )}

                {selectionMode && (
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection?.(item.id)}
                      className="h-5 w-5 shadow"
                    />
                  </div>
                )}

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
                      title={t('common.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/60 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div
                  className={cn(
                    "flex flex-col flex-1 p-3 sm:p-4 cursor-pointer",
                    !selectionMode && "sm:pb-9"
                  )}
                  onClick={() => {
                    cancelPress();
                    if (didLongPress.current) { didLongPress.current = false; return; }
                    selectionMode
                      ? onToggleSelection?.(item.id)
                      : onViewDetails?.(item.id);
                  }}
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
                      <p className="text-xs text-muted-foreground uppercase truncate">{item.category}</p>
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
                          <> {t('inventory_grid.lent_until')} {format(new Date(item.lent_until), i18n.language.startsWith('de') ? 'dd.MM.yy' : 'MM/dd/yy', { locale: dateLocale })}</>
                        )}
                      </span>
                    </div>
                  )}

                  {item.dmx_start_address && (
                    <div className="dmx-badge mt-2 text-xs text-primary/80 bg-primary/10 rounded px-2 py-0.5 inline-block w-fit">
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
            </InventoryContextMenu>
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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem, ItemCondition, CONDITION_LABELS } from "@/types/inventory";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { EventSetWithItems } from "@/types/eventSet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  CalendarPlus,
  Copy,
  Filter,
  History,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
} from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────────────

interface InventoryContextMenuProps {
  item: InventoryItem;
  children: React.ReactNode;
  onUpdateItem: (
    id: string,
    updates: Partial<Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">>
  ) => Promise<void>;
  onAddItem: (
    item: Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  eventSets: EventSetWithItems[];
  onAddToSet: (setId: string, itemId: string, quantity: number) => Promise<void>;
  onFilterCategory: (category: string) => void;
}

// "verliehen" is intentionally excluded – managed via the Lending flow.
const CONDITION_OPTIONS: ItemCondition[] = ["verfügbar", "in-einsatz", "defekt"];

// ─── Shared class strings ────────────────────────────────────────────────────

const CONTENT_CLS =
  "w-60 border border-border bg-popover text-popover-foreground shadow-2xl";

const SUB_CONTENT_CLS =
  "border border-border bg-popover text-popover-foreground shadow-xl";

const ITEM_CLS =
  "gap-2 cursor-pointer focus:bg-muted focus:text-foreground data-[disabled]:opacity-40";

const SUBTRIGGER_CLS =
  "gap-2 cursor-pointer focus:bg-muted focus:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground";

const SEPARATOR_CLS = "bg-border";

const subContentProps = {
  avoidCollisions: true,
  collisionPadding: 12,
  sideOffset: -2,
} as const;

// ─── Quantity Popover ────────────────────────────────────────────────────────
//
// Rendered as a self-contained sub-component so it can manage its own draft
// state without polluting the parent. The popover opens via the pattern:
//
//   <ContextMenuItem onSelect={(e) => e.preventDefault()}>
//
// Calling e.preventDefault() tells Radix NOT to close the ContextMenu when
// this item is "selected", which lets the Popover open in its place.
// When the popover closes (onOpenChange → false) the draft value is committed.

interface QtyPopoverProps {
  item: InventoryItem;
  onCommit: (newQty: number) => Promise<void>;
}

function QtyPopover({ item, onCommit }: QtyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(item.quantity));

  const parsedDraft = Math.max(0, parseInt(draft, 10) || 0);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(String(item.quantity));
    }
  };

  const handleConfirm = async () => {
    if (parsedDraft !== item.quantity) {
      await onCommit(parsedDraft);
    }
    setOpen(false);
  };

  const adjustDraft = (delta: number) => setDraft(String(parsedDraft + delta));

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        Menge anpassen
        <span className="ml-auto text-xs text-muted-foreground">
          {item.quantity} Stk.
        </span>
      </ContextMenuSubTrigger>

      <ContextMenuSubContent className={`${SUB_CONTENT_CLS} w-52`} {...subContentProps}>
        {/* Header */}
        <div className="px-2 py-1 text-sm font-semibold border-b border-border">
          Menge anpassen
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 px-2 py-2">
          <Button variant="outline" size="icon" onClick={() => adjustDraft(-1)}><Minus /></Button>
          <Input
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleInputKey}
            className="h-8 text-center w-16"
          />
          <Button variant="outline" size="icon" onClick={() => adjustDraft(1)}><Plus /></Button>
        </div>

        {/* Quick buttons */}
        <div className="mt-0.5 flex gap-1.5 px-2">
          {[-10, -5, 5, 10].map((delta) => (
            <Button key={delta} variant="ghost" size="sm" className="flex-1 text-xs"
              onClick={() => adjustDraft(delta)}>
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>

        {/* Confirm */}
        <div className="mt-2 px-2 py-2">
          <Button className="w-full" onClick={handleConfirm}>Bestätigen</Button>
        </div>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InventoryContextMenu({
  item,
  children,
  onUpdateItem,
  onAddItem,
  eventSets,
  onAddToSet,
  onFilterCategory,
}: InventoryContextMenuProps) {
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);

  if (isMobile) return <>{children}</>;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleConditionChange = async (condition: ItemCondition) => {
    try {
      await onUpdateItem(item.id, { condition });
      toast({
        title: "Zustand geändert",
        description: `„${item.name}" → ${CONDITION_LABELS[condition]}`,
      });
    } catch {
      /* toast already shown by useInventory */
    }
  };

  const handleQuantityCommit = async (newQty: number) => {
    try {
      await onUpdateItem(item.id, { quantity: newQty });
      toast({
        title: "Menge angepasst",
        description: `„${item.name}": ${item.quantity} → ${newQty}`,
      });
    } catch {
      /* handled upstream */
    }
  };

  const handleDuplicate = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, user_id, created_at, updated_at, ...rest } = item;
    try {
      await onAddItem({ ...rest, name: `${item.name} (Kopie)` });
      toast({
        title: "Dupliziert",
        description: `„${item.name} (Kopie)" wurde erstellt.`,
      });
    } catch {
      /* handled upstream */
    }
  };

  const handleAddToSet = async (set: EventSetWithItems) => {
    try {
      await onAddToSet(set.id, item.id, 1);
      toast({
        title: "Zum Event hinzugefügt",
        description: `„${item.name}" wurde zu „${set.name}" hinzugefügt.`,
      });
    } catch {
      /* useEventSets already shows a toast on duplicate / error */
    }
  };

  const handleShowHistory = () => navigate(`/item/${item.id}`);

  const recentSets = (eventSets || []).slice(0, 5);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent
          className={CONTENT_CLS}
          style={{ borderRadius: 10 }}
          collisionPadding={12}
        >
          {/* Item name – non-interactive header */}
          <ContextMenuLabel className="truncate px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary/70">
            {item.name}
          </ContextMenuLabel>

          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 1. Zustand ────────────────────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <Activity className="h-4 w-4 text-primary shrink-0" />
              Zustand ändern
              <span className="ml-auto text-xs text-muted-foreground">
                {CONDITION_LABELS[item.condition]}
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              className={`${SUB_CONTENT_CLS} w-44`}
              {...subContentProps}
            >
              <ContextMenuRadioGroup
                value={item.condition}
                onValueChange={(v) => handleConditionChange(v as ItemCondition)}
              >
                {CONDITION_OPTIONS.map((val) => (
                  <ContextMenuRadioItem
                    key={val}
                    value={val}
                    className={ITEM_CLS}
                  >
                    {CONDITION_LABELS[val]}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 2. Menge – Popover stepper ────────────────────────────── */}
          <QtyPopover item={item} onCommit={handleQuantityCommit} />

          {/* ── 3. Duplizieren ────────────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={handleDuplicate}>
            <Copy className="h-4 w-4 text-primary shrink-0" />
            Duplizieren
          </ContextMenuItem>

          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 4. Zu Event-Set hinzufügen ────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
              Zu Event-Set hinzufügen
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              className={`${SUB_CONTENT_CLS} w-52`}
              {...subContentProps}
            >
              {recentSets.length === 0 ? (
                <ContextMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
                  Keine Event-Sets vorhanden
                </ContextMenuLabel>
              ) : (
                recentSets.map((set) => (
                  <ContextMenuItem
                    key={set.id}
                    className={`truncate ${ITEM_CLS}`}
                    onSelect={() => handleAddToSet(set)}
                  >
                    {set.name}
                  </ContextMenuItem>
                ))
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 5. QR-Code ────────────────────────────────────────────── */}
          <ContextMenuItem
            className={ITEM_CLS}
            onSelect={() => setQrOpen(true)}
          >
            <QrCode className="h-4 w-4 text-primary shrink-0" />
            QR-Code anzeigen
          </ContextMenuItem>

          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 6. Kategorie filtern ──────────────────────────────────── */}
          <ContextMenuItem
            className={ITEM_CLS}
            onSelect={() => onFilterCategory(item.category)}
            disabled={!item.category}
          >
            <Filter className="h-4 w-4 text-primary shrink-0" />
            Kategorie filtern
            {item.category && (
              <span className="ml-auto max-w-[80px] truncate text-xs text-muted-foreground">
                {item.category}
              </span>
            )}
          </ContextMenuItem>

          {/* ── 7. Verlauf anzeigen ───────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={handleShowHistory}>
            <History className="h-4 w-4 text-primary shrink-0" />
            Verlauf anzeigen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* QR dialog – outside ContextMenu so it survives menu close */}
      <QRCodeDisplay
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        itemId={item.id}
        itemName={item.name}
        itemDetails={{
          category: item.category,
          quantity: item.quantity,
          location: item.location,
        }}
        size="md"
      />
    </>
  );
}
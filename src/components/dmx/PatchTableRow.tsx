import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Copy, Loader2, Wand2 } from "lucide-react";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import type { ItemCondition } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { DMX_UNIVERSE_SIZE, padAddress } from "@/components/dmx/dmxFormat";
import { InlineNumberEdit } from "@/components/dmx/InlineNumberEdit";

interface PatchTableRowProps {
  row: PatchplanRow;
  conflictsWith?: PatchplanRow[];
  disabled?: boolean;
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onAutoAssign?: (itemId: string, universe: number) => Promise<void>;
  onCopy: (row: PatchplanRow) => void;
  onError: (message: string) => void;
}

export function PatchTableRow({
  row,
  conflictsWith,
  disabled,
  onInstanceChange,
  onAutoAssign,
  onCopy,
  onError,
}: PatchTableRowProps) {
  const { t } = useTranslation();
  const [assigning, setAssigning] = useState(false);
  const conflict = !!conflictsWith?.length;
  const editable = !!onInstanceChange && !disabled;

  const validateAddress = (n: number) => {
    if (n < 1 || n > DMX_UNIVERSE_SIZE) return t("dmx_table.error.address_range");
    if (n + row.channels - 1 > DMX_UNIVERSE_SIZE)
      return t("dmx.too_many_channels_inline", { available: DMX_UNIVERSE_SIZE - n + 1 });
    return null;
  };
  const validateUniverse = (n: number) => (n < 1 ? t("dmx_table.error.universe_min") : null);

  const handleAutoAssign = async () => {
    if (!onAutoAssign) return;
    setAssigning(true);
    try {
      await onAutoAssign(row.itemId, row.universe);
    } catch {
      onError(t("dmx_table.error.save_failed"));
    } finally {
      setAssigning(false);
    }
  };

  const name = row.itemName;
  const addrText = cn("text-[13px]", conflict ? "text-destructive" : "text-foreground");

  return (
    <TableRow className={cn(conflict && "bg-destructive/[0.04] hover:bg-destructive/[0.07]")}>
      <TableCell
        className={cn("w-16 font-mono tabular-nums", conflict && "shadow-[inset_2px_0_0_hsl(var(--destructive))]")}
      >
        {editable ? (
          <InlineNumberEdit
            value={row.universe}
            display={String(row.universe)}
            validate={validateUniverse}
            onCommit={(n) => onInstanceChange!(row.itemId, row.instanceNumber, row.startAddress, n)}
            onError={onError}
            className={addrText}
            inputClassName="w-14"
            ariaLabel={`${name} – ${t("dmx_table.col.universe")}`}
          />
        ) : (
          <span className={addrText}>{row.universe}</span>
        )}
      </TableCell>
      <TableCell className="w-24">
        {editable ? (
          <InlineNumberEdit
            value={row.startAddress}
            display={padAddress(row.startAddress)}
            validate={validateAddress}
            onCommit={(n) => onInstanceChange!(row.itemId, row.instanceNumber, n, row.universe)}
            onError={onError}
            className={cn(addrText, "font-medium")}
            inputClassName="w-16"
            ariaLabel={`${name} – ${t("dmx_table.col.start_address")}`}
          />
        ) : (
          <span className={cn(addrText, "font-mono font-medium tabular-nums")}>{padAddress(row.startAddress)}</span>
        )}
      </TableCell>
      <TableCell className={cn("w-20 font-mono text-[13px] tabular-nums", conflict ? "text-destructive" : "text-muted-foreground")}>
        {padAddress(row.endAddress)}
      </TableCell>
      <TableCell className="w-16 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
        {row.channels}
      </TableCell>
      <TableCell className="min-w-[180px]">
        <div className="flex items-center gap-1.5">
          {conflict && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />}
          <span className="truncate text-[13px] font-medium">{name}</span>
          {row.hasCustomConfig && (
            <span
              className="h-1 w-1 shrink-0 rounded-full bg-primary"
              title={t("dmx_timeline.edit_dialog.custom_config")}
              aria-label={t("dmx_timeline.edit_dialog.custom_config")}
            />
          )}
        </div>
        {conflictsWith?.map((other) => (
          <p key={other.id} className="mt-0.5 text-[12px] text-destructive">
            {t("dmx_table.conflict_message", {
              name: other.totalInstances > 1 ? `${other.itemName} #${other.instanceNumber}` : other.itemName,
              start: padAddress(other.startAddress),
              end: padAddress(other.endAddress),
            })}
          </p>
        ))}
      </TableCell>
      <TableCell className="w-16 font-mono text-[13px] tabular-nums text-muted-foreground">
        {row.instanceNumber}/{row.totalInstances}
      </TableCell>
      <TableCell className="max-w-[160px] truncate text-[13px] text-muted-foreground">{row.location}</TableCell>
      <TableCell className="w-28">
        <StatusBadge condition={row.condition as ItemCondition} />
      </TableCell>
      <TableCell className="w-20 text-right">
        <div className="flex justify-end gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onCopy(row)}
            title={t("dmx_table.copy_title")}
            aria-label={t("dmx_table.copy_title")}
          >
            <Copy />
          </Button>
          {onAutoAssign && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => void handleAutoAssign()}
              disabled={disabled || assigning}
              title={t("dmx_table.auto_assign_title")}
              aria-label={t("dmx_table.auto_assign_title")}
            >
              {assigning ? <Loader2 className="animate-spin" /> : <Wand2 />}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

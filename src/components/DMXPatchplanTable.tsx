import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyPanel } from "@/components/QueryState";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { DMXAddressDialog } from "@/components/dmx/DMXAddressDialog";
import { PatchList } from "@/components/dmx/PatchList";
import { PatchTableRow } from "@/components/dmx/PatchTableRow";
import { buildConflictIndex } from "@/components/dmx/dmxFormat";

interface DMXPatchplanTableProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  /** Undefined = read-only. */
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onAutoAssign?: (itemId: string, universe: number) => Promise<void>;
  /** Disables editing while data is (re)loading. */
  loading?: boolean;
}

/**
 * Console-style patch table: universe, address range and footprint in mono,
 * conflicting instances marked in destructive. Small screens get a tap-to-edit list.
 */
export function DMXPatchplanTable({
  rows,
  conflicts,
  onInstanceChange,
  onAutoAssign,
  loading = false,
}: DMXPatchplanTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editingRow, setEditingRow] = useState<PatchplanRow | null>(null);

  const conflictIndex = useMemo(() => buildConflictIndex(conflicts), [conflicts]);

  const showError = useCallback(
    (message: string) => toast({ title: t("common.error"), description: message, variant: "destructive" }),
    [t, toast]
  );

  const copyRange = useCallback(
    async (row: PatchplanRow) => {
      const text = `${row.startAddress}-${row.endAddress}`;
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(text);
        toast({ description: t("dmx_table.copied") });
      } catch (err) {
        logger.error("DMXPatchplanTable", "Copy failed", err);
        showError(t("common.unknown_error"));
      }
    },
    [showError, t, toast]
  );

  if (rows.length === 0) {
    return <EmptyPanel title={t("dmx_table.empty")} />;
  }

  if (isMobile) {
    return (
      <>
        <PatchList
          rows={rows}
          conflictIndex={conflictIndex}
          onEdit={onInstanceChange && !loading ? setEditingRow : undefined}
        />
        <DMXAddressDialog
          row={editingRow}
          conflictsWith={editingRow ? conflictIndex.get(editingRow.id) : undefined}
          onClose={() => setEditingRow(null)}
          onSave={async (row, address, universe) => {
            await onInstanceChange?.(row.itemId, row.instanceNumber, address, universe);
          }}
        />
      </>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t("dmx_table.col.universe")}</TableHead>
            <TableHead className="w-24">{t("dmx_table.col.start_address")}</TableHead>
            <TableHead className="w-20">{t("dmx_table.col.end_address")}</TableHead>
            <TableHead className="w-16 text-right">{t("dmx_table.col.channels")}</TableHead>
            <TableHead>{t("dmx_table.col.device")}</TableHead>
            <TableHead className="w-16">{t("dmx_table.col.instance")}</TableHead>
            <TableHead>{t("fields.location")}</TableHead>
            <TableHead className="w-28">{t("dmx_table.col.status")}</TableHead>
            <TableHead className="w-20 text-right">
              <span className="sr-only">{t("dmx_table.col.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <PatchTableRow
              key={row.id}
              row={row}
              conflictsWith={conflictIndex.get(row.id)}
              disabled={loading}
              onInstanceChange={onInstanceChange}
              onAutoAssign={onAutoAssign}
              onCopy={(r) => void copyRange(r)}
              onError={showError}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DMX_UNIVERSE_SIZE, formatPatch, padAddress } from "@/components/dmx/dmxFormat";

interface DMXAddressDialogProps {
  row: PatchplanRow | null;
  onClose: () => void;
  onSave: (row: PatchplanRow, address: number, universe: number) => Promise<void>;
  /** Shown only for instances with a custom config. */
  onReset?: (row: PatchplanRow) => Promise<void>;
  /** Other rows overlapping this one (for the conflict hint). */
  conflictsWith?: PatchplanRow[];
}

function parseIntStrict(v: string): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  return parseInt(v, 10);
}

/** Edit start address + universe of a single fixture instance. */
export function DMXAddressDialog({ row, onClose, onSave, onReset, conflictsWith = [] }: DMXAddressDialogProps) {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [universe, setUniverse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) {
      setAddress(String(row.startAddress));
      setUniverse(String(row.universe));
    }
  }, [row]);

  const addr = parseIntStrict(address);
  const univ = parseIntStrict(universe);
  const end = row && addr !== null ? addr + row.channels - 1 : null;

  let error: string | null = null;
  if (addr === null || univ === null) error = t("dmx_table.error.invalid_input");
  else if (addr < 1 || addr > DMX_UNIVERSE_SIZE) error = t("dmx_table.error.address_range");
  else if (univ < 1) error = t("dmx_table.error.universe_min");
  else if (end !== null && end > DMX_UNIVERSE_SIZE)
    error = t("dmx.too_many_channels_inline", { available: DMX_UNIVERSE_SIZE - addr + 1 });

  const unchanged = !!row && addr === row.startAddress && univ === row.universe;

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!row || error || addr === null || univ === null) return;
    if (unchanged) {
      onClose();
      return;
    }
    void run(() => onSave(row, addr, univ));
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("dmx_timeline.edit_dialog.title")}</DialogTitle>
            {row && (
              <DialogDescription>
                <span className="font-medium text-foreground">{row.itemName}</span>
                {row.totalInstances > 1 && (
                  <>
                    {" · "}
                    {t("dmx_timeline.edit_dialog.instance_of", {
                      current: row.instanceNumber,
                      total: row.totalInstances,
                    })}
                  </>
                )}
                {row.hasCustomConfig && <> {t("dmx_timeline.edit_dialog.custom_config")}</>}
              </DialogDescription>
            )}
          </DialogHeader>

          {row && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dmx-edit-universe">{t("dmx_timeline.edit_dialog.universe")}</Label>
                  <Input
                    id="dmx-edit-universe"
                    inputMode="numeric"
                    className="font-mono tabular-nums"
                    value={universe}
                    onChange={(e) => setUniverse(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dmx-edit-address">{t("dmx_timeline.edit_dialog.start_address")}</Label>
                  <Input
                    id="dmx-edit-address"
                    inputMode="numeric"
                    className="font-mono tabular-nums"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={saving}
                    autoFocus
                  />
                </div>
              </div>

              <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-sunken text-center">
                <div className="px-2 py-2">
                  <dt className="eyebrow">{t("dmx_table.col.start_address")}</dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums">
                    {addr !== null && univ !== null ? formatPatch(univ, addr) : "–"}
                  </dd>
                </div>
                <div className="px-2 py-2">
                  <dt className="eyebrow">{t("dmx_table.col.end_address")}</dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums">
                    {end !== null && univ !== null ? formatPatch(univ, end) : "–"}
                  </dd>
                </div>
                <div className="px-2 py-2">
                  <dt className="eyebrow">{t("dmx_table.col.channels")}</dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums">{row.channels}</dd>
                </div>
              </dl>

              {error ? (
                <p className="text-[13px] text-destructive">{error}</p>
              ) : (
                unchanged &&
                conflictsWith.length > 0 && (
                  <ul className="space-y-0.5 text-[13px] text-destructive">
                    {conflictsWith.map((other) => (
                      <li key={other.id}>
                        {t("dmx_table.conflict_message", {
                          name: other.totalInstances > 1 ? `${other.itemName} #${other.instanceNumber}` : other.itemName,
                          start: padAddress(other.startAddress),
                          end: padAddress(other.endAddress),
                        })}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {row?.hasCustomConfig && onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void run(() => onReset(row))}
                disabled={saving}
                className="sm:mr-auto"
              >
                {t("common.reset")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !!error}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

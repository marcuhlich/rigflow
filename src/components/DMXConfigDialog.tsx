import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { InventoryItem, DMX_CATEGORIES } from "@/types/inventory";
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
import { DMX_UNIVERSE_SIZE, formatPatch } from "@/components/dmx/dmxFormat";

interface DMXConfigDialogProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem, dmxConfig: DMXConfig) => Promise<void>;
  loading?: boolean;
  hasConflict?: boolean;
}

export interface DMXConfig {
  dmx_universe: number;
  dmx_start_address: number;
  dmx_channels: number;
}

/** Raw input values; parsed on render so the user can clear a field while typing. */
interface Draft {
  universe: string;
  start: string;
  channels: string;
}

const toInt = (v: string) => (/^\d+$/.test(v.trim()) ? parseInt(v, 10) : NaN);

/** Base DMX patch (universe, start address, footprint) of an inventory item. */
export function DMXConfigDialog({
  isOpen,
  item,
  onClose,
  onSave,
  loading = false,
  hasConflict = false,
}: DMXConfigDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>({ universe: "1", start: "1", channels: "16" });

  const isDMXCategory = !!item && DMX_CATEGORIES.includes(item.category);

  useEffect(() => {
    if (item && isOpen) {
      setDraft({
        universe: String(item.dmx_universe || 1),
        start: String(item.dmx_start_address || 1),
        channels: String(item.dmx_channels || 16),
      });
    }
  }, [item, isOpen]);

  if (!item || !isDMXCategory) return null;

  const universe = toInt(draft.universe);
  const start = toInt(draft.start);
  const channels = toInt(draft.channels);
  const totalChannels = channels * item.quantity;
  const endAddress = start + totalChannels - 1;
  const available = DMX_UNIVERSE_SIZE - start + 1;

  const invalid =
    !(universe >= 1) || !(start >= 1 && start <= DMX_UNIVERSE_SIZE) || !(channels >= 1);
  const overflow = !invalid && endAddress > DMX_UNIVERSE_SIZE;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid || overflow) return;
    await onSave(item, { dmx_universe: universe, dmx_start_address: start, dmx_channels: channels });
  };

  const set = (key: keyof Draft) => (e: ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[420px]">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("dmx.title")}</DialogTitle>
            <DialogDescription>
              {item.name} <span className="font-mono tabular-nums">· {item.quantity}×</span>
            </DialogDescription>
          </DialogHeader>

          {hasConflict && (
            <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/[0.06] px-3 py-2 text-[13px] text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("dmx.conflict_warning")}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dmx_universe">{t("dmx_timeline.edit_dialog.universe")}</Label>
              <Input
                id="dmx_universe"
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={draft.universe}
                onChange={set("universe")}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dmx_start_address">{t("dmx_timeline.edit_dialog.start_address")}</Label>
              <Input
                id="dmx_start_address"
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={draft.start}
                onChange={set("start")}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dmx_channels">{t("dmx_table.col.channels")}</Label>
              <Input
                id="dmx_channels"
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={draft.channels}
                onChange={set("channels")}
                disabled={loading}
              />
            </div>
          </div>
          <p className="-mt-2 text-[12px] text-muted-foreground">
            {t("dmx.start_address_hint")} · {t("dmx.channels_hint")}
          </p>

          <dl className="divide-y divide-border rounded-md border border-border bg-surface-sunken text-[13px]">
            {[
              [t("dmx.summary.instances"), `${item.quantity}×`],
              [t("dmx.summary.channels_per_instance"), invalid ? "–" : String(channels)],
              [
                t("dmx.summary.address_range"),
                invalid ? "–" : `${formatPatch(universe, start)}–${formatPatch(universe, Math.min(endAddress, DMX_UNIVERSE_SIZE))}`,
              ],
              [t("dmx.summary.total_channels"), invalid ? "–" : String(totalChannels)],
            ].map(([label, value], i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={i === 3 && overflow ? "font-mono font-medium text-destructive" : "font-mono tabular-nums"}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {invalid && <p className="text-[13px] text-destructive">{t("dmx.invalid_values")}</p>}
          {overflow && (
            <p className="text-[13px] text-destructive">{t("dmx.too_many_channels_inline", { available })}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || invalid || overflow}>
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

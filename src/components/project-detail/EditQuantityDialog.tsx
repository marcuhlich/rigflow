import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  itemName: string;
  currentQty: number;
  maxQty: number;
  /** Resolves to true on success; the dialog closes then. */
  onSave: (qty: number) => Promise<boolean>;
}

export function EditQuantityDialog({ open, onClose, itemName, currentQty, maxQty, onSave }: Props) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(currentQty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setQty(currentQty); }, [open, currentQty]);

  const clamp = (n: number) => Math.min(maxQty, Math.max(1, n));
  const valid = qty >= 1 && qty <= maxQty;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const ok = await onSave(qty);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("project_detail.edit_quantity.title")}</DialogTitle>
          <DialogDescription className="truncate">{itemName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="project-item-qty">
            {t("project_detail.edit_quantity.label")}{" "}
            <span className="font-normal text-muted-foreground">{t("project_detail.edit_quantity.max_hint", { max: maxQty })}</span>
          </Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setQty(q => clamp(q - 1))} disabled={qty <= 1}
              aria-label={t("project_detail.edit_quantity.decrease")}>
              <Minus />
            </Button>
            <Input
              id="project-item-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qty}
              onChange={e => setQty(clamp(parseInt(e.target.value, 10) || 1))}
              onKeyDown={e => { if (e.key === "Enter") void handleSave(); }}
              className="w-20 text-center font-mono tabular-nums"
            />
            <Button variant="outline" size="icon" onClick={() => setQty(q => clamp(q + 1))} disabled={qty >= maxQty}
              aria-label={t("project_detail.edit_quantity.increase")}>
              <Plus />
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !valid}>
            {saving ? t("project_detail.edit_quantity.saving") : t("project_detail.edit_quantity.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

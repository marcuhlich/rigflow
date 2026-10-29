import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PACKAGE_COLOR, DEFAULT_PACKAGE_ICON, PACKAGE_COLORS, PACKAGE_ICONS,
} from "./packageIcons";
import { PackageGlyph } from "./PackageGlyph";

export interface PackageFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Should throw on failure; the dialog then stays open. */
  onSubmit: (data: PackageFormData) => Promise<void>;
  initial?: PackageFormData;
}

export function PackageFormDialog({ open, onClose, onSubmit, initial }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t("packages.title_edit") : t("packages.title_create")}</DialogTitle>
          <DialogDescription>{t("packages.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening so state always starts from `initial`. */}
        {open && <PackageForm initial={initial} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function PackageForm({ initial, onClose, onSubmit }: Omit<Props, "open">) {
  const { t } = useTranslation();
  const [name, setName]     = useState(initial?.name ?? "");
  const [desc, setDesc]     = useState(initial?.description ?? "");
  const [color, setColor]   = useState(initial?.color ?? DEFAULT_PACKAGE_COLOR);
  const [icon, setIcon]     = useState(initial?.icon ?? DEFAULT_PACKAGE_ICON);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), description: desc.trim(), color, icon });
      onClose();
    } catch {
      // usePackages toasts the error; keep the dialog open.
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="package-name">{t("packages.name_label")}</Label>
        <div className="flex gap-2">
          <PackageGlyph icon={icon} color={color} className="h-9 w-9" />
          <Input
            id="package-name"
            placeholder={t("packages.name_placeholder")}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="package-desc">{t("packages.description_label")}</Label>
        <Textarea
          id="package-desc"
          placeholder={t("packages.description_placeholder")}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={2}
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium leading-none">{t("packages.color_label")}</legend>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {PACKAGE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                color === c ? "border-foreground" : "border-border hover:border-border-strong",
              )}
            >
              <span className="h-4 w-4 rounded-[3px]" style={{ backgroundColor: c }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium leading-none">{t("packages.icon_label")}</legend>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {PACKAGE_ICONS.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={value}
              aria-pressed={icon === value}
              onClick={() => setIcon(value)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                icon === value
                  ? "border-foreground bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </fieldset>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>{t("packages.btn_cancel")}</Button>
        <Button type="submit" disabled={!name.trim() || saving}>
          {saving ? t("packages.btn_saving") : initial ? t("packages.btn_save") : t("packages.btn_create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

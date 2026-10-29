import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { dateFnsLocale, formatDay, parseDay, toDayString } from "@/components/projects/format";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

export interface NewLoanData {
  item: InventoryItem;
  lentTo: string;
  dueDate: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  onSubmit: (data: NewLoanData) => Promise<void>;
}

export function NewLoanDialog({ open, onOpenChange, items, onSubmit }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lending.add_dialog.title")}</DialogTitle>
          <DialogDescription>{t("lending.add_dialog.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening so the form always starts empty. */}
        {open && <NewLoanForm items={items} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewLoanForm({ items, onSubmit, onClose }: {
  items: InventoryItem[];
  onSubmit: Props["onSubmit"];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [itemId, setItemId]   = useState("");
  const [lentTo, setLentTo]   = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);

  const item = items.find(i => i.id === itemId);
  const canSubmit = !!item && lentTo.trim() !== "" && !saving;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || !canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({ item, lentTo: lentTo.trim(), dueDate, notes: notes.trim() || null });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="loan-item">{t("lending.add_dialog.item_label")}</Label>
        <ItemCombobox id="loan-item" items={items} value={itemId} onChange={setItemId} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loan-to">{t("lending.add_dialog.lent_to_label")}</Label>
        <Input
          id="loan-to"
          value={lentTo}
          onChange={e => setLentTo(e.target.value)}
          placeholder={t("lending.add_dialog.lent_to_placeholder")}
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loan-due">{t("lending.add_dialog.due_date_label")}</Label>
        <DueDateField id="loan-due" value={dueDate} onChange={setDueDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loan-notes">{t("fields.notes")}</Label>
        <Textarea
          id="loan-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t("item_form.placeholder.notes")}
          rows={2}
        />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!canSubmit}>
          {saving ? t("common.saving") : t("lending.add_dialog.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Searchable item picker. Items that are already lent out can't be picked again. */
function ItemCombobox({ id, items, value, onChange }: {
  id: string;
  items: InventoryItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);
  const categoryLabel = (c: string) => t(`categories.${c}`, { defaultValue: c });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          <span className="truncate">
            {selected
              ? t("lending.item_with_category", { name: selected.name, category: categoryLabel(selected.category) })
              : t("lending.add_dialog.item_placeholder")}
          </span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("lending.add_dialog.item_search")} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t("lending.add_dialog.item_empty")}</CommandEmpty>
            {items.map(item => {
              const isLent = item.condition === "verliehen";
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${categoryLabel(item.category)} ${item.id}`}
                  disabled={isLent}
                  onSelect={() => { onChange(item.id); setOpen(false); }}
                  className="gap-2"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === item.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
                  </div>
                  {item.condition !== "verfügbar" && <StatusBadge condition={item.condition} />}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DueDateField({ id, value, onChange }: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const date = parseDay(value);

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("min-w-0 flex-1 justify-start font-normal", !date && "text-muted-foreground")}
          >
            <CalendarDays className="text-muted-foreground" />
            <span className={cn("truncate", date && "tech")}>
              {date ? formatDay(date, i18n.language) : t("lending.date_picker.placeholder")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={d => { onChange(d ? toDayString(d) : null); setOpen(false); }}
            locale={dateFnsLocale(i18n.language)}
            weekStartsOn={i18n.language.startsWith("de") ? 1 : 0}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {date && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("common.clear")}
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

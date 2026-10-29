import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EditFormData } from "./constants";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: EditFormData;
  /** Resolves to true on success; the dialog closes then. */
  onSubmit: (data: EditFormData) => Promise<boolean>;
}

const toDate = (d: string | null) => (d ? parseISO(d) : undefined);

function DateRangeField({ value, onChange }: { value: DateRange | undefined; onChange: (r: DateRange | undefined) => void }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const locale = i18n.language.startsWith("de") ? de : enUS;

  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${format(value.from, "dd.MM.yyyy")} – ${format(value.to, "dd.MM.yyyy")}`
      : format(value.from, "dd.MM.yyyy")
    : null;

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="project-period"
            variant="outline"
            className={cn("flex-1 justify-start font-normal tabular-nums", !label && "text-muted-foreground")}
          >
            <CalendarDays className="text-muted-foreground" />
            {label ?? t("projects.date_picker.range_placeholder")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            defaultMonth={value?.from}
            locale={locale}
            weekStartsOn={1}
            initialFocus
          />
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {!value?.from ? t("projects.date_picker.hint_start") : !value.to ? t("projects.date_picker.hint_end") : label}
          </p>
        </PopoverContent>
      </Popover>
      {label && (
        <Button variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label={t("projects.date_picker.reset")}>
          <X />
        </Button>
      )}
    </div>
  );
}

export function ProjectEditDialog({ open, onClose, initial, onSubmit }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [range, setRange] = useState<DateRange | undefined>();
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens; `initial` is rebuilt on every
  // parent render, so it must not be a dependency here.
  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setRange(initial.dateStart ? { from: toDate(initial.dateStart), to: toDate(initial.dateEnd) } : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: keyof EditFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const from = range?.from;
    const to = range?.to ?? range?.from;
    const ok = await onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      dateStart: from ? format(from, "yyyy-MM-dd") : null,
      dateEnd: to ? format(to, "yyyy-MM-dd") : null,
      notes: form.notes.trim(),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projects.form.title_edit")}</DialogTitle>
          <DialogDescription>{t("projects.form.desc_edit")}</DialogDescription>
        </DialogHeader>
        <form id="project-edit-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">{t("projects.form.name_label")}</Label>
            <Input id="project-name" value={form.name} onChange={set("name")} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">{t("projects.form.description_label")}</Label>
            <Input id="project-description" value={form.description} onChange={set("description")}
              placeholder={t("projects.form.description_placeholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-location">{t("projects.form.location_label")}</Label>
            <Input id="project-location" value={form.location} onChange={set("location")}
              placeholder={t("projects.form.location_placeholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-period">{t("projects.form.period_label")}</Label>
            <DateRangeField value={range} onChange={setRange} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-notes">{t("project_detail.edit_dialog.notes_label")}</Label>
            <Textarea id="project-notes" value={form.notes} onChange={set("notes")} rows={3}
              placeholder={t("projects.form.notes_placeholder")} />
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" form="project-edit-form" disabled={!form.name.trim() || saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

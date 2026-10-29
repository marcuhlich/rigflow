import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DateRangeField } from "./DateRangeField";
import { parseDay, toDayString } from "./format";

export interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  dateStart: string | null;
  dateEnd: string | null;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Should throw on failure; the dialog then stays open. */
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initial?: ProjectFormData;
}

export function ProjectFormDialog({ open, onClose, onSubmit, initial }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? t("projects.form.title_edit") : t("projects.form.title_create")}</DialogTitle>
          <DialogDescription>
            {initial ? t("projects.form.desc_edit") : t("projects.form.desc_create")}
          </DialogDescription>
        </DialogHeader>
        {/* The form is mounted per opening, so its state always starts from `initial`. */}
        {open && <ProjectForm initial={initial} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ initial, onClose, onSubmit }: Omit<Props, "open">) {
  const { t } = useTranslation();
  const [name, setName]           = useState(initial?.name ?? "");
  const [desc, setDesc]           = useState(initial?.description ?? "");
  const [location, setLocation]   = useState(initial?.location ?? "");
  const [dateStart, setDateStart] = useState<Date | undefined>(() => parseDay(initial?.dateStart));
  const [dateEnd, setDateEnd]     = useState<Date | undefined>(() => parseDay(initial?.dateEnd));
  const [notes, setNotes]         = useState(initial?.notes ?? "");
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        name:        name.trim(),
        description: desc.trim(),
        location:    location.trim(),
        dateStart:   dateStart ? toDayString(dateStart) : null,
        dateEnd:     dateEnd ? toDayString(dateEnd) : null,
        notes:       notes.trim(),
      });
      onClose();
    } catch {
      // The hook reports the error via toast; keep the dialog open so no input is lost.
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">{t("projects.form.name_label")}</Label>
        <Input
          id="project-name"
          placeholder={t("projects.form.name_placeholder")}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-desc">{t("projects.form.description_label")}</Label>
        <Input
          id="project-desc"
          placeholder={t("projects.form.description_placeholder")}
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-location">{t("projects.form.location_label")}</Label>
          <Input
            id="project-location"
            placeholder={t("projects.form.location_placeholder")}
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-period">{t("projects.form.period_label")}</Label>
          <DateRangeField
            id="project-period"
            start={dateStart}
            end={dateEnd}
            onChange={(s, en) => { setDateStart(s); setDateEnd(en); }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-notes">{t("fields.notes")}</Label>
        <Textarea
          id="project-notes"
          placeholder={t("projects.form.notes_placeholder")}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!name.trim() || saving}>
          {saving ? t("common.saving") : initial ? t("common.save") : t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

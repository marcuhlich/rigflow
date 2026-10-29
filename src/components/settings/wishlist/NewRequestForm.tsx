import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TITLE_MAX = 100;
const DESC_MAX = 500;

interface Props {
  onSubmit: (title: string, description: string) => Promise<boolean>;
  onCancel: () => void;
}

export function NewRequestForm({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(title, description);
    // On success the parent unmounts this form, so only touch state on failure.
    if (!ok) setSubmitting(false);
  };

  return (
    <form
      className="surface space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm font-semibold">{t("wishlist.form_title")}</p>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="wish-title">{t("wishlist.title_label")}</Label>
          <span className="tech text-[11px] text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="wish-title"
          autoFocus
          placeholder={t("wishlist.title_placeholder")}
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wish-desc">{t("wishlist.description_label")}</Label>
        <Textarea
          id="wish-desc"
          rows={3}
          value={description}
          maxLength={DESC_MAX}
          onChange={(e) => setDescription(e.target.value)}
          className="resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting && <Loader2 className="animate-spin" />}
          {submitting ? t("wishlist.submitting") : t("wishlist.submit")}
        </Button>
      </div>
    </form>
  );
}

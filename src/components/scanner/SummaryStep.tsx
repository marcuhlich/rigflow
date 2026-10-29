import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemCondition } from "@/types/inventory";
import type { Project } from "@/types/project";
import { ScannedEntryRow } from "./ScannedEntryRow";
import { NotInProjectNotice } from "./ScanStep";
import { RETURN_CONDITIONS, type ScanMode, type ScannedEntry } from "./types";

interface SummaryStepProps {
  mode: ScanMode;
  entries: ScannedEntry[];
  person: string;
  dueDate: string;
  project: Project | null;
  isProcessing: boolean;
  onOverride: (itemId: string, status: ItemCondition) => void;
  onBack: () => void;
  onConfirm: () => void;
}

const SELECTED_STYLE: Record<string, string> = {
  "verfügbar": "border-success/40 bg-success/10 text-success",
  "defekt":    "border-destructive/40 bg-destructive/10 text-destructive",
  "verliehen": "border-warning/40 bg-warning/10 text-warning",
};

/** Parse a `yyyy-mm-dd` date input value as a local date (not UTC). */
function formatDateInput(value: string, locale: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(locale);
}

/** Step 4: review and book. */
export function SummaryStep({
  mode, entries, person, dueDate, project, isProcessing, onOverride, onBack, onConfirm,
}: SummaryStepProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";
  const notInSetCount = entries.filter((e) => e.inSet === false).length;

  return (
    <div className="space-y-4">
      <dl className="surface divide-y divide-border text-sm">
        <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">{t("scanner.summary.action_label")}</dt>
          <dd className="font-medium">{t(`scanner.mode.${mode}.label`)}</dd>
        </div>
        {mode === "verleih" && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{t("fields.lent_to")}</dt>
            <dd className="truncate font-medium">{person}</dd>
          </div>
        )}
        {mode === "verleih" && dueDate && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{t("fields.lent_until")}</dt>
            <dd className="tech">{formatDateInput(dueDate, locale)}</dd>
          </div>
        )}
        {project && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{t("scanner.summary.project_label")}</dt>
            <dd className="truncate font-medium">{project.name}</dd>
          </div>
        )}
      </dl>

      <div className="surface overflow-hidden">
        <div className="border-b border-border bg-surface-sunken px-4 py-2">
          <p className="eyebrow">{t("scanner.summary.item_count", { count: entries.length })}</p>
        </div>
        <ul className="divide-y divide-border">
          {entries.map((entry) => {
            const selected = entry.overrideStatus ?? "verfügbar";
            return (
              <ScannedEntryRow key={entry.item.id} entry={entry}>
                {mode === "abbau" && (
                  <div
                    className="mt-2 grid grid-cols-3 gap-1"
                    role="radiogroup"
                    aria-label={t("fields.condition")}
                  >
                    {RETURN_CONDITIONS.map((opt) => {
                      const active = selected === opt.status;
                      return (
                        <button
                          key={opt.status}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => onOverride(entry.item.id, opt.status)}
                          className={cn(
                            "h-8 rounded-md border text-xs font-medium transition-colors",
                            active
                              ? SELECTED_STYLE[opt.status]
                              : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                          )}
                        >
                          {t(opt.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScannedEntryRow>
            );
          })}
        </ul>
      </div>

      {project && <NotInProjectNotice count={notInSetCount} project={project.name} />}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft />
          {t("common.back")}
        </Button>
        <Button className="flex-1 sm:ml-auto sm:flex-none" onClick={onConfirm} disabled={isProcessing || entries.length === 0}>
          {isProcessing ? <Loader2 className="animate-spin" /> : <Check />}
          {isProcessing ? t("scanner.summary.saving") : t("scanner.summary.confirm")}
        </Button>
      </div>
    </div>
  );
}

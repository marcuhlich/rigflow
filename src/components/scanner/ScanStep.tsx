import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ScanLine, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyPanel } from "@/components/QueryState";
import type { Project } from "@/types/project";
import { ScannedEntryRow } from "./ScannedEntryRow";
import type { ScanMode, ScannedEntry } from "./types";

interface ScanStepProps {
  mode: ScanMode;
  entries: ScannedEntry[];
  /** Selected project with loaded item list, if any */
  project: Project | null;
  projectTotal: number;
  scannerDisabled?: boolean;
  onOpenScanner: () => void;
  onRemove: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NotInProjectNotice({ count, project }: { count: number; project: string }) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] text-warning" role="status">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {t("scanner.scan.not_in_project_warning", { count, project })}
    </div>
  );
}

/** Step 3: open the camera, review what was scanned. */
export function ScanStep({
  mode, entries, project, projectTotal, scannerDisabled, onOpenScanner, onRemove, onBack, onNext,
}: ScanStepProps) {
  const { t } = useTranslation();
  const isInventur = mode === "inventur";
  const hasEntries = entries.length > 0;
  const inSetCount = entries.filter((e) => e.inSet === true).length;
  const notInSetCount = entries.filter((e) => e.inSet === false).length;
  const progress = projectTotal > 0 ? Math.round((inSetCount / projectTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {project && projectTotal > 0 && (
        <div className="surface space-y-2.5 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="tech shrink-0 text-sm">
              {inSetCount}<span className="text-muted-foreground"> / {projectTotal}</span>
            </p>
          </div>
          <Progress value={progress} className="h-1.5" aria-label={`${inSetCount} / ${projectTotal}`} />
          {inSetCount === projectTotal && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("scanner.scan.all_scanned")}
            </p>
          )}
        </div>
      )}

      <Button
        size="lg"
        variant={hasEntries ? "outline" : "default"}
        className="h-12 w-full text-[15px]"
        onClick={onOpenScanner}
        disabled={scannerDisabled}
      >
        <ScanLine className="!size-5" />
        {hasEntries ? t("scanner.scan.cta_more") : t("scanner.scan.cta_first")}
      </Button>

      {hasEntries ? (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-4 py-2">
            <p className="eyebrow">{t("scanner.scan.scanned_count", { count: entries.length })}</p>
          </div>
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <ScannedEntryRow
                key={entry.item.id}
                entry={entry}
                trailing={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(entry.item.id)}
                    aria-label={t("scanner.scan.remove_entry", { name: entry.item.name })}
                  >
                    <X />
                  </Button>
                }
              />
            ))}
          </ul>
        </div>
      ) : (
        <EmptyPanel
          icon={ScanLine}
          title={isInventur ? t("scanner.mode.inventur.label") : t("scanner.toast.no_items_title")}
          description={isInventur ? t("scanner.scan.inventur_hint") : t("scanner.toast.no_items_desc")}
        />
      )}

      {project && <NotInProjectNotice count={notInSetCount} project={project.name} />}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft />
          {t("common.back")}
        </Button>
        {!isInventur && (
          <Button
            variant={hasEntries ? "default" : "outline"}
            className="flex-1 sm:ml-auto sm:flex-none"
            onClick={onNext}
            disabled={!hasEntries}
          >
            {t("scanner.scan.to_summary", { count: entries.length })}
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

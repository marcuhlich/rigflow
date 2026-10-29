import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, ProjectStatus } from "@/types/project";
import type { ProjectItemsStatus } from "./useProjectItemIds";
import type { ScanMode } from "./types";

export const NO_PROJECT = "none";

const PROJECT_STATUSES: Partial<Record<ScanMode, ProjectStatus[]>> = {
  aufbau: ["planned", "packed", "transit"],
  abbau:  ["transit", "live", "returning"],
};

interface ContextStepProps {
  mode: ScanMode;
  person: string;
  onPersonChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  projectId: string;
  onProjectChange: (id: string) => void;
  projects: Project[];
  projectsLoading: boolean;
  projectItems: { status: ProjectItemsStatus; count: number; error: string | null; retry: () => void };
  onBack: () => void;
  onNext: () => void;
}

/** Step 2: who/what the scan session is for. */
export function ContextStep({
  mode, person, onPersonChange, dueDate, onDueDateChange,
  projectId, onProjectChange, projects, projectsLoading, projectItems, onBack, onNext,
}: ContextStepProps) {
  const { t } = useTranslation();
  const [personError, setPersonError] = useState(false);

  const projectOptions = useMemo(() => {
    const statuses = PROJECT_STATUSES[mode];
    if (!statuses) return [];
    const list = projects.filter((p) => statuses.includes(p.status));
    // Keep a preselected project (e.g. from a deep link) selectable even if its status doesn't match
    const selected = projects.find((p) => p.id === projectId);
    if (selected && !list.includes(selected)) list.unshift(selected);
    return list;
  }, [mode, projects, projectId]);

  const hasProject = !!projectId && projectId !== NO_PROJECT;
  const loadingItems = hasProject && projectItems.status === "loading";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "verleih" && !person.trim()) {
      setPersonError(true);
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="surface space-y-4 p-4 sm:p-5">
        {mode === "verleih" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="scanner-person">{t("scanner.context.lend_to_label")}</Label>
              <Input
                id="scanner-person"
                value={person}
                onChange={(e) => { onPersonChange(e.target.value); if (personError) setPersonError(false); }}
                placeholder={t("scanner.context.lend_to_placeholder")}
                aria-invalid={personError}
                aria-describedby={personError ? "scanner-person-error" : undefined}
                autoComplete="off"
                autoFocus
              />
              {personError && (
                <p id="scanner-person-error" className="text-xs text-destructive">
                  {t("scanner.toast.person_required_desc")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scanner-due">{t("scanner.context.due_date_label")}</Label>
              <Input
                id="scanner-due"
                type="date"
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                className="tech sm:max-w-[12rem]"
              />
            </div>
          </>
        )}

        {(mode === "aufbau" || mode === "abbau") && (
          <div className="space-y-1.5">
            <Label htmlFor="scanner-project">
              {mode === "aufbau" ? t("scanner.context.project_optional_label") : t("scanner.context.project_label")}
            </Label>
            <Select value={projectId || NO_PROJECT} onValueChange={onProjectChange} disabled={projectsLoading}>
              <SelectTrigger id="scanner-project">
                <SelectValue placeholder={t("scanner.context.no_project_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>{t("scanner.context.no_project_option")}</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
              {projectsLoading && (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("common.loading")}
                </span>
              )}
              {hasProject && projectItems.status === "loading" && (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("scanner.context.project_loading")}
                </span>
              )}
              {hasProject && projectItems.status === "ready" && (
                projectItems.count > 0
                  ? t("scanner.context.project_item_count", { count: projectItems.count })
                  : t("scanner.context.project_empty")
              )}
              {hasProject && projectItems.status === "error" && (
                <span className="flex flex-wrap items-center gap-2 text-destructive">
                  {t("scanner.context.project_load_error")}
                  <Button type="button" variant="outline" size="sm" onClick={projectItems.retry} className="h-7">
                    <RotateCw />
                    {t("common.retry")}
                  </Button>
                </span>
              )}
            </div>
          </div>
        )}

        {mode === "abbau" && (
          <div className="rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-[13px]">
            <p className="font-medium">{t("scanner.context.condition_hint_title")}</p>
            <p className="mt-0.5 text-muted-foreground">{t("scanner.context.condition_hint_desc")}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft />
          {t("common.back")}
        </Button>
        <Button type="submit" className="flex-1 sm:flex-none sm:ml-auto" disabled={loadingItems}>
          {loadingItems && <Loader2 className="animate-spin" />}
          {t("scanner.context.next_button")}
        </Button>
      </div>
    </form>
  );
}

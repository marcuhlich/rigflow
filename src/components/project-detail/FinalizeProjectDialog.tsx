import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { EnrichedProjectItem } from "@/hooks/useProjectDetail";
import { cn } from "@/lib/utils";
import type { FinalizeOptions } from "./constants";

type Step = "confirm" | "actions" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when the user closes the dialog after a successful archive. */
  onDone: () => void;
  projectName: string;
  allItems: EnrichedProjectItem[];
  onFinalize: (options: FinalizeOptions) => Promise<boolean>;
  onOpenReport: () => void;
}

const DEFAULT_OPTIONS: FinalizeOptions = { missingAction: null, sendDamagedToMaintenance: true };
const PREVIEW_LIMIT = 8;

function ItemList({ items, tone, title }: { items: EnrichedProjectItem[]; tone: "warning" | "destructive"; title: string }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div className="surface overflow-hidden">
      <p className={cn("border-b border-border px-3 py-2 text-xs font-medium", tone === "warning" ? "text-warning" : "text-destructive")}>
        {title}
      </p>
      <ul className="max-h-32 divide-y divide-border overflow-y-auto">
        {items.slice(0, PREVIEW_LIMIT).map(i => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
            <span className="truncate">{i.item_name ?? t("packages.unknown")}</span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{i.quantity}</span>
          </li>
        ))}
        {items.length > PREVIEW_LIMIT && (
          <li className="px-3 py-1.5 text-xs text-muted-foreground">
            {t("project_detail.finalize.unpacked_more", { count: items.length - PREVIEW_LIMIT })}
          </li>
        )}
      </ul>
    </div>
  );
}

export function FinalizeProjectDialog({ open, onClose, onDone, projectName, allItems, onFinalize, onOpenReport }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("confirm");
  const [options, setOptions] = useState<FinalizeOptions>(DEFAULT_OPTIONS);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (open) { setStep("confirm"); setOptions(DEFAULT_OPTIONS); }
  }, [open]);

  const missing  = allItems.filter(i => i.condition === "missing");
  const damaged  = allItems.filter(i => i.condition === "damaged");
  const unpacked = allItems.filter(i => !i.packed);
  const okCount  = allItems.filter(i => i.condition === "ok").length;
  const unresolvedCount = missing.length + unpacked.length;

  const handleClose = () => {
    if (finalizing) return;
    if (step === "done") onDone(); else onClose();
  };

  const submit = async () => {
    setFinalizing(true);
    const ok = await onFinalize(options);
    setFinalizing(false);
    if (ok) setStep("done");
  };

  const stats = [
    { label: t("project_detail.finalize.stat_ok"), value: okCount, cls: "" },
    { label: t("project_detail.finalize.stat_damaged"), value: damaged.length, cls: damaged.length > 0 ? "text-warning" : "text-muted-foreground" },
    { label: t("project_detail.finalize.stat_missing"), value: missing.length, cls: missing.length > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  const actionOptions = [
    { value: "lost", title: "project_detail.finalize.action_lost_title", desc: "project_detail.finalize.action_lost_desc" },
    { value: "found", title: "project_detail.finalize.action_found_title", desc: "project_detail.finalize.action_found_desc" },
    { value: "skip", title: "project_detail.finalize.action_skip_title", desc: "project_detail.finalize.action_skip_desc" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("project_detail.finalize.title")}</DialogTitle>
              <DialogDescription>{t("project_detail.finalize.description", { name: projectName })}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="surface grid grid-cols-3 divide-x divide-border">
                {stats.map(s => (
                  <div key={s.label} className="px-3 py-3">
                    <p className={cn("font-mono text-2xl font-semibold tabular-nums", s.cls)}>{s.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <ItemList items={unpacked} tone="warning"
                title={t("project_detail.finalize.unpacked_warning", { count: unpacked.length })} />
              <ItemList items={missing} tone="destructive" title={t("project_detail.finalize.missing_title")} />

              {unresolvedCount === 0 && damaged.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t("project_detail.finalize.all_ok")}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button onClick={() => setStep("actions")}>
                {t("common.next")}
                <ChevronRight />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "actions" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("project_detail.finalize.actions_title")}</DialogTitle>
              <DialogDescription>{t("project_detail.finalize.actions_desc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {unresolvedCount > 0 && (
                <fieldset className="space-y-2">
                  <legend className="eyebrow mb-2">
                    {t("project_detail.finalize.unresolved_title", { count: unresolvedCount })}
                  </legend>
                  <RadioGroup
                    value={options.missingAction ?? "skip"}
                    onValueChange={v => setOptions(p => ({ ...p, missingAction: v === "skip" ? null : (v as "lost" | "found") }))}
                    className="surface gap-0 divide-y divide-border overflow-hidden"
                  >
                    {actionOptions.map(opt => (
                      <Label key={opt.value} htmlFor={`finalize-${opt.value}`}
                        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 font-normal hover:bg-muted/50">
                        <RadioGroupItem id={`finalize-${opt.value}`} value={opt.value} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">{t(opt.title)}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{t(opt.desc)}</span>
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </fieldset>
              )}

              {damaged.length > 0 && (
                <div className="space-y-2">
                  <p className="eyebrow">{t("project_detail.finalize.damaged_title", { count: damaged.length })}</p>
                  <Label htmlFor="finalize-maintenance"
                    className="surface flex cursor-pointer items-start gap-3 px-3 py-2.5 font-normal hover:bg-muted/50">
                    <Checkbox
                      id="finalize-maintenance"
                      checked={options.sendDamagedToMaintenance}
                      onCheckedChange={v => setOptions(p => ({ ...p, sendDamagedToMaintenance: v === true }))}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{t("project_detail.finalize.damaged_maintenance")}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{t("project_detail.finalize.damaged_maintenance_desc")}</span>
                      <span className="mt-1.5 block text-xs text-warning">
                        {damaged.map(i => i.item_name ?? t("packages.unknown")).join(", ")}
                      </span>
                    </span>
                  </Label>
                </div>
              )}

              <div className="flex items-start justify-between gap-3 border-t border-border pt-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t("project_detail.finalize.report_title")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("project_detail.finalize.report_desc")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={onOpenReport} className="shrink-0">
                  <ClipboardList />
                  {t("project_detail.finalize.report_open")}
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("confirm")} disabled={finalizing}>
                <ChevronLeft />
                {t("common.back")}
              </Button>
              <Button onClick={submit} disabled={finalizing}>
                {finalizing && <Loader2 className="animate-spin" />}
                {finalizing ? t("project_detail.finalize.submitting") : t("project_detail.finalize.submit")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("project_detail.finalize.done_title")}</DialogTitle>
              <DialogDescription>{t("project_detail.finalize.done_desc", { name: projectName })}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={1.5} />
            </div>
            <DialogFooter>
              <Button onClick={onDone} className="w-full sm:w-auto">{t("project_detail.finalize.back_to_projects")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

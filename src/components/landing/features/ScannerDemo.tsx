import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList, Package, QrCode, RotateCcw, ScanLine, Truck, X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MockField } from "../ProductFrame";

export type ModeId = "verleih" | "aufbau" | "abbau" | "inventur";
type Step = "mode" | "context" | "scan" | "summary";

const SCANNER_MODES: Array<{ id: ModeId; icon: LucideIcon; badge: "lent" | "inUse" | "available" }> = [
  { id: "verleih", icon: Truck, badge: "lent" },
  { id: "aufbau", icon: Package, badge: "inUse" },
  { id: "abbau", icon: RotateCcw, badge: "available" },
  { id: "inventur", icon: ClipboardList, badge: "available" },
];

const STEPS: Step[] = ["mode", "context", "scan", "summary"];
const PROJECT = "Open Air Berlin 2026";
const SCANNED = 3;
const EXPECTED = 25;

function ModeButton({
  id, icon: Icon, active, compact, onClick,
}: { id: ModeId; icon: LucideIcon; active: boolean; compact?: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border text-left transition-colors",
        compact ? "px-3 py-2" : "px-4 py-3",
        active ? "border-foreground/40 bg-muted" : "border-border bg-card hover:border-border-strong"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{t(`scanner_workflow.modes.${id}.label`)}</p>
        <p className={cn("mt-0.5 text-muted-foreground", compact ? "truncate text-[11px]" : "text-xs")}>
          {t(`scanner_workflow.modes.${id}.description`)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/** Interactive replica of the 4-step scanner wizard. */
export function ScannerDemo() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ModeId>("aufbau");
  const [step, setStep] = useState<Step>("mode");

  const stepIndex = STEPS.indexOf(step);
  const current = SCANNER_MODES.find((m) => m.id === mode) ?? SCANNER_MODES[0];
  const withProject = mode === "aufbau" || mode === "abbau";
  const goNext = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  const goBack = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  const items = [
    { name: "JBL EON 615", cat: t("scanner_workflow.demo_items.cat_audio"), inSet: true },
    { name: "Moving Head 250W", cat: t("scanner_workflow.demo_items.cat_lighting"), inSet: true },
    { name: "SM58", cat: t("scanner_workflow.demo_items.cat_audio"), inSet: false },
  ];
  const statusBadge = <Badge variant={current.badge}>{t(`scanner_workflow.modes.${mode}.target_status`)}</Badge>;

  const nav = (primaryLabel: string, onPrimary: () => void, PrimaryIcon: LucideIcon = ArrowRight) => (
    <div className="flex gap-2 pt-1">
      <Button variant="outline" size="sm" onClick={goBack} aria-label={t("common.back")}>
        <ArrowLeft />
      </Button>
      <Button size="sm" className="flex-1" onClick={onPrimary}>
        {PrimaryIcon === Check && <Check />}
        {primaryLabel}
        {PrimaryIcon !== Check && <PrimaryIcon />}
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
      <div>
        <p className="eyebrow mb-3">{t("scanner_workflow.demo.mode_select_label")}</p>
        <div className="space-y-2">
          {SCANNER_MODES.map((m) => (
            <ModeButton
              key={m.id}
              id={m.id}
              icon={m.icon}
              active={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setStep("mode");
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("scanner_workflow.demo.hint")}</p>
      </div>

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ScanLine className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              {t("scanner_workflow.demo.scanner_title")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t(`scanner_workflow.steps.${step}`)}</p>
          </div>
          {step !== "mode" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("mode")}>
              <X />
              {t("common.cancel")}
            </Button>
          )}
        </div>

        <div className="flex gap-1 px-4 pt-3" aria-hidden="true">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-0.5 flex-1 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        <div className="space-y-3 p-4">
          {step === "mode" &&
            SCANNER_MODES.map((m) => (
              <ModeButton
                key={m.id}
                id={m.id}
                icon={m.icon}
                compact
                active={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  setStep("context");
                }}
              />
            ))}

          {step === "context" && (
            <>
              <ModeButton id={mode} icon={current.icon} compact active onClick={() => setStep("mode")} />
              {mode === "verleih" && (
                <>
                  <MockField label={t("scanner_workflow.context_step.lend_to_label")} value={t("scanner_workflow.context_step.lend_to_placeholder")} muted />
                  <MockField label={t("scanner_workflow.context_step.return_until_label")} value={<span className="tech">{t("scanner_workflow.context_step.return_until_placeholder")}</span>} muted />
                </>
              )}
              {withProject && (
                <div className="space-y-1">
                  <MockField label={t("scanner_workflow.context_step.project_label")} value={<>{PROJECT}<ChevronRight className="h-3 w-3 text-muted-foreground" /></>} />
                  <p className="text-[11px] text-muted-foreground">
                    {t("scanner_workflow.context_step.project_items_expected", { count: EXPECTED })}
                  </p>
                </div>
              )}
              {mode === "inventur" && (
                <p className="rounded-md border border-border bg-surface-sunken p-3 text-xs text-muted-foreground">
                  {t("scanner_workflow.context_step.inventur_info")}
                </p>
              )}
              {nav(t("scanner_workflow.context_step.next_button"), goNext)}
            </>
          )}

          {step === "scan" && (
            <>
              {withProject && (
                <div className="rounded-md border border-border p-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{PROJECT}</span>
                    <span className="tech text-muted-foreground">
                      {t("scanner_workflow.scan_step.project_progress", { scanned: SCANNED, total: EXPECTED })}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${(SCANNED / EXPECTED) * 100}%` }} />
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-border-strong py-5">
                <QrCode className="h-7 w-7 text-muted-foreground" strokeWidth={1.25} />
                <p className="text-xs font-medium">{t("scanner_workflow.scan_step.scan_more")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("scanner_workflow.scan_step.items_scanned", { count: SCANNED })}
                </p>
              </div>
              <ul className="divide-y divide-border rounded-md border border-border">
                {items.map((item) => (
                  <li key={item.name} className="flex items-center gap-2.5 px-3 py-2">
                    {withProject && (
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.inSet ? "bg-success" : "bg-warning")} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.cat}</p>
                    </div>
                    {statusBadge}
                  </li>
                ))}
              </ul>
              {nav(t("scanner_workflow.scan_step.to_summary", { count: SCANNED }), goNext)}
            </>
          )}

          {step === "summary" && (
            <>
              <div className="rounded-md border border-border p-3">
                <p className="eyebrow mb-2">{t("scanner_workflow.summary_step.action_label")}</p>
                <p className="text-sm font-medium">{t(`scanner_workflow.modes.${mode}.label`)}</p>
                {mode === "aufbau" && (
                  <p className="text-xs text-muted-foreground">{t("scanner_workflow.summary_step.project_info", { name: PROJECT })}</p>
                )}
                {mode === "verleih" && (
                  <p className="text-xs text-muted-foreground">
                    {t("scanner_workflow.summary_step.lend_info", { name: "Max Mustermann", date: "20.05.2026" })}
                  </p>
                )}
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <p className="eyebrow border-b border-border bg-surface-sunken px-3 py-2">
                  {t("scanner_workflow.summary_step.items_count", { count: SCANNED })}
                </p>
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li key={item.name} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.cat}</p>
                      </div>
                      {mode === "abbau" ? (
                        <div className="flex gap-1">
                          {(["condition_ok", "condition_defect", "condition_missing"] as const).map((key, j) => (
                            <span
                              key={key}
                              className={cn(
                                "rounded-[4px] border px-1.5 py-px text-[10px]",
                                j === 0 ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground"
                              )}
                            >
                              {t(`scanner_workflow.summary_step.${key}`)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        statusBadge
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {nav(t("scanner_workflow.summary_step.confirm"), () => setStep("mode"), Check)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  AlertTriangle, CheckCheck, CheckCircle2, Clock, ImageIcon, Plus, Search, Sparkles, Wrench, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MockField } from "../ProductFrame";
import { tArray } from "../tArray";

type MType = "check" | "reparatur" | "reinigung" | "inspektion";

const TYPE_ICONS: Record<MType, LucideIcon> = {
  check: CheckCheck,
  reparatur: Wrench,
  reinigung: Sparkles,
  inspektion: Search,
};
const TYPES: MType[] = ["check", "reparatur", "reinigung", "inspektion"];

const STATUS_TONES: Array<{ icon: LucideIcon; cls: string }> = [
  { icon: CheckCircle2, cls: "border-success/25 bg-success/5 text-success" },
  { icon: Clock, cls: "border-warning/30 bg-warning/5 text-warning" },
  { icon: AlertTriangle, cls: "border-destructive/25 bg-destructive/5 text-destructive" },
];

/** Per-device maintenance status rows. */
export function ServiceStatusMock() {
  const { t } = useTranslation();
  const devices = tArray<{ label: string; interval: string; text: string }>(t, "landing.features.service.demo_devices");

  return (
    <div className="space-y-2">
      {devices.map((d, i) => {
        const tone = STATUS_TONES[i % STATUS_TONES.length];
        const Icon = tone.icon;
        return (
          <div key={d.label} className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="font-medium">{d.label}</span>
              <span className="tech text-muted-foreground">
                {t("landing.features.service.interval_label", { interval: d.interval })}
              </span>
            </div>
            <div className={cn("flex items-center gap-2 border-t px-3 py-2 text-[13px]", tone.cls)}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{d.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Interactive "new maintenance entry" form look-alike. */
export function ServiceFormMock() {
  const { t } = useTranslation();
  const [active, setActive] = useState<MType>("check");

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-semibold">{t("landing.features.service.form_title")}</span>
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground">
            <CheckCheck className="h-3.5 w-3.5" />
            {t("maintenance.quick_confirm")}
          </span>
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5" role="group">
          {TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActive(type)}
                aria-pressed={active === type}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
                  active === type
                    ? "border-foreground/40 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`landing.features.service.type_labels.${type}`)}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          <MockField label={t("maintenance.form.date_label")} value={<span className="tech">15.05.2026</span>} />
          <MockField label={t("maintenance.form.cost_label")} value={<span className="tech">€ —</span>} muted />
        </div>
        <div
          className="h-16 rounded-md border border-input bg-background px-2.5 py-2 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          {t("maintenance.form.notes_placeholder")}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1" aria-hidden="true">
          <span className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {t("landing.features.service.form_photo_btn")}
          </span>
          <div className="flex gap-1.5">
            <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground">{t("common.cancel")}</span>
            <span className="flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
              {t("common.save")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Chronological maintenance history. */
export function ServiceTimelineMock() {
  const { t } = useTranslation();
  const records = tArray<{ type: MType; ago: string; notes: string; cost?: string }>(
    t,
    "landing.features.service.demo_records"
  );

  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {records.map((rec, idx) => {
        const Icon = TYPE_ICONS[rec.type] ?? CheckCheck;
        return (
          <li key={`${rec.type}-${idx}`} className="relative">
            <span className="absolute -left-[27px] top-3 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border-strong bg-background">
              {idx === 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            <div className="rounded-md border border-border bg-card px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[13px] font-medium">{t(`landing.features.service.type_labels.${rec.type}`)}</span>
                <span className="text-xs text-muted-foreground">{rec.ago}</span>
                {rec.cost && <span className="tech ml-auto text-xs text-muted-foreground">€ {rec.cost}</span>}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{rec.notes}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Small add button row shown under the status list. */
export function ServiceActionsMock() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2" aria-hidden="true">
      <Button size="sm" className="pointer-events-none flex-1" tabIndex={-1}>
        <CheckCheck />
        {t("maintenance.quick_confirm")}
      </Button>
      <Button size="sm" variant="outline" className="pointer-events-none" tabIndex={-1}>
        <Plus />
        {t("maintenance.add_entry")}
      </Button>
    </div>
  );
}

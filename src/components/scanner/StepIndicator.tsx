import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type WizardStep } from "./types";

/** Four-segment progress bar; labels appear from `sm` upwards. */
export function StepIndicator({ step }: { step: WizardStep }) {
  const { t } = useTranslation();
  const current = WIZARD_STEPS.indexOf(step);

  return (
    <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label={t("scanner.step.progress", { current: current + 1, total: WIZARD_STEPS.length })}>
      {WIZARD_STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined}>
          <div className={cn("h-0.5 rounded-full", i <= current ? "bg-primary" : "bg-border")} />
          <p
            className={cn(
              "mt-2 hidden truncate text-xs sm:block",
              i === current ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="tech mr-1.5 text-muted-foreground">{i + 1}</span>
            {t(`scanner.step.${s}`)}
          </p>
        </li>
      ))}
    </ol>
  );
}

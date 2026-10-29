import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { ALL_ACCENTS, type AccentColor } from "@/lib/appearanceUtils";
import { cn } from "@/lib/utils";

/** One representative swatch per accent (actual light/dark values live in index.css). */
const ACCENT_SWATCH: Record<AccentColor, string> = {
  amber: "#f59e0b",
  mint: "#10b981",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  rose: "#e11d48",
};

interface Props {
  value: AccentColor;
  onChange: (accent: AccentColor) => void;
}

export function AccentPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t("appearance.section.accent_color")} className="flex flex-wrap gap-1.5">
      {ALL_ACCENTS.map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(`appearance.accent.${id}`)}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-border-strong bg-muted text-foreground"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            <span
              aria-hidden
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
              style={{ background: ACCENT_SWATCH[id] }}
            >
              {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </span>
            {t(`appearance.accent.${id}`)}
          </button>
        );
      })}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type DMXViewMode = "timeline" | "table";

interface ViewToggleProps {
  value: DMXViewMode;
  onChange: (mode: DMXViewMode) => void;
}

/** Segmented control: timeline vs. table. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const { t } = useTranslation();
  const options = [
    { mode: "timeline" as const, icon: LayoutGrid, label: t("dmx.view_timeline") },
    { mode: "table" as const, icon: List, label: t("dmx.view_table") },
  ];

  return (
    <div role="radiogroup" className="flex h-9 items-center rounded-md border border-input bg-background p-0.5">
      {options.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          aria-label={label}
          title={label}
          onClick={() => onChange(mode)}
          className={cn(
            "flex h-full items-center rounded-[4px] px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === mode ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

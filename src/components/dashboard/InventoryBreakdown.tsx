import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardPanel, PanelEmpty } from "@/components/dashboard/DashboardPanel";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

const LIMIT = 6;

type Mode = "category" | "location";

interface InventoryBreakdownProps {
  items: InventoryItem[];
}

/** Quantity per category / location as plain horizontal bars. */
export function InventoryBreakdown({ items }: InventoryBreakdownProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>("category");
  const numberLocale = i18n.language.startsWith("de") ? "de-DE" : "en-US";

  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = mode === "category" ? item.category : item.location?.trim() || "";
      counts.set(key, (counts.get(key) ?? 0) + item.quantity);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, mode]);

  const max = rows[0]?.[1] ?? 0;
  const visible = rows.slice(0, LIMIT);

  const label = (key: string) => {
    if (!key) return t("dashboard.breakdown.unassigned");
    return mode === "category" ? t(`categories.${key}`, { defaultValue: key }) : key;
  };

  const href = (key: string) =>
    mode === "category"
      ? `/inventory?category=${encodeURIComponent(key)}`
      : `/inventory?location=${encodeURIComponent(key)}`;

  const toggle = (
    <div role="tablist" className="flex rounded-md border border-border p-0.5">
      {(["category", "location"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            "h-6 rounded-[4px] px-2 text-[12px] font-medium transition-colors",
            mode === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "category" ? t("fields.category") : t("fields.location")}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardPanel title={t("dashboard.breakdown.title")} actions={toggle}>
      {visible.length === 0 ? (
        <PanelEmpty>
          {mode === "category" ? t("dashboard.charts.no_categories") : t("dashboard.charts.no_locations")}
        </PanelEmpty>
      ) : (
        <ul className="space-y-0.5 px-2 py-2">
          {visible.map(([key, count]) => (
            <li key={key || "__none"}>
              <Link
                to={key ? href(key) : "/inventory"}
                className="block rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate">{label(key)}</span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {count.toLocaleString(numberLocale)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{ width: `${max > 0 ? Math.max((count / max) * 100, 2) : 0}%` }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}

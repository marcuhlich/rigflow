import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isValid, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { DashboardPanel, PanelEmpty } from "@/components/dashboard/DashboardPanel";
import type { LendingRecord } from "@/hooks/useLendingHistory";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

const LIMIT = 8;

type ActivityType = "lent" | "returned" | "defect";

interface Activity {
  key: string;
  itemId: string;
  message: string;
  time: Date;
  type: ActivityType;
}

const DOT: Record<ActivityType, string> = {
  lent: "bg-warning",
  returned: "bg-success",
  defect: "bg-destructive",
};

interface RecentActivityProps {
  activeLoans: LendingRecord[];
  completedLoans: LendingRecord[];
  items: InventoryItem[];
}

/** Latest loans, returns and defect reports, newest first. */
export function RecentActivity({ activeLoans, completedLoans, items }: RecentActivityProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? de : enUS;

  const activities = useMemo(() => {
    const list: Activity[] = [];
    const push = (a: Omit<Activity, "time"> & { time: string | null | undefined }) => {
      if (!a.time) return;
      const time = parseISO(a.time);
      if (isValid(time)) list.push({ ...a, time });
    };

    activeLoans.forEach((r) =>
      push({
        key: `lent-${r.id}`,
        itemId: r.item_id,
        message: t("dashboard.activity.lent_to", { item: r.item_name, person: r.lent_to }),
        time: r.created_at,
        type: "lent",
      })
    );
    completedLoans.forEach((r) =>
      push({
        key: `returned-${r.id}`,
        itemId: r.item_id,
        message: t("dashboard.activity.returned_from", { item: r.item_name, person: r.lent_to }),
        time: r.returned_at,
        type: "returned",
      })
    );
    items.forEach((item) => {
      if (item.condition !== "defekt") return;
      push({
        key: `defect-${item.id}`,
        itemId: item.id,
        message: t("dashboard.activity.marked_defect", { item: item.name }),
        time: item.updated_at,
        type: "defect",
      });
    });

    return list.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, LIMIT);
  }, [activeLoans, completedLoans, items, t]);

  return (
    <DashboardPanel
      title={t("dashboard.charts.recent_activity")}
      link={{ to: "/lending", label: t("dashboard.all_loans") }}
    >
      {activities.length === 0 ? (
        <PanelEmpty>{t("dashboard.charts.no_activity")}</PanelEmpty>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((a) => (
            <li key={a.key}>
              <Link
                to={`/inventory/${a.itemId}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[a.type])} aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[13px]">{a.message}</p>
                <time
                  dateTime={a.time.toISOString()}
                  className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
                >
                  {format(a.time, "dd.MM. HH:mm", { locale })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}

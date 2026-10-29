import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  active: number;
  overdue: number;
  returned: number;
  total: number;
}

/** One bordered strip, four plain figures. Only "overdue" gets colour, and only when > 0. */
export function LendingStats({ active, overdue, returned, total }: Props) {
  const { t } = useTranslation();
  const cells = [
    { key: "active",   label: t("lending.stat_active"),   value: active },
    { key: "overdue",  label: t("lending.stat_overdue"),  value: overdue, alert: overdue > 0 },
    { key: "returned", label: t("lending.stat_returned"), value: returned },
    { key: "total",    label: t("lending.stat_total"),    value: total },
  ];

  return (
    <dl className="surface grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x [&>div:nth-child(-n+2)]:border-b [&>div:nth-child(-n+2)]:border-border sm:[&>div:nth-child(-n+2)]:border-b-0 [&>div:nth-child(odd)]:border-r [&>div:nth-child(odd)]:border-border sm:[&>div:nth-child(odd)]:border-r-0">
      {cells.map(c => (
        <div key={c.key} className="px-4 py-3">
          <dt className={cn("text-xs text-muted-foreground", c.alert && "text-destructive")}>{c.label}</dt>
          <dd className={cn("tech mt-0.5 text-xl font-semibold", c.alert && "text-destructive")}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

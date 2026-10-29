import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/StatCard";

export interface InventoryStats {
  total: number;
  available: number;
  lent: number;
  inUse: number;
  defect: number;
}

interface KpiRowProps {
  stats: InventoryStats;
  totalValue: number;
}

/** Five inventory KPIs in one hairline grid. Tiles link to the filtered list. */
export function KpiRow({ stats, totalValue }: KpiRowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-US";
  const fmt = (n: number) => n.toLocaleString(locale);

  const value =
    totalValue > 0
      ? totalValue.toLocaleString(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
      : null;

  return (
    <section
      aria-label={t("dashboard.subtitle")}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5"
    >
      <StatCard
        title={t("dashboard.stat.total")}
        value={fmt(stats.total)}
        hint={value ? `${t("fields.total_value")} ${value}` : undefined}
        to="/inventory"
        className="col-span-2 bg-card sm:col-span-1"
      />
      <StatCard
        title={t("dashboard.stat.available")}
        value={fmt(stats.available)}
        tone="success"
        to="/inventory?filter=verfügbar"
        className="bg-card"
      />
      <StatCard
        title={t("dashboard.stat.lent")}
        value={fmt(stats.lent)}
        tone="warning"
        to="/lending"
        className="bg-card"
      />
      <StatCard
        title={t("dashboard.stat.in_use")}
        value={fmt(stats.inUse)}
        tone="info"
        to="/inventory?filter=in-einsatz"
        className="bg-card"
      />
      <StatCard
        title={t("dashboard.stat.defect")}
        value={fmt(stats.defect)}
        tone="destructive"
        emphasize={stats.defect > 0}
        to="/inventory?filter=defekt"
        className="bg-card"
      />
    </section>
  );
}

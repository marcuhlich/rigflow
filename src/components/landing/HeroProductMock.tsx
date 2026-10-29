import { FolderKanban, HandCoins, LayoutDashboard, Package, ScanLine, Search, Sliders } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import { tArray } from "./tArray";

type StatusVariant = "available" | "lent" | "inUse" | "defect";

// Technical mock values (IDs, quantities) are data, not copy.
const ROW_META: Array<{ id: string; qty: string; categoryKey: string; variant: StatusVariant }> = [
  { id: "RF-0142", qty: "2", categoryKey: "categories.audio", variant: "available" },
  { id: "RF-0187", qty: "4", categoryKey: "categories.licht", variant: "lent" },
  { id: "RF-0203", qty: "6", categoryKey: "categories.audio", variant: "available" },
  { id: "RF-0311", qty: "8", categoryKey: "categories.strom", variant: "inUse" },
];

const NAV = [
  { icon: LayoutDashboard, key: "nav.dashboard" },
  { icon: Package, key: "nav.inventory", active: true },
  { icon: FolderKanban, key: "nav.projects" },
  { icon: HandCoins, key: "nav.lending" },
  { icon: Sliders, key: "nav.dmx" },
  { icon: ScanLine, key: "nav.scanner" },
];

/** Stylised inventory screen built from plain elements, used as the hero "screenshot". */
export function HeroProductMock() {
  const { t } = useTranslation();
  const items = tArray<{ name: string; status: string }>(t, "landing.home.inventory_section.demo_items");
  const rows = items.slice(0, ROW_META.length).map((item, i) => ({ ...item, ...ROW_META[i] }));

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-background text-left"
      aria-hidden="true"
    >
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
        {/* Sidebar */}
        <aside className="hidden border-r border-border bg-surface-sunken p-3 md:block">
          <Logo className="mb-5 px-1.5" />
          <ul className="space-y-0.5">
            {NAV.map(({ icon: Icon, key, active }) => (
              <li
                key={key}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md border px-2 text-[13px]",
                  active ? "border-border bg-background font-medium text-foreground" : "border-transparent text-muted-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} strokeWidth={1.75} />
                {t(key)}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">{t("nav.inventory")}</div>
              <div className="text-xs text-muted-foreground">
                {t("inventory.items_found", { count: rows.length })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden h-8 w-44 items-center gap-2 rounded-md border border-input px-2.5 text-xs text-muted-foreground sm:flex">
                <Search className="h-3.5 w-3.5" />
                {t("common.search")}
              </div>
              <div className="flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                {t("inventory.new_item")}
              </div>
            </div>
          </div>

          <table className="w-full text-[13px]">
            <thead className="bg-surface-sunken text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">{t("fields.name")}</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">{t("fields.category")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("fields.quantity")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("fields.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{row.name}</div>
                    <div className="tech text-xs text-muted-foreground">{row.id}</div>
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">{t(row.categoryKey)}</td>
                  <td className="tech px-3 py-2.5 text-right">{row.qty}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.variant}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

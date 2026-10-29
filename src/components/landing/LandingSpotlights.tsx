import { Package, QrCode, ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CheckList } from "./CheckList";
import { ProductFrame } from "./ProductFrame";
import { Section, Split, SplitText } from "./Section";
import { tArray } from "./tArray";

type StatusVariant = "available" | "lent" | "inUse";
const INV_VARIANTS: StatusVariant[] = ["available", "lent", "available", "inUse"];
const INV_IDS = ["RF-0142", "RF-0187", "RF-0203", "RF-0311"];

/** Static scan viewfinder: corner brackets around a QR glyph, plus a result row. */
function ScanMock() {
  const { t } = useTranslation();
  const items = tArray<{ name: string; status: string }>(t, "landing.home.inventory_section.demo_items");
  const first = items[0];

  return (
    <ProductFrame
      title={
        <>
          <ScanLine className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          {t("nav.scanner")}
        </>
      }
      bodyClassName="p-4 sm:p-6"
    >
      <div className="relative mx-auto flex aspect-square max-w-[220px] items-center justify-center rounded-md border border-border bg-surface-sunken">
        <span className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-foreground/70" />
        <span className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-foreground/70" />
        <span className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-foreground/70" />
        <span className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-foreground/70" />
        <span className="absolute inset-x-6 top-1/2 h-px bg-primary" />
        <QrCode className="h-14 w-14 text-muted-foreground/60" strokeWidth={1.25} />
      </div>
      {first && (
        <div className="mx-auto mt-4 flex max-w-[260px] items-center gap-3 rounded-md border border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{first.name}</div>
            <div className="tech text-xs text-muted-foreground">{INV_IDS[0]}</div>
          </div>
          <Badge variant="available">{first.status}</Badge>
        </div>
      )}
    </ProductFrame>
  );
}

function InventoryListMock() {
  const { t } = useTranslation();
  const items = tArray<{ name: string; status: string }>(t, "landing.home.inventory_section.demo_items");

  return (
    <ProductFrame
      title={
        <>
          <Package className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          {t("nav.inventory")}
        </>
      }
    >
      <ul className="divide-y divide-border">
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center gap-3 px-4 py-2.5">
            <QrCode className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{item.name}</div>
              <div className="tech text-xs text-muted-foreground">{INV_IDS[i]}</div>
            </div>
            <Badge variant={INV_VARIANTS[i] ?? "available"}>{item.status}</Badge>
          </li>
        ))}
      </ul>
    </ProductFrame>
  );
}

function ProjectMock() {
  const { t } = useTranslation();
  const packages = tArray<{ name: string; items: number; done: number }>(t, "landing.home.project_section.demo_packages");

  return (
    <ProductFrame
      title={
        <span className="truncate">
          {t("landing.home.project_section.demo_project_prefix")} {t("landing.home.project_section.demo_project_name")}
        </span>
      }
      actions={<Badge variant="inUse">{t("landing.home.project_section.demo_status_active")}</Badge>}
    >
      <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        {t("landing.home.project_section.demo_project_meta")}
      </div>
      <ul className="divide-y divide-border">
        {packages.map((pkg) => {
          const pct = pkg.items > 0 ? Math.round((pkg.done / pkg.items) * 100) : 0;
          const complete = pkg.done >= pkg.items;
          return (
            <li key={pkg.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="font-medium">{pkg.name}</span>
                <span className="tech text-xs text-muted-foreground">
                  {pkg.done}/{pkg.items} {t("landing.home.project_section.demo_ready")}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={complete ? "h-full bg-success" : "h-full bg-warning"}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border bg-surface-sunken px-4 py-2.5 text-xs text-muted-foreground">
        {t("landing.home.project_section.demo_availability")}
      </div>
    </ProductFrame>
  );
}

/** Three alternating text + mock rows: scanning, inventory, projects. */
export function LandingSpotlights() {
  const { t } = useTranslation();
  const subFeatures = tArray<{ label: string; desc: string }>(t, "landing.home.project_section.sub_features");

  return (
    <Section>
      <div className="space-y-20 sm:space-y-24">
        <Split
          text={
            <SplitText title={t("landing.home.qr_section.title")} description={t("landing.home.qr_section.description")}>
              <CheckList items={tArray<string>(t, "landing.home.qr_section.items")} />
            </SplitText>
          }
          visual={<ScanMock />}
        />
        <Split
          reverse
          text={
            <SplitText
              title={t("landing.home.inventory_section.title")}
              description={t("landing.home.inventory_section.description")}
            >
              <CheckList items={tArray<string>(t, "landing.home.inventory_section.items")} />
            </SplitText>
          }
          visual={<InventoryListMock />}
        />
        <Split
          text={
            <SplitText
              eyebrow={t("landing.home.project_section.badge")}
              title={t("landing.home.project_section.title")}
              description={t("landing.home.project_section.description")}
            >
              <CheckList items={subFeatures.map((f) => ({ label: f.label, desc: f.desc }))} />
            </SplitText>
          }
          visual={<ProjectMock />}
        />
      </div>
    </Section>
  );
}

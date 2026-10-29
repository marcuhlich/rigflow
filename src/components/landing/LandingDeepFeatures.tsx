import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Section } from "./Section";
import { tArray } from "./tArray";

type TechCard = { title: string; tag: string; description: string; link_label: string };
type DmxRow = { ch: string; name: string; mode: string };
type SvcRow = { name: string; date: string; status: string };

const LINKS = ["/features/dmx", "/features/service", "/features/scanner"];
const DMX_CONFLICT = [false, false, true];
const SVC_VARIANTS = ["available", "lent", "defect"] as const;

function DmxPreview() {
  const { t } = useTranslation();
  const rows = tArray<DmxRow>(t, "landing.home.tech_section.dmx_preview_rows");
  return (
    <ul className="divide-y divide-border">
      {rows.map((r, i) => (
        <li key={r.ch} className={cn("flex items-center gap-3 px-3 py-2 text-xs", DMX_CONFLICT[i] && "bg-destructive/5")}>
          <span className="tech w-8 text-muted-foreground">{r.ch}</span>
          <span className="flex-1 truncate">{r.name}</span>
          <span className="tech text-muted-foreground">{r.mode}</span>
          {DMX_CONFLICT[i] && <Badge variant="defect">{t("landing.home.tech_section.conflict_label")}</Badge>}
        </li>
      ))}
    </ul>
  );
}

function ServicePreview() {
  const { t } = useTranslation();
  const rows = tArray<SvcRow>(t, "landing.home.tech_section.service_preview_rows");
  return (
    <ul className="divide-y divide-border">
      {rows.map((r, i) => (
        <li key={r.name} className="flex items-center gap-3 px-3 py-2 text-xs">
          <span className="flex-1 truncate">{r.name}</span>
          <span className="tech text-muted-foreground">{r.date}</span>
          <Badge variant={SVC_VARIANTS[i] ?? "available"}>{r.status}</Badge>
        </li>
      ))}
    </ul>
  );
}

function ScannerPreview() {
  const { t } = useTranslation();
  const modes = tArray<string>(t, "landing.home.tech_section.scanner_modes");
  return (
    <ul className="divide-y divide-border">
      {modes.map((m, i) => (
        <li key={m} className="flex items-center gap-3 px-3 py-2 text-xs">
          <span className="tech w-5 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
          <span className={cn("flex-1", i === 1 && "font-medium")}>{m}</span>
          {i === 1 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </li>
      ))}
    </ul>
  );
}

const PREVIEWS: ReactNode[] = [<DmxPreview key="dmx" />, <ServicePreview key="svc" />, <ScannerPreview key="scan" />];

/** Cards linking to the dedicated feature pages, each with a small technical preview. */
export function LandingDeepFeatures() {
  const { t } = useTranslation();
  const cards = tArray<TechCard>(t, "landing.home.tech_section.cards");

  return (
    <Section
      sunken
      eyebrow={t("landing.home.tech_section.badge")}
      title={t("landing.home.tech_section.title")}
      description={t("landing.home.tech_section.description")}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card, i) => (
          <Link
            key={card.title}
            to={LINKS[i] ?? "/landing"}
            className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="eyebrow">{card.tag}</p>
            <h3 className="mt-2 text-base font-semibold">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{card.description}</p>
            <div className="mt-5 flex-1 overflow-hidden rounded-md border border-border bg-background" aria-hidden="true">
              {PREVIEWS[i]}
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              {card.link_label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

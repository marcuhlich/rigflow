import { useTranslation } from "react-i18next";
import { Bell, CheckCircle2, FileClock, ImageIcon } from "lucide-react";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { FeatureHero, TwoToneTitle } from "@/components/landing/FeatureHero";
import { Section } from "@/components/landing/Section";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CheckList } from "@/components/landing/CheckList";
import { CtaBand } from "@/components/landing/CtaBand";
import { tArray } from "@/components/landing/tArray";
import {
  ServiceActionsMock,
  ServiceFormMock,
  ServiceStatusMock,
  ServiceTimelineMock,
} from "@/components/landing/features/ServiceMock";

const BENEFIT_ICONS = [FileClock, Bell, ImageIcon, CheckCircle2];

export default function ServiceInstandhaltung() {
  const { t } = useTranslation();

  const benefits = tArray<{ title: string; desc: string }>(t, "landing.features.service.benefits.items").map((b, i) => ({
    icon: BENEFIT_ICONS[i % BENEFIT_ICONS.length],
    title: b.title,
    description: b.desc,
  }));
  const tracked = tArray<string>(t, "landing.features.service.tracked.items");

  return (
    <MarketingLayout>
      <FeatureHero
        eyebrow={t("landing.features.service.hero.badge")}
        title={
          <TwoToneTitle
            first={t("landing.features.service.hero.title_line1")}
            second={t("landing.features.service.hero.title_highlight")}
          />
        }
        description={t("landing.features.service.hero.description")}
      />

      <Section sunken>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="eyebrow">{t("landing.features.service.status_section_title")}</p>
            <ServiceStatusMock />
            <ServiceActionsMock />
            <ServiceFormMock />
          </div>
          <div className="space-y-4">
            <p className="eyebrow">{t("landing.features.service.timeline_title")}</p>
            <ServiceTimelineMock />
          </div>
        </div>
      </Section>

      <Section title={t("landing.features.service.benefits.title")}>
        <FeatureGrid items={benefits} columns={2} />
      </Section>

      <Section className="[&>div]:pt-0" title={t("landing.features.service.tracked.title")}>
        <CheckList items={tracked} className="grid grid-cols-1 gap-x-8 space-y-0 gap-y-2.5 sm:grid-cols-2" />
      </Section>

      <CtaBand title={t("landing.features.service.cta.title")} />
    </MarketingLayout>
  );
}

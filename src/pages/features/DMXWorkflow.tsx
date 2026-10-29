import { Trans, useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Printer, Calculator } from "lucide-react";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { FeatureHero } from "@/components/landing/FeatureHero";
import { Section } from "@/components/landing/Section";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CtaBand } from "@/components/landing/CtaBand";
import { tArray } from "@/components/landing/tArray";
import { DmxPatchMock } from "@/components/landing/features/DmxPatchMock";

const EXPORT_ICONS = [FileSpreadsheet, FileText, Printer];
const BENEFIT_ICONS = [Calculator, AlertTriangle, CheckCircle2];

export default function DMXWorkflow() {
  const { t } = useTranslation();

  const exportItems = tArray<{ label: string; desc: string }>(t, "landing.features.dmxWorkflow.export.items").map(
    (e, i) => ({ icon: EXPORT_ICONS[i % EXPORT_ICONS.length], title: e.label, description: e.desc })
  );
  const benefitItems = tArray<{ title: string; desc: string }>(t, "landing.features.dmxWorkflow.benefits.items").map(
    (b, i) => ({ icon: BENEFIT_ICONS[i % BENEFIT_ICONS.length], title: b.title, description: b.desc })
  );

  return (
    <MarketingLayout>
      <FeatureHero
        eyebrow={t("landing.features.dmxWorkflow.hero.badge")}
        title={
          <Trans
            i18nKey="landing.features.dmxWorkflow.hero.title"
            components={{
              br: <br className="hidden sm:block" />,
              highlight: <span className="text-muted-foreground" />,
            }}
          />
        }
        description={t("landing.features.dmxWorkflow.hero.description")}
      />

      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <DmxPatchMock />
      </div>

      <Section title={t("landing.features.dmxWorkflow.export.title")}>
        <FeatureGrid items={exportItems} />
      </Section>

      <Section className="pt-0 [&>div]:pt-0" title={t("landing.features.dmxWorkflow.benefits.title")}>
        <FeatureGrid items={benefitItems} />
      </Section>

      <CtaBand title={t("landing.features.dmxWorkflow.cta.title")} />
    </MarketingLayout>
  );
}

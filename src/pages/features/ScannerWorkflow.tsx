import { useTranslation } from "react-i18next";
import { AlertTriangle, ClipboardList, FolderKanban, MapPin, Package, RotateCcw, Truck } from "lucide-react";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { FeatureHero, TwoToneTitle } from "@/components/landing/FeatureHero";
import { Section } from "@/components/landing/Section";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CtaBand } from "@/components/landing/CtaBand";
import { ScannerDemo } from "@/components/landing/features/ScannerDemo";

const MODE_FEATURES = [
  { id: "verleih", icon: Truck },
  { id: "aufbau", icon: Package },
  { id: "abbau", icon: RotateCcw },
  { id: "inventur", icon: ClipboardList },
] as const;

const PROJECT_FEATURES = [
  { id: "check", icon: FolderKanban },
  { id: "not_in_set", icon: AlertTriangle },
  { id: "location_update", icon: MapPin },
] as const;

export default function ScannerWorkflow() {
  const { t } = useTranslation();

  const modeItems = MODE_FEATURES.map((f) => ({
    icon: f.icon,
    title: t(`scanner_workflow.features.${f.id}.title`),
    description: t(`scanner_workflow.features.${f.id}.desc`),
  }));
  const projectItems = PROJECT_FEATURES.map((f) => ({
    icon: f.icon,
    title: t(`scanner_workflow.project_integration.${f.id}.title`),
    description: t(`scanner_workflow.project_integration.${f.id}.desc`),
  }));

  return (
    <MarketingLayout>
      <FeatureHero
        eyebrow={t("scanner_workflow.badge")}
        title={<TwoToneTitle first={t("scanner_workflow.hero_title_1")} second={t("scanner_workflow.hero_title_2")} />}
        description={t("scanner_workflow.hero_description")}
        ctaLabel={t("scanner_workflow.try_now")}
      />

      <Section sunken title={t("scanner_workflow.demo.section_title")}>
        <ScannerDemo />
      </Section>

      <Section title={t("scanner_workflow.features.section_title")}>
        <FeatureGrid items={modeItems} columns={2} />
      </Section>

      <Section className="[&>div]:pt-0" title={t("scanner_workflow.project_integration.section_title")}>
        <FeatureGrid items={projectItems} />
      </Section>

      <CtaBand title={t("scanner_workflow.cta.title")} buttonLabel={t("scanner_workflow.cta.button")} />
    </MarketingLayout>
  );
}

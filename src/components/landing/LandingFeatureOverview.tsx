import { ClipboardList, History, QrCode, RefreshCw, SlidersHorizontal, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureGrid } from "./FeatureGrid";
import { Section } from "./Section";
import { tArray } from "./tArray";

const ICONS = [WifiOff, QrCode, ClipboardList, RefreshCw, SlidersHorizontal, History];
const STEP_KEYS = ["step1", "step2", "step3"] as const;

/** Anchor target "#features": feature grid plus a three-step "how it works". */
export function LandingFeatureOverview() {
  const { t } = useTranslation();
  const items = tArray<{ title: string; description: string }>(t, "landing.home.features_section.items").map(
    (f, i) => ({ ...f, icon: ICONS[i % ICONS.length] })
  );

  return (
    <>
      <Section
        id="features"
        title={t("landing.home.features_section.title")}
        description={t("landing.home.features_section.description")}
      >
        <FeatureGrid items={items} />
      </Section>

      <Section sunken eyebrow={t("landing.home.how.eyebrow")} title={t("landing.home.how.title")}>
        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="border-t border-border-strong pt-4">
              <span className="tech text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-sm font-semibold">{t(`landing.home.how.${key}_title`)}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {t(`landing.home.how.${key}_desc`)}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

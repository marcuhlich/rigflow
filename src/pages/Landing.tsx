import { useTranslation } from "react-i18next";
import { isNative } from "@/services/platform";
import { NativeWelcome } from "@/components/onboarding/NativeWelcome";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatureOverview } from "@/components/landing/LandingFeatureOverview";
import { LandingSpotlights } from "@/components/landing/LandingSpotlights";
import { LandingDeepFeatures } from "@/components/landing/LandingDeepFeatures";
import { LandingTrust } from "@/components/landing/LandingTrust";
import { CtaBand } from "@/components/landing/CtaBand";

function WebLanding() {
  const { t } = useTranslation();
  return (
    <MarketingLayout>
      <LandingHero />
      <LandingFeatureOverview />
      <LandingSpotlights />
      <LandingDeepFeatures />
      <LandingTrust />
      <CtaBand
        title={t("landing.home.cta_section.title")}
        buttonLabel={t("landing.home.cta_section.btn")}
        note={t("landing.home.cta_section.no_cc")}
      />
    </MarketingLayout>
  );
}

export default function Landing() {
  // Hooks live in the child components, so this early branch is safe.
  return isNative() ? <NativeWelcome /> : <WebLanding />;
}

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface FeatureHeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  ctaLabel?: string;
}

/** Hero block for the individual feature pages. */
export function FeatureHero({ eyebrow, title, description, ctaLabel }: FeatureHeroProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <Link to="/register">
              {ctaLabel ?? t("landing.common.tryNow")}
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/landing#features">{t("landing.home.hero.cta_features")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Two-tone headline: first part in foreground, second part muted. */
export function TwoToneTitle({ first, second }: { first: ReactNode; second: ReactNode }) {
  return (
    <>
      {first} <span className="text-muted-foreground">{second}</span>
    </>
  );
}

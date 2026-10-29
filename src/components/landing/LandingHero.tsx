import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HeroProductMock } from "./HeroProductMock";

export function LandingHero() {
  const { t } = useTranslation();

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="text-[36px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">
            {t("landing.home.hero.title_line1")}{" "}
            <span className="text-muted-foreground">{t("landing.home.hero.title_highlight")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("landing.home.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button size="lg" asChild>
              <Link to="/register">
                {t("landing.common.startFree")}
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">{t("landing.home.hero.cta_features")}</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("landing.home.hero.no_cc")}</p>
        </div>

        {/* Screenshot frame bleeds into the next section */}
        <div className="mt-14 sm:mt-16">
          <div className="rounded-t-xl border border-b-0 border-border bg-surface-sunken p-2 pb-0 sm:p-3 sm:pb-0">
            <div className="[&>div]:rounded-b-none [&>div]:border-b-0">
              <HeroProductMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

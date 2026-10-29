import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

/** First screen of the native (Capacitor) app for signed-out users. */
export function NativeWelcome() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 pb-safe pt-safe">
      <div className="pt-6">
        <Logo />
      </div>

      <div className="flex flex-1 flex-col justify-end pb-10">
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-tight">
          {t("landing.home.native.headline_1")}{" "}
          <span className="text-muted-foreground">{t("landing.home.native.headline_2")}</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{t("landing.home.native.subtitle")}</p>

        <div className="mt-8 flex flex-col gap-2">
          <Button size="lg" className="h-11 w-full" asChild>
            <Link to="/register">{t("landing.home.native.cta_register")}</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 w-full" asChild>
            <Link to="/auth?step=login">{t("landing.home.header.login")}</Link>
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-5 border-t border-border py-4 text-xs text-muted-foreground">
        <Link to="/impressum" className="hover:text-foreground">
          {t("settings.imprint_link")}
        </Link>
        <Link to="/datenschutz" className="hover:text-foreground">
          {t("landing.home.footer.privacy")}
        </Link>
        <Link to="/nutzungsbedingungen" className="hover:text-foreground">
          {t("settings.terms_link")}
        </Link>
      </div>
    </div>
  );
}

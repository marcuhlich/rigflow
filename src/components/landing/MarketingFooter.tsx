import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/layout/Logo";

const CONTACT_EMAIL = "rigflow.app@gmail.com";

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}

export function MarketingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border pb-safe">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <Logo />
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              {t("landing.home.footer.brand_desc")}
            </p>
          </div>

          <div>
            <p className="eyebrow mb-3">{t("landing.home.footer.col_product")}</p>
            <ul className="space-y-2">
              <FooterLink to="/landing#features">{t("landing.home.footer.link_features")}</FooterLink>
              <FooterLink to="/features/dmx">{t("landing.home.footer.link_dmx")}</FooterLink>
              <FooterLink to="/features/scanner">{t("nav.scanner")}</FooterLink>
              <FooterLink to="/features/service">{t("landing.nav.service")}</FooterLink>
              <FooterLink to="/install">{t("landing.home.header.install")}</FooterLink>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">{t("landing.home.footer.col_legal")}</p>
            <ul className="space-y-2">
              <FooterLink to="/impressum">{t("settings.imprint_link")}</FooterLink>
              <FooterLink to="/datenschutz">{t("landing.home.footer.privacy")}</FooterLink>
              <FooterLink to="/nutzungsbedingungen">{t("settings.terms_link")}</FooterLink>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">{t("landing.home.footer.col_contact")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="break-all text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">{t("landing.home.footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}

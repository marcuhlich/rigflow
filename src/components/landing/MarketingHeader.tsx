import { Link, NavLink } from "react-router-dom";
import { Download, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import { useInstallAction } from "./useInstallAction";

const NAV = [
  { to: "/landing#features", labelKey: "landing.home.footer.link_features" },
  { to: "/features/dmx", labelKey: "nav.dmx" },
  { to: "/features/scanner", labelKey: "nav.scanner" },
  { to: "/features/service", labelKey: "landing.nav.service" },
];

/** Top bar for all public marketing pages. Solid background, hairline bottom border. */
export function MarketingHeader() {
  const { t } = useTranslation();
  const { showInstall, handleInstall } = useInstallAction();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background pt-safe">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          to="/landing"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label={t("landing.nav.label")}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:text-foreground",
                  isActive && !item.to.includes("#") ? "text-foreground" : "text-muted-foreground"
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {showInstall && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={handleInstall}
                aria-label={t("landing.home.header.install")}
              >
                <Download />
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={handleInstall}>
                <Download />
                {t("landing.home.header.install")}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="sm:hidden" asChild>
            <Link to="/auth?step=login" aria-label={t("landing.home.header.login")}>
              <LogIn />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/auth?step=login">{t("landing.home.header.login")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/register">
              <span className="hidden sm:inline">{t("landing.common.startFree")}</span>
              <span className="sm:hidden">{t("landing.home.header.start_mobile")}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const goBack = () => (location.key === "default" ? navigate("/") : navigate(-1));

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 pb-safe pt-safe">
      <div className="mx-auto w-full max-w-md py-6">
        <Link to="/" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-24">
        <p className="tech text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("notfound.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("notfound.description_prefix")}{" "}
          <code className="break-all rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-foreground">
            {location.pathname}
          </code>{" "}
          {t("notfound.description_suffix")}
        </p>

        <div className="mt-8 flex gap-2">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft />
            {t("common.back")}
          </Button>
          <Button asChild>
            <Link to="/">{t("nav.dashboard")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

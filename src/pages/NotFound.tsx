import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { PackageX, ArrowLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    logger.warn(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">

        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-muted border border-border">
          <PackageX className="w-10 h-10 text-muted-foreground" />
          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
            !
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {t("notfound.badge")}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("notfound.title")}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("notfound.description_prefix")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground border border-border">
              {location.pathname}
            </code>{" "}
            {t("notfound.description_suffix")}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            {t("nav.dashboard")}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { setAnalyticsConsent, initializePostHog } from "@/lib/consentUtils";
import { logger } from "@/lib/logger";
import { tArray } from "@/components/landing/tArray";

interface ConsentScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Analytics consent prompt: bottom sheet on mobile, bottom bar on desktop. */
export default function ConsentScreen({ isOpen, onClose }: ConsentScreenProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConsent = (consentGiven: boolean) => {
    try {
      setAnalyticsConsent(consentGiven);
      initializePostHog();
    } catch (err) {
      // Analytics must never block the app.
      logger.warn("Consent handling failed", err);
    } finally {
      onClose();
    }
  };

  const withItems = tArray<string>(t, "consent.with_analytics_items");
  const privateItems = tArray<string>(t, "consent.private_items");

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4"
    >
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-card shadow-lg">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1">
            <h2 id="consent-title" className="text-sm font-semibold">
              {t("consent.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              <span className="sm:hidden">{t("consent.description")}</span>
              <span className="hidden sm:inline">{t("consent.desktop_description")}</span>{" "}
              <Link to="/datenschutz" className="font-medium text-foreground underline underline-offset-4">
                {t("consent.privacy_link")}
              </Link>
            </p>

            {/* Details only on mobile, where the sheet has room to explain */}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:hidden">
              <div className="rounded-md border border-border bg-surface-sunken p-2.5">
                <dt className="font-medium">{t("consent.with_analytics_title")}</dt>
                {withItems.map((item) => (
                  <dd key={item} className="mt-1 text-muted-foreground">
                    {item}
                  </dd>
                ))}
              </div>
              <div className="rounded-md border border-border bg-surface-sunken p-2.5">
                <dt className="font-medium">{t("consent.private_title_plain")}</dt>
                {privateItems.map((item) => (
                  <dd key={item} className="mt-1 text-muted-foreground">
                    {item}
                  </dd>
                ))}
              </div>
            </dl>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => handleConsent(false)}>
              {t("common.decline")}
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => handleConsent(true)}>
              {t("common.accept")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownDocument } from "@/components/landing/MarkdownDocument";

export default function HelpPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={t("settings.help_link")}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft />
            {t("common.back")}
          </Button>
        }
      />
      <div className="surface px-5 py-6 sm:px-8 sm:py-8">
        <MarkdownDocument deFile="/hilfe.md" enFile="/guide.md" hideTitle />
      </div>
    </div>
  );
}

import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MarkdownDocument } from "./MarkdownDocument";

interface LegalDocumentProps {
  deFile: string;
  enFile: string;
}

/** Reading column for legal pages (imprint, privacy, terms). */
export function LegalDocument({ deFile, enFile }: LegalDocumentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Opened directly (new tab, deep link): there is no history entry to go back to.
  const goBack = () => (location.key === "default" ? navigate("/landing") : navigate(-1));

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2.5 mb-6 text-muted-foreground">
        <ArrowLeft />
        {t("common.back")}
      </Button>
      <MarkdownDocument deFile={deFile} enFile={enFile} />
    </div>
  );
}

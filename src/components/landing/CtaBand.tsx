import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CtaBandProps {
  title: string;
  buttonLabel?: string;
  note?: string;
}

/** Closing call-to-action band at the bottom of marketing pages. */
export function CtaBand({ title, buttonLabel, note }: CtaBandProps) {
  const { t } = useTranslation();
  return (
    <section className="border-t border-border bg-surface-sunken">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {note && <p className="mt-1.5 text-[13px] text-muted-foreground">{note}</p>}
        </div>
        <Button size="lg" asChild>
          <Link to="/register">
            {buttonLabel ?? t("landing.common.startFree")}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

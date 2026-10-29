import { Database, FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CheckList } from "./CheckList";
import { Section } from "./Section";
import { tArray } from "./tArray";

/** Security and data-portability, side by side in one bordered panel. */
export function LandingTrust() {
  const { t } = useTranslation();
  const secItems = tArray<{ label: string; desc: string }>(t, "landing.home.security_section.security.items");

  const exports = [
    {
      icon: FileDown,
      title: t("landing.home.security_section.export.csv_title"),
      desc: t("landing.home.security_section.export.csv_desc"),
    },
    {
      icon: Database,
      title: t("landing.home.security_section.export.sheets_title"),
      desc: t("landing.home.security_section.export.sheets_desc"),
    },
  ];

  return (
    <Section>
      <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-6 sm:p-8">
          <p className="eyebrow mb-3">{t("landing.home.security_section.security.badge")}</p>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("landing.home.security_section.security.title_line1")}{" "}
            {t("landing.home.security_section.security.title_line2")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("landing.home.security_section.security.description")}
          </p>
          <CheckList className="mt-6" items={secItems} />
        </div>

        <div className="p-6 sm:p-8">
          <p className="eyebrow mb-3">{t("landing.home.security_section.export.badge")}</p>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("landing.home.security_section.export.title_line1")}{" "}
            {t("landing.home.security_section.export.title_line2")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("landing.home.security_section.export.description")}
          </p>
          <div className="mt-6 divide-y divide-border rounded-md border border-border">
            {exports.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-[13px] text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

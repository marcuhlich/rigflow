import { useTranslation } from "react-i18next";
import { Package, QrCode, Shield, SlidersHorizontal, Wifi, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Logo } from "@/components/layout/Logo";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";

// App version – hier anpassen
const APP_VERSION = "1.0.0-beta";
const BUILD_YEAR = "2026";

const VALUES = [
  { key: "offline_first", icon: Wifi },
  { key: "qr_workflow", icon: QrCode },
  { key: "dmx_management", icon: SlidersHorizontal },
  { key: "maintenance", icon: Wrench },
  { key: "project_packages", icon: Package },
  { key: "data_security", icon: Shield },
] as const;

export default function AboutRigFlow() {
  const { t } = useTranslation();

  const stackRaw: unknown = t("about.tech_stack", { returnObjects: true });
  const stack = Array.isArray(stackRaw) ? stackRaw.filter((s): s is string => typeof s === "string") : [];

  return (
    <SettingsPage>
      <PageHeader title={t("about.title")} />

      {/* Identity */}
      <section className="surface flex items-center gap-4 px-4 py-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken">
          <Logo withWordmark={false} rivets markClassName="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight">RigFlow</p>
          <p className="tech text-xs text-muted-foreground">{t("about.version", { version: APP_VERSION })}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t("about.hero_description")}</p>
        </div>
      </section>

      <SettingsSection title={t("about.what_is_rigflow")}>
        <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
          <p>{t("about.description_1")}</p>
          <p>{t("about.description_2")}</p>
        </div>
      </SettingsSection>

      <SettingsSection title={t("about.core_features")}>
        {VALUES.map(({ key, icon: Icon }) => (
          <SettingsRow
            key={key}
            label={
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {t(`about.values.${key}.label`)}
              </span>
            }
            description={<span className="block pl-6">{t(`about.values.${key}.desc`)}</span>}
          />
        ))}
      </SettingsSection>

      {stack.length > 0 && (
        <SettingsSection title={t("about.built_with")}>
          <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
            {stack.map((tech) => (
              <span
                key={tech}
                className="rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </SettingsSection>
      )}

      <p className="tech text-center text-xs text-muted-foreground">
        {t("about.footer", { year: BUILD_YEAR, version: APP_VERSION })}
      </p>
    </SettingsPage>
  );
}

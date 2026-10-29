import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

/** Shown instead of the settings area when the shared demo account is signed in. */
export default function DemoBlockedSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [switching, setSwitching] = useState(false);

  const raw: unknown = t("demo.blocked_items", { returnObjects: true });
  const blockedItems = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

  // /auth redirects signed-in users away, so leave the demo session first.
  const signInOwnAccount = async () => {
    setSwitching(true);
    try {
      await signOut();
    } catch {
      /* fall through to /auth anyway */
    }
    navigate("/auth", { replace: true });
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("settings.title")} />

      <section className="surface overflow-hidden">
        <div className="space-y-3 px-5 py-5">
          <Badge variant="outline">{t("demo.badge")}</Badge>
          <h2 className="text-base font-semibold tracking-tight">{t("demo.title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("demo.description")}</p>
        </div>

        {blockedItems.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {blockedItems.map((item) => (
              <li key={item} className="flex items-center gap-3 px-5 py-2.5 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border bg-surface-sunken px-5 py-3.5">
          <p className="text-[13px] font-medium">{t("demo.not_a_bug_title")}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{t("demo.not_a_bug_desc")}</p>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => navigate("/")}>{t("demo.go_dashboard")}</Button>
        <Button variant="outline" onClick={() => void signInOwnAccount()} disabled={switching}>
          {switching && <Loader2 className="animate-spin" />}
          {t("demo.sign_in_own_account")}
        </Button>
      </div>
    </div>
  );
}

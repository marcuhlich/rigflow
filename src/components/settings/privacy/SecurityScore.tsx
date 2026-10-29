import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isNative } from "@/services/platform";
import { checkNativeNotificationPermission } from "@/services/native/notifications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function usePushGranted() {
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (isNative()) {
      checkNativeNotificationPermission()
        .then((p) => {
          if (!cancelled) setGranted(p === "granted");
        })
        .catch(() => undefined);
    } else if ("Notification" in window) {
      setGranted(Notification.permission === "granted");
    }
    return () => {
      cancelled = true;
    };
  }, []);
  return granted;
}

/** Compact security check: score, status badge, progress bar and checklist. */
export function SecurityScore({ hasMfa }: { hasMfa: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pushGranted = usePushGranted();

  const checks = [
    { key: "email", label: t("privacy.score.check_email"), done: !!user?.email_confirmed_at },
    { key: "password", label: t("privacy.score.check_password"), done: true },
    { key: "2fa", label: t("privacy.score.check_2fa"), done: hasMfa },
    { key: "push", label: t("privacy.score.check_push"), done: pushGranted },
  ];
  const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  const level =
    score >= 80
      ? { badge: "available" as const, bar: "bg-success", label: t("privacy.score.label_secure") }
      : score >= 50
        ? { badge: "lent" as const, bar: "bg-warning", label: t("privacy.score.label_fair") }
        : { badge: "defect" as const, bar: "bg-destructive", label: t("privacy.score.label_weak") };

  return (
    <section className="surface px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{t("privacy.score.title", { score })}</p>
        <Badge variant={level.badge}>{level.label}</Badge>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-200", level.bar)} style={{ width: `${score}%` }} />
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-2 text-[13px]">
            {c.done ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-success" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

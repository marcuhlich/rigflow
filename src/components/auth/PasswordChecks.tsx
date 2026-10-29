import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Live password requirement checklist. */
export function PasswordChecks({ password }: { password: string }) {
  const { t } = useTranslation();
  const checks = [
    { label: t("register.password_check_length"), ok: password.length >= 8 },
    { label: t("register.password_check_letter"), ok: /[a-zA-Z]/.test(password) },
    { label: t("register.password_check_digit"), ok: /\d/.test(password) },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {checks.map(({ label, ok }) => (
        <li
          key={label}
          className={cn("flex items-center gap-1 text-xs transition-colors", ok ? "text-success" : "text-muted-foreground")}
        >
          {ok ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {label}
        </li>
      ))}
    </ul>
  );
}

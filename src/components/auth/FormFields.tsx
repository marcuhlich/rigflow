import { forwardRef, ReactNode, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: ReactNode;
  error?: string;
  /** Right side of the label row, e.g. "forgot password" link */
  labelAction?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

/** Label + control + inline error, wired up for screen readers. */
export function Field({ id, label, error, labelAction, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      {children}
      {hint && !error && <div className="text-xs text-muted-foreground">{hint}</div>}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = React.ComponentProps<typeof Input>;

/** Password input with show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={visible ? t("auth.login.hide_password") : t("auth.login.show_password")}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

/** Form-level error banner (e.g. wrong credentials). */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Centered status block used for success / waiting states in auth flows. */
export function AuthStatus({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card">{icon}</div>
      <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
      {description && <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>}
      {children && <div className="mt-7">{children}</div>}
    </div>
  );
}

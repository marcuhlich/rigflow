import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned header slot, e.g. a counter */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled block of fields inside the item form. Sections are separated by hairlines. */
export function FormSection({ title, description, aside, children, className }: FormSectionProps) {
  return (
    <section className={cn('border-t border-border px-4 py-5 first:border-t-0 sm:px-6', className)}>
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {aside}
        </div>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label above control, error (or hint) below. */
export function Field({ id, label, required, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className="block truncate text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-muted-foreground">*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">{actions}</div>}
    </div>
  );
}
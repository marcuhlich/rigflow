import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

export function StatCard({ title, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const bgColors = {
    default: 'bg-muted/30',
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };

  return (
    <div className="glass-card p-3 sm:p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{value}</p>
        </div>
        <div className={cn("p-2 sm:p-3 rounded-lg flex-shrink-0", bgColors[variant])}>
          <Icon className={cn("h-4 w-4 sm:h-6 sm:w-6", iconColors[variant])} />
        </div>
      </div>
    </div>
  );
}

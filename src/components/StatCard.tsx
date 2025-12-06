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
    <div 
      className="glass-card p-5 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={cn("p-3 rounded-lg", bgColors[variant])}>
          <Icon className={cn("h-6 w-6", iconColors[variant])} />
        </div>
      </div>
    </div>
  );
}

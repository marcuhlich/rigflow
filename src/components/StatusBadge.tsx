import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ItemCondition } from "@/types/inventory";
import { getConditionLabel } from "@/i18n/helpers";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  condition: ItemCondition;
  className?: string;
}

const conditionToVariant: Record<ItemCondition, "available" | "lent" | "inUse" | "defect"> = {
  "verfügbar": "available",
  "verliehen": "lent",
  "in-einsatz": "inUse",
  "defekt": "defect",
};

export function StatusBadge({ condition, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  // Unknown values (e.g. legacy rows) fall back to a neutral badge instead of an unstyled one.
  const variant = conditionToVariant[condition] ?? "outline";
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {getConditionLabel(condition, t)}
    </Badge>
  );
}

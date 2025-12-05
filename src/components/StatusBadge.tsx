import { Badge } from "@/components/ui/badge";
import { ItemCondition, CONDITION_LABELS } from "@/types/inventory";

interface StatusBadgeProps {
  condition: ItemCondition;
}

const conditionToVariant: Record<ItemCondition, "available" | "lent" | "inUse" | "defect"> = {
  'verfügbar': 'available',
  'verliehen': 'lent',
  'in-einsatz': 'inUse',
  'defekt': 'defect',
};

export function StatusBadge({ condition }: StatusBadgeProps) {
  return (
    <Badge variant={conditionToVariant[condition]}>
      {CONDITION_LABELS[condition]}
    </Badge>
  );
}

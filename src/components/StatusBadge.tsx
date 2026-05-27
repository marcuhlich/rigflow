import { useTranslation } from 'react-i18next';
import { Badge } from "@/components/ui/badge";
import { ItemCondition } from "@/types/inventory";
import { getConditionLabel } from "@/i18n/helpers";

interface StatusBadgeProps {
  condition: ItemCondition;
}

const conditionToVariant: Record<ItemCondition, "available" | "lent" | "inUse" | "defect"> = {
  'verfügbar':  'available',
  'verliehen':  'lent',
  'in-einsatz': 'inUse',
  'defekt':     'defect',
};

export function StatusBadge({ condition }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={conditionToVariant[condition]}>
      {getConditionLabel(condition, t)}
    </Badge>
  );
}
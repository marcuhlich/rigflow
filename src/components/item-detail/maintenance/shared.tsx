import { CheckCheck, Search, Sparkles, Wrench } from 'lucide-react';
import type { MaintenanceType } from '@/types/maintenance';

const ICONS: Record<MaintenanceType, React.ElementType> = {
  check:      CheckCheck,
  reparatur:  Wrench,
  reinigung:  Sparkles,
  inspektion: Search,
};

export function MaintenanceTypeIcon({ type, className }: { type: MaintenanceType; className?: string }) {
  const Icon = ICONS[type] ?? CheckCheck;
  return <Icon className={className ?? 'h-3.5 w-3.5'} strokeWidth={1.75} aria-hidden />;
}

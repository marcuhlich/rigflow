// src/types/maintenance.ts

export type MaintenanceType = 'check' | 'reparatur' | 'reinigung' | 'inspektion';

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  'check',
  'reparatur',
  'reinigung',
  'inspektion',
];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  check:      'Routinecheck',
  reparatur:  'Reparatur',
  reinigung:  'Reinigung',
  inspektion: 'Inspektion',
};

/** Tailwind bg-class for type pills / badges */
export const MAINTENANCE_TYPE_BG: Record<MaintenanceType, string> = {
  check:      'bg-green-500',
  reparatur:  'bg-orange-500',
  reinigung:  'bg-sky-500',
  inspektion: 'bg-violet-500',
};

/** CSS color value for the SVG timeline dot */
export const MAINTENANCE_TYPE_DOT_COLOR: Record<MaintenanceType, string> = {
  check:      '#22c55e',
  reparatur:  '#f97316',
  reinigung:  '#0ea5e9',
  inspektion: '#8b5cf6',
};

export interface MaintenanceRecord {
  id:           string;
  item_id:      string;
  user_id:      string;
  performed_at: string;        // ISO date: YYYY-MM-DD
  type:         MaintenanceType;
  notes?:       string | null;
  cost?:        number | null;
  image_url?:   string | null;
  created_at:   string;
}
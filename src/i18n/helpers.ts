import type { TFunction } from 'i18next';
import type { ItemCondition } from '@/types/inventory';
import type { MaintenanceType } from '@/types/maintenance';
import type { ProjectStatus } from '@/types/project';

// ── Condition Labels ──────────────────────────────────────────────────────────
const CONDITION_KEYS: Record<ItemCondition, string> = {
  'verfügbar':  'conditions.available',
  'verliehen':  'conditions.lent',
  'in-einsatz': 'conditions.in_use',
  'defekt':     'conditions.defect',
};

const MAINTENANCE_TYPE_KEYS: Record<MaintenanceType, string> = {
  check:      'maintenance_types.check',
  reparatur:  'maintenance_types.reparatur',
  reinigung:  'maintenance_types.reinigung',
  inspektion: 'maintenance_types.inspektion',
};

const PROJECT_STATUS_KEYS: Record<ProjectStatus, string> = {
  draft:     'project_status.draft',
  planned:   'project_status.planned',
  packed:    'project_status.packed',
  transit:   'project_status.transit',
  live:      'project_status.live',
  returning: 'project_status.returning',
  archived:  'project_status.archived',
};

export function getConditionLabel(condition: ItemCondition, t: TFunction): string {
  return t(CONDITION_KEYS[condition] ?? condition);
}

// ── Attribut-Werte (lamp_type, cooling, …) ────────────────────────────────────
export function getAttrValueLabel(field: string, value: string, t: TFunction): string {
  return t(`attr_values.${field}.${value}`, { defaultValue: value });
}

// ── Kategorie-Namen (aus DB, ID als Key) ──────────────────────────────────────
export function getCategoryLabel(
  category: { id: string; name: string },  // ← statt Category
  t: TFunction
): string {
  return t(`categories.${category.id}`, { defaultValue: category.name });
}

export function getMaintenanceTypeLabel(type: MaintenanceType, t: TFunction): string {
  return t(MAINTENANCE_TYPE_KEYS[type] ?? type);
}

export function getProjectStatusLabel(status: ProjectStatus, t: TFunction): string {
  return t(PROJECT_STATUS_KEYS[status] ?? status);
}
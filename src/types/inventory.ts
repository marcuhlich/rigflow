export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';

export type ItemCategory = 'Kabel' | 'Lautsprecher' | 'Lichttechnik' | 'Mikrofone' | 'Zubehör' | 'Effektgeräte';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  condition: ItemCondition;
  location: string;
  notes?: string | null;
  lent_to?: string | null;
  lent_until?: string | null;
  accessories?: string | null;
  dmx_start_address?: number | null;
  dmx_channels?: number | null;
  dmx_universe?: number | null;
  unit_price?: number | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES: ItemCategory[] = ['Kabel', 'Lautsprecher', 'Lichttechnik', 'Mikrofone', 'Zubehör', 'Effektgeräte'];

export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar': 'Verfügbar',
  'verliehen': 'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt': 'Defekt'
};

export const DMX_CATEGORIES: ItemCategory[] = ['Lichttechnik', 'Effektgeräte'];

export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';

export type ItemCategory = string;

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
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null; // Papierkorb
}

export const DEFAULT_CATEGORIES: string[] = ['Kabel', 'Lautsprecher', 'Lichttechnik', 'Mikrofone', 'Zubehör', 'Effektgeräte'];
export const CATEGORIES = DEFAULT_CATEGORIES;
export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];
export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar': 'Verfügbar',
  'verliehen': 'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt': 'Defekt'
};
export const DMX_CATEGORIES: string[] = ['Lichttechnik', 'Effektgeräte'];
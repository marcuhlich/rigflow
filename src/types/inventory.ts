export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';

// Category is now dynamic (stored in user_categories table)
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
}

// Default categories (used as fallback only)
export const DEFAULT_CATEGORIES: string[] = ['Kabel', 'Lautsprecher', 'Lichttechnik', 'Mikrofone', 'Zubehör', 'Effektgeräte'];

// Legacy exports for backward compat – prefer useCategories() hook
export const CATEGORIES = DEFAULT_CATEGORIES;

export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar': 'Verfügbar',
  'verliehen': 'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt': 'Defekt'
};

// Legacy – prefer dmxCategories from useCategories()
export const DMX_CATEGORIES: string[] = ['Lichttechnik', 'Effektgeräte'];

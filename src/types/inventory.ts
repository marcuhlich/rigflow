export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';

export type ItemCategory = 'Kabel' | 'Lautsprecher' | 'Lichttechnik' | 'Mikrofone' | 'Zubehör';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  condition: ItemCondition;
  location: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES: ItemCategory[] = ['Kabel', 'Lautsprecher', 'Lichttechnik', 'Mikrofone', 'Zubehör'];

export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar': 'Verfügbar',
  'verliehen': 'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt': 'Defekt'
};

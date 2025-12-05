export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';

export type ItemCategory = 'Kabel' | 'Lautsprecher' | 'Lichttechnik' | 'Mikrofone' | 'Zubehör';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  condition: ItemCondition;
  location: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CATEGORIES: ItemCategory[] = ['Kabel', 'Lautsprecher', 'Lichttechnik', 'Mikrofone', 'Zubehör'];

export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar': 'Verfügbar',
  'verliehen': 'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt': 'Defekt'
};

// ── Conditions ────────────────────────────────────────────────────────────────
export type ItemCondition = 'verfügbar' | 'verliehen' | 'in-einsatz' | 'defekt';
export type ItemCategory = string; // category id: 'licht', 'audio', …

export const CONDITIONS: ItemCondition[] = ['verfügbar', 'verliehen', 'in-einsatz', 'defekt'];
export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'verfügbar':  'Verfügbar',
  'verliehen':  'Verliehen',
  'in-einsatz': 'Im Einsatz',
  'defekt':     'Defekt',
};

// ── Category (aus DB) ─────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_dmx_capable: boolean;
  color: string;
  icon: string;
}

// ── Attribute-Interfaces pro Kategorie ───────────────────────────────────────
export interface LichtAttributes {
  lamp_type?: 'LED' | 'Halogen' | 'Entladung' | 'Laser';
  cooling?:   'Aktiv' | 'Passiv';
  beam_angle_min?: number;
  beam_angle_max?: number;
  dmx_mode?:  string;
}
export interface AudioAttributes {
  frequency_range?: string;
  is_active?:       boolean;
  impedance?:       number;
  connector_type?:  string;
}
export interface VideoAttributes {
  resolution?:       string;
  brightness_lumen?: number;
  signal_type?:      string;
}
export interface RiggingAttributes {
  wll?:                number;
  self_weight?:        number;
  certification_date?: string;
}
export interface StromAttributes {
  voltage?:       number;
  max_amperage?:  number;
  connector_in?:  string;
  connector_out?: string;
}
export interface ITNetzwerkAttributes {
  ip_range?:   string;
  protocol?:   string;
  port_count?: number;
}
export type ItemAttributes =
  | LichtAttributes
  | AudioAttributes
  | VideoAttributes
  | RiggingAttributes
  | StromAttributes
  | ITNetzwerkAttributes
  | Record<string, never>;

// ── InventoryItem ─────────────────────────────────────────────────────────────
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
  weight_kg?: number | null;
  units_per_case?: number | null;
  dimensions_cm?: { length?: number; width?: number; height?: number; } | null;
  image_url?: string | null;
  attributes?: ItemAttributes | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Alte Konstanten – werden von einigen Seiten noch importiert
export const DEFAULT_CATEGORIES: string[] = ['licht', 'audio', 'video', 'rigging', 'strom', 'it-netzwerk', 'werkzeug'];
export const CATEGORIES = DEFAULT_CATEGORIES;
export const DMX_CATEGORIES: string[] = ['licht'];
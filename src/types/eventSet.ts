export interface EventSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  event_date_start: string | null;
  event_date_end: string | null;
  is_favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSetItem {
  id: string;
  set_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
}

export interface EventSetWithItems extends EventSet {
  items: (EventSetItem & {
    item_name?: string;
    item_category?: string;
    item_location?: string;
    available_quantity?: number;
    reserved_by_other_quantity?: number;
  })[];
}

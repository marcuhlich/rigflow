export type ProjectStatus = 'draft' | 'planned' | 'packed' | 'transit' | 'live' | 'returning';

export interface Package {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  id: string;
  package_id: string;
  inventory_item_id: string;
  quantity: number;
  position: number;
  created_at: string;
  // Angereichert (client-side)
  item_name?: string;
  item_category?: string;
  item_location?: string;
}

export interface PackageWithItems extends Package {
  items: PackageItem[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  event_date_start: string | null;
  event_date_end: string | null;
  location: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectPackage {
  id: string;
  project_id: string;
  package_id: string;
  added_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  inventory_item_id: string;
  quantity: number;
  packed: boolean;
  source: 'direct' | 'package';
  package_instance_id: string | null;
  notes: string | null;
  condition: 'ok' | 'damaged' | 'missing';
  created_at: string;
}

export interface ProjectTodo {
  id: string;
  project_id: string;
  title: string;
  done: boolean;
  position: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
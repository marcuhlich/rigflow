/**
 * Event Checklist Types - für Pre/Post Event Planning
 */

export type ChecklistItemStatus = 'pending' | 'completed' | 'skipped';

export interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  order: number;
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
}

export interface EventChecklist {
  id: string;
  eventId?: string; // optional, kann auch standalone sein
  eventName: string;
  type: 'pre-event' | 'post-event' | 'general';
  items: ChecklistItem[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  user_id: string;
  isTemplate?: boolean; // Kann als Template für zukünftige Events gespeichert werden
  completionPercentage?: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  type: 'pre-event' | 'post-event' | 'general';
  items: Omit<ChecklistItem, 'id'>[];
  description?: string;
  category?: string;
}

// Standard Templates
export const DEFAULT_TEMPLATES: Record<string, ChecklistTemplate> = {
  'pre-event': {
    id: 'template-pre-event',
    name: 'Pre-Event Checklist',
    type: 'pre-event',
    description: 'Standard Vorbereitung für Events',
    category: 'default',
    items: [
      { text: 'Alle Equipment items checken', status: 'pending', order: 1 },
      { text: 'Beschädigte Geräte reparieren/ersetzen', status: 'pending', order: 2 },
      { text: 'Batterien/Akkus aufladen', status: 'pending', order: 3 },
      { text: 'Kabel und Adapter überprüfen', status: 'pending', order: 4 },
      { text: 'DMX Konfiguration testen', status: 'pending', order: 5 },
      { text: 'Dokumentation ausdrucken', status: 'pending', order: 6 },
      { text: 'Team briefen', status: 'pending', order: 7 },
    ],
  },
  'post-event': {
    id: 'template-post-event',
    name: 'Post-Event Checklist',
    type: 'post-event',
    description: 'Nach dem Event - Inventur und Rückgaben',
    category: 'default',
    items: [
      { text: 'Alle Equipment zurück zu Lagerplatz', status: 'pending', order: 1 },
      { text: 'Inventur durchführen', status: 'pending', order: 2 },
      { text: 'Beschädigte Items dokumentieren', status: 'pending', order: 3 },
      { text: 'Schmutzige Equipment reinigen', status: 'pending', order: 4 },
      { text: 'Wartungs-Notizen hinzufügen', status: 'pending', order: 5 },
      { text: 'Abrechnung durchführen', status: 'pending', order: 6 },
      { text: 'Besitztümer überprüfen', status: 'pending', order: 7 },
    ],
  },
};

export type ChecklistCompletionStatus = 'pending' | 'in-progress' | 'completed';

export interface EventChecklistStats {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  percentage: number;
}

export function calculateChecklistStats(items: ChecklistItem[]): EventChecklistStats {
  const total = items.length;
  const completed = items.filter(i => i.status === 'completed').length;
  const pending = items.filter(i => i.status === 'pending').length;
  const skipped = items.filter(i => i.status === 'skipped').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, skipped, percentage };
}

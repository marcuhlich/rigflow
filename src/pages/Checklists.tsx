/**
 * Event Checklists - Verwaltungsseite für alle Checklisten
 */
import { useState, useEffect } from 'react';
import { useEventChecklists } from '@/hooks/useEventChecklists';
import { ChecklistCard } from '@/components/ChecklistCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEFAULT_TEMPLATES, calculateChecklistStats } from '@/types/checklist';

export function ChecklistsPage() {
  const {
    checklists,
    createChecklist,
    deleteChecklist,
    updateItemStatus,
    deleteItem,
    addItem,
  } = useEventChecklists();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [templateType, setTemplateType] = useState<'pre-event' | 'post-event' | 'general'>(
    'pre-event'
  );

  const handleCreateChecklist = () => {
    if (eventName.trim()) {
      createChecklist(eventName, templateType);
      setEventName('');
      setTemplateType('pre-event');
      setIsDialogOpen(false);
    }
  };

  const sortedChecklists = [...checklists].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pre-event':
        return 'bg-blue-50 border-blue-200';
      case 'post-event':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Event Checklisten</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte Deine Event-Vorbereitungen und Nachbesprechungen
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Neue Checklist</span>
              <span className="sm:hidden">+</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[95vw] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Neue Checklist erstellen</DialogTitle>
              <DialogDescription>
                Wähle einen Vorlagen-Typ und gib einen Namen für dein Event ein
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Event Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Name *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="z.B. 'Summer Festival 2024'"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateChecklist();
                    }
                  }}
                />
              </div>

              {/* Template Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vorlagen-Typ</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['pre-event', 'post-event', 'general'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTemplateType(type)}
                      className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
                        templateType === type
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-muted-foreground'
                      }`}
                    >
                      {type === 'pre-event' && '🔧 Vor Event'}
                      {type === 'post-event' && '📋 Nach Event'}
                      {type === 'general' && '📝 Allgemein'}
                    </button>
                  ))}
                </div>

                {/* Template Preview */}
                <div className="mt-3 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Enthält {DEFAULT_TEMPLATES[templateType].items.length} Standard-Items
                  </p>
                  <ul className="space-y-1">
                    {DEFAULT_TEMPLATES[templateType].items.slice(0, 3).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        {item.text}
                      </li>
                    ))}
                    {DEFAULT_TEMPLATES[templateType].items.length > 3 && (
                      <li className="text-xs text-muted-foreground italic">
                        +{DEFAULT_TEMPLATES[templateType].items.length - 3} weitere...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateChecklist}
                disabled={!eventName.trim()}
              >
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {sortedChecklists.length === 0 ? (
        <div className="px-3 sm:px-6">
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Keine Checklisten vorhanden</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Erstelle deine erste Checklist, um mit der Planung zu beginnen
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Erste Checklist erstellen
                </Button>
              </DialogTrigger>
              {/* Dialog content is above */}
            </Dialog>
          </Card>
        </div>
      ) : (
        <div className="px-3 sm:px-6 space-y-4">
          {/* Info Banner */}
          {checklists.some((c) => {
            const stats = calculateChecklistStats(c.items);
            return stats.pending > 0;
          }) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Du hast noch unvollendete Checklisten. Beende diese, um sie zu archivieren.
              </AlertDescription>
            </Alert>
          )}

          {/* Checklists Grid */}
          <div className="grid gap-4">
            {sortedChecklists.map((checklist) => (
              <div key={checklist.id} className={`rounded-lg border ${getTypeColor(checklist.type)}`}>
                <ChecklistCard
                  checklist={checklist}
                  onItemStatusChange={(itemId, status) => updateItemStatus(checklist.id, itemId, status)}
                  onItemDelete={(itemId) => deleteItem(checklist.id, itemId)}
                  onAddItem={(text) => addItem(checklist.id, text, '')}
                  onDeleteChecklist={() => deleteChecklist(checklist.id)}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
              <span>Vor Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-300" />
              <span>Nach Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
              <span>Allgemein</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

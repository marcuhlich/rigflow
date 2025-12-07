/**
 * Event Checklist Card - Zeigt eine Checklist mit Progress an
 */
import { EventChecklist } from '@/types/checklist';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChecklistItemComponent } from './ChecklistItem';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { calculateChecklistStats } from '@/types/checklist';

interface ChecklistCardProps {
  checklist: EventChecklist;
  onItemStatusChange: (itemId: string, status: 'pending' | 'completed' | 'skipped') => void;
  onItemDelete: (itemId: string) => void;
  onAddItem: (text: string) => void;
  onDeleteChecklist: () => void;
}

export function ChecklistCard({
  checklist,
  onItemStatusChange,
  onItemDelete,
  onAddItem,
  onDeleteChecklist,
}: ChecklistCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newItemText, setNewItemText] = useState('');
  const stats = calculateChecklistStats(checklist.items);

  const typeLabels = {
    'pre-event': 'Vor Event',
    'post-event': 'Nach Event',
    'general': 'Allgemein',
  };

  const typeBadgeVariants = {
    'pre-event': 'default',
    'post-event': 'secondary',
    'general': 'outline',
  } as const;

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText);
      setNewItemText('');
    }
  };

  const sortedItems = [...checklist.items].sort((a, b) => a.order - b.order);

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{checklist.eventName}</h3>
            <Badge variant={typeBadgeVariants[checklist.type]}>
              {typeLabels[checklist.type]}
            </Badge>
          </div>
          {checklist.description && (
            <p className="text-xs text-muted-foreground mt-1">{checklist.description}</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteChecklist()}
          className="text-destructive hover:text-destructive"
          title="Checklist löschen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fortschritt</span>
          <span className="font-semibold">
            {stats.completed} / {stats.total} ({stats.percentage}%)
          </span>
        </div>
        <Progress value={stats.percentage} className="h-2" />
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="space-y-2">
          {sortedItems.length > 0 ? (
            <>
              {sortedItems.map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  onStatusChange={(itemId, status) => onItemStatusChange(itemId, status)}
                  onDelete={onItemDelete}
                />
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Keine Items in dieser Checklist
            </p>
          )}

          {/* Add New Item */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
              }}
              placeholder="Neues Item hinzufügen..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background"
            />
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      )}

      {/* Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-center gap-2"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Einklappen
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Ausklappen ({stats.completed}/{stats.total})
          </>
        )}
      </Button>
    </Card>
  );
}

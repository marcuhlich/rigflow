/**
 * Single Checklist Item Component
 */
import { ChecklistItem as ChecklistItemType } from '@/types/checklist';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onStatusChange: (itemId: string, status: 'pending' | 'completed' | 'skipped') => void;
  onDelete: (itemId: string) => void;
  onEditNote?: (itemId: string, note: string) => void;
}

export function ChecklistItemComponent({
  item,
  onStatusChange,
  onDelete,
  onEditNote,
}: ChecklistItemProps) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(item.notes || '');

  const handleStatusToggle = () => {
    if (item.status === 'completed') {
      onStatusChange(item.id, 'pending');
    } else {
      onStatusChange(item.id, 'completed');
    }
  };

  const handleSaveNote = () => {
    if (onEditNote) {
      onEditNote(item.id, noteText);
    }
    setShowNote(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
      {/* Checkbox */}
      <Checkbox
        checked={item.status === 'completed'}
        onCheckedChange={handleStatusToggle}
        className="mt-1"
        aria-label={`Mark "${item.text}" as ${item.status === 'completed' ? 'incomplete' : 'complete'}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <label
          className={`text-sm font-medium cursor-pointer block ${
            item.status === 'completed'
              ? 'line-through text-muted-foreground'
              : 'text-foreground'
          }`}
          onClick={handleStatusToggle}
        >
          {item.text}
        </label>

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Notiz: {item.notes}
          </p>
        )}

        {/* Skip State */}
        {item.status === 'skipped' && (
          <div className="flex items-center gap-1 mt-1 text-xs text-warning">
            <AlertCircle className="h-3 w-3" />
            <span>Übersprungen</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (item.status === 'skipped') {
              onStatusChange(item.id, 'pending');
            } else {
              onStatusChange(item.id, 'skipped');
            }
          }}
          className="text-xs"
          title={item.status === 'skipped' ? 'Nicht übersprungen' : 'Überspringen'}
        >
          {item.status === 'skipped' ? '↺' : '∅'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="text-destructive hover:text-destructive px-2"
          title="Löschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

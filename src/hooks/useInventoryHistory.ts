import { useCallback, useRef, useState } from 'react';
import { InventoryItem } from '@/types/inventory';

export type HistoryAction =
  | { type: 'add'; item: InventoryItem }
  | { type: 'update'; oldItem: InventoryItem; newItem: InventoryItem }
  | { type: 'delete'; item: InventoryItem };

const MAX_HISTORY = 50;

export function useInventoryHistory() {
  const undoStack = useRef<HistoryAction[]>([]);
  const redoStack = useRef<HistoryAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const pushAction = useCallback((action: HistoryAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    // Clear redo on new action
    redoStack.current = [];
    updateFlags();
  }, [updateFlags]);

  const undo = useCallback((): HistoryAction | null => {
    const action = undoStack.current.pop() ?? null;
    if (action) {
      redoStack.current.push(action);
    }
    updateFlags();
    return action;
  }, [updateFlags]);

  const redo = useCallback((): HistoryAction | null => {
    const action = redoStack.current.pop() ?? null;
    if (action) {
      undoStack.current.push(action);
    }
    updateFlags();
    return action;
  }, [updateFlags]);

  /**
   * Re-creating an item (e.g. redo of "add" / undo of "delete") gives it a new id.
   * Call this with the old and new id so later undo/redo steps target the right row.
   */
  const remapItemId = useCallback((oldId: string, newId: string) => {
    if (!oldId || !newId || oldId === newId) return;
    const remapItem = (item: InventoryItem) => (item.id === oldId ? { ...item, id: newId } : item);
    const remap = (action: HistoryAction): HistoryAction => {
      switch (action.type) {
        case 'add':
        case 'delete':
          return { ...action, item: remapItem(action.item) };
        case 'update':
          return { ...action, oldItem: remapItem(action.oldItem), newItem: remapItem(action.newItem) };
      }
    };
    undoStack.current = undoStack.current.map(remap);
    redoStack.current = redoStack.current.map(remap);
  }, []);

  const clear = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    updateFlags();
  }, [updateFlags]);

  return { pushAction, undo, redo, canUndo, canRedo, clear, remapItemId };
}

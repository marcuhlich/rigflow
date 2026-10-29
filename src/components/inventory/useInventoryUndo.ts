import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useInventoryHistory, type HistoryAction } from "@/hooks/useInventoryHistory";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@/types/inventory";
import type { ItemDraft } from "@/components/inventory/format";

interface Ops {
  addItem: (item: ItemDraft) => Promise<unknown>;
  updateItem: (id: string, updates: ItemDraft) => Promise<unknown>;
  deleteItem: (id: string) => Promise<unknown>;
  restoreItem: (id: string) => Promise<unknown>;
}

/** Strips server-managed columns so a stored snapshot can be written back. */
export function toDraft(item: InventoryItem): ItemDraft {
  const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...draft } = item;
  return draft;
}

/**
 * Inventory undo/redo: owns the history stack, exposes stable `undo`/`redo`
 * callbacks and registers them with the app-shell undo buttons.
 */
export function useInventoryUndo(ops: Ops) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const history = useInventoryHistory();
  const { register, unregister } = useUndoRedoContext();

  // Always call the latest hook functions without re-creating the callbacks.
  const opsRef = useRef(ops);
  useEffect(() => { opsRef.current = ops; });

  const { undo: popUndo, redo: popRedo, pushAction, remapItemId } = history;

  const undo = useCallback(async () => {
    const action = popUndo();
    if (!action) return;
    const { updateItem, deleteItem, restoreItem } = opsRef.current;
    try {
      switch (action.type) {
        case "add":
          await deleteItem(action.item.id);
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_add_description", { name: action.item.name }) });
          break;
        case "update":
          await updateItem(action.oldItem.id, toDraft(action.oldItem));
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_update_description", { name: action.oldItem.name }) });
          break;
        case "delete":
          await restoreItem(action.item.id);
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_delete_description", { name: action.item.name }) });
          break;
      }
    } catch {
      // Put the action back so the user can retry; the hook already showed an error toast.
      // Note: pushAction clears the redo stack, which also drops the failed entry from redo.
      pushAction(action);
    }
  }, [popUndo, pushAction, toast, t]);

  const redo = useCallback(async () => {
    const action: HistoryAction | null = popRedo();
    if (!action) return;
    const { addItem, updateItem, deleteItem } = opsRef.current;
    try {
      switch (action.type) {
        case "add":
        {
          // Redo re-creates the item with a new id; point the history at it
          // so a later undo deletes the right row.
          const created = await addItem(toDraft(action.item));
          const newId = (created as { id?: string } | undefined)?.id;
          if (newId && newId !== action.item.id) remapItemId(action.item.id, newId);
        }
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_add_description", { name: action.item.name }) });
          break;
        case "update":
          await updateItem(action.newItem.id, toDraft(action.newItem));
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_update_description", { name: action.newItem.name }) });
          break;
        case "delete":
          await deleteItem(action.item.id);
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_delete_description", { name: action.item.name }) });
          break;
      }
    } catch { /* error toast shown by useInventory */ }
  }, [popRedo, remapItemId, toast, t]);

  useEffect(() => {
    register({
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      onUndo: () => void undo(),
      onRedo: () => void redo(),
    });
  }, [register, history.canUndo, history.canRedo, undo, redo]);

  useEffect(() => unregister, [unregister]);

  return { pushAction, undo, redo };
}

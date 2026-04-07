import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Trash2, RotateCcw, X, AlertTriangle, PackageX,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { InventoryItem } from "@/types/inventory";

interface TrashDrawerProps {
  open: boolean;
  onClose: () => void;
  trashedItems: InventoryItem[];
  onFetch: () => Promise<void>;
  onRestore: (id: string) => Promise<InventoryItem | undefined>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

function getDaysRemaining(deletedAt: string): number {
  const msInDay = 1000 * 60 * 60 * 24;
  const daysInTrash = Math.floor((Date.now() - new Date(deletedAt).getTime()) / msInDay);
  return Math.max(0, 30 - daysInTrash);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function TrashDrawer({
  open, onClose, trashedItems, onFetch, onRestore, onPermanentDelete, onEmptyTrash,
}: TrashDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setSelectedIds(new Set());
      onFetch().finally(() => setIsLoading(false));
    }
  }, [open]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === trashedItems.length
        ? new Set()
        : new Set(trashedItems.map(i => i.id))
    );
  };

  const handleRestore = async (id: string) => {
    try {
      const restored = await onRestore(id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      if (restored) {
        toast({
          title: "Item wiederhergestellt",
          description: `„${restored.name}" ist wieder verfügbar.`,
          action: (
            <ToastAction
              altText="Zum Item"
              onClick={() => { onClose(); navigate(`/inventory/${restored.id}`); }}
            >
              Zum Item
            </ToastAction>
          ),
        });
      }
    } catch { /* handled in hook */ }
  };

  const handleBulkRestore = async () => {
    for (const id of Array.from(selectedIds)) {
      await onRestore(id);
    }
    setSelectedIds(new Set());
    toast({ title: "Items wiederhergestellt", description: "Alle ausgewählten Items sind wieder verfügbar." });
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await onPermanentDelete(id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setConfirmDeleteId(null);
    } catch { /* handled in hook */ }
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await onPermanentDelete(id);
    }
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const handleEmptyTrash = async () => {
    try {
      await onEmptyTrash();
      setSelectedIds(new Set());
      setConfirmEmptyOpen(false);
      toast({ title: "Papierkorb geleert", description: "Alle Items wurden endgültig gelöscht." });
    } catch { /* handled in hook */ }
  };

  const allSelected = trashedItems.length > 0 && selectedIds.size === trashedItems.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col gap-0 pt-6">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                <SheetTitle className="text-base font-semibold">Papierkorb</SheetTitle>
                {trashedItems.length > 0 && (
                  <Badge variant="secondary" className="text-xs tabular-nums">{trashedItems.length}</Badge>
                )}
              </div>
              {trashedItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8 px-3"
                  onClick={() => setConfirmEmptyOpen(true)}
                >
                  Leeren
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 text-left font-normal">
              Items werden nach 30 Tagen automatisch endgültig gelöscht.
            </p>
          </SheetHeader>

          {/* Bulk-Action-Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-b border-border">
                  <span className="text-xs text-muted-foreground">{selectedIds.size} ausgewählt</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5"
                      onClick={handleBulkRestore}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Wiederherstellen
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 text-xs gap-1.5"
                      onClick={() => setConfirmBulkDelete(true)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alle auswählen */}
          {trashedItems.length > 0 && !isLoading && (
            <div
              className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 flex-shrink-0 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={toggleSelectAll}
            >
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                className="h-3.5 w-3.5 pointer-events-none"
              />
              <span className="text-xs text-muted-foreground">Alle auswählen</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : trashedItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center justify-center h-full py-20 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <PackageX className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-sm text-foreground mb-1.5">Alles sauber!</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                  Gelöschte Items erscheinen hier für 30 Tage, bevor sie endgültig entfernt werden.
                </p>
              </motion.div>
            ) : (
              <ul className="py-1.5">
                <AnimatePresence initial={false}>
                  {trashedItems.map((item) => {
                    const daysRemaining = getDaysRemaining(item.deleted_at!);
                    const isUrgent = daysRemaining <= 7;
                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex items-center gap-3 mx-3 my-1.5 p-3.5 rounded-lg border transition-colors cursor-default
                            ${isUrgent
                            ? "border-destructive/30 bg-destructive/5"
                            : "border-border bg-card hover:bg-muted/30"
                            }`}
                        >
                        <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-normal">
                                {item.category}
                            </Badge>
                            <Badge
                                variant={isUrgent ? "destructive" : "secondary"}
                                className="text-[10px] px-1.5 h-4"
                            >
                                {daysRemaining}d verbleibend
                            </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{formatDate(item.deleted_at!)}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                            title="Wiederherstellen"
                            onClick={() => handleRestore(item.id)}
                            >
                            <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
                            title="Endgültig löschen"
                            onClick={() => setConfirmDeleteId(item.id)}
                            >
                            <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bestätigung: Papierkorb leeren */}
      <AlertDialog open={confirmEmptyOpen} onOpenChange={setConfirmEmptyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Papierkorb leeren?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {trashedItems.length} Item{trashedItems.length !== 1 ? "s" : ""} werden endgültig
              gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEmptyTrash}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bestätigung: Einzelnes Item löschen */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Item wird dauerhaft entfernt und kann nicht wiederhergestellt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId)}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bestätigung: Bulk-Löschen */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {selectedIds.size} Items endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Diese {selectedIds.size} Items werden dauerhaft entfernt und können nicht
              wiederhergestellt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { useState } from "react";
import { X, Trash2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemCondition, CONDITION_LABELS } from "@/types/inventory";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchUpdateCondition: (condition: ItemCondition) => void;
  onBatchUpdateLocation: (location: string) => void;
  onBatchDelete: () => void;
  locations: string[];
  isProcessing: boolean;
}

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onBatchUpdateCondition,
  onBatchUpdateLocation,
  onBatchDelete,
  locations,
  isProcessing,
}: BatchActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
        <div className="glass-card p-3 sm:p-4 shadow-lg border border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearSelection}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap">
                {selectedCount} ausgewählt
              </span>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
              <Select
                onValueChange={(value) => onBatchUpdateCondition(value as ItemCondition)}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status ändern" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                onValueChange={onBatchUpdateLocation}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Standort" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                className="h-8 text-xs w-full sm:w-auto"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Löschen
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Items löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du wirklich {selectedCount} Item(s) unwiderruflich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onBatchDelete();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

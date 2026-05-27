import { Undo2, Redo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isMobile?: boolean;
}

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isMobile,
}: UndoRedoButtonsProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            canUndo
              ? "text-foreground active:scale-90 hover:bg-muted/50"
              : "text-muted-foreground/30 pointer-events-none"
          )}
          aria-label={t("undo_redo.undo")}
        >
          <Undo2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            canRedo
              ? "text-foreground active:scale-90 hover:bg-muted/50"
              : "text-muted-foreground/30 pointer-events-none"
          )}
          aria-label={t("undo_redo.redo")}
        >
          <Redo2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-9 w-9"
            aria-label={t("undo_redo.undo")}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>

        <TooltipContent>
          {t("undo_redo.undo_tooltip")}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-9 w-9"
            aria-label={t("undo_redo.redo")}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>

        <TooltipContent>
          {t("undo_redo.redo_tooltip")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
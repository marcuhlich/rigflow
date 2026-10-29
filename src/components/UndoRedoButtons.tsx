import { Redo2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Larger touch targets for the mobile top bar. */
  isMobile?: boolean;
}

export function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo, isMobile }: UndoRedoButtonsProps) {
  const { t } = useTranslation();

  const buttonClass = cn(
    "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-35",
    isMobile ? "h-9 w-9 active:bg-muted" : "h-7 w-7 hover:bg-muted hover:text-foreground"
  );
  const iconClass = isMobile ? "h-[18px] w-[18px]" : "h-3.5 w-3.5";

  const buttons = [
    { key: "undo", Icon: Undo2, onClick: onUndo, enabled: canUndo, label: t("undo_redo.undo"), tip: t("undo_redo.undo_tooltip") },
    { key: "redo", Icon: Redo2, onClick: onRedo, enabled: canRedo, label: t("undo_redo.redo"), tip: t("undo_redo.redo_tooltip") },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {buttons.map(({ key, Icon, onClick, enabled, label, tip }) => {
        const button = (
          <button
            key={key}
            type="button"
            onClick={onClick}
            disabled={!enabled}
            aria-label={label}
            className={buttonClass}
          >
            <Icon className={iconClass} />
          </button>
        );
        if (isMobile) return button;
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

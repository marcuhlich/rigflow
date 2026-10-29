import { MoreHorizontal, Pencil, QrCode, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ItemActionsMenuProps {
  onShowQr: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

/** Row-level "…" menu shared by the table and grid views. */
export function ItemActionsMenu({ onShowQr, onEdit, onDelete, className }: ItemActionsMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.actions")}
          className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowQr}>
          <QrCode className="mr-2 h-4 w-4 text-muted-foreground" />
          {t("inventory_context.show_qr")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

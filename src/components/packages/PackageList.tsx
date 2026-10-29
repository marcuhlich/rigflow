import { useTranslation } from "react-i18next";
import { ListPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PackageWithItems } from "@/types/project";
import { PackageGlyph } from "./PackageGlyph";

interface Props {
  packages: PackageWithItems[];
  onOpen: (pkg: PackageWithItems) => void;
  onEdit: (pkg: PackageWithItems) => void;
  onDelete: (pkg: PackageWithItems) => void;
}

/** Dense package list: one row per package, counts in mono, actions in an overflow menu. */
export function PackageList({ packages, onOpen, onEdit, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <div className="surface overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,1fr)_6rem_6rem_3rem] items-center gap-3 border-b border-border bg-surface-sunken px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>{t("packages.col_name")}</span>
        <span className="text-right">{t("packages.col_items")}</span>
        <span className="text-right">{t("packages.col_quantity")}</span>
        <span className="sr-only">{t("common.actions")}</span>
      </div>
      <ul className="divide-y divide-border">
        {packages.map(pkg => {
          const totalQty = pkg.items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
          return (
            <li
              key={pkg.id}
              className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_3rem]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PackageGlyph icon={pkg.icon} color={pkg.color} />
                <div className="min-w-0">
                  {/* Stretched button: the whole row opens the content editor. */}
                  <button
                    type="button"
                    onClick={() => onOpen(pkg)}
                    className="block max-w-full truncate text-left text-sm font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                  >
                    {pkg.name}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    {pkg.description || (
                      <span className="sm:hidden">
                        {t("packages.item_count", { count: pkg.items.length })} · {t("packages.quantity_count", { count: totalQty })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="tech hidden text-right text-sm sm:block">{pkg.items.length}</span>
              <span className="tech hidden text-right text-sm text-muted-foreground sm:block">{totalQty}</span>
              <div className="relative z-10 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.actions")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => onOpen(pkg)}>
                      <ListPlus className="mr-2 h-4 w-4" />
                      {t("packages.edit_contents")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onEdit(pkg)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("packages.edit_details")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => onDelete(pkg)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("packages.delete_button")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

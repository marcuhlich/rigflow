import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import type { ScannedEntry } from "./types";

interface ScannedEntryRowProps {
  entry: ScannedEntry;
  /** Right-most control, e.g. a remove button. */
  trailing?: ReactNode;
  /** Extra content below the row (condition picker). */
  children?: ReactNode;
}

/** One scanned item: name, category, short id, resulting status. */
export function ScannedEntryRow({ entry, trailing, children }: ScannedEntryRowProps) {
  const { t } = useTranslation();
  const { item } = entry;
  const status = entry.overrideStatus ?? entry.targetStatus;

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{t(`categories.${item.category}`, { defaultValue: item.category })}</span>
            <span aria-hidden>·</span>
            <span className="tech shrink-0">{item.id.slice(0, 8)}</span>
          </p>
        </div>
        {entry.inSet === false && (
          <Badge variant="lent" className="hidden shrink-0 sm:inline-flex">
            {t("scanner.result.not_in_project_badge")}
          </Badge>
        )}
        <span className="shrink-0"><StatusBadge condition={status} /></span>
        {trailing}
      </div>
      {entry.inSet === false && (
        <p className="mt-1 text-xs text-warning sm:hidden">{t("scanner.result.not_in_project_badge")}</p>
      )}
      {children}
    </li>
  );
}

import { useTranslation } from "react-i18next";
import { Package, Filter, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/QueryState";

type EmptyStateVariant = "empty" | "filtered" | "search";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  searchQuery?: string;
  onAddItem?: () => void;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  className?: string;
}

/** Inventory-specific empty states: no items at all, nothing matches filters, nothing matches search. */
export function EmptyState({
  variant,
  searchQuery,
  onAddItem,
  onClearFilters,
  onClearSearch,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  if (variant === "search") {
    return (
      <EmptyPanel
        className={className}
        icon={Search}
        title={
          searchQuery
            ? t("empty_state.search.title_with_query", { query: searchQuery })
            : t("empty_state.search.title")
        }
        description={t("empty_state.search.description")}
        action={
          onClearSearch && (
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              <X />
              {t("empty_state.search.clear_button")}
            </Button>
          )
        }
      />
    );
  }

  if (variant === "filtered") {
    return (
      <EmptyPanel
        className={className}
        icon={Filter}
        title={t("empty_state.filtered.title")}
        description={t("empty_state.filtered.description")}
        action={
          onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X />
              {t("empty_state.filtered.clear_button")}
            </Button>
          )
        }
      />
    );
  }

  return (
    <EmptyPanel
      className={className}
      icon={Package}
      title={t("empty_state.empty.title")}
      description={t("empty_state.empty.description")}
      action={
        onAddItem && (
          <Button size="sm" onClick={onAddItem}>
            <Plus />
            {t("empty_state.empty.add_button")}
          </Button>
        )
      }
    />
  );
}

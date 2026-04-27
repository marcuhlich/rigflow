import { Package, Filter, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "empty" | "filtered" | "search";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  searchQuery?: string;
  onAddItem?: () => void;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  className?: string;
}

const configs = {
  empty: {
    Icon: Package,
    title: "Noch keine Geräte vorhanden",
    description: "Füge dein erstes Gerät hinzu, um dein Inventar aufzubauen.",
  },
  filtered: {
    Icon: Filter,
    title: "Keine Ergebnisse für deine Filter",
    description: "Versuch es mit anderen Kategorien oder Zuständen.",
  },
  search: {
    Icon: Search,
    title: "Kein Treffer",
    description: "Überprüfe die Schreibweise oder suche nach einem anderen Begriff.",
  },
};

export function EmptyState({
  variant,
  searchQuery,
  onAddItem,
  onClearFilters,
  onClearSearch,
  className,
}: EmptyStateProps) {
  const { Icon, title, description } = configs[variant];

  const displayTitle =
    variant === "search" && searchQuery
      ? `Kein Treffer für „${searchQuery}"`
      : title;

  return (
    <div
      className={cn(
        "glass-card flex flex-col items-center gap-5 py-16 px-8 text-center",
        className
      )}
    >
      <div className="rounded-full border border-border/40 bg-muted/30 p-5">
        <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <div className="max-w-xs">
        <h3 className="text-base font-medium">{displayTitle}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {variant === "empty" && onAddItem && (
        <Button onClick={onAddItem} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Gerät hinzufügen
        </Button>
      )}

      {variant === "filtered" && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} className="gap-1.5">
          <X className="h-4 w-4" />
          Filter zurücksetzen
        </Button>
      )}

      {variant === "search" && onClearSearch && (
        <Button variant="outline" onClick={onClearSearch} className="gap-1.5">
          <X className="h-4 w-4" />
          Suche löschen
        </Button>
      )}
    </div>
  );
}
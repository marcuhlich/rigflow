import { Search, Filter, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CONDITIONS, CONDITION_LABELS, ItemCategory, ItemCondition } from "@/types/inventory";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: ItemCategory | 'all';
  onCategoryChange: (value: ItemCategory | 'all') => void;
  conditionFilter: ItemCondition | 'all';
  onConditionChange: (value: ItemCondition | 'all') => void;
  locationFilter?: string;
  onLocationChange?: (value: string) => void;
  locations?: string[];
  onClearFilters: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  conditionFilter,
  onConditionChange,
  locationFilter = 'all',
  onLocationChange,
  locations = [],
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || conditionFilter !== 'all' || locationFilter !== 'all';

  return (
    <div className="glass-card p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Name, Standort..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={(v) => onCategoryChange(v as ItemCategory | 'all')}>
            <SelectTrigger className="w-[160px] glass-input">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={(v) => onConditionChange(v as ItemCondition | 'all')}>
            <SelectTrigger className="w-[160px] glass-input">
              <SelectValue placeholder="Zustand" />
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">Alle Zustände</SelectItem>
              {CONDITIONS.map((cond) => (
                <SelectItem key={cond} value={cond}>{CONDITION_LABELS[cond]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onLocationChange && locations.length > 0 && (
            <Select value={locationFilter} onValueChange={onLocationChange}>
              <SelectTrigger className="w-[160px] glass-input">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Standort" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">Alle Standorte</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Filter zurücksetzen"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

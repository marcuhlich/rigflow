import { useState } from "react";
import { Search, Filter, X, MapPin, SlidersHorizontal, CheckCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { CONDITIONS, CONDITION_LABELS, ItemCategory, ItemCondition } from "@/types/inventory";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: ItemCategory | "all";
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onCategoryChange: (value: ItemCategory | "all") => void;
  conditionFilter: ItemCondition | "all";
  onConditionChange: (value: ItemCondition | "all") => void;
  locationFilter?: string;
  onLocationChange?: (value: string) => void;
  locations?: string[];
  categories?: string[];
  onClearFilters: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  searchRef,
  conditionFilter,
  onConditionChange,
  locationFilter = "all",
  onLocationChange,
  locations = [],
  categories = [],
  onClearFilters,
}: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapRatio, setSnapRatio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();

  const hasActiveFilters =
    searchQuery ||
    categoryFilter !== "all" ||
    conditionFilter !== "all" ||
    locationFilter !== "all";

  const activeFilterCount = [
    categoryFilter !== "all",
    conditionFilter !== "all",
    locationFilter !== "all",
  ].filter(Boolean).length;

  // ── Chip row helper ───────────────────────────────────────────────────────
  function ChipGroup<T extends string>({
    label,
    icon,
    options,
    value,
    onChange,
  }: {
    label: string;
    icon?: React.ReactNode;
    options: { value: T | "all"; label: string }[];
    value: T | "all";
    onChange: (v: T | "all") => void;
  }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6);
                  onChange(opt.value as T | "all");
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/40"
                }`}
              >
                {active && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    const categoryOptions = [
      { value: "all" as const, label: "Alle" },
      ...categories.map((c) => ({ value: c as ItemCategory | "all", label: c })),
    ];
    const conditionOptions = [
      { value: "all" as const, label: "Alle" },
      ...CONDITIONS.map((c) => ({ value: c as ItemCondition | "all", label: CONDITION_LABELS[c] })),
    ];
    const locationOptions = [
      { value: "all" as const, label: "Alle" },
      ...locations.map((l) => ({ value: l as string | "all", label: l })),
    ];

    return (
      <>
        <div className="glass-card p-3 flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 glass-input"
              ref={searchRef}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter trigger */}
          <Button
            variant="outline"
            size="icon"
            className="relative glass-input shrink-0 h-10 w-10"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(6);
              setDrawerOpen(true);
              setSnapRatio(1);
            }}
            aria-label="Filter öffnen"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Backdrop — opacity + blur tied to snapRatio */}
        <div
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${snapRatio * 0.6})`,
            backdropFilter: `blur(${snapRatio * 8}px)`,
            WebkitBackdropFilter: `blur(${snapRatio * 8}px)`,
            pointerEvents: snapRatio > 0.01 ? "auto" : "none",
            transition: isDragging
              ? "none"
              : "background-color 0.35s ease, backdrop-filter 0.35s ease",
          }}
          onClick={() => {
            setDrawerOpen(false);
            setSnapRatio(0);
          }}
        />

        {/* Bottom Drawer — modal={false} so chips are tappable */}
        <Drawer
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            setSnapRatio(open ? 1 : 0);
            if (!open) setIsDragging(false);
          }}
          onDrag={(_, pct) => {
            setIsDragging(true);
            // Vaul zählt pct ab der aktuellen Position:
            // → Drawer offen + runterziehen: pct 0→1 = Overlay nimmt ab
            // → Drawer zu   + hochziehen:   pct 0→1 = Overlay nimmt zu
            setSnapRatio(
              drawerOpen
                ? Math.max(0, 1 - pct)
                : Math.max(0, Math.min(1, pct))
            );
          }}
          onRelease={() => {
            setIsDragging(false);
          }}
          modal={false}
        >
          <DrawerContent className="glass-card border-t border-border/50 px-4 z-50">
            <DrawerHeader className="pb-3">
              <DrawerTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filter
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-5 pb-2">
              <ChipGroup
                label="Kategorie"
                icon={<Filter className="h-3 w-3" />}
                options={categoryOptions}
                value={categoryFilter}
                onChange={onCategoryChange}
              />
              <ChipGroup
                label="Zustand"
                options={conditionOptions}
                value={conditionFilter}
                onChange={onConditionChange}
              />
              {onLocationChange && locations.length > 0 && (
                <ChipGroup
                  label="Standort"
                  icon={<MapPin className="h-3 w-3" />}
                  options={locationOptions}
                  value={locationFilter ?? "all"}
                  onChange={onLocationChange as (v: string | "all") => void}
                />
              )}
            </div>

            <DrawerFooter className="flex-row gap-2 pt-4 pb-10">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  className="flex-1 text-muted-foreground"
                  onClick={() => {
                    onClearFilters();
                    if (navigator.vibrate) navigator.vibrate(6);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>
              )}
              <DrawerClose asChild>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Anwenden
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop layout (unchanged) ────────────────────────────────────────────
  return (
    <div className="glass-card p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Suche nach Name, Standort..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 glass-input"
            ref={searchRef}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
            <kbd className="h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">/</span>
            </kbd>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <Select
            value={categoryFilter}
            onValueChange={(v) => onCategoryChange(v as ItemCategory | "all")}
          >
            <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {categoryFilter === "all" ? "Kategorie" : categoryFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={conditionFilter}
            onValueChange={(v) => onConditionChange(v as ItemCondition | "all")}
          >
            <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
              <span className="truncate">
                {conditionFilter === "all"
                  ? "Zustand"
                  : CONDITION_LABELS[conditionFilter]}
              </span>
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">Alle Zustände</SelectItem>
              {CONDITIONS.map((cond) => (
                <SelectItem key={cond} value={cond}>
                  {CONDITION_LABELS[cond]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onLocationChange && locations.length > 0 && (
            <Select value={locationFilter} onValueChange={onLocationChange}>
              <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
                <MapPin className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {locationFilter === "all" ? "Standort" : locationFilter}
                </span>
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">Alle Standorte</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
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
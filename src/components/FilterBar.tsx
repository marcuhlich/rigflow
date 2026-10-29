import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, SlidersHorizontal, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { CONDITIONS, ItemCategory, ItemCondition } from "@/types/inventory";
import { getConditionLabel, getCategoryLabel } from "@/i18n/helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, hapticFeedback } from "@/lib/utils";

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
  categories?: { id: string; name: string }[];
  onClearFilters: () => void;
  availableTags?: string[];
  tagFilter?: string;
  onTagChange?: (tag: string) => void;
  /** Extra controls rendered at the right end of the toolbar (e.g. view toggle). */
  trailing?: ReactNode;
}

type Option = { value: string; label: string };

// ── Mobile chip group ─────────────────────────────────────────────────────────
function ChipGroup({
  label, options, value, onChange,
}: { label: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="eyebrow">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { hapticFeedback(6); onChange(opt.value); }}
              aria-pressed={active}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[13px] transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground active:bg-muted"
              )}
            >
              {active && <Check className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Desktop select ────────────────────────────────────────────────────────────
function FilterSelect({
  value, placeholder, allLabel, options, onChange, className,
}: {
  value: string;
  placeholder: string;
  allLabel: string;
  options: Option[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const active = value !== "all";
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-auto min-w-[120px] max-w-[200px] gap-2 text-[13px]",
          active ? "border-border-strong text-foreground" : "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {active ? (
            <>
              <span className="text-muted-foreground">{placeholder}: </span>
              {current}
            </>
          ) : (
            placeholder
          )}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
  availableTags = [],
  tagFilter = "all",
  onTagChange,
  trailing,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const categoryOptions: Option[] = categories
    .filter((c) => c.id)
    .map((c) => ({ value: c.id, label: getCategoryLabel(c, t) }));
  const conditionOptions: Option[] = CONDITIONS.map((c) => ({ value: c, label: getConditionLabel(c, t) }));
  const locationOptions: Option[] = locations.filter(Boolean).map((l) => ({ value: l, label: l }));
  const tagOptions: Option[] = availableTags.filter(Boolean).map((tag) => ({ value: tag, label: tag }));

  const showLocation = !!onLocationChange && locationOptions.length > 0;
  const showTags = !!onTagChange && tagOptions.length > 0;

  const activeFilterCount = [
    categoryFilter !== "all",
    conditionFilter !== "all",
    locationFilter !== "all",
    tagFilter !== "all",
  ].filter(Boolean).length;
  const hasActiveFilters = !!searchQuery || activeFilterCount > 0;

  const searchInput = (placeholder: string, withKbd: boolean) => (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={searchRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={t("common.search")}
        className="h-9 pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          aria-label={t("common.clear")}
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        withKbd && (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-sunken px-1.5 font-mono text-2xs text-muted-foreground">
            /
          </kbd>
        )
      )}
    </div>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    const allLabel = t("filter_bar.all");
    const withAll = (opts: Option[]) => [{ value: "all", label: allLabel }, ...opts];

    return (
      <>
        <div className="flex items-center gap-2">
          {searchInput(t("filter_bar.search_placeholder_short"), false)}
          <Button
            variant="outline"
            className={cn("h-9 shrink-0 gap-1.5 px-3", activeFilterCount > 0 && "border-border-strong")}
            onClick={() => { hapticFeedback(6); setDrawerOpen(true); }}
            aria-label={t("filter_bar.open_filters")}
          >
            <SlidersHorizontal />
            {activeFilterCount > 0 && (
              <span className="font-mono text-xs tabular-nums">{activeFilterCount}</span>
            )}
          </Button>
          {trailing}
        </div>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="px-4">
            <DrawerHeader className="px-0 pb-3 text-left">
              <DrawerTitle className="text-base">{t("filter_bar.title")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex max-h-[60dvh] flex-col gap-5 overflow-y-auto pb-2">
              <ChipGroup
                label={t("filter_bar.condition")}
                options={withAll(conditionOptions)}
                value={conditionFilter}
                onChange={(v) => onConditionChange(v as ItemCondition | "all")}
              />
              <ChipGroup
                label={t("filter_bar.category")}
                options={withAll(categoryOptions)}
                value={categoryFilter}
                onChange={(v) => onCategoryChange(v)}
              />
              {showLocation && (
                <ChipGroup
                  label={t("filter_bar.location")}
                  options={withAll(locationOptions)}
                  value={locationFilter}
                  onChange={(v) => onLocationChange?.(v)}
                />
              )}
              {showTags && (
                <ChipGroup
                  label={t("filter_bar.tags")}
                  options={withAll(tagOptions)}
                  value={tagFilter}
                  onChange={(v) => onTagChange?.(v)}
                />
              )}
            </div>
            <DrawerFooter className="flex-row gap-2 px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!hasActiveFilters}
                onClick={() => { hapticFeedback(6); onClearFilters(); }}
              >
                {t("filter_bar.reset")}
              </Button>
              <DrawerClose asChild>
                <Button className="flex-1">{t("filter_bar.apply")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop / tablet ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex w-full min-w-[220px] sm:w-auto sm:max-w-sm sm:flex-1">
        {searchInput(t("filter_bar.search_placeholder"), true)}
      </div>

      <FilterSelect
        value={conditionFilter}
        placeholder={t("filter_bar.condition")}
        allLabel={t("filter_bar.all_conditions")}
        options={conditionOptions}
        onChange={(v) => onConditionChange(v as ItemCondition | "all")}
      />
      <FilterSelect
        value={categoryFilter}
        placeholder={t("filter_bar.category")}
        allLabel={t("filter_bar.all_categories")}
        options={categoryOptions}
        onChange={(v) => onCategoryChange(v)}
      />
      {showLocation && (
        <FilterSelect
          value={locationFilter}
          placeholder={t("filter_bar.location")}
          allLabel={t("filter_bar.all_locations")}
          options={locationOptions}
          onChange={(v) => onLocationChange?.(v)}
        />
      )}
      {showTags && (
        <FilterSelect
          value={tagFilter}
          placeholder={t("filter_bar.tags")}
          allLabel={t("filter_bar.all_tags")}
          options={tagOptions}
          onChange={(v) => onTagChange?.(v)}
        />
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          aria-label={t("filter_bar.reset_aria")}
          className="h-9 text-muted-foreground"
        >
          <X />
          {t("filter_bar.reset")}
        </Button>
      )}

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, MapPin, SlidersHorizontal, CheckCircle, Check, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { CONDITIONS, ItemCategory, ItemCondition } from '@/types/inventory';
import { getConditionLabel, getCategoryLabel } from '@/i18n/helpers';
import { useIsMobile } from '@/hooks/use-mobile';
import { hapticFeedback, hapticStop } from '@/lib/utils';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: ItemCategory | 'all';
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onCategoryChange: (value: ItemCategory | 'all') => void;
  conditionFilter: ItemCondition | 'all';
  onConditionChange: (value: ItemCondition | 'all') => void;
  locationFilter?: string;
  onLocationChange?: (value: string) => void;
  locations?: string[];
  categories?: { id: string; name: string }[];
  onClearFilters: () => void;
  availableTags?: string[];
  tagFilter?: string;
  onTagChange?: (tag: string) => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  searchRef,
  conditionFilter,
  onConditionChange,
  locationFilter = 'all',
  onLocationChange,
  locations = [],
  categories = [],
  onClearFilters,
  availableTags = [],
  tagFilter = 'all',
  onTagChange,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snapRatio, setSnapRatio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();

  const hasActiveFilters =
    searchQuery ||
    categoryFilter !== 'all' ||
    conditionFilter !== 'all' ||
    locationFilter !== 'all' ||
    tagFilter !== 'all';

  const activeFilterCount = [
    categoryFilter !== 'all',
    conditionFilter !== 'all',
    locationFilter !== 'all',
    tagFilter !== 'all',
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
    options: { value: T | 'all'; label: string }[];
    value: T | 'all';
    onChange: (v: T | 'all') => void;
  }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value as T | 'all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/40'
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
    const allLabel = t('filter_bar.all');
    const categoryOptions = [
      { value: 'all' as const, label: allLabel },
      ...categories.map(c => ({ value: c.id as ItemCategory | 'all', label: getCategoryLabel(c, t) })),
    ];
    const conditionOptions = [
      { value: 'all' as const, label: allLabel },
      ...CONDITIONS.map(c => ({ value: c as ItemCondition | 'all', label: getConditionLabel(c, t) })),
    ];
    const locationOptions = [
      { value: 'all' as const, label: allLabel },
      ...locations.map(l => ({ value: l as string | 'all', label: l })),
    ];

    return (
      <>
        <div className="glass-card p-3 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder={t('filter_bar.search_placeholder_short')}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 glass-input"
              ref={searchRef}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative glass-input shrink-0 h-10 w-10"
            onClick={() => {
              hapticFeedback(6);
              setDrawerOpen(true);
              setSnapRatio(1);
            }}
            aria-label={t('filter_bar.open_filters')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${snapRatio * 0.6})`,
            backdropFilter: `blur(${snapRatio * 8}px)`,
            WebkitBackdropFilter: `blur(${snapRatio * 8}px)`,
            pointerEvents: snapRatio > 0.01 ? 'auto' : 'none',
            transition: isDragging
              ? 'none'
              : 'background-color 0.35s ease, backdrop-filter 0.35s ease',
          }}
          onClick={() => { setDrawerOpen(false); setSnapRatio(0); }}
        />

        <Drawer
          open={drawerOpen}
          onOpenChange={open => {
            setDrawerOpen(open);
            setSnapRatio(open ? 1 : 0);
            if (!open) setIsDragging(false);
          }}
          onDrag={(_, pct) => {
            setIsDragging(true);
            setSnapRatio(drawerOpen ? Math.max(0, 1 - pct) : Math.max(0, Math.min(1, pct)));
          }}
          onRelease={() => setIsDragging(false)}
          modal={false}
        >
          <DrawerContent className="glass-card border-t border-border/50 px-4 z-50">
            <DrawerHeader className="pb-3">
              <DrawerTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                {t('filter_bar.title')}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-5 pb-2">
              <ChipGroup
                label={t('filter_bar.category')}
                icon={<Filter className="h-3 w-3" />}
                options={categoryOptions}
                value={categoryFilter}
                onChange={onCategoryChange}
              />
              <ChipGroup
                label={t('filter_bar.condition')}
                options={conditionOptions}
                value={conditionFilter}
                onChange={onConditionChange}
              />
              {onLocationChange && locations.length > 0 && (
                <ChipGroup
                  label={t('filter_bar.location')}
                  icon={<MapPin className="h-3 w-3" />}
                  options={locationOptions}
                  value={locationFilter ?? 'all'}
                  onChange={onLocationChange as (v: string | 'all') => void}
                />
              )}
              {onTagChange && availableTags.length > 0 && (
                <ChipGroup
                  label={t('filter_bar.tags')}
                  icon={<Tag className="h-3 w-3" />}
                  options={[
                    { value: 'all' as const, label: allLabel },
                    ...availableTags.filter(t => t).map(t => ({ value: t as string | 'all', label: t })),
                  ]}
                  value={tagFilter ?? 'all'}
                  onChange={onTagChange as (v: string | 'all') => void}
                />
              )}
            </div>
            <DrawerFooter className="flex-row gap-2 pt-4 pb-10">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  className="flex-1 text-muted-foreground"
                  onClick={() => { onClearFilters(); hapticFeedback(6); }}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('filter_bar.reset')}
                </Button>
              )}
              <DrawerClose asChild>
                <Button className="flex-1 active:scale-95" onClick={() => hapticFeedback(8)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('filter_bar.apply')}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div className="glass-card p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder={t('filter_bar.search_placeholder')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
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
          {/* Kategorie */}
          <Select value={categoryFilter} onValueChange={v => onCategoryChange(v as ItemCategory | 'all')}>
            <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {categoryFilter === 'all'
                  ? t('filter_bar.category')
                  : getCategoryLabel(
                      categories.find(c => c.id === categoryFilter) ?? { id: categoryFilter, name: categoryFilter },
                      t
                    )}
              </span>
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">{t('filter_bar.all_categories')}</SelectItem>
              {categories.filter(cat => cat.id).map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{getCategoryLabel(cat, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zustand */}
          <Select value={conditionFilter} onValueChange={v => onConditionChange(v as ItemCondition | 'all')}>
            <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
              <span className="truncate">
                {conditionFilter === 'all'
                  ? t('filter_bar.condition')
                  : getConditionLabel(conditionFilter, t)}
              </span>
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              <SelectItem value="all">{t('filter_bar.all_conditions')}</SelectItem>
              {CONDITIONS.map(cond => (
                <SelectItem key={cond} value={cond}>{getConditionLabel(cond, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Standort */}
          {onLocationChange && locations.length > 0 && (
            <Select value={locationFilter} onValueChange={onLocationChange}>
              <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[160px] glass-input">
                <MapPin className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {locationFilter === 'all' ? t('filter_bar.location') : locationFilter}
                </span>
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">{t('filter_bar.all_locations')}</SelectItem>
                {locations.filter(loc => loc).map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Tags */}
          {onTagChange && availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={onTagChange}>
              <SelectTrigger className="flex-1 min-w-0 sm:flex-none sm:w-[140px] glass-input">
                <Tag className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {tagFilter === 'all' ? t('filter_bar.tags') : tagFilter}
                </span>
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">{t('filter_bar.all_tags')}</SelectItem>
                {availableTags.filter(tag => tag).map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
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
              aria-label={t('filter_bar.reset_aria')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
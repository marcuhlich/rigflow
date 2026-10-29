import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { useAttributeFields } from '@/hooks/useAttributeFields';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getCategoryLabel } from '@/i18n/helpers';
import { cn } from '@/lib/utils';

interface CategorySettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategorySettingsPanel({ isOpen, onClose }: CategorySettingsPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { categories, loading: catsLoading } = useCategories();
  const { getAllFieldsForCategory, getEnabledAttributesForCategory, toggleCategoryAttribute } = useAttributeFields();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabledAttrs, setEnabledAttrs] = useState<Set<string>>(new Set());
  const [isLoadingAttrs, setIsLoadingAttrs] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const togglingRef = useRef(false);

  // `getEnabledAttributesForCategory` is recreated every render by the hook;
  // keep the latest in a ref so the load effect only runs when the category changes.
  const getEnabledRef = useRef(getEnabledAttributesForCategory);
  useEffect(() => { getEnabledRef.current = getEnabledAttributesForCategory; });

  // Pick the first category once categories are available
  useEffect(() => {
    if (isOpen && !selectedId && categories.length > 0) setSelectedId(categories[0].id);
  }, [isOpen, selectedId, categories]);

  // Load enabled attributes for the selected category; ignore stale responses
  useEffect(() => {
    if (!isOpen || !selectedId) return;
    let cancelled = false;
    setIsLoadingAttrs(true);
    getEnabledRef.current(selectedId)
      .then(set => { if (!cancelled) setEnabledAttrs(set); })
      .catch(() => { /* hook already logs; keep previous state */ })
      .finally(() => { if (!cancelled) setIsLoadingAttrs(false); });
    return () => { cancelled = true; };
  }, [isOpen, selectedId]);

  const availableFields = selectedId ? getAllFieldsForCategory(selectedId) : [];
  const selectedCat = categories.find(c => c.id === selectedId);
  const selectedLabel = selectedCat ? getCategoryLabel(selectedCat, t) : '';

  const handleToggle = async (attributeKey: string) => {
    if (!selectedId || togglingRef.current) return;
    const categoryId = selectedId;
    const previous = enabledAttrs;
    const willEnable = !previous.has(attributeKey);

    const next = new Set(previous);
    if (willEnable) next.add(attributeKey);
    else next.delete(attributeKey);
    setEnabledAttrs(next); // optimistic

    togglingRef.current = true;
    setTogglingKey(attributeKey);
    try {
      await toggleCategoryAttribute(categoryId, attributeKey, willEnable);
      // The item form treats "no enabled rows" as "show all defaults". When
      // disabling, persist the remaining enabled fields explicitly so the
      // choice actually takes effect there.
      if (!willEnable) {
        for (const key of next) {
          await toggleCategoryAttribute(categoryId, key, true);
        }
      }

      const field = availableFields.find(f => f.key === attributeKey);
      const fieldLabel = field ? t(field.label, { defaultValue: attributeKey }) : attributeKey;
      toast({
        title: willEnable ? t('common.enabled') : t('common.disabled'),
        description: willEnable
          ? t('category_settings.attribute_enabled', { attr: fieldLabel })
          : t('category_settings.attribute_disabled', { attr: fieldLabel }),
      });
    } catch {
      setEnabledAttrs(previous);
      toast({
        title: t('common.error'),
        description: t('category_settings.error_updating_attribute'),
        variant: 'destructive',
      });
    } finally {
      togglingRef.current = false;
      setTogglingKey(null);
    }
  };

  const handleClose = () => {
    if (togglingRef.current) {
      toast({ title: t('common.saving'), description: t('common.please_wait') });
      return;
    }
    onClose();
  };

  const busy = togglingKey !== null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle>{t('category_settings.title')}</DialogTitle>
            <DialogDescription className="mt-1 text-[13px]">{t('category_settings.description')}</DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-1 h-8 w-8 shrink-0"
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <X />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Category picker: select on phones, list on larger screens */}
          <div className="shrink-0 border-b border-border p-4 sm:hidden">
            <Label htmlFor="category-settings-select" className="mb-1.5 block text-[13px]">
              {t('fields.category')}
            </Label>
            <Select value={selectedId ?? undefined} onValueChange={setSelectedId} disabled={busy}>
              <SelectTrigger id="category-settings-select">
                <SelectValue placeholder={t('fields.category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{getCategoryLabel(cat, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <nav
            aria-label={t('fields.category')}
            className="hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-surface-sunken p-2 sm:block"
          >
            <p className="eyebrow px-2 pb-2 pt-1">{t('fields.category')}</p>
            {catsLoading && categories.length === 0 ? (
              <div className="space-y-1.5 px-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <ul className="space-y-0.5">
                {categories.map(cat => {
                  const active = cat.id === selectedId;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(cat.id)}
                        disabled={busy}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors disabled:opacity-60',
                          active
                            ? 'bg-background font-medium text-foreground shadow-[0_0_0_1px_hsl(var(--border))]'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate">{getCategoryLabel(cat, t)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          {/* Fields */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {selectedId && (
              <>
                <p className="eyebrow mb-2">
                  {t('category_settings.available_fields', { category: selectedLabel })}
                </p>
                {isLoadingAttrs ? (
                  <div className="surface divide-y divide-border">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-3">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-5 w-9 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : availableFields.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-[13px] text-muted-foreground">
                    {t('category_settings.empty_fields')}
                  </p>
                ) : (
                  <ul className="surface divide-y divide-border">
                    {availableFields.map(field => {
                      const id = `attr-toggle-${field.key}`;
                      return (
                        <li key={field.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <Label htmlFor={id} className="min-w-0 cursor-pointer">
                            <span className="block truncate text-[13px] font-medium">
                              {t(field.label, { defaultValue: field.label })}
                            </span>
                            {field.unit && (
                              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                {t('common.unit')}: <span className="font-mono">{field.unit}</span>
                              </span>
                            )}
                          </Label>
                          <div className="flex shrink-0 items-center gap-2">
                            {togglingKey === field.key && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                              id={id}
                              checked={enabledAttrs.has(field.key)}
                              onCheckedChange={() => void handleToggle(field.key)}
                              disabled={busy}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

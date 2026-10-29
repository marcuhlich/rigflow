import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeFields } from '@/hooks/useAttributeFields';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Settings2, X, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface CategorySettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategorySettingsPanel({ isOpen, onClose }: CategorySettingsPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isMobile } = useDeviceDetection();
  const { categories, loading: catsLoading } = useCategories();
  const { getAllFieldsForCategory, getEnabledAttributesForCategory, toggleCategoryAttribute, loading: attrsLoading } = useAttributeFields();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [enabledAttrs, setEnabledAttrs] = useState<Set<string>>(new Set());
  const [isLoadingAttrs, setIsLoadingAttrs] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const isTogglingRef = useRef(false);
  const lastLoadedCategoryRef = useRef<string | null>(null);

  // Load enabled attributes for a category
  const loadCategoryAttributes = async (categoryId: string) => {
    setIsLoadingAttrs(true);
    try {
      const enabledSet = await getEnabledAttributesForCategory(categoryId);
      setEnabledAttrs(enabledSet);
      lastLoadedCategoryRef.current = categoryId;
    } finally {
      setIsLoadingAttrs(false);
    }
  };

  // When dialog opens or categories load, select first category
  useEffect(() => {
    if (isOpen && categories.length > 0 && !selectedCategoryId) {
      const firstCat = categories[0];
      setSelectedCategoryId(firstCat.id);
      setSelectedCategoryName(firstCat.id);
      loadCategoryAttributes(firstCat.id);
    }
  }, [isOpen, categories, selectedCategoryId, getEnabledAttributesForCategory]);

  // Only reload when category actually changes
  useEffect(() => {
    if (!selectedCategoryId || !selectedCategoryName) return;
    if (lastLoadedCategoryRef.current === selectedCategoryId) return; // Already loaded
    if (isTogglingRef.current) return; // Don't reload during toggle
    
    loadCategoryAttributes(selectedCategoryId);
  }, [selectedCategoryId, selectedCategoryName, getEnabledAttributesForCategory]);

  const handleToggleAttribute = async (attributeKey: string) => {
    if (!selectedCategoryId || isTogglingRef.current) return;

    const willEnable = !enabledAttrs.has(attributeKey);
    
    // Optimistic update - change UI immediately
    const newSet = new Set(enabledAttrs);
    if (willEnable) {
      newSet.add(attributeKey);
    } else {
      newSet.delete(attributeKey);
    }
    setEnabledAttrs(newSet);

    // Now save to database
    isTogglingRef.current = true;
    setIsToggling(true);
    try {
      await toggleCategoryAttribute(selectedCategoryId, attributeKey, willEnable);

      // Find the field to get its translated label
      const field = availableFields.find(f => f.key === attributeKey);
      const fieldLabel = field ? t(field.label, { defaultValue: attributeKey }) : attributeKey;

      toast({
        title: willEnable ? t('common.enabled') : t('common.disabled'),
        description: willEnable
          ? t('category_settings.attribute_enabled', { attr: fieldLabel })
          : t('category_settings.attribute_disabled', { attr: fieldLabel }),
      });
    } catch (error) {
      // Revert on error
      setEnabledAttrs(enabledAttrs);
      
      toast({
        title: t('common.error'),
        description: t('category_settings.error_updating_attribute'),
        variant: 'destructive',
      });
    } finally {
      isTogglingRef.current = false;
      setIsToggling(false);
    }
  };

  const availableFields = selectedCategoryName ? getAllFieldsForCategory(selectedCategoryName) : [];
  const isLoading = catsLoading || attrsLoading || isLoadingAttrs;

  // Prevent closing while toggle is in progress
  const handleClose = () => {
    if (isTogglingRef.current) {
      // Show toast that save is in progress
      toast({
        title: t('common.saving'),
        description: 'Bitte warte kurz...',
      });
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`w-[calc(100%-2rem)] ${isMobile ? 'max-w-[calc(100%-2rem)]' : 'max-w-2xl'} p-0 overflow-hidden rounded-2xl bg-background border-border`}>
        {/* Header - Single close button only */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold">
                  {t('category_settings.title')}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {t('category_settings.description')}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className={`max-h-[60vh] overflow-hidden flex flex-col gap-4 ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
          {isMobile ? (
            <>
              {/* Mobile: Dropdown Select */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('fields.category')}</Label>
                <Select value={selectedCategoryId || ''} onValueChange={(id) => {
                  setSelectedCategoryId(id);
                  setSelectedCategoryName(id); // Use ID for field lookup
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('fields.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile: Attributes below dropdown */}
              {selectedCategoryName && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-foreground">
                    {t('category_settings.available_fields', { category: selectedCategoryName })}
                  </h3>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {availableFields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t('common.none')}
                        </div>
                      ) : (
                        availableFields.map(field => (
                          <Card key={field.key} className="p-3 border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <Checkbox
                                id={`attr_${field.key}`}
                                checked={enabledAttrs.has(field.key)}
                                onCheckedChange={() => handleToggleAttribute(field.key)}
                                disabled={isLoading || isToggling}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground">
                                  {t(field.label, { defaultValue: field.label })}
                                </div>
                                {field.unit && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {t('common.unit')}: <span className="font-mono">{field.unit}</span>
                                  </div>
                                )}
                              </div>
                            </label>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Desktop: Two-column layout */}
              <div className="flex gap-4">
                {/* Category List - Left */}
                <div className="w-40 rounded-xl border border-border/50 bg-muted/30 overflow-hidden flex flex-col flex-shrink-0">
                  <div className="p-2 border-b border-border/50 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">
                      {t('fields.category')}
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSelectedCategoryName(cat.id); // Use ID for field lookup
                          }}
                          className={`
                            w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                            ${selectedCategoryId === cat.id
                              ? 'bg-primary text-primary-foreground font-medium shadow-md'
                              : 'text-foreground/75 hover:text-foreground hover:bg-muted/50'
                            }
                          `}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Attributes Settings - Right */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedCategoryName && (
                    <>
                      <h3 className="font-semibold text-sm text-foreground mb-3">
                        {t('category_settings.available_fields', { category: selectedCategoryName })}
                      </h3>
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-2">
                          {availableFields.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              {t('common.none')}
                            </div>
                          ) : (
                            availableFields.map(field => (
                              <Card key={field.key} className="p-3 border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <Checkbox
                                    id={`attr_${field.key}`}
                                    checked={enabledAttrs.has(field.key)}
                                    onCheckedChange={() => handleToggleAttribute(field.key)}
                                    disabled={isLoading || isToggling}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-foreground">
                                      {t(field.label, { defaultValue: field.label })}
                                    </div>
                                    {field.unit && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {t('common.unit')}: <span className="font-mono">{field.unit}</span>
                                      </div>
                                    )}
                                  </div>
                                </label>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

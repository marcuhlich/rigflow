import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Tag, ChevronDown, Check, ChevronsDown, ChevronsUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InventoryItem, CONDITIONS, ItemCondition, ItemAttributes, Category,
} from '@/types/inventory';
import { getConditionLabel, getCategoryLabel, getAttrValueLabel } from '@/i18n/helpers';
import { validators } from '@/lib/validators';
import { hapticFeedback } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AttributeFieldDef } from '@/hooks/useAttributeFields';
import { useAttributeFields } from '@/hooks/useAttributeFields';

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editItem?: InventoryItem | null;
  categories?: Category[];
}

function CategoryIcon({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}

const emptyForm = (firstCatId = '') => ({
  name: '',
  category: firstCatId,
  quantity: '1',
  condition: 'verfügbar' as ItemCondition,
  location: '',
  notes: '',
  lent_to: '',
  lent_until: '',
  accessories: '',
  dmx_start_address: '',
  dmx_channels: '',
  dmx_universe: '',
  unit_price: '',
  weight_kg: '',
  units_per_case: '',
  dim_length: '',
  dim_width: '',
  dim_height: '',
  image_url: null as string | null,
  attributes: {} as Record<string, string | number | boolean>,
  tags: [] as string[],
});

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  icon,
  iconColor,
  defaultOpen = false,
  children,
  filledCount,
  expandAll,
  collapseAll,
  onOpenChange,
}: {
  label: string;
  icon?: React.ReactNode;
  iconColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  filledCount?: number;
  expandAll?: boolean;
  collapseAll?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen && !open) setOpen(true);
  }, [defaultOpen, open]);

  useEffect(() => {
    if (expandAll) setOpen(true);
    if (collapseAll) setOpen(false);
  }, [expandAll, collapseAll]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    // Each section is visually separated by a stronger border
    <div className="first:border-t-0">
      {/* Header — has a distinct background so sections are always distinguishable */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center justify-between py-3 px-3 text-left group transition-colors duration-150 active:opacity-75',
          open
            ? 'bg-white/[0.07]'
            : 'bg-white/[0.03] hover:bg-white/[0.06]',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && (
            <span
              className="shrink-0 transition-colors duration-150"
              style={{ color: open ? (iconColor ?? 'currentColor') : undefined }}
            >
              {icon}
            </span>
          )}
          {/* FIX 1: text-foreground/60 → /85, inactive also readable */}
          <span className={`text-sm font-semibold transition-colors duration-150 truncate ${
            open ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground/95'
          }`}>
            {label}
          </span>
          {filledCount !== undefined && filledCount > 0 && (
            // FIX 2: badge has enough contrast in both states
            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums transition-colors duration-150 ${
              open
                ? 'bg-primary/25 text-primary'
                : 'bg-white/20 text-foreground/75'
            }`}>
              {filledCount}
            </span>
          )}
        </span>
        {/* FIX 3: chevron was /30 (nearly invisible) → now clearly visible */}
        <span className={`shrink-0 ml-3 transition-all duration-200 ${
          open ? 'text-foreground/60 rotate-180' : 'text-foreground/45 group-hover:text-foreground/70'
        }`}>
          <ChevronDown size={14} />
        </span>
      </button>

      {/* Animated content */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="overflow-hidden">
          {/* FIX 4: content area gets a subtle tint to visually belong to the open header */}
          <div
            className="pb-4 px-3 pt-3 space-y-3 bg-white/[0.02]"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(-4px)',
              transition: 'opacity 0.18s ease, transform 0.18s ease',
              transitionDelay: open ? '0.04s' : '0s',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ItemForm({ isOpen, onClose, onSubmit, editItem, categories = [] }: ItemFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getFieldsForCategory } = useAttributeFields();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData]   = useState(emptyForm(categories[0]?.id));
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [openSectionsMap, setOpenSectionsMap] = useState<Record<string, boolean>>({});

  const [tagInput, setTagInput]               = useState('');
  const [tagSuggestions, setTagSuggestions]   = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allUserTags, setAllUserTags]         = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const selectedCat = categories.find(c => c.id === formData.category);
  const attrFields  = getFieldsForCategory(formData.category);
  const showDMX     = selectedCat?.is_dmx_capable ?? false;
  const showLent    = formData.condition === 'verliehen';

  // ── Filled-field counters for section badges ──────────────────────────────

  const physicalFilledCount = [
    formData.weight_kg, formData.units_per_case,
    formData.dim_length, formData.dim_width, formData.dim_height,
  ].filter(Boolean).length;

  const mediaFilledCount = [formData.image_url, formData.notes].filter(Boolean).length;

  const dmxFilledCount = [
    formData.dmx_start_address, formData.dmx_channels, formData.dmx_universe,
  ].filter(Boolean).length;

  const attrFilledCount = Object.values(formData.attributes).filter(
    v => v !== undefined && v !== '' && v !== false
  ).length;

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !isOpen) return;
    supabase
      .from('tags')
      .select('name')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data }) => {
        if (data) setAllUserTags(data.map(t => t.name));
      });
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitted(false);
    setExpandAll(false);
    setCollapseAll(false);
    if (editItem) {
      setFormData({
        name:              editItem.name,
        category:          editItem.category,
        quantity:          editItem.quantity.toString(),
        condition:         editItem.condition,
        location:          editItem.location,
        notes:             editItem.notes ?? '',
        lent_to:           editItem.lent_to ?? '',
        lent_until:        editItem.lent_until ?? '',
        accessories:       editItem.accessories ?? '',
        dmx_start_address: editItem.dmx_start_address?.toString() ?? '',
        dmx_channels:      editItem.dmx_channels?.toString() ?? '',
        dmx_universe:      editItem.dmx_universe?.toString() ?? '',
        unit_price:        editItem.unit_price?.toString() ?? '',
        weight_kg:         editItem.weight_kg?.toString() ?? '',
        units_per_case:    editItem.units_per_case?.toString() ?? '',
        dim_length:        (editItem.dimensions_cm as any)?.length?.toString() ?? '',
        dim_width:         (editItem.dimensions_cm as any)?.width?.toString() ?? '',
        dim_height:        (editItem.dimensions_cm as any)?.height?.toString() ?? '',
        image_url:         editItem.image_url ?? null,
        attributes:        (editItem.attributes as Record<string, string | number | boolean>) ?? {},
        tags:              editItem.tags ?? [],
      });
    } else {
      setFormData(emptyForm(categories[0]?.id));
    }
    setErrors({});
    setTagInput('');
  }, [editItem, isOpen, categories]);

  useEffect(() => {
    if (!editItem && categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [categories, editItem]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCategoryChange = (catId: string) => {
    hapticFeedback(10);
    setFormData(prev => ({ ...prev, category: catId, attributes: {} }));
  };

  const setAttr = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, attributes: { ...prev.attributes, [key]: value } }));
  };

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || formData.tags.includes(trimmed)) return;
    setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput('');
    setShowSuggestions(false);
    hapticFeedback(10);
  }, [formData.tags]);

  const removeTag = (name: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== name) }));
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = allUserTags.filter(
        t => t.toLowerCase().includes(value.toLowerCase()) && !formData.tags.includes(t)
      );
      setTagSuggestions(filtered.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
      removeTag(formData.tags[formData.tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ── DMX Instances ─────────────────────────────────────────────────────────

  type InstanceEdit = { instanceNumber: number; address: string; universe: string };
  const [instanceEdits, setInstanceEdits] = useState<InstanceEdit[]>([]);

  useEffect(() => {
    if (!isOpen) { setInstanceEdits([]); return; }
    
    const qty = parseInt(formData.quantity) || 0;
    const channels = parseInt(formData.dmx_channels) || 0;
    
    if (qty <= 1 || !channels) { 
      setInstanceEdits([]); 
      return; 
    }
    
    if (editItem) {
      supabase
        .from('dmx_instances')
        .select('*')
        .eq('item_id', editItem.id)
        .then(({ data }) => {
          const configs = new Map((data ?? []).map(d => [d.instance_number, d]));
          const baseAddr = parseInt(formData.dmx_start_address) || 1;
          const baseUni  = parseInt(formData.dmx_universe) || 1;
          
          setInstanceEdits(
            Array.from({ length: qty }, (_, i) => {
              const n = i + 1;
              const cfg = configs.get(n);
              return {
                instanceNumber: n,
                address:  cfg ? String(cfg.dmx_start_address) : String(baseAddr + i * channels),
                universe: cfg ? String(cfg.dmx_universe)      : String(baseUni),
              };
            })
          );
        });
    } else {
      const baseAddr = parseInt(formData.dmx_start_address) || 1;
      const baseUni  = parseInt(formData.dmx_universe) || 1;
      
      setInstanceEdits(
        Array.from({ length: qty }, (_, i) => ({
          instanceNumber: i + 1,
          address:  String(baseAddr + i * channels),
          universe: String(baseUni),
        }))
      );
    }
  }, [isOpen, editItem, formData.quantity, formData.dmx_channels, formData.dmx_start_address, formData.dmx_universe]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim())  newErrors.name     = t('item_form.error.name_required');
    if (!formData.category)     newErrors.category = t('item_form.error.category_required');
    if (formData.quantity === '' || parseInt(formData.quantity) <= 0)
      newErrors.quantity = t('item_form.error.quantity_zero');

    if (showDMX) {
      if (formData.dmx_start_address) {
        const v = validators.dmxAddress(formData.dmx_start_address);
        if (!v.valid && v.error) newErrors.dmx_start_address = v.error;
      }
      if (formData.dmx_channels) {
        const v = validators.dmxChannels(formData.dmx_channels);
        if (!v.valid && v.error) newErrors.dmx_channels = v.error;
      }
      if (formData.dmx_universe) {
        const v = validators.universe(formData.dmx_universe);
        if (!v.valid && v.error) newErrors.dmx_universe = v.error;
      }
    }

    if (formData.quantity) {
      const v = validators.quantity(formData.quantity);
      if (!v.valid && v.error) newErrors.quantity = v.error;
    }

    if (formData.units_per_case && parseInt(formData.units_per_case) > parseInt(formData.quantity)) {
      newErrors.units_per_case = t('item_form.error.units_per_case_exceeds_quantity');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      hapticFeedback(80);
      return;
    }
    setErrors({});

    const parsedAttributes: Record<string, string | number | boolean> = {};
    attrFields.forEach(field => {
      const raw = formData.attributes[field.key];
      if (raw === undefined || raw === '') return;
      if (field.type === 'number') {
        const n = parseFloat(raw as string);
        if (!isNaN(n)) parsedAttributes[field.key] = n;
      } else {
        parsedAttributes[field.key] = raw;
      }
    });

    try {
      await onSubmit({
        name:              formData.name,
        category:          formData.category,
        quantity:          parseInt(formData.quantity),
        condition:         formData.condition,
        location:          formData.location,
        notes:             formData.notes || null,
        lent_to:           formData.lent_to || null,
        lent_until:        formData.lent_until || null,
        accessories:       formData.accessories || null,
        dmx_start_address: formData.dmx_start_address ? parseInt(formData.dmx_start_address) : null,
        dmx_channels:      formData.dmx_channels ? parseInt(formData.dmx_channels) : null,
        dmx_universe:      formData.dmx_universe ? parseInt(formData.dmx_universe) : null,
        unit_price:        formData.unit_price ? parseFloat(formData.unit_price) : null,
        weight_kg:         formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        units_per_case:    formData.units_per_case ? parseInt(formData.units_per_case) : null,
        dimensions_cm:     (formData.dim_length || formData.dim_width || formData.dim_height)
          ? {
              length: formData.dim_length ? parseFloat(formData.dim_length) : undefined,
              width:  formData.dim_width  ? parseFloat(formData.dim_width)  : undefined,
              height: formData.dim_height ? parseFloat(formData.dim_height) : undefined,
            }
          : null,
        image_url:         formData.image_url,
        attributes:        Object.keys(parsedAttributes).length > 0 ? parsedAttributes as ItemAttributes : null,
        tags:              formData.tags,
        deleted_at:        null,
      });

      if (editItem && instanceEdits.length > 0) {
        for (const inst of instanceEdits) {
          const addr = parseInt(inst.address);
          const uni  = parseInt(inst.universe);
          if (isNaN(addr) || isNaN(uni)) continue;
          await supabase
            .from('dmx_instances')
            .upsert(
              { item_id: editItem.id, instance_number: inst.instanceNumber, dmx_start_address: addr, dmx_universe: uni },
              { onConflict: 'item_id,instance_number' }
            );
        }
      }

      setSubmitted(true);
      hapticFeedback(60);
      await new Promise(r => setTimeout(r, 420));
      onClose();
    } catch {
      // handled in parent
    } finally {
      setIsLoading(false);
      setSubmitted(false);
    }
  };

  const dmxBaseFields = [
    { id: 'dmx_universe',      label: t('item_form.label.dmx_universe'),      key: 'dmx_universe',      ph: '1',  max: undefined as number | undefined, errKey: 'dmx_universe' },
    { id: 'dmx_start_address', label: t('item_form.label.dmx_start_address'), key: 'dmx_start_address', ph: '1',  max: 512 as number | undefined,        errKey: 'dmx_start_address' },
    { id: 'dmx_channels',      label: t('item_form.label.dmx_channels'),      key: 'dmx_channels',      ph: '16', max: undefined as number | undefined,  errKey: 'dmx_channels' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 w-[99vw] sm:max-w-[640px] max-h-[90vh] p-0 animate-scale-in overflow-hidden flex flex-col">

        {/* Header */}
        <DialogHeader className="px-7 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {editItem ? t('item_form.title_edit') : t('item_form.title_add')}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} id="item-form" className="px-6 pr-8 pb-5 pt-1">

            {/* ── Name ── */}
            <div className="space-y-1.5 mb-4">
              <Label htmlFor="name" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('item_form.label.name')} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder={t('item_form.placeholder.name')}
                className={`glass-input text-base font-medium h-11 w-full transition-shadow duration-150 ${errors.name ? 'border-destructive' : ''}`}
                autoFocus
              />
              {errors.name && (
                <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-150">
                  {errors.name}
                </p>
              )}
            </div>

            {/* ── Category chips ── */}
            <div className="space-y-2 mb-5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('item_form.label.category')} *
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => {
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={[
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                        'transition-all duration-150 active:scale-95',
                        isSelected
                          ? 'scale-[1.02] shadow-sm'
                          : 'border-border/50 bg-white/[0.04] hover:bg-white/[0.08] hover:border-border/70 text-foreground/70 hover:text-foreground',
                      ].join(' ')}
                      style={isSelected ? { borderColor: cat.color, color: cat.color, backgroundColor: `${cat.color}14` } : {}}
                    >
                      <CategoryIcon name={cat.icon} size={12} color={isSelected ? cat.color : 'currentColor'} />
                      {getCategoryLabel(cat, t)}
                    </button>
                  );
                })}
              </div>
              {errors.category && (
                <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-150">
                  {errors.category}
                </p>
              )}
            </div>

            {/* ── Menge · Zustand · Standort ── */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  id: 'quantity', label: `${t('item_form.label.quantity')} *`, type: 'number',
                  value: formData.quantity, min: '1', placeholder: '1', errKey: 'quantity',
                  onChange: (v: string) => setFormData(p => ({ ...p, quantity: v })),
                },
                {
                  id: 'location', label: `${t('item_form.label.location')} *`, type: 'text',
                  value: formData.location, placeholder: t('item_form.placeholder.location'), errKey: '',
                  onChange: (v: string) => setFormData(p => ({ ...p, location: v })),
                },
              ].map(f => (
                <div key={f.id} className="space-y-1.5 min-w-0">
                  <Label htmlFor={f.id} className="text-xs text-muted-foreground truncate block">{f.label}</Label>
                  <Input
                    id={f.id}
                    type={f.type}
                    min={f.min}
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className={`glass-input w-full ${f.errKey && errors[f.errKey] ? 'border-destructive' : ''}`}
                  />
                  {f.errKey && errors[f.errKey] && (
                    <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-150">
                      {errors[f.errKey]}
                    </p>
                  )}
                </div>
              ))}

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="condition" className="text-xs text-muted-foreground truncate block">
                  {t('item_form.label.condition')} *
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={v => setFormData(p => ({ ...p, condition: v as ItemCondition }))}
                >
                  <SelectTrigger className="glass-input w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {CONDITIONS.map(c => (
                      <SelectItem key={c} value={c}>{getConditionLabel(c, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Preis + Zubehör ── */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="unit_price" className="text-xs text-muted-foreground">
                  {t('item_form.label.unit_price')}
                </Label>
                <Input
                  id="unit_price" type="number" step="0.01" min="0"
                  value={formData.unit_price}
                  onChange={e => setFormData(p => ({ ...p, unit_price: e.target.value }))}
                  placeholder="0.00"
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="accessories" className="text-xs text-muted-foreground">
                  {t('fields.accessories')}
                </Label>
                <Input
                  id="accessories"
                  value={formData.accessories}
                  onChange={e => setFormData(p => ({ ...p, accessories: e.target.value }))}
                  placeholder={t('item_form.placeholder.accessories')}
                  className="glass-input w-full"
                />
              </div>
            </div>

            {/* ── Lent (conditional inline, no accordion) ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: showLent ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="overflow-hidden">
                <div
                  className="pb-5"
                  style={{
                    opacity: showLent ? 1 : 0,
                    transform: showLent ? 'translateY(0)' : 'translateY(-4px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                    transitionDelay: showLent ? '0.04s' : '0s',
                  }}
                >
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="lent_to" className="text-xs text-muted-foreground">
                        {t('item_form.label.lent_to')}
                      </Label>
                      <Input
                        id="lent_to"
                        value={formData.lent_to}
                        onChange={e => setFormData(p => ({ ...p, lent_to: e.target.value }))}
                        placeholder={t('item_form.placeholder.lent_to')}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="lent_until" className="text-xs text-muted-foreground">
                        {t('item_form.label.lent_until')}
                      </Label>
                      <Input
                        id="lent_until" type="date"
                        value={formData.lent_until}
                        onChange={e => setFormData(p => ({ ...p, lent_until: e.target.value }))}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Visual separator before sections ── */}
            <div className="h-px bg-gradient-to-r from-border/0 via-border/40 to-border/0 my-5" />

            {/* ── Sections header with expand/collapse toggle ── */}
            <div className="flex items-center justify-between mb-3 px-1">
              {/* FIX 5: "Details" label is now clearly readable */}
              <h3 className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">Details</h3>
              {(() => {
                const openCount = Object.values(openSectionsMap).filter(v => v).length;
                const allClosed = openCount === 0;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (allClosed) {
                        setCollapseAll(false);
                        setExpandAll(true);
                      } else {
                        setExpandAll(false);
                        setCollapseAll(true);
                      }
                    }}
                    // FIX 6: button text was barely visible at hover-only opacity
                    className="p-1 text-foreground/55 hover:text-foreground hover:bg-white/8 rounded-md transition-all duration-150 active:scale-95 flex items-center gap-1.5"
                    title={allClosed ? 'Alle ausklappen' : 'Alle einklappen'}
                  >
                    <span className="text-xs font-medium">{allClosed ? 'Ausklappen' : 'Einklappen'}</span>
                    {allClosed ? (
                      <ChevronsDown size={14} strokeWidth={1.5} />
                    ) : (
                      <ChevronsUp size={14} strokeWidth={1.5} />
                    )}
                  </button>
                );
              })()}
            </div>

            {/* ── Collapsible sections ── */}
            {/* FIX 7: stronger border (border/50) + stronger dividers (divide-border/50)
                so each section has a clear visual boundary even when multiple are open */}
            <div className="border border-border/50 rounded-xl overflow-hidden divide-y divide-border/50">

              {/* DMX — only for DMX-capable categories */}
              {showDMX && (
                <CollapsibleSection
                  label={t('item_form.label.dmx_config')}
                  icon={<LucideIcons.Zap size={13} />}
                  iconColor="hsl(var(--primary))"
                  defaultOpen={false}
                  filledCount={dmxFilledCount}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  onOpenChange={(isOpen) => setOpenSectionsMap(p => ({ ...p, dmx: isOpen }))}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {dmxBaseFields.map(field => (
                      <div key={field.id} className="space-y-1.5 min-w-0">
                        <Label htmlFor={field.id} className="text-xs text-muted-foreground truncate block">
                          {field.label}
                        </Label>
                        <Input
                          id={field.id} type="number" min="1" max={field.max}
                          value={(formData as any)[field.key]}
                          onChange={e => {
                            setFormData(p => ({ ...p, [field.key]: e.target.value }));
                            if (field.key === 'dmx_start_address' && instanceEdits.length > 0) {
                              setInstanceEdits(prev => prev.map(inst =>
                                inst.instanceNumber === 1 ? { ...inst, address: e.target.value } : inst
                              ));
                            }
                            if (field.key === 'dmx_universe' && instanceEdits.length > 0) {
                              setInstanceEdits(prev => prev.map(inst =>
                                inst.instanceNumber === 1 ? { ...inst, universe: e.target.value } : inst
                              ));
                            }
                          }}
                          placeholder={field.ph}
                          className={`glass-input w-full ${errors[field.errKey] ? 'border-destructive' : ''}`}
                        />
                        {errors[field.errKey] && (
                          <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-150">
                            {errors[field.errKey]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {instanceEdits.length > 1 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border/40" />
                        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                          {t('item_form.dmx.all_instances')}
                        </span>
                        <div className="h-px flex-1 bg-border/40" />
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {instanceEdits.map(inst => {
                          const addr = parseInt(inst.address);
                          const ch   = parseInt(formData.dmx_channels) || 0;
                          const endAddr = !isNaN(addr) && ch > 0 ? addr + ch - 1 : null;
                          const outOfRange = endAddr !== null && endAddr > 512;
                          return (
                            <div
                              key={inst.instanceNumber}
                              className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-border/35 px-3 py-2"
                            >
                              <span className="text-[10px] font-mono font-semibold text-muted-foreground/65 w-5 shrink-0">
                                #{inst.instanceNumber}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-muted-foreground/55 hidden sm:inline">U</span>
                                <Input
                                  type="number" min="1"
                                  value={inst.universe}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setInstanceEdits(prev => prev.map(i =>
                                      i.instanceNumber === inst.instanceNumber ? { ...i, universe: val } : i
                                    ));
                                    if (inst.instanceNumber === 1) setFormData(p => ({ ...p, dmx_universe: val }));
                                  }}
                                  className="glass-input h-7 w-14 text-center text-xs px-1 font-mono"
                                  placeholder="1"
                                />
                              </div>
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="text-[10px] text-muted-foreground/55 hidden sm:inline shrink-0">CH</span>
                                <Input
                                  type="number" min="1" max="512"
                                  value={inst.address}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setInstanceEdits(prev => prev.map(i =>
                                      i.instanceNumber === inst.instanceNumber ? { ...i, address: val } : i
                                    ));
                                    if (inst.instanceNumber === 1) setFormData(p => ({ ...p, dmx_start_address: val }));
                                  }}
                                  className={`glass-input h-7 w-16 text-center text-xs px-1 font-mono ${outOfRange ? 'border-destructive' : ''}`}
                                  placeholder="1"
                                />
                              </div>
                              <span className={`text-[10px] font-mono shrink-0 ${outOfRange ? 'text-destructive' : 'text-muted-foreground/55'}`}>
                                → {endAddr ?? '–'}{outOfRange && ' ⚠'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {t('item_form.dmx.instance_sync_hint')}
                      </p>
                    </div>
                  )}
                </CollapsibleSection>
              )}

              {/* Category-specific attributes */}
              {attrFields.length > 0 && (
                <CollapsibleSection
                  label={`${selectedCat ? getCategoryLabel(selectedCat, t) : ''}-Details`}
                  icon={<CategoryIcon name={selectedCat?.icon ?? 'Package'} size={13} color={selectedCat?.color ?? 'currentColor'} />}
                  iconColor={selectedCat?.color}
                  defaultOpen={false}
                  filledCount={attrFilledCount}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  onOpenChange={(isOpen) => setOpenSectionsMap(p => ({ ...p, attributes: isOpen }))}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {attrFields.map(field => (
                      <AttributeField
                        key={field.key}
                        field={field}
                        value={formData.attributes[field.key]}
                        onChange={val => setAttr(field.key, val)}
                        selectPlaceholder={t('item_form.placeholder.select')}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Physical */}
              <CollapsibleSection
                label={t('item_form.label.weight_dimensions')}
                icon={<LucideIcons.Ruler size={13} />}
                defaultOpen={false}
                filledCount={physicalFilledCount}
                expandAll={expandAll}
                collapseAll={collapseAll}
                onOpenChange={(isOpen) => setOpenSectionsMap(p => ({ ...p, physical: isOpen }))}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="weight_kg" className="text-xs text-muted-foreground">
                      {t('item_form.label.weight_kg')}
                    </Label>
                    <Input
                      id="weight_kg" type="number" step="0.1" min="0"
                      value={formData.weight_kg}
                      onChange={e => setFormData(p => ({ ...p, weight_kg: e.target.value }))}
                      placeholder="4.5"
                      className="glass-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="units_per_case" className="text-xs text-muted-foreground">
                      {t('item_form.label.units_per_case')}
                    </Label>
                    <Input
                      id="units_per_case" type="number" min="1"
                      value={formData.units_per_case}
                      onChange={e => setFormData(p => ({ ...p, units_per_case: e.target.value }))}
                      placeholder="1"
                      className={`glass-input w-full ${errors.units_per_case ? 'border-destructive' : ''}`}
                    />
                    {errors.units_per_case && (
                      <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-150">
                        {errors.units_per_case}
                      </p>
                    )}
                    {formData.quantity && formData.units_per_case && (() => {
                      const qty = parseInt(formData.quantity);
                      const perCase = parseInt(formData.units_per_case);
                      if (perCase > qty) return null;
                      const full = Math.floor(qty / perCase);
                      const rest = qty % perCase;
                      return (
                        <p className="text-[10px] text-muted-foreground/60">
                          → {full} Case{full !== 1 ? 's' : ''} à {perCase}
                          {rest > 0 && ` + ${rest} Stk.`}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'dim_length', label: t('item_form.label.dim_length') },
                    { key: 'dim_width',  label: t('item_form.label.dim_width')  },
                    { key: 'dim_height', label: t('item_form.label.dim_height') },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5 min-w-0">
                      <Label htmlFor={key} className="text-xs text-muted-foreground truncate block">{label}</Label>
                      <Input
                        id={key} type="number" min="0"
                        value={(formData as any)[key]}
                        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="—"
                        className="glass-input w-full"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Tags */}
              <CollapsibleSection
                label="Tags"
                icon={<Tag size={13} />}
                defaultOpen={false}
                filledCount={formData.tags.length}
                expandAll={expandAll}
                collapseAll={collapseAll}
                onOpenChange={(isOpen) => setOpenSectionsMap(p => ({ ...p, tags: isOpen }))}
              >
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/12 text-primary border border-primary/20 animate-in zoom-in-75 duration-150"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive transition-colors duration-100 ml-0.5 active:scale-90"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={e => handleTagInputChange(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onFocus={() => tagInput && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={t('item_form.placeholder.tag_input')}
                    className="glass-input w-full"
                  />
                  {showSuggestions && tagSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full glass-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-150">
                      {tagSuggestions.map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onMouseDown={() => addTag(sug)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors duration-100"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/65">{t('item_form.tags_hint')}</p>
              </CollapsibleSection>

              {/* Photo + Notes */}
              <CollapsibleSection
                label={t('item_form.label.notes_photo')}
                icon={<LucideIcons.FileText size={13} />}
                defaultOpen={false}
                filledCount={mediaFilledCount}
                expandAll={expandAll}
                collapseAll={collapseAll}
                onOpenChange={(isOpen) => setOpenSectionsMap(p => ({ ...p, media: isOpen }))}
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('item_form.label.photo')}</Label>
                  <ImageUpload
                    currentImageUrl={formData.image_url}
                    onImageChange={url => setFormData(p => ({ ...p, image_url: url }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs text-muted-foreground">{t('fields.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder={t('item_form.placeholder.notes')}
                    className="glass-input resize-none w-full"
                    rows={3}
                  />
                </div>
              </CollapsibleSection>

            </div>{/* end collapsible container */}

          </form>
        </div>

        {/* ── Sticky Submit Bar ── */}
        <div className="sticky bottom-0 px-6 py-3 border-t border-border/40 bg-gradient-to-t from-background/95 to-background/80 backdrop-blur-sm flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-10 transition-all duration-150 active:scale-[0.97]"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>

          <Button
            type="submit"
            form="item-form"
            className={[
              'flex-1 h-10 transition-all duration-200 active:scale-[0.97]',
              submitted ? 'bg-green-500/90 hover:bg-green-500/90' : '',
            ].join(' ')}
            disabled={isLoading || submitted}
          >
            {submitted ? (
              <span className="flex items-center gap-1.5 animate-in zoom-in-75 duration-150">
                <Check size={14} strokeWidth={2.5} />
                {t('common.saved')}
              </span>
            ) : isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.saving')}
              </span>
            ) : (
              editItem ? t('common.save') : t('item_form.btn_add')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── AttributeField ────────────────────────────────────────────────────────────

interface AttributeFieldProps {
  field: AttributeFieldDef;
  value: string | number | boolean | undefined;
  onChange: (val: string | number | boolean) => void;
  selectPlaceholder: string;
}

function AttributeField({
  field,
  value,
  onChange,
  selectPlaceholder,
}: AttributeFieldProps) {
  const { t } = useTranslation();

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2 col-span-2">
        <Label className="text-sm font-normal text-muted-foreground">{field.label}</Label>
        <Switch
          checked={!!value}
          onCheckedChange={v => { hapticFeedback(10); onChange(v); }}
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5 min-w-0">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger className="glass-input w-full">
            <SelectValue placeholder={selectPlaceholder} />
          </SelectTrigger>
          <SelectContent className="glass-card border-border/50">
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>
                {getAttrValueLabel(field.key, opt, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs text-muted-foreground">
        {field.label}
        {field.unit && <span className="text-muted-foreground/60 ml-1">({field.unit})</span>}
      </Label>
      <Input
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={(value as string | number) ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="glass-input w-full"
        step={field.type === 'number' ? 'any' : undefined}
      />
    </div>
  );
}
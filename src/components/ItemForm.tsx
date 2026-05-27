import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Tag, ChevronDown, ChevronUp } from 'lucide-react';
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

type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date';
interface AttributeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  unit?: string;
}

// Außerhalb der Komponente – nimmt t entgegen
function getAttributeFields(t: (k: string) => string): Record<string, AttributeFieldDef[]> {
  return {
    licht: [
      { key: 'lamp_type',  label: t('attr.licht.lamp_type'),  type: 'select', options: ['LED', 'Halogen', 'Entladung', 'Laser'] },
      { key: 'cooling',    label: t('attr.licht.cooling'),    type: 'select', options: ['Aktiv', 'Passiv'] },
      { key: 'beam_angle', label: t('attr.licht.beam_angle'), type: 'number', unit: '°', placeholder: '25' },
      { key: 'dmx_mode',   label: t('attr.licht.dmx_mode'),   type: 'text',   placeholder: 'Standard / Extended' },
    ],
    audio: [
      { key: 'frequency_range', label: t('attr.audio.frequency_range'), type: 'text',    placeholder: '20Hz – 20kHz' },
      { key: 'is_active',       label: t('attr.audio.is_active'),       type: 'boolean' },
      { key: 'impedance',       label: t('attr.audio.impedance'),       type: 'number', unit: 'Ω', placeholder: '8' },
      { key: 'connector_type',  label: t('attr.audio.connector_type'),  type: 'text',   placeholder: 'XLR, Speakon …' },
    ],
    video: [
      { key: 'resolution',       label: t('attr.video.resolution'),       type: 'text',   placeholder: '1920 × 1080' },
      { key: 'brightness_lumen', label: t('attr.video.brightness_lumen'), type: 'number', unit: 'lm', placeholder: '5000' },
      { key: 'signal_type',      label: t('attr.video.signal_type'),      type: 'text',   placeholder: 'HDMI, SDI …' },
    ],
    rigging: [
      { key: 'wll',                label: t('attr.rigging.wll'),                type: 'number', unit: 'kg', placeholder: '500' },
      { key: 'self_weight',        label: t('attr.rigging.self_weight'),        type: 'number', unit: 'kg', placeholder: '2.5' },
      { key: 'certification_date', label: t('attr.rigging.certification_date'), type: 'date' },
    ],
    strom: [
      { key: 'voltage',       label: t('attr.strom.voltage'),       type: 'number', unit: 'V',  placeholder: '230' },
      { key: 'max_amperage',  label: t('attr.strom.max_amperage'),  type: 'number', unit: 'A',  placeholder: '16' },
      { key: 'connector_in',  label: t('attr.strom.connector_in'),  type: 'text',   placeholder: 'CEE 32A, Schuko …' },
      { key: 'connector_out', label: t('attr.strom.connector_out'), type: 'text',   placeholder: 'Schuko, CEE 16A …' },
    ],
    'it-netzwerk': [
      { key: 'ip_range',   label: t('attr.it_netzwerk.ip_range'),   type: 'text',   placeholder: '192.168.1.0/24' },
      { key: 'protocol',   label: t('attr.it_netzwerk.protocol'),   type: 'text',   placeholder: 'sACN, Art-Net, Dante …' },
      { key: 'port_count', label: t('attr.it_netzwerk.port_count'), type: 'number', placeholder: '8' },
    ],
    werkzeug: [],
  };
}

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editItem?: InventoryItem | null;
  categories?: Category[];
}

function CategoryIcon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
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
  image_url: null as string | null,
  attributes: {} as Record<string, string | number | boolean>,
  tags: [] as string[],
});

export function ItemForm({ isOpen, onClose, onSubmit, editItem, categories = [] }: ItemFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData]   = useState(emptyForm(categories[0]?.id));
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const [tagInput, setTagInput]               = useState('');
  const [tagSuggestions, setTagSuggestions]   = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allUserTags, setAllUserTags]         = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const ATTRIBUTE_FIELDS = getAttributeFields(t);

  const selectedCat = categories.find(c => c.id === formData.category);
  const attrFields  = ATTRIBUTE_FIELDS[formData.category] ?? [];
  const showDMX     = selectedCat?.is_dmx_capable ?? false;
  const showLent    = formData.condition === 'verliehen';

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

  const handleCategoryChange = (catId: string) => {
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

  type InstanceEdit = { instanceNumber: number; address: string; universe: string };
  const [instanceEdits, setInstanceEdits] = useState<InstanceEdit[]>([]);

  useEffect(() => {
    if (!isOpen || !editItem || !editItem.dmx_channels) { setInstanceEdits([]); return; }
    const qty = editItem.quantity;
    if (qty <= 1) { setInstanceEdits([]); return; }

    supabase
      .from('dmx_instances')
      .select('*')
      .eq('item_id', editItem.id)
      .then(({ data }) => {
        const configs = new Map((data ?? []).map(d => [d.instance_number, d]));
        const baseAddr = editItem.dmx_start_address ?? 1;
        const baseCh   = editItem.dmx_channels ?? 1;
        const baseUni  = editItem.dmx_universe ?? 1;
        setInstanceEdits(
          Array.from({ length: qty }, (_, i) => {
            const n = i + 1;
            const cfg = configs.get(n);
            return {
              instanceNumber: n,
              address:  cfg ? String(cfg.dmx_start_address) : String(baseAddr + i * baseCh),
              universe: cfg ? String(cfg.dmx_universe)      : String(baseUni),
            };
          })
        );
      });
  }, [isOpen, editItem]);

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
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
      hapticFeedback(50);
      onClose();
    } catch {
      // handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const dmxBaseFields = [
    { id: 'dmx_universe',      label: t('item_form.label.dmx_universe'),      key: 'dmx_universe',      ph: '1',  max: undefined,     errKey: 'dmx_universe' },
    { id: 'dmx_start_address', label: t('item_form.label.dmx_start_address'), key: 'dmx_start_address', ph: '1',  max: 512 as number | undefined, errKey: 'dmx_start_address' },
    { id: 'dmx_channels',      label: t('item_form.label.dmx_channels'),      key: 'dmx_channels',      ph: '16', max: undefined,     errKey: 'dmx_channels' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 w-[95vw] sm:max-w-[600px] max-h-[90vh] p-0 animate-scale-in">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {editItem ? t('item_form.title_edit') : t('item_form.title_add')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-5 px-4 sm:px-6 pb-6 pt-2">

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('item_form.label.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder={t('item_form.placeholder.name')}
                className={`glass-input ${errors.name ? 'border-destructive' : ''}`}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Kategorie */}
            <div className="space-y-2">
              <Label>{t('item_form.label.category')} *</Label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={[
                        'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all duration-200',
                        isSelected
                          ? 'border-2 bg-white/5 shadow-sm scale-[1.03]'
                          : 'border-border/40 bg-white/[0.02] hover:bg-white/5 hover:border-border/70',
                      ].join(' ')}
                      style={isSelected ? { borderColor: cat.color } : {}}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}22` }}>
                        <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium leading-tight">{getCategoryLabel(cat, t)}</span>
                    </button>
                  );
                })}
              </div>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            {/* Menge + Zustand + Standort */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">{t('item_form.label.quantity')} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="1"
                  className={`glass-input ${errors.quantity ? 'border-destructive' : ''}`}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">{t('item_form.label.condition')} *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={v => setFormData(p => ({ ...p, condition: v as ItemCondition }))}
                >
                  <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {CONDITIONS.map(c => (
                      <SelectItem key={c} value={c}>{getConditionLabel(c, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('item_form.label.location')} *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  placeholder={t('item_form.placeholder.location')}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Preis + Zubehör */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit_price">{t('item_form.label.unit_price')}</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={e => setFormData(p => ({ ...p, unit_price: e.target.value }))}
                  placeholder="0.00"
                  className="glass-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessories">{t('fields.accessories')}</Label>
                <Input
                  id="accessories"
                  value={formData.accessories}
                  onChange={e => setFormData(p => ({ ...p, accessories: e.target.value }))}
                  placeholder={t('item_form.placeholder.accessories')}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Verliehen */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: showLent ? '200px' : '0px', opacity: showLent ? 1 : 0 }}
            >
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="space-y-2">
                  <Label htmlFor="lent_to">{t('item_form.label.lent_to')}</Label>
                  <Input
                    id="lent_to"
                    value={formData.lent_to}
                    onChange={e => setFormData(p => ({ ...p, lent_to: e.target.value }))}
                    placeholder={t('item_form.placeholder.lent_to')}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lent_until">{t('item_form.label.lent_until')}</Label>
                  <Input
                    id="lent_until"
                    type="date"
                    value={formData.lent_until}
                    onChange={e => setFormData(p => ({ ...p, lent_until: e.target.value }))}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* DMX */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: showDMX ? '600px' : '0px', opacity: showDMX ? 1 : 0 }}
            >
              <div className="space-y-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Label className="text-sm font-medium text-primary">
                  {t('item_form.label.dmx_config')}
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {dmxBaseFields.map(field => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={field.id} className="text-xs text-muted-foreground">
                        {field.label}
                        {field.key === 'dmx_start_address' && instanceEdits.length > 0 && (
                          <span className="ml-1 text-primary/60">{t('item_form.dmx.instance_1_hint')}</span>
                        )}
                      </Label>
                      <Input
                        id={field.id}
                        type="number"
                        min="1"
                        max={field.max}
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
                        className={`glass-input ${errors[field.errKey] ? 'border-destructive' : ''}`}
                      />
                      {errors[field.errKey] && (
                        <p className="text-xs text-destructive">{errors[field.errKey]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {instanceEdits.length > 1 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-primary/20" />
                      <span className="text-[10px] text-primary/60 font-medium uppercase tracking-wide">
                        {t('item_form.dmx.all_instances')}
                      </span>
                      <div className="h-px flex-1 bg-primary/20" />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {instanceEdits.map(inst => {
                        const addr = parseInt(inst.address);
                        const ch   = parseInt(formData.dmx_channels) || 0;
                        const endAddr = !isNaN(addr) && ch > 0 ? addr + ch - 1 : null;
                        const outOfRange = endAddr !== null && endAddr > 512;

                        return (
                          <div
                            key={inst.instanceNumber}
                            className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2"
                          >
                            <span className="text-[10px] font-mono font-semibold text-primary/70 w-6 shrink-0">
                              #{inst.instanceNumber}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">U</span>
                              <Input
                                type="number"
                                min="1"
                                value={inst.universe}
                                onChange={e => {
                                  const val = e.target.value;
                                  setInstanceEdits(prev => prev.map(i =>
                                    i.instanceNumber === inst.instanceNumber ? { ...i, universe: val } : i
                                  ));
                                  if (inst.instanceNumber === 1) setFormData(p => ({ ...p, dmx_universe: val }));
                                }}
                                className="glass-input h-8 w-14 text-center text-xs px-1 font-mono"
                                placeholder="1"
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <span className="text-[10px] text-muted-foreground hidden sm:inline shrink-0">CH</span>
                              <Input
                                type="number"
                                min="1"
                                max="512"
                                value={inst.address}
                                onChange={e => {
                                  const val = e.target.value;
                                  setInstanceEdits(prev => prev.map(i =>
                                    i.instanceNumber === inst.instanceNumber ? { ...i, address: val } : i
                                  ));
                                  if (inst.instanceNumber === 1) setFormData(p => ({ ...p, dmx_start_address: val }));
                                }}
                                className={`glass-input h-8 w-16 text-center text-xs px-1 font-mono ${outOfRange ? 'border-destructive' : ''}`}
                                placeholder="1"
                              />
                            </div>
                            <span className={`text-[10px] font-mono shrink-0 ${outOfRange ? 'text-destructive' : 'text-muted-foreground'}`}>
                              → {endAddr !== null ? endAddr : '–'}
                              {outOfRange && ' ⚠'}
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
              </div>
            </div>

            {/* Dynamische Attribute */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: attrFields.length > 0 ? `${attrFields.length * 80 + 60}px` : '0px',
                opacity:   attrFields.length > 0 ? 1 : 0,
              }}
            >
              {attrFields.length > 0 && (
                <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-white/[0.02]">
                  <Label
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: selectedCat?.color }}
                  >
                    <CategoryIcon name={selectedCat?.icon ?? 'Package'} size={14} color={selectedCat?.color ?? '#fff'} />
                    {t('item_form.category_properties', { name: selectedCat ? getCategoryLabel(selectedCat, t) : '' })}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
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
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag size={13} className="text-muted-foreground" />
                {t('item_form.label.tags')}
              </Label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/25"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
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
                  className="glass-input"
                />
                {showSuggestions && tagSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full glass-card border border-border/50 rounded-xl shadow-xl overflow-hidden">
                    {tagSuggestions.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onMouseDown={() => addTag(sug)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('item_form.tags_hint')}</p>
            </div>

            {/* Foto */}
            <div className="space-y-2">
              <Label>{t('item_form.label.photo')}</Label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageChange={url => setFormData(p => ({ ...p, image_url: url }))}
              />
            </div>

            {/* Notizen */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('fields.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder={t('item_form.placeholder.notes')}
                className="glass-input resize-none"
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1" disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('common.saving')}</>
                ) : editItem ? t('common.save') : t('item_form.btn_add')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── AttributeField ────────────────────────────────────────────────────────────
function AttributeField({
  field,
  value,
  onChange,
  selectPlaceholder,
}: {
  field: AttributeFieldDef;
  value: string | number | boolean | undefined;
  onChange: (val: string | number | boolean) => void;
  selectPlaceholder: string;
}) {
  const baseClass = 'glass-input';
  const { t } = useTranslation();

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2 col-span-2">
        <Label className="text-sm font-normal">{field.label}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger className={baseClass}>
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
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {field.label}{field.unit && <span className="text-muted-foreground/60 ml-1">({field.unit})</span>}
      </Label>
      <Input
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={(value as string | number) ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={baseClass}
        step={field.type === 'number' ? 'any' : undefined}
      />
    </div>
  );
}
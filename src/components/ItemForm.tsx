import { useState, useEffect, useRef, useCallback } from 'react';
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
import { InventoryItem, CONDITIONS, CONDITION_LABELS, ItemCondition, ItemAttributes, Category } from '@/types/inventory';
import { validators } from '@/lib/validators';
import { hapticFeedback } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ── Attribut-Feld-Definitionen pro Kategorie ──────────────────────────────────
type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date';
interface AttributeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  unit?: string;
}

const ATTRIBUTE_FIELDS: Record<string, AttributeFieldDef[]> = {
  licht: [
    { key: 'lamp_type',  label: 'Lampentyp',       type: 'select', options: ['LED', 'Halogen', 'Entladung', 'Laser'] },
    { key: 'cooling',    label: 'Kühlung',          type: 'select', options: ['Aktiv', 'Passiv'] },
    { key: 'beam_angle', label: 'Abstrahlwinkel',   type: 'number', unit: '°', placeholder: '25' },
    { key: 'dmx_mode',   label: 'DMX-Modus',        type: 'text',   placeholder: 'Standard / Extended' },
  ],
  audio: [
    { key: 'frequency_range', label: 'Frequenzbereich',       type: 'text',    placeholder: '20Hz – 20kHz' },
    { key: 'is_active',       label: 'Aktiv (mit Verstärker)', type: 'boolean' },
    { key: 'impedance',       label: 'Impedanz',               type: 'number', unit: 'Ω', placeholder: '8' },
    { key: 'connector_type',  label: 'Anschluss',              type: 'text',   placeholder: 'XLR, Speakon …' },
  ],
  video: [
    { key: 'resolution',       label: 'Auflösung',   type: 'text',   placeholder: '1920 × 1080' },
    { key: 'brightness_lumen', label: 'Helligkeit',  type: 'number', unit: 'lm', placeholder: '5000' },
    { key: 'signal_type',      label: 'Signaltyp',   type: 'text',   placeholder: 'HDMI, SDI …' },
  ],
  rigging: [
    { key: 'wll',                label: 'Traglast (WLL)',  type: 'number', unit: 'kg', placeholder: '500' },
    { key: 'self_weight',        label: 'Eigengewicht',    type: 'number', unit: 'kg', placeholder: '2.5' },
    { key: 'certification_date', label: 'Prüfdatum',       type: 'date' },
  ],
  strom: [
    { key: 'voltage',       label: 'Spannung',    type: 'number', unit: 'V',  placeholder: '230' },
    { key: 'max_amperage',  label: 'Max. Strom',  type: 'number', unit: 'A',  placeholder: '16' },
    { key: 'connector_in',  label: 'Eingang',     type: 'text',   placeholder: 'CEE 32A, Schuko …' },
    { key: 'connector_out', label: 'Ausgang',     type: 'text',   placeholder: 'Schuko, CEE 16A …' },
  ],
  'it-netzwerk': [
    { key: 'ip_range',   label: 'IP-Bereich', type: 'text',   placeholder: '192.168.1.0/24' },
    { key: 'protocol',   label: 'Protokoll',  type: 'text',   placeholder: 'sACN, Art-Net, Dante …' },
    { key: 'port_count', label: 'Ports',      type: 'number', placeholder: '8' },
  ],
  werkzeug: [],
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editItem?: InventoryItem | null;
  categories?: Category[];
}

// ── Lucide Icon dynamisch rendern ─────────────────────────────────────────────
function CategoryIcon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}

// ── Leerer Formularstand ──────────────────────────────────────────────────────
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

// ── Komponente ────────────────────────────────────────────────────────────────
export function ItemForm({ isOpen, onClose, onSubmit, editItem, categories = [] }: ItemFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading]   = useState(false);
  const [formData, setFormData]     = useState(emptyForm(categories[0]?.id));
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // Tag-State
  const [tagInput, setTagInput]           = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allUserTags, setAllUserTags]     = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const selectedCat = categories.find(c => c.id === formData.category);
  const attrFields  = ATTRIBUTE_FIELDS[formData.category] ?? [];
  const showDMX     = selectedCat?.is_dmx_capable ?? false;
  const showLent    = formData.condition === 'verliehen';

  // Tags vom User laden (für Autovervollständigung)
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

  // Formular befüllen
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

  // Nachsetzen falls categories später ankommen als das Formular sich öffnet
  useEffect(() => {
    if (!editItem && categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [categories, editItem]);

  // Kategorie-Wechsel → Attribute zurücksetzen
  const handleCategoryChange = (catId: string) => {
    setFormData(prev => ({ ...prev, category: catId, attributes: {} }));
  };

  // Attribut-Änderung
  const setAttr = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  // ── Tag-Handling ─────────────────────────────────────────────────────────

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

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name ist erforderlich';
    if (!formData.category)    newErrors.category = 'Kategorie ist erforderlich';
    if (formData.quantity === '' || parseInt(formData.quantity) <= 0)
      newErrors.quantity = 'Menge darf nicht 0 sein';

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

    // Attribute konvertieren (string → number/boolean wo nötig)
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
      hapticFeedback(50);
      onClose();
    } catch {
      // handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 w-[95vw] sm:max-w-[600px] max-h-[90vh] p-0 animate-scale-in">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {editItem ? 'Item bearbeiten' : 'Neues Item hinzufügen'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-5 px-4 sm:px-6 pb-6 pt-2">

            {/* ── Name ── */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Moving Head LED"
                className={`glass-input ${errors.name ? 'border-destructive' : ''}`}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* ── Kategorie-Picker ── */}
            <div className="space-y-2">
              <Label>Kategorie *</Label>
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
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}22` }}
                      >
                        <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            {/* ── Menge + Zustand + Standort ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Menge *</Label>
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
                <Label htmlFor="condition">Zustand *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={v => setFormData(p => ({ ...p, condition: v as ItemCondition }))}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {CONDITIONS.map(c => (
                      <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Standort *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  placeholder="Lager A"
                  className="glass-input"
                />
              </div>
            </div>

            {/* ── Preis + Zubehör ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Stückpreis (€)</Label>
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
                <Label htmlFor="accessories">Zubehör</Label>
                <Input
                  id="accessories"
                  value={formData.accessories}
                  onChange={e => setFormData(p => ({ ...p, accessories: e.target.value }))}
                  placeholder="Netzteil, Case …"
                  className="glass-input"
                />
              </div>
            </div>

            {/* ── Verliehen-Felder ── */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: showLent ? '200px' : '0px', opacity: showLent ? 1 : 0 }}
            >
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="space-y-2">
                  <Label htmlFor="lent_to">Verliehen an</Label>
                  <Input
                    id="lent_to"
                    value={formData.lent_to}
                    onChange={e => setFormData(p => ({ ...p, lent_to: e.target.value }))}
                    placeholder="Name / Firma"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lent_until">Verliehen bis</Label>
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

            {/* ── DMX-Felder (nur Licht) ── */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: showDMX ? '200px' : '0px', opacity: showDMX ? 1 : 0 }}
            >
              <div className="space-y-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Label className="text-sm font-medium text-primary">DMX-Konfiguration</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dmx_universe',      label: 'Universum',    key: 'dmx_universe',      ph: '1',  max: undefined, errKey: 'dmx_universe' },
                    { id: 'dmx_start_address', label: 'Startadresse', key: 'dmx_start_address', ph: '1',  max: 512,       errKey: 'dmx_start_address' },
                    { id: 'dmx_channels',      label: 'Kanäle',       key: 'dmx_channels',      ph: '16', max: undefined, errKey: 'dmx_channels' },
                  ].map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        type="number"
                        min="1"
                        max={field.max}
                        value={(formData as any)[field.key]}
                        onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.ph}
                        className={`glass-input ${errors[field.errKey] ? 'border-destructive' : ''}`}
                      />
                      {errors[field.errKey] && (
                        <p className="text-xs text-destructive">{errors[field.errKey]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Dynamische Kategorie-Attribute ── */}
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
                    {selectedCat?.name}-Eigenschaften
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {attrFields.map(field => (
                      <AttributeField
                        key={field.key}
                        field={field}
                        value={formData.attributes[field.key]}
                        onChange={val => setAttr(field.key, val)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Tags ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag size={13} className="text-muted-foreground" />
                Tags
              </Label>

              {/* Gewählte Tags */}
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

              {/* Eingabe + Autovervollständigung */}
              <div className="relative">
                <Input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={e => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onFocus={() => tagInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Tag eingeben, Enter zum Hinzufügen …"
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
              <p className="text-xs text-muted-foreground">Enter oder Komma = Tag hinzufügen</p>
            </div>

            {/* ── Foto ── */}
            <div className="space-y-2">
              <Label>Foto</Label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageChange={url => setFormData(p => ({ ...p, image_url: url }))}
              />
            </div>

            {/* ── Notizen ── */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optionale Bemerkungen …"
                className="glass-input resize-none"
                rows={3}
              />
            </div>

            {/* ── Buttons ── */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1" disabled={isLoading}>
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichern…</>
                ) : editItem ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Attribut-Feld-Renderer ────────────────────────────────────────────────────
function AttributeField({
  field,
  value,
  onChange,
}: {
  field: AttributeFieldDef;
  value: string | number | boolean | undefined;
  onChange: (val: string | number | boolean) => void;
}) {
  const baseClass = 'glass-input';

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2 col-span-2">
        <Label className="text-sm font-normal">{field.label}</Label>
        <Switch
          checked={!!value}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Select
          value={(value as string) ?? ''}
          onValueChange={onChange}
        >
          <SelectTrigger className={baseClass}>
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent className="glass-card border-border/50">
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
        onChange={e => onChange(field.type === 'number' ? e.target.value : e.target.value)}
        placeholder={field.placeholder}
        className={baseClass}
        step={field.type === 'number' ? 'any' : undefined}
      />
    </div>
  );
}
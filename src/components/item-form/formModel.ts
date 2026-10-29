import type { TFunction } from 'i18next';
import type { InventoryItem, ItemAttributes, ItemCondition } from '@/types/inventory';
import type { AttributeFieldDef } from '@/hooks/useAttributeFields';
import { validators } from '@/lib/validators';

export type AttrValue = string | number | boolean;

export type ItemFormPayload = Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

/** Raw (string-based) form state. Converted to a payload on submit. */
export interface ItemFormValues {
  name: string;
  category: string;
  quantity: string;
  condition: ItemCondition;
  location: string;
  notes: string;
  lent_to: string;
  lent_until: string;
  accessories: string;
  dmx_start_address: string;
  dmx_channels: string;
  dmx_universe: string;
  unit_price: string;
  weight_kg: string;
  units_per_case: string;
  dim_length: string;
  dim_width: string;
  dim_height: string;
  image_url: string | null;
  attributes: Record<string, AttrValue>;
  tags: string[];
}

export type SetFieldFn = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => void;

export type FormErrors = Partial<Record<string, string>>;

/** DOM id for a form field, used by labels and to focus the first invalid field. */
export const fieldId = (key: string) => `item-form-${key}`;

/** Classes for inputs that show the invalid state via `aria-invalid`. */
export const invalidCls = 'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20';

/** Props wiring an input to its Field error message. */
export const errorProps = (id: string, error?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
});

export function emptyForm(firstCategoryId = ''): ItemFormValues {
  return {
    name: '',
    category: firstCategoryId,
    quantity: '1',
    condition: 'verfügbar',
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
    image_url: null,
    attributes: {},
    tags: [],
  };
}

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function itemToForm(item: InventoryItem): ItemFormValues {
  const dims = item.dimensions_cm ?? null;
  return {
    name: item.name,
    category: item.category,
    quantity: String(item.quantity),
    condition: item.condition,
    location: item.location ?? '',
    notes: item.notes ?? '',
    lent_to: item.lent_to ?? '',
    lent_until: item.lent_until ?? '',
    accessories: item.accessories ?? '',
    dmx_start_address: str(item.dmx_start_address),
    dmx_channels: str(item.dmx_channels),
    dmx_universe: str(item.dmx_universe),
    unit_price: str(item.unit_price),
    weight_kg: str(item.weight_kg),
    units_per_case: str(item.units_per_case),
    dim_length: str(dims?.length),
    dim_width: str(dims?.width),
    dim_height: str(dims?.height),
    image_url: item.image_url ?? null,
    attributes: (item.attributes as Record<string, AttrValue> | null | undefined) ?? {},
    tags: item.tags ?? [],
  };
}

/**
 * Validation. Ranges mirror `src/lib/validators.ts`; messages are localised here
 * because the validator strings are German-only.
 */
export function validateForm(values: ItemFormValues, showDMX: boolean, t: TFunction): FormErrors {
  const errors: FormErrors = {};
  const range = (min: number, max: number) => t('item_form.error.range', { min, max });

  if (!values.name.trim()) errors.name = t('item_form.error.name_required');
  if (!values.category) errors.category = t('item_form.error.category_required');

  if (values.quantity === '' || parseInt(values.quantity) <= 0) {
    errors.quantity = t('item_form.error.quantity_zero');
  } else if (!validators.quantity(values.quantity).valid) {
    errors.quantity = range(1, 9999);
  }

  if (showDMX) {
    if (values.dmx_universe && !validators.universe(values.dmx_universe).valid) {
      errors.dmx_universe = range(1, 500);
    }
    if (values.dmx_start_address && !validators.dmxAddress(values.dmx_start_address).valid) {
      errors.dmx_start_address = range(1, 512);
    }
    if (values.dmx_channels && !validators.dmxChannels(values.dmx_channels).valid) {
      errors.dmx_channels = range(1, 512);
    }
  }

  if (values.units_per_case && parseInt(values.units_per_case) > parseInt(values.quantity)) {
    errors.units_per_case = t('item_form.error.units_per_case_exceeds_quantity');
  }

  return errors;
}

/** Order in which invalid fields are focused on submit (top to bottom). */
export const FIELD_ORDER = [
  'name', 'category', 'quantity',
  'dmx_universe', 'dmx_start_address', 'dmx_channels',
  'units_per_case',
];

export function buildPayload(values: ItemFormValues, attrFields: AttributeFieldDef[]): ItemFormPayload {
  const parsedAttributes: Record<string, AttrValue> = {};
  attrFields.forEach(field => {
    const raw = values.attributes[field.key];
    if (raw === undefined || raw === '') return;
    if (field.type === 'number') {
      const n = parseFloat(String(raw));
      if (!isNaN(n)) parsedAttributes[field.key] = n;
    } else {
      parsedAttributes[field.key] = raw;
    }
  });

  const hasDims = !!(values.dim_length || values.dim_width || values.dim_height);

  return {
    name:              values.name,
    category:          values.category,
    quantity:          parseInt(values.quantity),
    condition:         values.condition,
    location:          values.location,
    notes:             values.notes || null,
    lent_to:           values.lent_to || null,
    lent_until:        values.lent_until || null,
    accessories:       values.accessories || null,
    dmx_start_address: values.dmx_start_address ? parseInt(values.dmx_start_address) : null,
    dmx_channels:      values.dmx_channels ? parseInt(values.dmx_channels) : null,
    dmx_universe:      values.dmx_universe ? parseInt(values.dmx_universe) : null,
    unit_price:        values.unit_price ? parseFloat(values.unit_price) : null,
    weight_kg:         values.weight_kg ? parseFloat(values.weight_kg) : null,
    units_per_case:    values.units_per_case ? parseInt(values.units_per_case) : null,
    dimensions_cm:     hasDims
      ? {
          length: values.dim_length ? parseFloat(values.dim_length) : undefined,
          width:  values.dim_width  ? parseFloat(values.dim_width)  : undefined,
          height: values.dim_height ? parseFloat(values.dim_height) : undefined,
        }
      : null,
    image_url:         values.image_url,
    attributes:        Object.keys(parsedAttributes).length > 0 ? (parsedAttributes as ItemAttributes) : null,
    tags:              values.tags,
    deleted_at:        null,
  };
}

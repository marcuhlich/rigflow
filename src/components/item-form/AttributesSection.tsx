import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AttributeFieldDef } from '@/hooks/useAttributeFields';
import { getAttrValueLabel } from '@/i18n/helpers';
import { hapticFeedback } from '@/lib/utils';
import { Field, FormSection } from './FormLayout';
import { AttrValue, fieldId } from './formModel';

interface Props {
  categoryLabel: string;
  fields: AttributeFieldDef[];
  values: Record<string, AttrValue>;
  onChange: (key: string, value: AttrValue) => void;
}

/** Dynamic, per-category attributes (configured in category settings). */
export function AttributesSection({ categoryLabel, fields, values, onChange }: Props) {
  const { t } = useTranslation();
  const filled = fields.filter(f => {
    const v = values[f.key];
    return v !== undefined && v !== '' && v !== false;
  }).length;

  return (
    <FormSection
      title={t('item_form.category_properties', { name: categoryLabel })}
      aside={filled > 0 ? (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {filled}/{fields.length}
        </span>
      ) : undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <AttributeField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={val => onChange(field.key, val)}
          />
        ))}
      </div>
    </FormSection>
  );
}

interface AttributeFieldProps {
  field: AttributeFieldDef;
  value: AttrValue | undefined;
  onChange: (val: AttrValue) => void;
}

function AttributeField({ field, value, onChange }: AttributeFieldProps) {
  const { t } = useTranslation();
  const id = fieldId(`attr-${field.key}`);
  // Field labels are i18n keys (e.g. "attr.licht.lamp_type")
  const label = t(field.label, { defaultValue: field.label });

  if (field.type === 'boolean') {
    return (
      <div className="flex h-9 items-center justify-between gap-3 self-end rounded-md border border-border px-3 sm:col-span-2">
        <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
        <Switch
          id={id}
          checked={!!value}
          onCheckedChange={v => { hapticFeedback(10); onChange(v); }}
        />
      </div>
    );
  }

  const labelWithUnit = (
    <>
      {label}
      {field.unit && <span className="ml-1 font-normal text-muted-foreground">({field.unit})</span>}
    </>
  );

  if (field.type === 'select' && field.options) {
    return (
      <Field id={id} label={labelWithUnit}>
        <Select value={typeof value === 'string' && value ? value : undefined} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={t('item_form.placeholder.select')} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>
                {getAttrValueLabel(field.key, opt, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  const isNumber = field.type === 'number';
  return (
    <Field id={id} label={labelWithUnit}>
      <Input
        id={id}
        type={field.type === 'date' ? 'date' : isNumber ? 'number' : 'text'}
        inputMode={isNumber ? 'decimal' : undefined}
        step={isNumber ? 'any' : undefined}
        value={typeof value === 'boolean' ? '' : (value ?? '')}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={isNumber ? 'font-mono tabular-nums' : undefined}
      />
    </Field>
  );
}

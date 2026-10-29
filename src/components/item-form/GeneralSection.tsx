import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CONDITIONS, Category, ItemCondition } from '@/types/inventory';
import { getCategoryLabel, getConditionLabel } from '@/i18n/helpers';
import { cn } from '@/lib/utils';
import { Field, FormSection } from './FormLayout';
import { FormErrors, ItemFormValues, SetFieldFn, errorProps, fieldId, invalidCls } from './formModel';

interface Props {
  values: ItemFormValues;
  errors: FormErrors;
  setField: SetFieldFn;
  categories: Category[];
  onCategoryChange: (id: string) => void;
}

export const GeneralSection = forwardRef<HTMLInputElement, Props>(function GeneralSection(
  { values, errors, setField, categories, onCategoryChange },
  nameRef,
) {
  const { t } = useTranslation();
  const ids = {
    name: fieldId('name'),
    category: fieldId('category'),
    quantity: fieldId('quantity'),
    condition: fieldId('condition'),
    location: fieldId('location'),
    lent_to: fieldId('lent_to'),
    lent_until: fieldId('lent_until'),
  };
  const isLent = values.condition === 'verliehen';

  return (
    <FormSection title={t('item_form.section.general')}>
      <Field id={ids.name} label={t('item_form.label.name')} required error={errors.name}>
        <Input
          ref={nameRef}
          id={ids.name}
          value={values.name}
          onChange={e => setField('name', e.target.value)}
          placeholder={t('item_form.placeholder.name')}
          autoComplete="off"
          className={invalidCls}
          {...errorProps(ids.name, errors.name)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={ids.category} label={t('item_form.label.category')} required error={errors.category}>
          <Select value={values.category || undefined} onValueChange={onCategoryChange}>
            <SelectTrigger id={ids.category} className={invalidCls} {...errorProps(ids.category, errors.category)}>
              <SelectValue placeholder={t('item_form.placeholder.select')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: cat.color }}
                    />
                    {getCategoryLabel(cat, t)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id={ids.condition} label={t('item_form.label.condition')} required>
          <Select value={values.condition} onValueChange={v => setField('condition', v as ItemCondition)}>
            <SelectTrigger id={ids.condition}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map(c => (
                <SelectItem key={c} value={c}>{getConditionLabel(c, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-4">
        <Field id={ids.quantity} label={t('item_form.label.quantity')} required error={errors.quantity}>
          <Input
            id={ids.quantity}
            type="number"
            inputMode="numeric"
            min={1}
            value={values.quantity}
            onChange={e => setField('quantity', e.target.value)}
            placeholder="1"
            className={cn('font-mono tabular-nums', invalidCls)}
            {...errorProps(ids.quantity, errors.quantity)}
          />
        </Field>
        <Field id={ids.location} label={t('item_form.label.location')}>
          <Input
            id={ids.location}
            value={values.location}
            onChange={e => setField('location', e.target.value)}
            placeholder={t('item_form.placeholder.location')}
          />
        </Field>
      </div>

      {isLent && (
        <div className="grid grid-cols-1 gap-4 rounded-md border border-warning/30 bg-warning/5 p-3 sm:grid-cols-2">
          <Field id={ids.lent_to} label={t('item_form.label.lent_to')}>
            <Input
              id={ids.lent_to}
              value={values.lent_to}
              onChange={e => setField('lent_to', e.target.value)}
              placeholder={t('item_form.placeholder.lent_to')}
            />
          </Field>
          <Field id={ids.lent_until} label={t('item_form.label.lent_until')}>
            <Input
              id={ids.lent_until}
              type="date"
              value={values.lent_until}
              onChange={e => setField('lent_until', e.target.value)}
            />
          </Field>
        </div>
      )}
    </FormSection>
  );
});

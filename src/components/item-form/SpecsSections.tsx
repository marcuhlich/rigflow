import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Field, FormSection } from './FormLayout';
import { FormErrors, ItemFormValues, SetFieldFn, errorProps, fieldId, invalidCls } from './formModel';

interface Props {
  values: ItemFormValues;
  errors: FormErrors;
  setField: SetFieldFn;
}

/** Unit price and accessories. */
export function ValueSection({ values, setField }: Omit<Props, 'errors'>) {
  const { t } = useTranslation();
  const priceId = fieldId('unit_price');
  const accId = fieldId('accessories');

  return (
    <FormSection title={t('item_form.section.value')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <Field id={priceId} label={t('item_form.label.unit_price')}>
          <Input
            id={priceId}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            value={values.unit_price}
            onChange={e => setField('unit_price', e.target.value)}
            placeholder="0.00"
            className="font-mono tabular-nums"
          />
        </Field>
        <Field id={accId} label={t('fields.accessories')}>
          <Input
            id={accId}
            value={values.accessories}
            onChange={e => setField('accessories', e.target.value)}
            placeholder={t('item_form.placeholder.accessories')}
          />
        </Field>
      </div>
    </FormSection>
  );
}

type DimKey = 'dim_length' | 'dim_width' | 'dim_height';

/** Weight, case packing and dimensions. */
export function PhysicalSection({ values, errors, setField }: Props) {
  const { t } = useTranslation();
  const weightId = fieldId('weight_kg');
  const perCaseId = fieldId('units_per_case');

  const qty = parseInt(values.quantity);
  const perCase = parseInt(values.units_per_case);
  const caseSummary = qty > 0 && perCase > 0 && perCase <= qty
    ? [
        t('item_form.case_summary', { count: Math.floor(qty / perCase), perCase }),
        qty % perCase > 0 ? t('item_form.case_remainder', { count: qty % perCase }) : null,
      ].filter(Boolean).join(' ')
    : null;

  const dims: { key: DimKey; label: string }[] = [
    { key: 'dim_length', label: t('item_form.label.dim_length') },
    { key: 'dim_width',  label: t('item_form.label.dim_width') },
    { key: 'dim_height', label: t('item_form.label.dim_height') },
  ];

  return (
    <FormSection title={t('item_form.section_physical')}>
      <div className="grid grid-cols-2 gap-4">
        <Field id={weightId} label={t('item_form.label.weight_kg')}>
          <Input
            id={weightId}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={values.weight_kg}
            onChange={e => setField('weight_kg', e.target.value)}
            placeholder="4.5"
            className="font-mono tabular-nums"
          />
        </Field>
        <Field
          id={perCaseId}
          label={t('item_form.label.units_per_case')}
          error={errors.units_per_case}
          hint={caseSummary ?? t('item_form.label.units_per_case_hint')}
        >
          <Input
            id={perCaseId}
            type="number"
            inputMode="numeric"
            min={1}
            value={values.units_per_case}
            onChange={e => setField('units_per_case', e.target.value)}
            placeholder="1"
            className={cn('font-mono tabular-nums', invalidCls)}
            {...errorProps(perCaseId, errors.units_per_case)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {dims.map(({ key, label }) => {
          const id = fieldId(key);
          return (
            <Field key={key} id={id} label={label}>
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                value={values[key]}
                onChange={e => setField(key, e.target.value)}
                placeholder="–"
                className="font-mono tabular-nums"
              />
            </Field>
          );
        })}
      </div>
    </FormSection>
  );
}

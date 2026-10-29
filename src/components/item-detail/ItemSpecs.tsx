import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import type { AttributeFieldDef } from '@/hooks/useAttributeFields';
import { getAttrValueLabel } from '@/i18n/helpers';
import { EmptyPanel } from '@/components/QueryState';
import { Fact, FactGrid } from './FactGrid';

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

interface Props {
  item: InventoryItem;
  /** All attribute definitions of the item's category, for labels/units. */
  attributeFields: AttributeFieldDef[];
}

/** "Details" tab: category attributes, DMX, physical specs, notes. */
export function ItemSpecs({ item, attributeFields }: Props) {
  const { t } = useTranslation();

  const attrFacts: Fact[] = Object.entries((item.attributes ?? {}) as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, value]) => {
      const def = attributeFields.find(f => f.key === key);
      const label = def
        ? t(def.label, { defaultValue: key })
        : t(`fields.${key}`, { defaultValue: key.replace(/_/g, ' ') });
      let display: string;
      if (typeof value === 'boolean') display = value ? t('common.yes') : t('common.no');
      else if (def?.type === 'select') display = getAttrValueLabel(key, String(value), t);
      else display = def?.unit ? `${value} ${def.unit}` : String(value);
      return { key, label, value: display, mono: typeof value === 'number' };
    });

  const hasDmx = item.dmx_start_address != null;
  const dmxFacts: Fact[] = hasDmx
    ? [
        { key: 'universe', label: t('item_detail.label_universe'), value: item.dmx_universe || 1, mono: true },
        { key: 'address', label: t('item_detail.label_start_address'), value: item.dmx_start_address, mono: true },
        { key: 'channels', label: t('item_detail.label_channels'), value: item.dmx_channels || 1, mono: true },
      ]
    : [];

  const dims = item.dimensions_cm;
  const dimsValue = dims
    ? [dims.length, dims.width, dims.height].map(v => (v ? String(v) : '–')).join(' × ')
    : null;

  const physicalFacts: Fact[] = [
    ...(item.weight_kg ? [{ key: 'weight', label: t('item_form.label.weight_kg'), value: item.weight_kg, mono: true }] : []),
    ...(item.units_per_case
      ? [{ key: 'case', label: t('item_form.label.units_per_case'), value: t('item_detail.units_per_case_value', { count: item.units_per_case }) }]
      : []),
    ...(dimsValue ? [{ key: 'dims', label: t('item_form.label.dimensions'), value: `${dimsValue} cm`, mono: true }] : []),
    ...(item.accessories ? [{ key: 'acc', label: t('fields.accessories'), value: item.accessories }] : []),
  ];

  const isEmpty = attrFacts.length === 0 && !hasDmx && physicalFacts.length === 0 && !item.notes;
  if (isEmpty) {
    return <EmptyPanel icon={FileText} title={t('item_detail.details_empty')} />;
  }

  return (
    <div className="space-y-6">
      {attrFacts.length > 0 && (
        <Section title={t('item_detail.section_properties')}>
          <FactGrid facts={attrFacts} />
        </Section>
      )}
      {hasDmx && (
        <Section title={t('dmx.title')}>
          <FactGrid facts={dmxFacts} />
        </Section>
      )}
      {physicalFacts.length > 0 && (
        <Section title={t('item_form.section_physical')}>
          <FactGrid facts={physicalFacts} columns={2} />
        </Section>
      )}
      {item.notes && (
        <Section title={t('fields.notes')}>
          <p className="surface whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed">{item.notes}</p>
        </Section>
      )}
    </div>
  );
}

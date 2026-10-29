import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Field, FormSection } from './FormLayout';
import { FormErrors, ItemFormValues, SetFieldFn, errorProps, fieldId, invalidCls } from './formModel';
import type { DmxInstanceRow } from './useDmxInstances';

type DmxKey = 'dmx_universe' | 'dmx_start_address' | 'dmx_channels';

interface Props {
  values: ItemFormValues;
  errors: FormErrors;
  setField: SetFieldFn;
  instances: DmxInstanceRow[];
  /** Per-instance editing is only possible for stored items. */
  instancesEditable: boolean;
  onInstanceChange: (n: number, key: 'address' | 'universe', value: string) => void;
}

export function DmxSection({ values, errors, setField, instances, instancesEditable, onInstanceChange }: Props) {
  const { t } = useTranslation();
  const channels = parseInt(values.dmx_channels) || 0;

  const baseFields: { key: DmxKey; label: string; placeholder: string; max?: number }[] = [
    { key: 'dmx_universe',      label: t('item_form.label.dmx_universe'),      placeholder: '1' },
    { key: 'dmx_start_address', label: t('item_form.label.dmx_start_address'), placeholder: '1', max: 512 },
    { key: 'dmx_channels',      label: t('item_form.label.dmx_channels'),      placeholder: '16', max: 512 },
  ];

  const handleInstance = (n: number, key: 'address' | 'universe', value: string) => {
    if (n === 1) setField(key === 'address' ? 'dmx_start_address' : 'dmx_universe', value);
    else onInstanceChange(n, key, value);
  };

  return (
    <FormSection title={t('item_form.label.dmx_config')}>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {baseFields.map(f => {
          const id = fieldId(f.key);
          return (
            <Field key={f.key} id={id} label={f.label} error={errors[f.key]}>
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={f.max}
                value={values[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={cn('font-mono tabular-nums', invalidCls)}
                {...errorProps(id, errors[f.key])}
              />
            </Field>
          );
        })}
      </div>

      {instances.length > 1 && (
        <div className="space-y-2">
          <p className="eyebrow">{t('item_form.dmx.all_instances')}</p>
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_4.5rem] gap-2 border-b border-border bg-surface-sunken px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <span>#</span>
              <span className="truncate">{t('item_form.label.dmx_universe')}</span>
              <span className="truncate">{t('item_form.label.dmx_start_address')}</span>
              <span className="truncate text-right">{t('item_form.dmx.end_address')}</span>
            </div>
            <div className="max-h-56 divide-y divide-border overflow-y-auto">
              {instances.map(inst => {
                const addr = parseInt(inst.address);
                const endAddr = !isNaN(addr) && channels > 0 ? addr + channels - 1 : null;
                const outOfRange = endAddr !== null && endAddr > 512;
                return (
                  <div
                    key={inst.instanceNumber}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_4.5rem] items-center gap-2 px-3 py-1.5"
                  >
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {inst.instanceNumber}
                    </span>
                    {instancesEditable ? (
                      <>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={inst.universe}
                          onChange={e => handleInstance(inst.instanceNumber, 'universe', e.target.value)}
                          placeholder="1"
                          aria-label={`${t('item_form.label.dmx_universe')} #${inst.instanceNumber}`}
                          className="h-8 font-mono text-xs tabular-nums"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={512}
                          value={inst.address}
                          onChange={e => handleInstance(inst.instanceNumber, 'address', e.target.value)}
                          placeholder="1"
                          aria-label={`${t('item_form.label.dmx_start_address')} #${inst.instanceNumber}`}
                          aria-invalid={outOfRange || undefined}
                          className={cn('h-8 font-mono text-xs tabular-nums', invalidCls)}
                        />
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs tabular-nums">{inst.universe || '1'}</span>
                        <span className="font-mono text-xs tabular-nums">{inst.address || '1'}</span>
                      </>
                    )}
                    <span
                      className={cn(
                        'text-right font-mono text-xs tabular-nums',
                        outOfRange ? 'text-destructive' : 'text-muted-foreground',
                      )}
                      title={outOfRange ? t('item_form.dmx.out_of_range') : undefined}
                    >
                      {endAddr ?? '–'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {instances.some(i => {
            const a = parseInt(i.address);
            return !isNaN(a) && channels > 0 && a + channels - 1 > 512;
          }) && (
            <p role="alert" className="text-xs text-destructive">{t('item_form.dmx.out_of_range')}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {instancesEditable ? t('item_form.dmx.instance_sync_hint') : t('item_form.dmx.instances_after_save')}
          </p>
        </div>
      )}
    </FormSection>
  );
}

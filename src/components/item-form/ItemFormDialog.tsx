import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Category, InventoryItem } from '@/types/inventory';
import { getCategoryLabel } from '@/i18n/helpers';
import { useAttributeFields } from '@/hooks/useAttributeFields';
import { useToast } from '@/hooks/use-toast';
import { cn, hapticFeedback } from '@/lib/utils';
import { GeneralSection } from './GeneralSection';
import { AttributesSection } from './AttributesSection';
import { DmxSection } from './DmxSection';
import { PhysicalSection, ValueSection } from './SpecsSections';
import { NotesSection, TagsSection } from './TagsNotesSections';
import { useUserTags } from './useUserTags';
import { useDmxInstances } from './useDmxInstances';
import {
  AttrValue, FIELD_ORDER, ItemFormPayload, ItemFormValues, SetFieldFn,
  buildPayload, emptyForm, fieldId, itemToForm, validateForm,
} from './formModel';

export interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Should reject on failure; the form then stays open with the user's input. */
  onSubmit: (item: ItemFormPayload) => Promise<void>;
  editItem?: InventoryItem | null;
  categories?: Category[];
}

const EMPTY_CATEGORIES: Category[] = [];

// Full-screen sheet on phones, centred dialog from `sm` up.
const MOBILE_FULLSCREEN = [
  'max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:max-w-none',
  'max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
  'max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=open]:slide-in-from-top-0',
  'max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=closed]:slide-out-to-top-0',
].join(' ');

export function ItemForm({ isOpen, onClose, onSubmit, editItem, categories = EMPTY_CATEGORIES }: ItemFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getFieldsForCategory } = useAttributeFields();
  const userTags = useUserTags(isOpen);

  const [values, setValues] = useState<ItemFormValues>(() => emptyForm(categories[0]?.id));
  const [attempted, setAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Reset whenever the dialog opens or switches to another item. Intentionally
  // not keyed on the item object / categories array: a background refetch must
  // not wipe what the user is typing.
  const editId = editItem?.id;
  useEffect(() => {
    if (!isOpen) return;
    setValues(editItem ? itemToForm(editItem) : emptyForm(categories[0]?.id));
    setAttempted(false);
    setIsSaving(false);
  }, [isOpen, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Categories may arrive after the dialog opened (new item only).
  const firstCategoryId = categories[0]?.id;
  useEffect(() => {
    if (!isOpen || editId || !firstCategoryId) return;
    setValues(prev => (prev.category ? prev : { ...prev, category: firstCategoryId }));
  }, [isOpen, editId, firstCategoryId]);

  const setField = useCallback<SetFieldFn>((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const selectedCat = categories.find(c => c.id === values.category);
  const attrFields = getFieldsForCategory(values.category);
  const showDMX = selectedCat?.is_dmx_capable ?? false;

  const dmx = useDmxInstances({
    isOpen,
    itemId: editId,
    quantity: values.quantity,
    channels: values.dmx_channels,
    startAddress: values.dmx_start_address,
    universe: values.dmx_universe,
  });

  // Inline validation: silent until the first submit, then live.
  const errors = useMemo(
    () => (attempted ? validateForm(values, showDMX, t) : {}),
    [attempted, values, showDMX, t],
  );
  const errorCount = Object.keys(errors).length;

  const handleCategoryChange = (catId: string) => {
    hapticFeedback(10);
    setValues(prev => ({ ...prev, category: catId, attributes: {} }));
  };

  const setAttr = (key: string, value: AttrValue) => {
    setValues(prev => ({ ...prev, attributes: { ...prev.attributes, [key]: value } }));
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setAttempted(true);

    const nextErrors = validateForm(values, showDMX, t);
    const firstInvalid = FIELD_ORDER.find(k => nextErrors[k]);
    if (firstInvalid) {
      hapticFeedback(80);
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(buildPayload(values, attrFields));

      if (editItem && dmx.rows.length > 0) {
        const ok = await dmx.persist(editItem.id);
        if (!ok) {
          toast({
            title: t('common.error'),
            description: t('item_form.error.dmx_instances_save'),
            variant: 'destructive',
          });
        }
      }

      hapticFeedback(60);
      if (mountedRef.current) {
        setIsSaving(false);
        onClose();
      }
    } catch {
      // The caller reports the error; keep the dialog open so nothing is lost.
      if (mountedRef.current) setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={e => {
          // New item: start typing the name right away. Edit: default focus (close button).
          if (editItem) return;
          e.preventDefault();
          nameRef.current?.focus();
        }}
        className={cn('flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0', MOBILE_FULLSCREEN)}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border pl-4 pr-2 max-sm:mt-[env(safe-area-inset-top)] sm:pl-6">
          <DialogTitle className="truncate">
            {editItem ? t('item_form.title_edit') : t('item_form.title_add')}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSaving}
            aria-label={t('common.close')}
          >
            <X />
          </Button>
        </header>

        <form
          id="item-form"
          onSubmit={handleSubmit}
          noValidate
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <GeneralSection
            ref={nameRef}
            values={values}
            errors={errors}
            setField={setField}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />

          {attrFields.length > 0 && (
            <AttributesSection
              categoryLabel={selectedCat ? getCategoryLabel(selectedCat, t) : ''}
              fields={attrFields}
              values={values.attributes}
              onChange={setAttr}
            />
          )}

          {showDMX && (
            <DmxSection
              values={values}
              errors={errors}
              setField={setField}
              instances={dmx.rows}
              instancesEditable={!!editItem}
              onInstanceChange={dmx.setInstanceValue}
            />
          )}

          <ValueSection values={values} setField={setField} />
          <PhysicalSection values={values} errors={errors} setField={setField} />
          <TagsSection
            tags={values.tags}
            onChange={tags => setField('tags', tags)}
            suggestionsSource={userTags}
          />
          <NotesSection values={values} setField={setField} />
        </form>

        <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-4 py-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <p role="status" className="mr-auto hidden min-w-0 truncate text-xs text-destructive sm:block">
            {errorCount > 0 ? t('item_form.error.summary') : null}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="max-sm:flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="item-form" disabled={isSaving} className="max-sm:flex-1">
            {isSaving && <Loader2 className="animate-spin" />}
            {isSaving ? t('common.saving') : editItem ? t('common.save') : t('item_form.btn_add')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

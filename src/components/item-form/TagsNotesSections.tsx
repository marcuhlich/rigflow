import { KeyboardEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { hapticFeedback } from '@/lib/utils';
import { Field, FormSection } from './FormLayout';
import { ItemFormValues, SetFieldFn, fieldId } from './formModel';

interface TagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestionsSource: string[];
}

export function TagsSection({ tags, onChange, suggestionsSource }: TagsProps) {
  const { t } = useTranslation();
  const id = fieldId('tags');
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    return suggestionsSource
      .filter(s => s.toLowerCase().includes(q) && !tags.includes(s))
      .slice(0, 6);
  }, [input, suggestionsSource, tags]);

  const addTag = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    setInput('');
    setOpen(false);
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    hapticFeedback(10);
  };

  const removeTag = (name: string) => onChange(tags.filter(tag => tag !== name));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Enter') {
      // Never submit the whole form from the tag input
      e.preventDefault();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <FormSection title={t('item_form.label.tags')}>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="sr-only">{t('item_form.label.tags')}</Label>
        <div className="relative">
          <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 hover:border-border-strong">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-border bg-muted pl-1.5 pr-0.5 text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-[3px] p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label={`${t('common.delete')}: ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Input
              id={id}
              value={input}
              onChange={e => { setInput(e.target.value); setOpen(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => input && setOpen(true)}
              onBlur={() => setOpen(false)}
              placeholder={tags.length === 0 ? t('item_form.placeholder.tag_input') : undefined}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls={`${id}-list`}
              className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1.5 shadow-none hover:border-0 focus-visible:ring-0"
            />
          </div>
          {open && suggestions.length > 0 && (
            <ul
              id={`${id}-list`}
              role="listbox"
              className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg"
            >
              {suggestions.map(s => (
                <li key={s} role="option" aria-selected={false}>
                  <button
                    type="button"
                    // mousedown fires before the input's blur closes the list
                    onMouseDown={e => { e.preventDefault(); addTag(s); }}
                    className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('item_form.tags_hint')}</p>
      </div>
    </FormSection>
  );
}

interface NotesProps {
  values: ItemFormValues;
  setField: SetFieldFn;
}

export function NotesSection({ values, setField }: NotesProps) {
  const { t } = useTranslation();
  const notesId = fieldId('notes');

  return (
    <FormSection title={t('item_form.label.notes_photo')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field id={notesId} label={t('fields.notes')}>
          <Textarea
            id={notesId}
            value={values.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder={t('item_form.placeholder.notes')}
            rows={4}
            className="resize-y"
          />
        </Field>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] font-medium">{t('item_form.label.photo')}</p>
          <ImageUpload
            currentImageUrl={values.image_url}
            onImageChange={url => setField('image_url', url)}
          />
        </div>
      </div>
    </FormSection>
  );
}

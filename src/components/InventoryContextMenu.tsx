import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem, ItemCondition } from '@/types/inventory';
import { getConditionLabel } from '@/i18n/helpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import type { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Activity, FolderKanban, Copy, Filter, History,
  Minus, Plus, QrCode, ShieldCheck,
} from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────────────────────
interface InventoryContextMenuProps {
  item: InventoryItem;
  children: React.ReactNode;
  onUpdateItem: (
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  onAddItem: (
    item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  onFilterCategory: (category: string) => void;
  /** Projects offered in "Add to project". Fetched once by the list, not per row. */
  projects?: Project[];
}

const CONDITION_OPTIONS: ItemCondition[] = ['verfügbar', 'in-einsatz', 'defekt'];

// ─── Shared class strings ─────────────────────────────────────────────────────
const CONTENT_CLS = 'w-60';
const ITEM_CLS = 'gap-2 cursor-pointer focus:bg-muted focus:text-foreground data-[disabled]:opacity-40';
const ICON_CLS = 'h-4 w-4 shrink-0 text-muted-foreground';
const SUBTRIGGER_CLS = 'gap-2 cursor-pointer focus:bg-muted focus:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground';
const SEPARATOR_CLS = 'bg-border';
const subContentProps = { avoidCollisions: true, collisionPadding: 12, sideOffset: -2 } as const;

// ─── Quantity Popover ─────────────────────────────────────────────────────────
interface QtyPopoverProps {
  item: InventoryItem;
  onCommit: (newQty: number) => Promise<void>;
}

function QtyPopover({ item, onCommit }: QtyPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(item.quantity));
  const parsedDraft = Math.max(0, parseInt(draft, 10) || 0);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setDraft(String(item.quantity));
  };

  const handleConfirm = async () => {
    if (parsedDraft !== item.quantity) await onCommit(parsedDraft);
    setOpen(false);
  };

  const adjustDraft = (delta: number) => setDraft(String(parsedDraft + delta));

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Keep Radix menu typeahead from stealing digits typed into the field.
    if (e.key !== 'Escape') e.stopPropagation();
    if (e.key === 'Enter') void handleConfirm();
  };

  return (
    <ContextMenuSub open={open} onOpenChange={handleOpenChange}>
      <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
        <ShieldCheck className={ICON_CLS} />
        {t('inventory_context.adjust_quantity')}
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {t('inventory_context.quantity_unit', { count: item.quantity })}
        </span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-52" {...subContentProps}>
        <div className="eyebrow border-b border-border px-2 pb-1.5 pt-1">
          {t('inventory_context.adjust_quantity')}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustDraft(-1)} aria-label="-1"><Minus /></Button>
          <Input
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleInputKey}
            className="h-8 flex-1 text-center font-mono tabular-nums"
          />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustDraft(1)} aria-label="+1"><Plus /></Button>
        </div>
        <div className="mt-0.5 flex gap-1.5 px-2">
          {[-10, -5, 5, 10].map(delta => (
            <Button key={delta} variant="ghost" size="sm" className="h-7 flex-1 px-0 font-mono text-xs tabular-nums"
              onClick={() => adjustDraft(delta)}>
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>
        <div className="px-2 pb-1.5 pt-2">
          <Button size="sm" className="w-full" onClick={() => void handleConfirm()}>
            {t('common.confirm')}
          </Button>
        </div>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InventoryContextMenu({
  item,
  children,
  onUpdateItem,
  onAddItem,
  onFilterCategory,
  projects = [],
}: InventoryContextMenuProps) {
  const { t } = useTranslation();
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);

  if (isMobile) return <>{children}</>;

  const activeProjects = projects
    .filter(p => p.status !== 'archived' && p.status !== 'draft')
    .slice(0, 8);

  const showAddError = () =>
    toast({
      title: t('common.error'),
      description: t('inventory_context.add_to_project_error'),
      variant: 'destructive',
    });

  const handleAddToProject = async (projectId: string, projectName: string) => {
    try {
      const { data: existing, error: lookupError } = await supabase
        .from('project_items')
        .select('id')
        .eq('project_id', projectId)
        .eq('inventory_item_id', item.id)
        .maybeSingle();

      if (lookupError) { showAddError(); return; }

      if (existing) {
        toast({
          title: t('inventory_context.already_in_project'),
          description: t('inventory_context.already_in_project_desc', {
            item: item.name,
            project: projectName,
          }),
          variant: 'destructive',
        });
        return;
      }

      const { error: insertError } = await supabase.from('project_items').insert({
        project_id:        projectId,
        inventory_item_id: item.id,
        quantity:          item.quantity,
        source:            'direct',
        packed:            false,
      });
      if (insertError) { showAddError(); return; }

      toast({
        title: t('inventory_context.added_to_project'),
        description: t('inventory_context.added_to_project_desc', {
          item: item.name,
          project: projectName,
        }),
      });
    } catch {
      showAddError();
    }
  };

  const handleConditionChange = async (condition: ItemCondition) => {
    try {
      await onUpdateItem(item.id, { condition });
      toast({
        title: t('inventory_context.condition_changed'),
        description: `„${item.name}" → ${getConditionLabel(condition, t)}`,
      });
    } catch { /* toast already shown by useInventory */ }
  };

  const handleQuantityCommit = async (newQty: number) => {
    try {
      await onUpdateItem(item.id, { quantity: newQty });
      toast({
        title: t('inventory_context.quantity_changed'),
        description: `„${item.name}": ${item.quantity} → ${newQty}`,
      });
    } catch { /* handled upstream */ }
  };

  const handleDuplicate = async () => {
    // Build an explicit insert payload instead of spreading the fetched row. This
    // prevents read-only/runtime fields from reaching Supabase and ensures a copy
    // starts as an independent, available item rather than inheriting a loan or
    // occupied DMX patch from the original.
    const duplicate = {
      name: t('inventory_context.copy_name', { name: item.name }),
      category: item.category,
      quantity: item.quantity,
      condition: 'verfügbar' as const,
      location: item.location,
      notes: item.notes ?? null,
      lent_to: null,
      lent_until: null,
      accessories: item.accessories ?? null,
      dmx_start_address: null,
      dmx_channels: item.dmx_channels ?? null,
      dmx_universe: null,
      unit_price: item.unit_price ?? null,
      weight_kg: item.weight_kg ?? null,
      units_per_case: item.units_per_case ?? null,
      dimensions_cm: item.dimensions_cm ?? null,
      image_url: item.image_url ?? null,
      attributes: item.attributes ?? null,
      tags: [...(item.tags ?? [])],
    };
    try {
      await onAddItem(duplicate);
      toast({
        title: t('inventory_context.duplicated'),
        description: t('inventory_context.duplicated_desc', { name: item.name }),
      });
    } catch { /* handled upstream */ }
  };

  const handleShowHistory = () => navigate(`/inventory/${item.id}?tab=wartung`);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className={CONTENT_CLS} collisionPadding={12}>
          <ContextMenuLabel className="truncate px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {item.name}
          </ContextMenuLabel>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 1. Zustand ─────────────────────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <Activity className={ICON_CLS} />
              {t('inventory_context.change_condition')}
              <span className="ml-auto text-xs text-muted-foreground">
                {getConditionLabel(item.condition, t)}
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44" {...subContentProps}>
              <ContextMenuRadioGroup
                value={item.condition}
                onValueChange={v => handleConditionChange(v as ItemCondition)}
              >
                {CONDITION_OPTIONS.map(val => (
                  <ContextMenuRadioItem key={val} value={val} className={ITEM_CLS}>
                    {getConditionLabel(val, t)}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 2. Menge ───────────────────────────────────────────────── */}
          <QtyPopover item={item} onCommit={handleQuantityCommit} />

          {/* ── 3. Duplizieren ─────────────────────────────────────────── */}
          <ContextMenuItem
            className={ITEM_CLS}
            onSelect={(event) => {
              event.preventDefault();
              void handleDuplicate();
            }}
          >
            <Copy className={ICON_CLS} />
            {t('inventory_context.duplicate')}
          </ContextMenuItem>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 4. Zu Projekt hinzufügen ───────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <FolderKanban className={ICON_CLS} />
              {t('inventory_context.add_to_project')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56" {...subContentProps}>
              {activeProjects.length === 0 ? (
                <ContextMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
                  {t('inventory_context.no_active_projects')}
                </ContextMenuLabel>
              ) : (
                activeProjects.map(project => (
                  <ContextMenuItem
                    key={project.id}
                    className={`truncate ${ITEM_CLS}`}
                    onSelect={() => void handleAddToProject(project.id, project.name)}
                  >
                    <span className="truncate flex-1">{project.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                      {t(`project_status.${project.status}`, { defaultValue: '' })}
                    </span>
                  </ContextMenuItem>
                ))
              )}
              <ContextMenuSeparator className={SEPARATOR_CLS} />
              <ContextMenuItem className={ITEM_CLS} onSelect={() => navigate('/projects')}>
                {t('inventory_context.all_projects')}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 5. QR-Code ─────────────────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={() => setQrOpen(true)}>
            <QrCode className={ICON_CLS} />
            {t('inventory_context.show_qr')}
          </ContextMenuItem>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 6. Kategorie filtern ───────────────────────────────────── */}
          <ContextMenuItem
            className={ITEM_CLS}
            onSelect={() => onFilterCategory(item.category)}
            disabled={!item.category}
          >
            <Filter className={ICON_CLS} />
            {t('inventory_context.filter_category')}
            {item.category && (
              <span className="ml-auto max-w-[80px] truncate text-xs text-muted-foreground">
                {t(`categories.${item.category}`, { defaultValue: item.category })}
              </span>
            )}
          </ContextMenuItem>

          {/* ── 7. Verlauf anzeigen ────────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={handleShowHistory}>
            <History className={ICON_CLS} />
            {t('inventory_context.show_history')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {qrOpen && (
        <QRCodeDisplay
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          itemId={item.id}
          itemName={item.name}
          itemDetails={{
            category: item.category,
            quantity: item.quantity,
            location: item.location,
          }}
          size="md"
        />
      )}
    </>
  );
}

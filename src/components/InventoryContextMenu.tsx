import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem, ItemCondition } from '@/types/inventory';
import { getConditionLabel } from '@/i18n/helpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
}

const CONDITION_OPTIONS: ItemCondition[] = ['verfügbar', 'in-einsatz', 'defekt'];

// ─── Shared class strings ─────────────────────────────────────────────────────
const CONTENT_CLS = 'w-60 border border-border bg-popover text-popover-foreground shadow-2xl';
const SUB_CONTENT_CLS = 'border border-border bg-popover text-popover-foreground shadow-xl';
const ITEM_CLS = 'gap-2 cursor-pointer focus:bg-muted focus:text-foreground data-[disabled]:opacity-40';
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
    if (e.key === 'Enter') handleConfirm();
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        {t('inventory_context.adjust_quantity')}
        <span className="ml-auto text-xs text-muted-foreground">
          {t('inventory_context.quantity_unit', { count: item.quantity })}
        </span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className={`${SUB_CONTENT_CLS} w-52`} {...subContentProps}>
        <div className="px-2 py-1 text-sm font-semibold border-b border-border">
          {t('inventory_context.adjust_quantity')}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-2">
          <Button variant="outline" size="icon" onClick={() => adjustDraft(-1)}><Minus /></Button>
          <Input
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleInputKey}
            className="h-8 text-center w-16"
          />
          <Button variant="outline" size="icon" onClick={() => adjustDraft(1)}><Plus /></Button>
        </div>
        <div className="mt-0.5 flex gap-1.5 px-2">
          {[-10, -5, 5, 10].map(delta => (
            <Button key={delta} variant="ghost" size="sm" className="flex-1 text-xs"
              onClick={() => adjustDraft(delta)}>
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>
        <div className="mt-2 px-2 py-2">
          <Button className="w-full" onClick={handleConfirm}>
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
}: InventoryContextMenuProps) {
  const { t } = useTranslation();
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);
  const { projects } = useProjects();

  if (isMobile) return <>{children}</>;

  const activeProjects = projects
    .filter(p => p.status !== ('archived' as any) && p.status !== 'draft')
    .slice(0, 8);

  const handleAddToProject = async (projectId: string, projectName: string) => {
    try {
      const { data: existing } = await supabase
        .from('project_items')
        .select('id')
        .eq('project_id', projectId)
        .eq('inventory_item_id', item.id)
        .maybeSingle();

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

      await supabase.from('project_items').insert({
        project_id:        projectId,
        inventory_item_id: item.id,
        quantity:          item.quantity,
        source:            'direct',
        packed:            false,
      } as any);

      toast({
        title: t('inventory_context.added_to_project'),
        description: t('inventory_context.added_to_project_desc', {
          item: item.name,
          project: projectName,
        }),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('inventory_context.add_to_project_error'),
        variant: 'destructive',
      });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, user_id, created_at, updated_at, ...rest } = item;
    try {
      await onAddItem({ ...rest, name: t('inventory_context.copy_name', { name: item.name }) });
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
        <ContextMenuContent
          className={CONTENT_CLS}
          style={{ borderRadius: 10 }}
          collisionPadding={12}
        >
          <ContextMenuLabel className="truncate px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary/70">
            {item.name}
          </ContextMenuLabel>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 1. Zustand ─────────────────────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <Activity className="h-4 w-4 text-primary shrink-0" />
              {t('inventory_context.change_condition')}
              <span className="ml-auto text-xs text-muted-foreground">
                {getConditionLabel(item.condition, t)}
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className={`${SUB_CONTENT_CLS} w-44`} {...subContentProps}>
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
          <ContextMenuItem className={ITEM_CLS} onSelect={handleDuplicate}>
            <Copy className="h-4 w-4 text-primary shrink-0" />
            {t('inventory_context.duplicate')}
          </ContextMenuItem>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 4. Zu Projekt hinzufügen ───────────────────────────────── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUBTRIGGER_CLS}>
              <FolderKanban className="h-4 w-4 text-primary shrink-0" />
              {t('inventory_context.add_to_project')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className={`${SUB_CONTENT_CLS} w-56`} {...subContentProps}>
              {activeProjects.length === 0 ? (
                <ContextMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
                  {t('inventory_context.no_active_projects')}
                </ContextMenuLabel>
              ) : (
                activeProjects.map(project => (
                  <ContextMenuItem
                    key={project.id}
                    className={`truncate ${ITEM_CLS}`}
                    onSelect={() => handleAddToProject(project.id, project.name)}
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
                <FolderKanban className="h-4 w-4 text-primary shrink-0" />
                {t('inventory_context.all_projects')}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 5. QR-Code ─────────────────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4 text-primary shrink-0" />
            {t('inventory_context.show_qr')}
          </ContextMenuItem>
          <ContextMenuSeparator className={SEPARATOR_CLS} />

          {/* ── 6. Kategorie filtern ───────────────────────────────────── */}
          <ContextMenuItem
            className={ITEM_CLS}
            onSelect={() => onFilterCategory(item.category)}
            disabled={!item.category}
          >
            <Filter className="h-4 w-4 text-primary shrink-0" />
            {t('inventory_context.filter_category')}
            {item.category && (
              <span className="ml-auto max-w-[80px] truncate text-xs text-muted-foreground">
                {t(`categories.${item.category}`, { defaultValue: item.category })}
              </span>
            )}
          </ContextMenuItem>

          {/* ── 7. Verlauf anzeigen ────────────────────────────────────── */}
          <ContextMenuItem className={ITEM_CLS} onSelect={handleShowHistory}>
            <History className="h-4 w-4 text-primary shrink-0" />
            {t('inventory_context.show_history')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
    </>
  );
}
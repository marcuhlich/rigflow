import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ToastAction } from "@/components/ui/toast";
import { EmptyPanel, ErrorState, ListSkeleton } from "@/components/QueryState";
import { ConfirmDestructiveDialog } from "@/components/inventory/ConfirmDestructiveDialog";
import { useCategoryLabel } from "@/components/inventory/format";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface TrashDrawerProps {
  open: boolean;
  onClose: () => void;
  trashedItems: InventoryItem[];
  onFetch: () => Promise<void>;
  onRestore: (id: string) => Promise<InventoryItem | undefined>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  categories?: { id: string; name: string }[];
}

const RETENTION_DAYS = 30;

function getDaysRemaining(deletedAt: string | null | undefined): number {
  if (!deletedAt) return RETENTION_DAYS;
  const ts = new Date(deletedAt).getTime();
  if (Number.isNaN(ts)) return RETENTION_DAYS;
  const daysInTrash = Math.floor((Date.now() - ts) / 86_400_000);
  return Math.max(0, RETENTION_DAYS - daysInTrash);
}

function formatDate(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang.startsWith("de") ? "de-DE" : "en-US", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

type Confirm = { kind: "empty" } | { kind: "single"; id: string } | { kind: "bulk" } | null;

export function TrashDrawer({
  open, onClose, trashedItems, onFetch, onRestore, onPermanentDelete, onEmptyTrash, categories,
}: TrashDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const categoryLabel = useCategoryLabel(categories);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const onFetchRef = useRef(onFetch);
  useEffect(() => { onFetchRef.current = onFetch; }, [onFetch]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      await onFetchRef.current();
    } catch (error) {
      if (mounted.current) setLoadError(error);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    void load();
  }, [open, load]);

  // Drop selections for items that disappeared (restored/deleted elsewhere).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(trashedItems.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [trashedItems]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = trashedItems.length > 0 && selectedIds.size === trashedItems.length;
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(trashedItems.map((i) => i.id)));

  /** Runs fn for every id; returns how many succeeded. Errors are toasted by the hook. */
  const runEach = async (ids: string[], fn: (id: string) => Promise<unknown>) => {
    let ok = 0;
    for (const id of ids) {
      try {
        await fn(id);
        ok++;
      } catch { /* toast shown by useInventory */ }
    }
    return ok;
  };

  const handleRestore = async (id: string) => {
    try {
      const restored = await onRestore(id);
      if (!restored) return;
      toast({
        title: t("trash.restored_title"),
        description: t("trash.restored_description", { name: restored.name }),
        action: (
          <ToastAction
            altText={t("trash.go_to_item")}
            onClick={() => { onClose(); navigate(`/inventory/${restored.id}`); }}
          >
            {t("trash.go_to_item")}
          </ToastAction>
        ),
      });
    } catch { /* toast shown by useInventory */ }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    setBusy(true);
    const ok = await runEach(ids, onRestore);
    if (!mounted.current) return;
    setBusy(false);
    setSelectedIds(new Set());
    if (ok === ids.length) {
      toast({ title: t("trash.bulk_restored_title"), description: t("trash.bulk_restored_description") });
    }
  };

  const handleConfirm = async () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;
    setBusy(true);
    try {
      if (current.kind === "single") {
        await runEach([current.id], onPermanentDelete);
      } else if (current.kind === "bulk") {
        await runEach(Array.from(selectedIds), onPermanentDelete);
        if (mounted.current) setSelectedIds(new Set());
      } else {
        await onEmptyTrash();
        if (mounted.current) setSelectedIds(new Set());
        toast({ title: t("trash.emptied_title"), description: t("trash.emptied_description") });
      }
    } catch { /* toast shown by useInventory */ }
    if (mounted.current) setBusy(false);
  };

  const count = trashedItems.length;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] text-left">
            <div className="flex items-center gap-2 pr-8">
              <SheetTitle className="text-base font-semibold">{t("trash.title")}</SheetTitle>
              {count > 0 && (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
              )}
            </div>
            <SheetDescription className="text-xs">{t("trash.auto_delete_hint")}</SheetDescription>
          </SheetHeader>

          {count > 0 && !isLoading && !loadError && (
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-surface-sunken px-5">
              <Checkbox
                id="trash-select-all"
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="trash-select-all" className="cursor-pointer text-[13px] text-muted-foreground">
                {selectedIds.size > 0
                  ? t("batch.selected_count", { count: selectedIds.size })
                  : t("trash.select_all")}
              </label>
              <div className="ml-auto flex items-center gap-1">
                {selectedIds.size > 0 ? (
                  <>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void handleBulkRestore()}>
                      <RotateCcw />
                      {t("trash.restore")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirm({ kind: "bulk" })}
                    >
                      <Trash2 />
                      {t("common.delete")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirm({ kind: "empty" })}
                  >
                    {t("trash.empty_button")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {isLoading && count === 0 ? (
              <ListSkeleton rows={5} className="m-4" />
            ) : loadError ? (
              <ErrorState error={loadError} onRetry={() => void load()} className="m-4" />
            ) : count === 0 ? (
              <EmptyPanel
                className="m-4"
                icon={Trash}
                title={t("trash.empty_title")}
                description={t("trash.empty_description")}
              />
            ) : (
              <ul className="divide-y divide-border">
                {trashedItems.map((item) => {
                  const daysRemaining = getDaysRemaining(item.deleted_at);
                  const isUrgent = daysRemaining <= 7;
                  const checked = selectedIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className={cn("flex items-center gap-3 px-5 py-3", checked && "bg-primary/[0.06]")}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={t("inventory.select_item_aria", { name: item.name })}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <span className="truncate">{categoryLabel(item.category)}</span>
                          <span aria-hidden>·</span>
                          <span className="tech">{formatDate(item.deleted_at, i18n.language)}</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums",
                          isUrgent ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {t("trash.days_remaining", { count: daysRemaining })}
                      </span>
                      <div className="flex shrink-0 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={t("trash.restore")}
                          aria-label={t("trash.restore")}
                          disabled={busy}
                          onClick={() => void handleRestore(item.id)}
                        >
                          <RotateCcw />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title={t("trash.permanent_delete")}
                          aria-label={t("trash.permanent_delete")}
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "single", id: item.id })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDestructiveDialog
        open={confirm?.kind === "empty"}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={t("trash.confirm_empty_title")}
        description={t("trash.confirm_empty_description", { count })}
        confirmLabel={t("trash.permanent_delete")}
        onConfirm={() => void handleConfirm()}
      />
      <ConfirmDestructiveDialog
        open={confirm?.kind === "single"}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={t("trash.confirm_delete_title")}
        description={t("trash.confirm_delete_description")}
        confirmLabel={t("trash.permanent_delete")}
        onConfirm={() => void handleConfirm()}
      />
      <ConfirmDestructiveDialog
        open={confirm?.kind === "bulk"}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={t("trash.confirm_bulk_delete_title", { count: selectedIds.size })}
        description={t("trash.confirm_bulk_delete_description", { count: selectedIds.size })}
        confirmLabel={t("trash.permanent_delete")}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}

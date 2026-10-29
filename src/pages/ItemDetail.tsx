import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { ChevronLeft, Edit2, PackageX, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { badgeVariants } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel, PageLoader } from "@/components/QueryState";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { ItemForm } from "@/components/ItemForm";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { Fact, FactGrid } from "@/components/item-detail/FactGrid";
import { ItemSpecs } from "@/components/item-detail/ItemSpecs";
import { LendingHistoryList } from "@/components/item-detail/LendingHistoryList";
import { ItemLabelCard } from "@/components/item-detail/ItemLabelCard";
import { InventoryItem, ItemCondition } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { useCategories } from "@/hooks/useCategories";
import { useAttributeFields } from "@/hooks/useAttributeFields";
import { getCategoryLabel, getConditionLabel } from "@/i18n/helpers";
import { cn } from "@/lib/utils";

type Tab = "details" | "wartung" | "verleih";
const TABS: Tab[] = ["details", "wartung", "verleih"];

const CONDITION_VARIANT: Record<ItemCondition, "available" | "lent" | "inUse" | "defect"> = {
  "verfügbar":  "available",
  "verliehen":  "lent",
  "in-einsatz": "inUse",
  "defekt":     "defect",
};

type ItemWithInterval = InventoryItem & { maintenance_interval_days?: number | null };
type ItemPayload = Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">;

export default function ItemDetail() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("de") ? de : enUS;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { allItems, loading, updateItem, deleteItem, refetch } = useInventory();
  const { addRecord, getItemHistory, loading: historyLoading } = useLendingHistory();
  const { categories } = useCategories();
  const { getAllFieldsForCategory } = useAttributeFields();

  const rawTab = searchParams.get("tab");
  const activeTab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "details";

  const [isQROpen, setIsQROpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const item = useMemo(
    () => (allItems.find(i => i.id === id) ?? null) as ItemWithInterval | null,
    [allItems, id],
  );

  // Maintenance dot: initial status from a light query, then live from the timeline
  const initialMaint = useMaintenanceStatus(item?.id ?? "", item?.maintenance_interval_days);
  const [liveMaint, setLiveMaint] = useState<{ overdue: boolean; warning: boolean } | null>(null);
  useEffect(() => { setLiveMaint(null); }, [item?.id]);
  const handleMaintStatus = useCallback((overdue: boolean, warning: boolean) => {
    setLiveMaint({ overdue, warning });
  }, []);
  const maint = liveMaint ?? (initialMaint.loading ? null : initialMaint);

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "details") next.delete("tab");
      else next.set("tab", value);
      return next;
    }, { replace: true });
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEditSubmit = async (data: ItemPayload) => {
    if (!item) return;
    try {
      if (data.condition === "verliehen" && item.condition !== "verliehen" && data.lent_to) {
        await addRecord({
          item_id:     item.id,
          item_name:   data.name,
          lent_to:     data.lent_to,
          lent_at:     new Date().toISOString().split("T")[0],
          due_date:    data.lent_until || null,
          returned_at: null,
          notes:       null,
        });
      }
      await updateItem(item.id, data);
      setIsEditOpen(false);
      toast({ title: t("inventory.updated_title"), description: t("inventory.updated_description") });
    } catch (err) {
      toast({
        title: t("common.error"),
        description: t("item_detail.update_error_description"),
        variant: "destructive",
      });
      // Let the form stay open with the user's changes
      throw err;
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!item || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      toast({
        title: t("inventory.moved_to_trash_title"),
        description: t("item_detail.delete_success_description", { name: item.name }),
      });
      setIsDeleteOpen(false);
      navigate("/inventory");
    } catch {
      toast({
        title: t("common.error"),
        description: t("item_detail.delete_error_description"),
        variant: "destructive",
      });
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const backLink = (
    <Link
      to="/inventory"
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {t("nav.inventory")}
    </Link>
  );

  if (loading && !item) return <PageLoader />;

  if (!item) {
    return (
      <>
        <div className="mb-4 text-[13px] text-muted-foreground">{backLink}</div>
        <EmptyPanel
          icon={PackageX}
          title={t("item_detail.not_found_title")}
          description={t("item_detail.not_found_description")}
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                {t("common.retry")}
              </Button>
              <Button size="sm" asChild>
                <Link to="/inventory">{t("common.back")}</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const category = categories.find(c => c.id === item.category);
  const categoryLabel = category ? getCategoryLabel(category, t) : item.category;
  const history = getItemHistory(item.id);
  const currency = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });
  const formatDate = (v: string) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : format(d, "dd.MM.yyyy", { locale: dateLocale });
  };
  const isLent = item.condition === "verliehen";

  const facts: Fact[] = [
    { key: "qty", label: t("fields.quantity"), value: item.quantity, mono: true },
    { key: "location", label: t("item_detail.label_location"), value: item.location || "–" },
    { key: "category", label: t("fields.category"), value: categoryLabel },
    ...(item.unit_price != null
      ? [
          { key: "price", label: t("item_detail.label_price_per_unit"), value: currency.format(item.unit_price), mono: true },
          { key: "total", label: t("fields.total_value"), value: currency.format(item.unit_price * item.quantity), mono: true },
        ]
      : []),
    ...(isLent && item.lent_to
      ? [{ key: "lent_to", label: t("item_detail.label_lent_to"), value: item.lent_to, tone: "warning" as const }]
      : []),
    ...(isLent && item.lent_until
      ? [{ key: "lent_until", label: t("item_detail.label_return_by"), value: formatDate(item.lent_until), mono: true, tone: "warning" as const }]
      : []),
  ];

  const maintDot = maint?.overdue ? "bg-destructive" : maint?.warning ? "bg-warning" : null;

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={item.name}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={badgeVariants({ variant: CONDITION_VARIANT[item.condition] })}>
              {getConditionLabel(item.condition, t)}
            </span>
            <span>{categoryLabel}</span>
            <span aria-hidden className="text-border-strong">/</span>
            <span className="font-mono text-xs tabular-nums" title={item.id}>{item.id.slice(0, 8)}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              {t("common.delete")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsQROpen(true)}>
              <QrCode />
              {t("item_detail.btn_qr")}
            </Button>
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit2 />
              {t("common.edit")}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {/* Overview */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              {item.image_url && (
                <a
                  href={item.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0 overflow-hidden rounded-lg border border-border bg-surface-sunken sm:w-44 sm:self-start"
                >
                  <img src={item.image_url} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                </a>
              )}
              <FactGrid facts={facts} className="flex-1 self-start" />
            </div>
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex h-6 items-center rounded-[4px] border border-border bg-muted px-1.5 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sections */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="details">{t("item_detail.tab_details")}</TabsTrigger>
              <TabsTrigger value="wartung" className="gap-1.5">
                {t("item_detail.tab_maintenance")}
                {maintDot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", maintDot)} />}
              </TabsTrigger>
              <TabsTrigger value="verleih" className="gap-1.5">
                <span className="truncate">{t("item_detail.section_lending_history")}</span>
                {history.length > 0 && (
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{history.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <ItemSpecs item={item} attributeFields={getAllFieldsForCategory(item.category)} />
            </TabsContent>
            <TabsContent value="wartung" className="mt-4">
              <MaintenanceTimeline
                itemId={item.id}
                maintenanceIntervalDays={item.maintenance_interval_days}
                onStatusChange={handleMaintStatus}
              />
            </TabsContent>
            <TabsContent value="verleih" className="mt-4">
              <LendingHistoryList records={history} loading={historyLoading} dateLocale={dateLocale} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="min-w-0 space-y-4">
          <ItemLabelCard item={item} dateLocale={dateLocale} onOpenQR={() => setIsQROpen(true)} />
        </aside>
      </div>

      <QRCodeDisplay
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        itemId={item.id}
        itemName={item.name}
        itemDetails={{ category: item.category, quantity: item.quantity, location: item.location }}
        size="lg"
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={open => { if (!isDeleting) setIsDeleteOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("item_detail.delete_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("item_detail.delete_dialog_description", { name: item.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); void handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ItemForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        editItem={item}
        categories={categories}
      />
    </>
  );
}

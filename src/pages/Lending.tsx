import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { HandCoins, History, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel, ErrorState, ListSkeleton } from "@/components/QueryState";
import { LendingStats } from "@/components/lending/LendingStats";
import { LoanList } from "@/components/lending/LoanList";
import { NewLoanData, NewLoanDialog } from "@/components/lending/NewLoanDialog";
import { isOverdue, sortActive, sortHistory } from "@/components/lending/loanStatus";
import { useLendingHistory, LendingRecord } from "@/hooks/useLendingHistory";
import { useInventory } from "@/hooks/useInventory";
import { hapticFeedback } from "@/lib/utils";

type Tab = "active" | "history";

function matches(r: LendingRecord, q: string) {
  return r.item_name.toLowerCase().includes(q) || r.lent_to.toLowerCase().includes(q);
}

export default function Lending() {
  const { t } = useTranslation();
  const lending = useLendingHistory();
  const { activeLoans, completedLoans, records, loading, refetch, addRecord, markReturned, deleteRecord } = lending;
  // Forward-compatible: shows the error panel as soon as the hook exposes `error`.
  const loadError = "error" in lending ? lending.error : null;
  const { allItems } = useInventory();

  const [search, setSearch]             = useState("");
  const [tab, setTab]                   = useState<Tab>("active");
  const [addOpen, setAddOpen]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LendingRecord | null>(null);
  const [returningIds, setReturningIds] = useState<ReadonlySet<string>>(() => new Set());

  const overdueCount = useMemo(() => activeLoans.filter(r => isOverdue(r)).length, [activeLoans]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = tab === "active" ? activeLoans : completedLoans;
    const list = q ? source.filter(r => matches(r, q)) : source;
    return tab === "active" ? sortActive(list) : sortHistory(list);
  }, [tab, activeLoans, completedLoans, search]);

  const handleAdd = async ({ item, lentTo, dueDate, notes }: NewLoanData) => {
    // useLendingHistory toasts its own errors and rethrows; the dialog stays open on failure.
    await addRecord({
      item_id:     item.id,
      item_name:   item.name,
      lent_to:     lentTo,
      lent_at:     format(new Date(), "yyyy-MM-dd"),
      due_date:    dueDate,
      returned_at: null,
      notes,
    });
    hapticFeedback(50);
  };

  const handleReturn = async (record: LendingRecord) => {
    if (returningIds.has(record.id)) return;
    setReturningIds(prev => new Set(prev).add(record.id));
    try {
      await markReturned(record.id);
      hapticFeedback(50);
    } catch {
      // already toasted by useLendingHistory
    } finally {
      setReturningIds(prev => { const next = new Set(prev); next.delete(record.id); return next; });
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteRecord(target.id);
      hapticFeedback(100);
    } catch {
      // already toasted by useLendingHistory
    }
  };

  const renderList = () => {
    if (loading && records.length === 0) return <ListSkeleton rows={5} />;
    if (loadError && records.length === 0) return <ErrorState error={loadError} onRetry={() => void refetch()} />;
    if (visible.length === 0) {
      if (search.trim()) {
        return (
          <EmptyPanel
            icon={Search}
            title={t("lending.no_results")}
            action={<Button size="sm" variant="outline" onClick={() => setSearch("")}>{t("common.reset")}</Button>}
          />
        );
      }
      return tab === "active" ? (
        <EmptyPanel icon={HandCoins} title={t("lending.empty_active_title")} description={t("lending.empty_active_desc")} />
      ) : (
        <EmptyPanel icon={History} title={t("lending.empty_history_title")} description={t("lending.empty_history_desc")} />
      );
    }
    return (
      <LoanList
        records={visible}
        mode={tab}
        returningIds={returningIds}
        onReturn={r => void handleReturn(r)}
        onDelete={setDeleteTarget}
      />
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.lending")}
        description={t("lending.description")}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            {t("lending.new_loan")}
          </Button>
        }
      />

      <LendingStats
        active={activeLoans.length}
        overdue={overdueCount}
        returned={completedLoans.length}
        total={records.length}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="active" className="gap-1.5">
              {t("lending.tabs.active")}
              <span className="tech text-muted-foreground">{activeLoans.length}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              {t("lending.tabs.history")}
              <span className="tech text-muted-foreground">{completedLoans.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-[12rem] flex-1 sm:ml-auto sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("common.search")}
            placeholder={t("lending.search_placeholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {renderList()}

      <NewLoanDialog open={addOpen} onOpenChange={setAddOpen} items={allItems} onSubmit={handleAdd} />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lending.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("lending.delete_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

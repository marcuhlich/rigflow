import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel } from "@/components/QueryState";
import { PullToRefreshWrapper } from "@/components/PullToRefreshWrapper";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { AttentionPanel } from "@/components/dashboard/AttentionPanel";
import { UpcomingProjects } from "@/components/dashboard/UpcomingProjects";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { InventoryBreakdown } from "@/components/dashboard/InventoryBreakdown";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useMaintenanceDue } from "@/components/dashboard/useMaintenanceDue";
import { useInventory } from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNative } from "@/services/platform";

function isStandaloneApp() {
  return isNative() || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches);
}

/** Operations overview: KPIs, things that need attention, upcoming projects, activity. */
export default function Dashboard() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { allItems, stats, loading, refetch: refetchInventory } = useInventory();
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { activeLoans, completedLoans, markReturned, refetch: refetchLoans } = useLendingHistory();
  const maintenance = useMaintenanceDue(allItems);
  const { refetch: refetchMaintenance } = maintenance;

  const defectItems = useMemo(() => allItems.filter((i) => i.condition === "defekt"), [allItems]);
  const totalValue = useMemo(
    () => allItems.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity, 0),
    [allItems]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([refetchInventory(), refetchProjects(), refetchLoans(), refetchMaintenance()]);
  }, [refetchInventory, refetchProjects, refetchLoans, refetchMaintenance]);

  const handleReturn = useCallback(
    async (loanId: string) => {
      try {
        await markReturned(loanId);
      } catch {
        return; // already toasted by useLendingHistory
      }
      await refetchInventory();
    },
    [markReturned, refetchInventory]
  );

  const header = (
    <PageHeader
      title={t("dashboard.title")}
      description={t("dashboard.subtitle")}
      actions={
        <Button asChild>
          <Link to="/scanner">
            <ScanLine />
            {t("nav.scanner")}
          </Link>
        </Button>
      }
    />
  );

  if (loading && allItems.length === 0) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh} disabled={!isMobile || !isStandaloneApp()}>
      {header}

      {allItems.length === 0 ? (
        <EmptyPanel
          icon={Package}
          title={t("dashboard.empty.title")}
          description={t("dashboard.empty.description")}
          action={
            <Button variant="outline" asChild>
              <Link to="/inventory">{t("dmx_patchplan.empty_cta")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <KpiRow stats={stats} totalValue={totalValue} />

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <AttentionPanel
                activeLoans={activeLoans}
                defectItems={defectItems}
                maintenance={maintenance}
                onReturn={handleReturn}
              />
            </div>
            <UpcomingProjects projects={projects} loading={projectsLoading} />
            <div className="min-w-0 lg:col-span-2">
              <RecentActivity activeLoans={activeLoans} completedLoans={completedLoans} items={allItems} />
            </div>
            <InventoryBreakdown items={allItems} />
          </div>
        </div>
      )}
    </PullToRefreshWrapper>
  );
}

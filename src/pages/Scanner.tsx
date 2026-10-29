/**
 * Scanner — wizard-based scan workflow (lend, setup, strike/return, inventory check).
 * Steps: mode → context → scan → summary. Parts live in src/components/scanner/.
 * Deep link: /scanner?mode=aufbau&projectId=<id>
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel } from "@/components/QueryState";
import { EnhancedQRScanner } from "@/components/EnhancedQRScanner";
import { StepIndicator } from "@/components/scanner/StepIndicator";
import { ModeStep } from "@/components/scanner/ModeStep";
import { ContextStep, NO_PROJECT } from "@/components/scanner/ContextStep";
import { ScanStep } from "@/components/scanner/ScanStep";
import { SummaryStep } from "@/components/scanner/SummaryStep";
import { useProjectItemIds } from "@/components/scanner/useProjectItemIds";
import {
  SCAN_MODES, WIZARD_STEPS, isScanMode, usesProject,
  type ScanFeedback, type ScanMode, type ScannedEntry, type WizardStep,
} from "@/components/scanner/types";
import { useInventory } from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCondition } from "@/types/inventory";

export default function Scanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { allItems, loading: inventoryLoading, updateItem } = useInventory();
  const { projects, loading: projectsLoading } = useProjects();
  const { toast } = useToast();

  // ── Deep link (validated) ────────────────────────────────────────────────
  const rawMode = searchParams.get("mode");
  const urlMode: ScanMode | null = isScanMode(rawMode) ? rawMode : null;
  const urlProjectId = searchParams.get("projectId") ?? "";
  const [directToScan] = useState(
    () => urlMode === "inventur" || (usesProject(urlMode) && !!urlProjectId)
  );

  const [step, setStep] = useState<WizardStep>(() =>
    urlMode ? (directToScan ? "scan" : "context") : "mode"
  );
  const [mode, setMode] = useState<ScanMode | null>(urlMode);
  const [person, setPerson] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(() => (usesProject(urlMode) ? urlProjectId : ""));
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  /** Scanner should open as soon as inventory and project data are ready. */
  const [openRequested, setOpenRequested] = useState(directToScan);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref mirror so rapid consecutive scans see the latest list
  const entriesRef = useRef<ScannedEntry[]>([]);
  const updateEntries = useCallback((fn: (prev: ScannedEntry[]) => ScannedEntry[]) => {
    entriesRef.current = fn(entriesRef.current);
    setEntries(entriesRef.current);
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const modeConfig = SCAN_MODES.find((m) => m.id === mode) ?? null;
  const activeProjectId = usesProject(mode) && projectId && projectId !== NO_PROJECT ? projectId : null;
  const projectItems = useProjectItemIds(activeProjectId);
  const selectedProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) ?? null : null;
  const projectTotal = projectItems.status === "ready" ? projectItems.ids.size : 0;
  const inventoryPending = inventoryLoading && allItems.length === 0;

  // Re-check already scanned entries when the project (or its item list) changes
  const { status: projectItemsStatus, ids: projectItemIds } = projectItems;
  useEffect(() => {
    if (entriesRef.current.length === 0 || projectItemsStatus === "loading") return;
    updateEntries((prev) =>
      prev.map((e) => ({
        ...e,
        inSet: projectItemsStatus === "ready" ? projectItemIds.has(e.item.id) : undefined,
      }))
    );
  }, [projectItemsStatus, projectItemIds, updateEntries]);

  // ── Open scanner once data is ready ───────────────────────────────────────
  useEffect(() => {
    if (!openRequested || step !== "scan") return;
    if (inventoryPending || projectItems.status === "loading") return;
    setOpenRequested(false);
    setScannerOpen(true);
  }, [openRequested, step, inventoryPending, projectItems.status]);

  // ── Step transitions ──────────────────────────────────────────────────────
  const handleModeSelect = (m: ScanMode) => {
    if (m !== mode) updateEntries(() => []);
    setMode(m);
    setProjectId("");
    if (m === "inventur") {
      setStep("scan");
      setOpenRequested(true);
    } else {
      setStep("context");
    }
  };

  const handleContextNext = () => {
    setStep("scan");
    setOpenRequested(true);
  };

  const goToSummary = () => {
    if (entriesRef.current.length === 0) return;
    setScannerOpen(false);
    setStep("summary");
  };

  const reset = () => {
    setStep("mode");
    setMode(null);
    setPerson("");
    setDueDate("");
    setProjectId("");
    updateEntries(() => []);
    setScannerOpen(false);
    setOpenRequested(false);
  };

  // ── Scan handling ─────────────────────────────────────────────────────────
  const handleScan = useCallback(
    (itemId: string): ScanFeedback | void => {
      const item = allItems.find((i) => i.id === itemId);
      if (!item || !modeConfig) return;

      if (modeConfig.id === "inventur") {
        setScannerOpen(false);
        navigate(`/inventory/${itemId}`);
        return;
      }

      if (entriesRef.current.some((e) => e.item.id === itemId)) {
        return { tone: "warning", message: t("scanner.toast.already_scanned_desc", { name: item.name }) };
      }

      const inSet = projectItems.status === "ready" ? projectItems.ids.has(itemId) : undefined;
      updateEntries((prev) => [
        ...prev,
        { item, scannedAt: new Date(), targetStatus: modeConfig.targetStatus, inSet },
      ]);
      return inSet === false
        ? { tone: "warning", message: t("scanner.result.added_not_in_project") }
        : { tone: "success", message: t("scanner.result.added") };
    },
    [allItems, modeConfig, navigate, projectItems.status, projectItems.ids, t, updateEntries]
  );

  const handleOverride = (itemId: string, status: ItemCondition) =>
    updateEntries((prev) => prev.map((e) => (e.item.id === itemId ? { ...e, overrideStatus: status } : e)));

  const handleRemove = (itemId: string) =>
    updateEntries((prev) => prev.filter((e) => e.item.id !== itemId));

  // ── Booking ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!mode || isProcessing) return;
    setIsProcessing(true);
    const list = entriesRef.current;
    try {
      for (const entry of list) {
        if (mode === "inventur") continue;
        const { item } = entry;
        const finalStatus = entry.overrideStatus ?? entry.targetStatus;
        const newLocation = mode === "aufbau" && selectedProject ? selectedProject.name : item.location;

        await updateItem(item.id, {
          name:              item.name,
          category:          item.category,
          quantity:          item.quantity,
          condition:         finalStatus,
          location:          newLocation,
          notes:             item.notes ?? null,
          lent_to:           mode === "verleih"
                               ? person.trim()
                               : finalStatus === "verfügbar" ? null : item.lent_to ?? null,
          lent_until:        mode === "verleih" && dueDate
                               ? dueDate
                               : finalStatus === "verfügbar" ? null : item.lent_until ?? null,
          accessories:       item.accessories ?? null,
          dmx_start_address: item.dmx_start_address ?? null,
          dmx_channels:      item.dmx_channels ?? null,
          dmx_universe:      item.dmx_universe ?? null,
          unit_price:        item.unit_price ?? null,
          image_url:         item.image_url ?? null,
          attributes:        item.attributes ?? null,
          tags:              item.tags ?? [],
          deleted_at:        item.deleted_at ?? null,
        });

        if (activeProjectId) {
          if (mode === "aufbau") {
            const { error } = await supabase
              .from("project_items")
              .update({ original_location: item.location })
              .eq("inventory_item_id", item.id)
              .eq("project_id", activeProjectId)
              .is("original_location", null);
            if (error) throw error;
          }
          const { error } = await supabase
            .from("project_items")
            .update({ packed: true })
            .eq("inventory_item_id", item.id)
            .eq("project_id", activeProjectId);
          if (error) throw error;
        }
      }

      toast({
        title: t(`scanner.confirm.booked_${mode}`),
        description: t("scanner.confirm.items_updated", { count: list.length }),
      });
      navigate(urlProjectId ? `/projects/${urlProjectId}` : "/");
    } catch (err) {
      toast({
        title: t("scanner.toast.save_error_title"),
        description: err instanceof Error ? err.message : t("scanner.toast.save_error_unknown"),
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const stepNumber = WIZARD_STEPS.indexOf(step) + 1;
  const scannerSubtitle =
    mode === "verleih" ? person.trim() || undefined : selectedProject?.name;

  const header = (
    <PageHeader
      title={t("scanner.title")}
      description={`${t("scanner.step.progress", { current: stepNumber, total: WIZARD_STEPS.length })} · ${t(`scanner.step.${step}`)}`}
      actions={
        step !== "mode" && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            <X />
            {t("common.cancel")}
          </Button>
        )
      }
    />
  );

  if (!inventoryLoading && allItems.length === 0) {
    return (
      <>
        {header}
        <EmptyPanel
          icon={Package}
          title={t("scanner.empty_inventory.title")}
          description={t("scanner.empty_inventory.description")}
          action={
            <Button size="sm" onClick={() => navigate("/inventory")}>
              {t("command.nav.inventory_title")}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="max-w-2xl">
        <StepIndicator step={step} />

        {step === "mode" && <ModeStep onSelect={handleModeSelect} />}

        {step === "context" && mode && (
          <ContextStep
            mode={mode}
            person={person}
            onPersonChange={setPerson}
            dueDate={dueDate}
            onDueDateChange={setDueDate}
            projectId={projectId}
            onProjectChange={setProjectId}
            projects={projects}
            projectsLoading={projectsLoading && projects.length === 0}
            projectItems={{
              status: projectItems.status,
              count: projectTotal,
              error: projectItems.error,
              retry: projectItems.retry,
            }}
            onBack={() => setStep("mode")}
            onNext={handleContextNext}
          />
        )}

        {step === "scan" && mode && (
          <ScanStep
            mode={mode}
            entries={entries}
            project={projectItems.status === "ready" ? selectedProject : null}
            projectTotal={projectTotal}
            scannerDisabled={inventoryPending}
            onOpenScanner={() => setScannerOpen(true)}
            onRemove={handleRemove}
            onBack={() => { setScannerOpen(false); setStep(mode === "inventur" ? "mode" : "context"); }}
            onNext={goToSummary}
          />
        )}

        {step === "summary" && mode && (
          <SummaryStep
            mode={mode}
            entries={entries}
            person={person.trim()}
            dueDate={dueDate}
            project={selectedProject}
            isProcessing={isProcessing}
            onOverride={handleOverride}
            onBack={() => setStep("scan")}
            onConfirm={handleConfirm}
          />
        )}
      </div>

      <EnhancedQRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        items={allItems}
        projects={projects}
        onItemFound={handleScan}
        continuous={mode !== "inventur"}
        title={mode ? t(`scanner.mode.${mode}.label`) : undefined}
        subtitle={scannerSubtitle}
        count={mode && mode !== "inventur" ? entries.length : undefined}
      />
    </>
  );
}

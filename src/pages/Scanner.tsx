/**
 * Scanner.tsx — Wizard-basierter QR-Scanner
 * i18n: scanner.*, condition.*, common.*
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import {
  QrCode, ArrowRight, ArrowLeft, CheckCircle2,
  Package, Truck, RotateCcw, ClipboardList,
  X, Loader2, ScanLine, AlertTriangle,
  ChevronRight, LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EnhancedQRScanner } from "@/components/EnhancedQRScanner";
import { useInventory } from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem, ItemCondition } from "@/types/inventory";
import { hapticFeedback } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanMode   = "verleih" | "aufbau" | "abbau" | "inventur";
type WizardStep = "mode" | "context" | "scan" | "summary";

interface ScannedEntry {
  item: InventoryItem;
  scannedAt: Date;
  targetStatus: ItemCondition;
  overrideStatus?: ItemCondition;
  inSet?: boolean;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const COND_COLORS: Record<ItemCondition, string> = {
  "verfügbar":  "bg-emerald-400/20 text-emerald-400 border-emerald-400/30",
  "verliehen":  "bg-blue-400/20 text-blue-400 border-blue-400/30",
  "in-einsatz": "bg-primary/20 text-primary border-primary/30",
  "defekt":     "bg-destructive/20 text-destructive border-destructive/30",
};

const slide: MotionProps = {
  initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 }, transition: { duration: 0.2, ease: "easeOut" },
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function Scanner() {
  const { t } = useTranslation();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { allItems, updateItem } = useInventory();
  const { projects }   = useProjects();
  const { toast }      = useToast();

  const urlMode      = searchParams.get('mode') as ScanMode | null;
  const urlProjectId = searchParams.get('projectId') ?? '';

  const [step,              setStep]             = useState<WizardStep>("mode");
  const [mode,              setMode]             = useState<ScanMode | null>(null);
  const [person,            setPerson]           = useState("");
  const [dueDate,           setDueDate]          = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(urlProjectId);
  const [projectItemIds,    setProjectItemIds]   = useState<Set<string>>(new Set());
  const [projectIdsLoaded,  setProjectIdsLoaded] = useState(false);
  const [scannerOpen,       setScannerOpen]      = useState(false);
  const [scannerKey,        setScannerKey]       = useState(0);
  const [entries,           setEntries]          = useState<ScannedEntry[]>([]);
  const [isProcessing,      setIsProcessing]     = useState(false);

  // MODES wird hier gebaut, damit t() greift
  const MODES: {
    id: ScanMode; label: string; description: string;
    Icon: LucideIcon; colorClass: string; targetStatus: ItemCondition;
  }[] = [
    {
      id: "verleih", label: t('scanner.mode.verleih.label'),
      targetStatus: "verliehen",
      Icon: Truck,
      colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20 hover:bg-blue-400/15",
      description: t('scanner.mode.verleih.description'),
    },
    {
      id: "aufbau", label: t('scanner.mode.aufbau.label'),
      targetStatus: "in-einsatz",
      Icon: Package,
      colorClass: "text-primary bg-primary/10 border-primary/20 hover:bg-primary/15",
      description: t('scanner.mode.aufbau.description'),
    },
    {
      id: "abbau", label: t('scanner.mode.abbau.label'),
      targetStatus: "verfügbar",
      Icon: RotateCcw,
      colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/15",
      description: t('scanner.mode.abbau.description'),
    },
    {
      id: "inventur", label: t('scanner.mode.inventur.label'),
      targetStatus: "verfügbar",
      Icon: ClipboardList,
      colorClass: "text-muted-foreground bg-muted/10 border-muted/20 hover:bg-muted/15",
      description: t('scanner.mode.inventur.description'),
    },
  ];

  const stepLabels: Record<WizardStep, string> = {
    mode:    t('scanner.step.mode'),
    context: t('scanner.step.context'),
    scan:    t('scanner.step.scan'),
    summary: t('scanner.step.summary'),
  };

  const modeConfig      = MODES.find(m => m.id === mode);
  const selectedProject = (selectedProjectId && selectedProjectId !== "none")
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  const scannedInProject = entries.filter(e => e.inSet === true).length;
  const totalInProject   = projectItemIds.size;
  const progress = totalInProject > 0 ? Math.round((scannedInProject / totalInProject) * 100) : 0;

  // ── Projekt-Items laden ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProjectId || selectedProjectId === "none") {
      setProjectItemIds(new Set());
      setProjectIdsLoaded(true);
      return;
    }
    setProjectIdsLoaded(false);
    supabase
      .from("project_items")
      .select("inventory_item_id")
      .eq("project_id", selectedProjectId)
      .then(({ data }) => {
        setProjectItemIds(new Set((data ?? []).map((r: any) => r.inventory_item_id)));
        setProjectIdsLoaded(true);
      });
  }, [selectedProjectId]);

  // Direktstart via URL-Params
  useEffect(() => {
    if (!urlMode) return;
    setMode(urlMode);
    if ((urlMode === 'aufbau' || urlMode === 'abbau') && urlProjectId) {
      setStep('scan');
    } else {
      setStep('context');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scannerOpenedForUrl = useRef(false);
  useEffect(() => {
    if (urlMode && urlProjectId && projectIdsLoaded && step === 'scan' && !scannerOpenedForUrl.current) {
      scannerOpenedForUrl.current = true;
      setScannerOpen(true);
      setScannerKey(k => k + 1);
    }
  }, [urlMode, urlProjectId, projectIdsLoaded, step]);

  // ── Schritt 1 → 2 ─────────────────────────────────────────────────────────

  const handleModeSelect = (m: ScanMode) => {
    setMode(m);
    setSelectedProjectId('');
    setProjectItemIds(new Set());
    setProjectIdsLoaded(true);
    if (m === "inventur") {
      setStep("scan");
      setScannerOpen(true);
      setScannerKey(k => k + 1);
    } else {
      setStep("context");
    }
  };

  // ── Schritt 2 → 3 ─────────────────────────────────────────────────────────

  const handleContextNext = () => {
    if (mode === "verleih" && !person.trim()) {
      toast({
        title: t('scanner.toast.person_required_title'),
        description: t('scanner.toast.person_required_desc'),
        variant: "destructive",
      });
      return;
    }
    setStep("scan");
    if (projectIdsLoaded) {
      setScannerOpen(true);
      setScannerKey(k => k + 1);
    }
  };

  useEffect(() => {
    if (step === "scan" && projectIdsLoaded && !scannerOpen && entries.length === 0 && !urlProjectId) {
      setScannerOpen(true);
      setScannerKey(k => k + 1);
    }
  }, [projectIdsLoaded, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scan-Handler ───────────────────────────────────────────────────────────

  const handleScan = useCallback((itemId: string) => {
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
      toast({
        title: t('scanner.toast.item_not_found_title'),
        description: t('scanner.toast.item_not_found_desc'),
        variant: "destructive",
      });
      return;
    }

    if (mode === "inventur") {
      setScannerOpen(false);
      navigate(`/inventory/${itemId}`);
      return;
    }

    if (entries.some(e => e.item.id === itemId)) {
      toast({
        title: t('scanner.toast.already_scanned_title'),
        description: t('scanner.toast.already_scanned_desc', { name: item.name }),
        variant: "destructive",
      });
      hapticFeedback([50, 30, 50]);
      return;
    }

    const targetStatus = modeConfig?.targetStatus ?? "verfügbar";
    const hasProject = (mode === "aufbau" || mode === "abbau")
      && selectedProjectId
      && selectedProjectId !== "none"
      && projectIdsLoaded;
    const inSet = hasProject ? projectItemIds.has(itemId) : undefined;

    setEntries(prev => [...prev, { item, scannedAt: new Date(), targetStatus, inSet }]);
    hapticFeedback(60);
    toast({
      title: `✓ ${item.name}`,
      description: inSet === false ? t('scanner.toast.not_in_project') : undefined,
    });
  }, [allItems, entries, modeConfig, mode, selectedProjectId, projectItemIds, projectIdsLoaded, toast, navigate, t]);

  // ── Schritt 3 → 4 ─────────────────────────────────────────────────────────

  const goToSummary = () => {
    if (entries.length === 0) {
      toast({
        title: t('scanner.toast.no_items_title'),
        description: t('scanner.toast.no_items_desc'),
        variant: "destructive",
      });
      return;
    }
    setScannerOpen(false);
    setStep("summary");
  };

  const setOverride = (idx: number, status: ItemCondition) =>
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, overrideStatus: status } : e));

  const removeEntry = (idx: number) =>
    setEntries(prev => prev.filter((_, i) => i !== idx));

  // ── Bestätigen ────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      for (const entry of entries) {
        if (mode === "inventur") continue;
        const finalStatus = entry.overrideStatus ?? entry.targetStatus;
        const item = entry.item;

        const newLocation = (mode === "aufbau" && selectedProject)
          ? selectedProject.name
          : item.location;

        await updateItem(item.id, {
          name:              item.name,
          category:          item.category,
          quantity:          item.quantity,
          condition:         finalStatus,
          location:          newLocation,
          notes:             item.notes          ?? null,
          lent_to:           mode === "verleih"
                               ? person
                               : (finalStatus === 'verfügbar' ? null : (item.lent_to ?? null)),
          lent_until:        mode === "verleih" && dueDate
                               ? dueDate
                               : (finalStatus === 'verfügbar' ? null : (item.lent_until ?? null)),
          accessories:       item.accessories   ?? null,
          dmx_start_address: item.dmx_start_address ?? null,
          dmx_channels:      item.dmx_channels  ?? null,
          dmx_universe:      item.dmx_universe   ?? null,
          unit_price:        item.unit_price     ?? null,
          image_url:         item.image_url      ?? null,
          attributes:        item.attributes     ?? null,
          tags:              item.tags           ?? [],
          deleted_at:        item.deleted_at     ?? null,
        });

        if (mode === "aufbau" && selectedProjectId && selectedProjectId !== "none") {
          await supabase
            .from("project_items")
            .update({ original_location: item.location } as any)
            .eq("inventory_item_id", item.id)
            .eq("project_id", selectedProjectId)
            .is("original_location", null);
        }

        if ((mode === "aufbau" || mode === "abbau") && selectedProjectId && selectedProjectId !== "none") {
          await supabase
            .from("project_items")
            .update({ packed: true } as any)
            .eq("inventory_item_id", item.id)
            .eq("project_id", selectedProjectId);
        }
      }

      const labelKey = mode === "verleih" ? 'scanner.confirm.booked_verleih'
        : mode === "aufbau" ? 'scanner.confirm.booked_aufbau'
        : mode === "abbau"  ? 'scanner.confirm.booked_abbau'
        : 'scanner.confirm.booked_inventur';

      toast({
        title: `✓ ${t(labelKey)}`,
        description: t('scanner.confirm.items_updated', { count: entries.length }),
      });
      setIsProcessing(false);
      navigate(urlProjectId ? `/projects/${urlProjectId}` : "/");

    } catch (err) {
      setIsProcessing(false);
      toast({
        title: t('scanner.toast.save_error_title'),
        description: err instanceof Error ? err.message : t('scanner.toast.save_error_unknown'),
        variant: "destructive",
      });
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep("mode"); setMode(null); setPerson(""); setDueDate("");
    setSelectedProjectId(""); setProjectItemIds(new Set());
    setProjectIdsLoaded(true); setEntries([]); setScannerOpen(false);
    scannerOpenedForUrl.current = false;
  };

  const stepOrder: WizardStep[] = ["mode", "context", "scan", "summary"];
  const stepIndex = stepOrder.indexOf(step);
  const aufbauProjects = projects.filter(p => ['planned','packed','transit'].includes(p.status));
  const abbauProjects  = projects.filter(p => ['transit','live','returning'].includes(p.status));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" /> {t('scanner.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{stepLabels[step]}</p>
        </div>
        {step !== "mode" && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
            <X className="h-4 w-4" /> {t('common.cancel')}
          </Button>
        )}
      </div>

      {/* Step-Indicator */}
      <div className="flex gap-1.5">
        {stepOrder.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Modus ── */}
        {step === "mode" && (
          <motion.div key="mode" {...slide} className="grid gap-3">
            {MODES.map(m => (
              <button key={m.id} onClick={() => handleModeSelect(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${m.colorClass}`}>
                <div className="p-2.5 rounded-lg bg-white/5"><m.Icon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Kontext ── */}
        {step === "context" && (
          <motion.div key="context" {...slide} className="space-y-4">
            <Card className="glass-card p-5 space-y-4">

              {mode === "verleih" && (<>
                <div className="space-y-1.5">
                  <Label htmlFor="person">{t('scanner.context.lend_to_label')}</Label>
                  <Input id="person" placeholder={t('scanner.context.lend_to_placeholder')}
                    value={person} onChange={e => setPerson(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due">{t('scanner.context.due_date_label')}</Label>
                  <Input id="due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </>)}

              {mode === "aufbau" && (
                <div className="space-y-1.5">
                  <Label>{t('scanner.context.project_optional_label')}</Label>
                  <Select value={selectedProjectId} onValueChange={v => { setSelectedProjectId(v); setProjectIdsLoaded(false); }}>
                    <SelectTrigger><SelectValue placeholder={t('scanner.context.no_project_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('scanner.context.no_project_option')}</SelectItem>
                      {aufbauProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedProjectId && selectedProjectId !== "none" && !projectIdsLoaded && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t('scanner.context.project_loading')}
                    </p>
                  )}
                  {selectedProjectId && selectedProjectId !== "none" && projectIdsLoaded && (
                    <p className="text-xs text-muted-foreground">
                      {totalInProject > 0
                        ? t('scanner.context.project_item_count', { count: totalInProject })
                        : t('scanner.context.project_empty')}
                    </p>
                  )}
                </div>
              )}

              {mode === "abbau" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t('scanner.context.project_label')}</Label>
                    <Select value={selectedProjectId} onValueChange={v => { setSelectedProjectId(v); setProjectIdsLoaded(false); }}>
                      <SelectTrigger><SelectValue placeholder={t('scanner.context.no_project_placeholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('scanner.context.no_project_option')}</SelectItem>
                        {abbauProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedProjectId && selectedProjectId !== "none" && projectIdsLoaded && totalInProject > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t('scanner.context.project_item_count', { count: totalInProject })}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">{t('scanner.context.condition_hint_title')}</p>
                    <p>{t('scanner.context.condition_hint_desc')}</p>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("mode")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
              </Button>
              <Button onClick={handleContextNext} className="flex-1 gap-2" disabled={!projectIdsLoaded}>
                {!projectIdsLoaded
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}</>
                  : <>{t('scanner.context.next_button')} <ArrowRight className="h-4 w-4" /></>
                }
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Scannen ── */}
        {step === "scan" && (
          <motion.div key="scan" {...slide} className="space-y-4">

            {/* Projekt-Fortschritt */}
            {(mode === "aufbau" || mode === "abbau") && selectedProject && totalInProject > 0 && (
              <Card className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{selectedProject.name}</span>
                  <span className="text-muted-foreground">{scannedInProject} / {totalInProject}</span>
                </div>
                <Progress value={progress} className="h-2" />
                {scannedInProject === totalInProject && totalInProject > 0 && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('scanner.scan.all_scanned')}
                  </p>
                )}
              </Card>
            )}

            {/* Scanner-Button */}
            <button onClick={() => { setScannerKey(k => k + 1); setScannerOpen(true); }}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-xl bg-primary/10 border border-primary/30 active:bg-primary/20 active:scale-[0.98] transition-all">
              <div className="p-4 rounded-full bg-primary/20"><QrCode className="h-8 w-8 text-primary" /></div>
              <div className="text-center">
                <p className="font-semibold text-primary">
                  {entries.length === 0 ? t('scanner.scan.cta_first') : t('scanner.scan.cta_more')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entries.length === 0
                    ? t('scanner.scan.cta_hint')
                    : t('scanner.scan.scanned_count', { count: entries.length })}
                </p>
              </div>
            </button>

            {/* Gescannte Items */}
            {entries.length > 0 && (
              <Card className="glass-card divide-y divide-border/50 overflow-hidden p-0">
                {entries.map((entry, idx) => (
                  <div key={entry.item.id} className="flex items-center gap-3 px-4 py-3">
                    {(mode === "aufbau" || mode === "abbau") && selectedProjectId && selectedProjectId !== "none" && (
                      <div className={`shrink-0 h-2 w-2 rounded-full ${
                        entry.inSet === true  ? "bg-emerald-400" :
                        entry.inSet === false ? "bg-yellow-400" : "bg-muted"
                      }`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.category}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 border ${COND_COLORS[entry.overrideStatus ?? entry.targetStatus]}`}>
                      {t(`condition.${entry.overrideStatus ?? entry.targetStatus}`)}
                    </Badge>
                    <button onClick={() => removeEntry(idx)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {/* Nicht-im-Projekt Warnung */}
            {(mode === "aufbau" || mode === "abbau") && selectedProject && entries.some(e => e.inSet === false) && (
              <div className="flex items-start gap-2 text-xs text-amber-400 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t('scanner.scan.not_in_project_warning', {
                  count: entries.filter(e => e.inSet === false).length,
                  project: selectedProject.name,
                })}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(
                mode === "verleih" || mode === "aufbau" || mode === "abbau" ? "context" : "mode"
              )}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button onClick={goToSummary} className="flex-1 gap-2" disabled={entries.length === 0}>
                {t('scanner.scan.to_summary', { count: entries.length })} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Zusammenfassung ── */}
        {step === "summary" && (
          <motion.div key="summary" {...slide} className="space-y-4">

            <Card className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('scanner.summary.action_label')}
              </p>
              <div className="flex items-center gap-3">
                {modeConfig && (
                  <div className={`p-2.5 rounded-lg border ${modeConfig.colorClass}`}>
                    <modeConfig.Icon className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{modeConfig?.label}</p>
                  {mode === "verleih" && (
                    <p className="text-xs text-muted-foreground">
                      {t('scanner.summary.lend_to', { person })}
                      {dueDate && ` · ${t('scanner.summary.lend_until', { date: new Date(dueDate).toLocaleDateString() })}`}
                    </p>
                  )}
                  {(mode === "aufbau" || mode === "abbau") && selectedProject && (
                    <p className="text-xs text-muted-foreground">
                      {t('scanner.summary.project', { name: selectedProject.name })}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="glass-card divide-y divide-border/50 overflow-hidden p-0">
              <div className="px-4 py-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('scanner.summary.item_count', { count: entries.length })}
                </p>
              </div>
              {entries.map((entry, idx) => (
                <div key={entry.item.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.category}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 border ${COND_COLORS[entry.overrideStatus ?? entry.targetStatus]}`}>
                      {t(`condition.${entry.overrideStatus ?? entry.targetStatus}`)}
                    </Badge>
                  </div>

                  {/* Abbau: Zustand pro Item */}
                  {mode === "abbau" && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { s: "verfügbar" as ItemCondition, labelKey: 'scanner.summary.cond_ok',      cls: "bg-emerald-400/20 border-emerald-400/40 text-emerald-400" },
                        { s: "defekt"    as ItemCondition, labelKey: 'scanner.summary.cond_damaged',  cls: "bg-amber-400/20 border-amber-400/40 text-amber-400"       },
                        { s: "verliehen" as ItemCondition, labelKey: 'scanner.summary.cond_missing',  cls: "bg-destructive/20 border-destructive/40 text-destructive"  },
                      ].map(opt => (
                        <button key={opt.s} onClick={() => setOverride(idx, opt.s)}
                          className={`text-xs py-1.5 rounded-lg border transition-all ${
                            (entry.overrideStatus ?? "verfügbar") === opt.s
                              ? opt.cls
                              : "border-border/50 text-muted-foreground hover:border-border"
                          }`}>
                          {t(opt.labelKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>

            {/* Nicht-im-Projekt Warnung */}
            {(mode === "aufbau" || mode === "abbau") && selectedProject && entries.some(e => e.inSet === false) && (
              <div className="flex items-start gap-2 text-xs text-amber-400 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t('scanner.scan.not_in_project_warning', {
                  count: entries.filter(e => e.inSet === false).length,
                  project: selectedProject.name,
                })}
              </div>
            )}

            {mode === "inventur" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t('scanner.summary.inventur_hint')}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("scan"); setScannerOpen(false); }} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
              </Button>
              <Button onClick={handleConfirm} disabled={isProcessing} className="flex-1 gap-2">
                {isProcessing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('scanner.summary.saving')}</>
                  : <><CheckCircle2 className="h-4 w-4" /> {t('scanner.summary.confirm')}</>
                }
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EnhancedQRScanner
        key={scannerKey}
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onItemFound={handleScan}
        onNavigateToItem={() => {}}
      />
    </div>
  );
}
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import {
  QrCode, ArrowRight, ArrowLeft, CheckCircle2,
  Package, Truck, RotateCcw, ClipboardList,
  X, Loader2, Calendar, ScanLine, AlertTriangle,
  ChevronRight, Zap,
  LucideIcon,
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
import { useEventSets } from "@/hooks/useEventSets";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem, ItemCondition } from "@/types/inventory";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanMode = "verleih" | "aufbau" | "abbau" | "inventur";
type WizardStep = "mode" | "context" | "scan" | "summary";

interface ScannedEntry {
  item: InventoryItem;
  scannedAt: Date;
  targetStatus: ItemCondition;
  overrideStatus?: ItemCondition;
  inSet?: boolean; // nur für Aufbau mit Set
}

// ─── Modus-Definitionen ───────────────────────────────────────────────────────

const MODES: {
  id: ScanMode;
  label: string;
  description: string;
  Icon: LucideIcon;
  colorClass: string;
  targetStatus: ItemCondition;
}[] = [
  {
    id: "verleih",
    label: "Verleih",
    description: "Equipment an eine Person ausgeben und als verliehen markieren",
    Icon: Truck,
    colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20 hover:bg-blue-400/15",
    targetStatus: "verliehen",
  },
  {
    id: "aufbau",
    label: "Aufbau",
    description: "Items als 'Im Einsatz' markieren – optional gegen ein Event-Set prüfen",
    Icon: Package,
    colorClass: "text-primary bg-primary/10 border-primary/20 hover:bg-primary/15",
    targetStatus: "in-einsatz",
  },
  {
    id: "abbau",
    label: "Abbau / Rückgabe",
    description: "Items zurückbuchen, defekte direkt beim Scannen markieren",
    Icon: RotateCcw,
    colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/15",
    targetStatus: "verfügbar",
  },
  {
    id: "inventur",
    label: "Inventur",
    description: "Vorhandene Items erfassen und den Bestand überprüfen",
    Icon: ClipboardList,
    colorClass: "text-muted-foreground bg-muted/10 border-muted/20 hover:bg-muted/15",
    targetStatus: "verfügbar",
  },
];

// ─── Status-Helpers ───────────────────────────────────────────────────────────

function statusLabel(s: ItemCondition) {
  switch (s) {
    case "verfügbar":  return "Verfügbar";
    case "verliehen":  return "Verliehen";
    case "in-einsatz": return "Im Einsatz";
    case "defekt":     return "Defekt";
    default: return s;
  }
}

function statusColor(s: ItemCondition) {
  switch (s) {
    case "verfügbar":  return "bg-emerald-400/20 text-emerald-400 border-emerald-400/30";
    case "verliehen":  return "bg-blue-400/20 text-blue-400 border-blue-400/30";
    case "in-einsatz": return "bg-primary/20 text-primary border-primary/30";
    case "defekt":     return "bg-destructive/20 text-destructive border-destructive/30";
    default: return "";
  }
}

// ─── Slide-Animation ──────────────────────────────────────────────────────────

const slide: MotionProps = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
  transition: { duration: 0.2, ease: "easeOut" },
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function Scanner() {
  const navigate = useNavigate();
  const { allItems, updateItem } = useInventory();
  const { sets } = useEventSets();
  const { toast } = useToast();

  // Wizard-State
  const [step, setStep]           = useState<WizardStep>("mode");
  const [mode, setMode]           = useState<ScanMode | null>(null);
  const [person, setPerson]       = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [scannerOpen, setScannerOpen]     = useState(false);
  const [ scannerKey, setScannerKey ] = useState(0);
  const [entries, setEntries]     = useState<ScannedEntry[]>([]);
  const [isProcessing, setIsProcessing]   = useState(false);

  const modeConfig = MODES.find((m) => m.id === mode);

  // Set-Items für den Soll-/Ist-Vergleich
  const selectedSet =
    selectedSetId && selectedSetId !== "none"
      ? sets.find((s) => s.id === selectedSetId)
      : null;
  const setItemIds  = new Set(selectedSet?.items?.map((si) => si.item_id) ?? []);

  // Fortschritt bei Aufbau mit Set
  const scannedInSet  = entries.filter((e) => e.inSet).length;
  const totalInSet    = selectedSet?.items?.length ?? 0;
  const progress      = totalInSet > 0 ? Math.round((scannedInSet / totalInSet) * 100) : 0;

  // ─── Schritt 1 → 2 ───────────────────────────────────────────────────────

  const handleModeSelect = (m: ScanMode) => {
    setMode(m);
    // Inventur & Abbau brauchen keinen Kontext-Schritt
    if (m === "inventur" || m === "abbau") {
      setStep("scan");
      setScannerOpen(true);
      setScannerKey((k) => k + 1);
    } else {
      setStep("context");
    }
  };

  // ─── Schritt 2 → 3 ───────────────────────────────────────────────────────

  const handleContextNext = () => {
    if (mode === "verleih" && !person.trim()) {
      toast({ title: "Person erforderlich", description: "Bitte gib an, wer die Items mitnimmt.", variant: "destructive" });
      return;
    }
    setStep("scan");
    setScannerOpen(true);
    setScannerKey((k) => k + 1);
  };

  // ─── QR-Scan Handler ─────────────────────────────────────────────────────

  const handleScan = useCallback((itemId: string) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) {
      toast({ title: "Item nicht gefunden", description: "Dieses QR-Label gehört zu keinem bekannten Item.", variant: "destructive" });
      return;
    }
    
    // ── Inventur: sofort zur Detailseite ──
    if (mode === "inventur") {
      setScannerOpen(false);
      navigate(`/inventory/${itemId}`);
      return;
    }

    if (entries.some((e) => e.item.id === itemId)) {
      toast({ title: "Bereits gescannt", description: `${item.name} ist schon in der Liste.`, variant: "destructive" });
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return;
    }

    const targetStatus = modeConfig?.targetStatus ?? "verfügbar";
    const inSet = mode === "aufbau" && selectedSetId ? setItemIds.has(itemId) : undefined;

    setEntries((prev) => [
      ...prev,
      { item, scannedAt: new Date(), targetStatus, inSet },
    ]);

    if (navigator.vibrate) navigator.vibrate(60);
    toast({ title: `✓ ${item.name}`, description: inSet === false ? "⚠ Nicht im gewählten Set" : undefined });
  }, [allItems, entries, modeConfig, mode, selectedSetId, setItemIds, toast]);

  // ─── Schritt 3 → 4 ───────────────────────────────────────────────────────

  const goToSummary = () => {
    if (entries.length === 0) {
      toast({ title: "Noch keine Items", description: "Scanne mindestens ein Item.", variant: "destructive" });
      return;
    }
    setScannerOpen(false);
    setStep("summary");
  };

  // ─── Override-Status (Abbau: defekt markieren) ────────────────────────────

  const setOverride = (idx: number, status: ItemCondition) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, overrideStatus: status } : e));
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Bestätigen ───────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      for (const entry of entries) {
        const finalStatus = entry.overrideStatus ?? entry.targetStatus;
        if (mode === "inventur") continue; // Inventur ändert nichts

        await updateItem(entry.item.id, {
          ...entry.item,
          condition: finalStatus,
          lent_to:    mode === "verleih" ? person : null,
          lent_until: mode === "verleih" && dueDate ? dueDate : null,
        });
      }

      const label =
        mode === "verleih"   ? "Verleih gebucht"  :
        mode === "aufbau"    ? "Aufbau gebucht"   :
        mode === "abbau"     ? "Rückgabe gebucht" : "Inventur abgeschlossen";

      toast({ title: `✓ ${label}`, description: `${entries.length} Item(s) aktualisiert.` });
      navigate("/");
    } catch (err) {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Unbekannter Fehler", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep("mode");
    setMode(null);
    setPerson("");
    setDueDate("");
    setSelectedSetId("");
    setEntries([]);
    setScannerOpen(false);
  };

  // ─── Schritt-Header ───────────────────────────────────────────────────────

  const stepLabels: Record<WizardStep, string> = {
    mode:    "Modus wählen",
    context: "Details eingeben",
    scan:    "Items scannen",
    summary: "Zusammenfassung",
  };
  const stepOrder: WizardStep[] = ["mode", "context", "scan", "summary"];
  const stepIndex = stepOrder.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            Scanner
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{stepLabels[step]}</p>
        </div>
        {step !== "mode" && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
            <X className="h-4 w-4" />
            Abbrechen
          </Button>
        )}
      </div>

      {/* Step-Indicator */}
      <div className="flex gap-1.5">
        {stepOrder.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* ── Schritt 1: Modus ── */}
      <AnimatePresence mode="wait">
        {step === "mode" && (
          <motion.div key="mode" {...slide} className="grid gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeSelect(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${m.colorClass}`}
              >
                <div className="p-2.5 rounded-lg bg-white/5">
                  <m.Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Schritt 2: Kontext ── */}
        {step === "context" && (
          <motion.div key="context" {...slide} className="space-y-4">
            <Card className="glass-card p-5 space-y-4">
              {mode === "verleih" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="person">An wen wird verliehen? *</Label>
                    <Input
                      id="person"
                      placeholder="Name der Person oder Organisation"
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      className="glass-input"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="due">Rückgabe bis (optional)</Label>
                    <Input
                      id="due"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </>
              )}

              {mode === "aufbau" && (
                <div className="space-y-1.5">
                  <Label>Event-Set zur Prüfung (optional)</Label>
                  <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Kein Set – frei scannen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ohne Set</SelectItem>
                      {sets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSetId && (
                    <p className="text-xs text-muted-foreground">
                      Beim Scannen wird geprüft ob das Item im Set enthalten ist.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("mode")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Zurück
              </Button>
              <Button onClick={handleContextNext} className="flex-1 gap-2">
                Weiter – Scanner öffnen <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Schritt 3: Scan ── */}
        {step === "scan" && (
          <motion.div key="scan" {...slide} className="space-y-4">

            {/* Set-Fortschritt */}
            {mode === "aufbau" && selectedSet && (
              <Card className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{selectedSet.name}</span>
                  <span className="text-muted-foreground">{scannedInSet} / {totalInSet}</span>
                </div>
                <Progress value={progress} className="h-2" />
                {scannedInSet === totalInSet && totalInSet > 0 && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Alle Set-Items gescannt!
                  </p>
                )}
              </Card>
            )}

            {/* Scanner-Button */}
            <button
              onClick={() => {
                  setScannerKey((k) => k + 1);
                  setScannerOpen(true);
              }}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-xl bg-primary/10 border border-primary/30 active:bg-primary/20 active:scale-[0.98] transition-all"
            >
              <div className="p-4 rounded-full bg-primary/20">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-primary">
                  {entries.length === 0 ? "QR-Code scannen" : "Weiteren scannen"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entries.length === 0
                    ? "Tippe hier um den Scanner zu öffnen"
                    : `${entries.length} Item(s) bereits gescannt`}
                </p>
              </div>
            </button>

            {/* Gescannte Items */}
            {entries.length > 0 && (
              <Card className="glass-card divide-y divide-border/50 overflow-hidden p-0">
                {entries.map((entry, idx) => (
                  <div key={entry.item.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Set-Indikator */}
                    {mode === "aufbau" && selectedSetId && (
                      <div className={`shrink-0 h-2 w-2 rounded-full ${entry.inSet ? "bg-emerald-400" : "bg-yellow-400"}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.category}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${statusColor(entry.overrideStatus ?? entry.targetStatus)}`}>
                      {statusLabel(entry.overrideStatus ?? entry.targetStatus)}
                    </Badge>
                    <button onClick={() => removeEntry(idx)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep(mode === "verleih" || mode === "aufbau" ? "context" : "mode"); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button onClick={goToSummary} className="flex-1 gap-2" disabled={entries.length === 0}>
                Zur Zusammenfassung ({entries.length}) <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Schritt 4: Zusammenfassung ── */}
        {step === "summary" && (
          <motion.div key="summary" {...slide} className="space-y-4">

            {/* Info-Box */}
            <Card className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aktion</p>
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
                      An: {person}{dueDate && ` · bis ${new Date(dueDate).toLocaleDateString("de-DE")}`}
                    </p>
                  )}
                  {mode === "aufbau" && selectedSet && (
                    <p className="text-xs text-muted-foreground">Set: {selectedSet.name}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Item-Liste */}
            <Card className="glass-card divide-y divide-border/50 overflow-hidden p-0">
              <div className="px-4 py-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {entries.length} Item(s)
                </p>
              </div>
              {entries.map((entry, idx) => (
                <div key={entry.item.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.category}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${statusColor(entry.overrideStatus ?? entry.targetStatus)}`}>
                      {statusLabel(entry.overrideStatus ?? entry.targetStatus)}
                    </Badge>
                  </div>

                  {/* Abbau: Defekt-Override */}
                  {mode === "abbau" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOverride(idx, "verfügbar")}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                          (entry.overrideStatus ?? "verfügbar") === "verfügbar"
                            ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        ✓ Verfügbar
                      </button>
                      <button
                        onClick={() => setOverride(idx, "defekt")}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                          entry.overrideStatus === "defekt"
                            ? "bg-destructive/20 border-destructive/40 text-destructive"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        ✗ Defekt
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Card>

            {/* Inventur-Hinweis */}
            {mode === "inventur" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Inventur ändert keine Status — es wird nur protokolliert was gescannt wurde.
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("scan"); setScannerOpen(false); }} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Zurück
              </Button>
              <Button onClick={handleConfirm} disabled={isProcessing} className="flex-1 gap-2">
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Bestätigen</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR-Scanner (persistent) */}
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
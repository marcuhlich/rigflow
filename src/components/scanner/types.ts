import { ClipboardList, Package, RotateCcw, Truck, type LucideIcon } from "lucide-react";
import type { InventoryItem, ItemCondition } from "@/types/inventory";

export type ScanMode = "verleih" | "aufbau" | "abbau" | "inventur";
export type WizardStep = "mode" | "context" | "scan" | "summary";

export const WIZARD_STEPS: WizardStep[] = ["mode", "context", "scan", "summary"];

export interface ScannedEntry {
  item: InventoryItem;
  scannedAt: Date;
  targetStatus: ItemCondition;
  overrideStatus?: ItemCondition;
  /** true/false when checked against a project, undefined without project */
  inSet?: boolean;
}

export interface ScanModeConfig {
  id: ScanMode;
  Icon: LucideIcon;
  targetStatus: ItemCondition;
  /** Whether the mode changes item status (inventur only opens details) */
  changesStatus: boolean;
}

export const SCAN_MODES: ScanModeConfig[] = [
  { id: "verleih",  Icon: Truck,         targetStatus: "verliehen",  changesStatus: true  },
  { id: "aufbau",   Icon: Package,       targetStatus: "in-einsatz", changesStatus: true  },
  { id: "abbau",    Icon: RotateCcw,     targetStatus: "verfügbar",  changesStatus: true  },
  { id: "inventur", Icon: ClipboardList, targetStatus: "verfügbar",  changesStatus: false },
];

export const isScanMode = (value: string | null | undefined): value is ScanMode =>
  !!value && SCAN_MODES.some((m) => m.id === value);

export const usesProject = (mode: ScanMode | null) => mode === "aufbau" || mode === "abbau";

/** Feedback a consumer can return for a scan; shown in the result sheet. */
export interface ScanFeedback {
  tone: "success" | "warning" | "error";
  message: string;
}

/** Condition choices per item in the strike/return summary. */
export const RETURN_CONDITIONS: { status: ItemCondition; labelKey: string }[] = [
  { status: "verfügbar", labelKey: "scanner.summary.condition_ok" },
  { status: "defekt",    labelKey: "scanner.summary.condition_damaged" },
  { status: "verliehen", labelKey: "scanner.summary.condition_missing" },
];

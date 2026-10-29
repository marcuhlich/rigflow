import type { ProjectStatus } from "@/types/project";
import type { ItemReturnCondition } from "@/hooks/useProjectDetail";

/** Phases in which the project's equipment counts as "in use". */
export const IN_USE_PHASES: ProjectStatus[] = ["transit", "live", "returning"];
/** Phases that show the packing checklist. */
export const PACK_PHASES: ProjectStatus[] = ["packed", "transit"];
/** Phases in which the equipment list can't be edited. */
export const LOCKED_PHASES: ProjectStatus[] = ["transit", "live"];
/** Phases in which the return condition of items is recorded. */
export const CONDITION_PHASES: ProjectStatus[] = ["returning"];
/** Phases in which equipment can be marked "in use" before going out. */
export const SETUP_PHASES: ProjectStatus[] = ["planned", "packed"];
export const PHASES_WITH_TEMPLATES: ProjectStatus[] = ["planned", "packed", "transit", "live", "returning"];

export type Condition = ItemReturnCondition;
export const CONDITION_VALUES: Condition[] = ["ok", "damaged", "missing"];

export const CONDITION_TEXT: Record<Condition, string> = {
  ok: "text-success",
  damaged: "text-warning",
  missing: "text-destructive",
};

export interface ConflictInfo {
  type: "lending" | "project" | "defect";
  label: string;
}

export interface FinalizeOptions {
  missingAction: "lost" | "found" | null;
  sendDamagedToMaintenance: boolean;
}

export interface EditFormData {
  name: string;
  description: string;
  location: string;
  dateStart: string | null;
  dateEnd: string | null;
  notes: string;
}

/** Colour of the status dot. Text stays neutral; the dot carries the meaning. */
export const STATUS_DOT: Record<ProjectStatus, string> = {
  draft: "bg-muted-foreground/50",
  planned: "bg-info",
  packed: "bg-info",
  transit: "bg-warning",
  live: "bg-success",
  returning: "bg-warning",
  archived: "bg-muted-foreground/30",
};

import { differenceInCalendarDays, startOfToday } from "date-fns";
import type { LendingRecord } from "@/hooks/useLendingHistory";
import { parseDay } from "@/components/projects/format";

export type DueState =
  | { kind: "returned" }
  | { kind: "none" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "ok"; days: number };

/** Days a loan counts as "due soon". */
const SOON_DAYS = 3;

/** Due state in the user's *local* calendar (the old code compared against the UTC date). */
export function getDueState(record: LendingRecord, today: Date = startOfToday()): DueState {
  if (record.returned_at) return { kind: "returned" };
  const due = parseDay(record.due_date);
  if (!due) return { kind: "none" };
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days === 0) return { kind: "today" };
  if (days <= SOON_DAYS) return { kind: "soon", days };
  return { kind: "ok", days };
}

export function isOverdue(record: LendingRecord, today?: Date): boolean {
  return getDueState(record, today).kind === "overdue";
}

/** Active loans: overdue first, then by due date; loans without due date last. */
export function sortActive(records: LendingRecord[]): LendingRecord[] {
  return [...records].sort((a, b) => {
    const da = a.due_date ?? "￿";
    const db = b.due_date ?? "￿";
    return da.localeCompare(db) || a.item_name.localeCompare(b.item_name);
  });
}

/** History: most recently returned first. */
export function sortHistory(records: LendingRecord[]): LendingRecord[] {
  return [...records].sort((a, b) => (b.returned_at ?? "").localeCompare(a.returned_at ?? ""));
}

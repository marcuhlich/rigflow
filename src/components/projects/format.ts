import { format, isValid, parseISO } from "date-fns";
import { de as deLocale, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

/** Parses a `yyyy-MM-dd` (or ISO) string as a *local* date. `new Date("2026-05-01")` would be UTC midnight. */
export function parseDay(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

/** Serialises a date as `yyyy-MM-dd` in local time. */
export function toDayString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dateFnsLocale(language: string): Locale {
  return language.startsWith("de") ? deLocale : enUS;
}

/** Locale-aware numeric date, e.g. 01.05.2026 / 05/01/2026. */
export function formatDay(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDayRange(start: Date | undefined, end: Date | undefined, language: string): string | null {
  if (!start) return null;
  const s = formatDay(start, language);
  if (!end || end.getTime() === start.getTime()) return s;
  return `${s} – ${formatDay(end, language)}`;
}

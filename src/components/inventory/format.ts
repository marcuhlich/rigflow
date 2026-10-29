import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCategoryLabel } from "@/i18n/helpers";
import type { InventoryItem, ItemCondition } from "@/types/inventory";

export type ItemDraft = Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">;
export type ItemUpdate = Partial<ItemDraft>;
export type CategoryRef = { id: string; name: string };

/** DMX patch as `U.AAA–EEE`, e.g. `1.001–016`. Returns null when unpatched. */
export function formatDmx(item: Pick<InventoryItem, "dmx_start_address" | "dmx_channels" | "dmx_universe">): string | null {
  if (!item.dmx_start_address) return null;
  const universe = item.dmx_universe || 1;
  const start = item.dmx_start_address;
  const end = start + Math.max(1, item.dmx_channels || 1) - 1;
  const pad = (n: number) => String(n).padStart(3, "0");
  return end > start ? `${universe}.${pad(start)}–${pad(end)}` : `${universe}.${pad(start)}`;
}

export function formatPrice(value: number | null | undefined, lang: string): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat(lang.startsWith("de") ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatShortDate(value: string | null | undefined, lang: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(lang.startsWith("de") ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Sort order for the status column (matches the design status mapping). */
export const CONDITION_ORDER: Record<ItemCondition, number> = {
  "verfügbar": 0,
  "in-einsatz": 1,
  "verliehen": 2,
  "defekt": 3,
};

/** Returns a stable function that turns a category id into its translated label. */
export function useCategoryLabel(categories: CategoryRef[] = []) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  return useCallback(
    (id: string | null | undefined) => {
      if (!id) return "";
      return getCategoryLabel(byId.get(id) ?? { id, name: id }, t);
    },
    [byId, t]
  );
}

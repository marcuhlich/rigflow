import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface DmxInstanceRow {
  instanceNumber: number;
  address: string;
  universe: string;
}

interface SavedConfig {
  address: number;
  universe: number;
}

interface Options {
  isOpen: boolean;
  /** Only set when editing: instances can only be stored for existing items. */
  itemId?: string;
  quantity: string;
  channels: string;
  startAddress: string;
  universe: string;
}

/**
 * Per-instance DMX addressing for items with quantity > 1.
 *
 * Instance #1 always mirrors the base fields. Other instances use (in order):
 * the user's edit in this session, the stored config, or the auto-computed
 * address `start + (n-1) * channels`.
 *
 * Stored configs are loaded once per open, so typing in the base fields never
 * throws away the user's per-instance edits.
 */
export function useDmxInstances({ isOpen, itemId, quantity, channels, startAddress, universe }: Options) {
  const [saved, setSaved] = useState<Map<number, SavedConfig>>(new Map());
  const [overrides, setOverrides] = useState<Record<number, Partial<Pick<DmxInstanceRow, 'address' | 'universe'>>>>({});

  useEffect(() => {
    setOverrides({});
    setSaved(new Map());
    if (!isOpen || !itemId) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('dmx_instances')
        .select('instance_number, dmx_start_address, dmx_universe')
        .eq('item_id', itemId);
      if (cancelled) return;
      if (error) {
        logger.error('ItemForm', 'Error loading DMX instances', error);
        return;
      }
      setSaved(new Map((data ?? []).map(d => [
        d.instance_number,
        { address: d.dmx_start_address, universe: d.dmx_universe },
      ])));
    };

    void load();
    return () => { cancelled = true; };
  }, [isOpen, itemId]);

  const rows = useMemo<DmxInstanceRow[]>(() => {
    const qty = parseInt(quantity) || 0;
    const ch = parseInt(channels) || 0;
    if (qty <= 1 || !ch) return [];

    const baseAddr = parseInt(startAddress) || 1;
    const baseUni = parseInt(universe) || 1;

    return Array.from({ length: qty }, (_, i) => {
      const n = i + 1;
      if (n === 1) return { instanceNumber: 1, address: startAddress, universe };
      const cfg = saved.get(n);
      const o = overrides[n];
      return {
        instanceNumber: n,
        address: o?.address ?? (cfg ? String(cfg.address) : String(baseAddr + i * ch)),
        universe: o?.universe ?? (cfg ? String(cfg.universe) : String(baseUni)),
      };
    });
  }, [quantity, channels, startAddress, universe, saved, overrides]);

  /** Update a non-primary instance. Instance #1 is edited via the base fields. */
  const setInstanceValue = useCallback((n: number, key: 'address' | 'universe', value: string) => {
    setOverrides(prev => ({ ...prev, [n]: { ...prev[n], [key]: value } }));
  }, []);

  /** Upsert all valid instance rows. Returns false when the write failed. */
  const persist = useCallback(async (id: string): Promise<boolean> => {
    const payload = rows
      .map(r => ({ n: r.instanceNumber, addr: parseInt(r.address), uni: parseInt(r.universe) }))
      .filter(r => !isNaN(r.addr) && !isNaN(r.uni))
      .map(r => ({ item_id: id, instance_number: r.n, dmx_start_address: r.addr, dmx_universe: r.uni }));
    if (payload.length === 0) return true;

    const { error } = await supabase
      .from('dmx_instances')
      .upsert(payload, { onConflict: 'item_id,instance_number' });
    if (error) {
      logger.error('ItemForm', 'Error saving DMX instances', error);
      return false;
    }
    return true;
  }, [rows]);

  return { rows, setInstanceValue, persist };
}

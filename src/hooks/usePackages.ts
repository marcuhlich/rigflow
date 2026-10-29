import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Package, PackageItem, PackageWithItems } from '@/types/project';
import { InventoryItem } from '@/types/inventory';
import i18n from '@/i18n';

type PackageItemRow = Database['public']['Tables']['package_items']['Row'];
type PackageUpdate = Database['public']['Tables']['packages']['Update'];

export function usePackages() {
  const [packages, setPackages] = useState<PackageWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();

  // Guards against out-of-order responses and state updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPackages = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

    if (!userId) {
      if (isCurrent()) { setPackages([]); setInventoryItems([]); setLoading(false); }
      return;
    }
    try {
      const [pkgRes, itemsRes, invRes] = await Promise.all([
        supabase.from('packages').select('*').order('created_at', { ascending: false }),
        supabase.from('package_items').select('*').order('position', { ascending: true }),
        supabase.from('inventory_items').select('*').is('deleted_at', null),
      ]);
      if (pkgRes.error) throw pkgRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (invRes.error) throw invRes.error;
      if (!isCurrent()) return;

      const inv = (invRes.data ?? []).map(row => ({ ...row, tags: [] }) as unknown as InventoryItem);
      const invById = new Map(inv.map(i => [i.id, i]));
      setInventoryItems(inv);

      const pkgItems: PackageItemRow[] = itemsRes.data ?? [];
      const enriched: PackageWithItems[] = (pkgRes.data ?? []).map(pkg => ({
        ...(pkg as Package),
        items: pkgItems
          .filter(pi => pi.package_id === pkg.id)
          .map((pi): PackageItem => {
            const invItem = invById.get(pi.inventory_item_id);
            return {
              ...pi,
              item_name: invItem?.name,
              item_category: invItem?.category,
              item_location: invItem?.location,
            };
          }),
      }));
      setPackages(enriched);
      setError(null);
    } catch (error) {
      logger.error('usePackages', 'Failed to load packages', error);
      if (isCurrent()) setError(error instanceof Error ? error : new Error(String(error)));
      if (isCurrent() && navigator.onLine) {
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.packages_load_failed'), variant: 'destructive' });
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const fail = (action: string, error: unknown): never => {
    logger.error('usePackages', action, error);
    toast({ title: i18n.t('common.error'), variant: 'destructive' });
    throw error;
  };

  const createPackage = async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    if (!user) return;
    const { data: pkg, error } = await supabase
      .from('packages')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error) fail('Create package failed', error);
    await fetchPackages();
    return pkg as Package;
  };

  const updatePackage = async (id: string, updates: Partial<Pick<Package, 'name' | 'description' | 'color' | 'icon'>>) => {
    const { error } = await supabase.from('packages').update(updates as PackageUpdate).eq('id', id);
    if (error) fail('Update package failed', error);
    await fetchPackages();
  };

  const deletePackage = async (id: string) => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) fail('Delete package failed', error);
    await fetchPackages();
  };

  const addItemToPackage = async (packageId: string, inventoryItemId: string, quantity: number = 1) => {
    const pkg = packages.find(p => p.id === packageId);
    const maxPos = pkg && pkg.items.length > 0 ? Math.max(...pkg.items.map(i => i.position)) + 1 : 0;

    const { error } = await supabase.from('package_items').insert({
      package_id: packageId,
      inventory_item_id: inventoryItemId,
      quantity,
      position: maxPos,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: i18n.t('feedback.notice'), description: i18n.t('feedback.item_already_in_package') });
      } else {
        logger.error('usePackages', 'Add item to package failed', error);
        toast({ title: i18n.t('common.error'), variant: 'destructive' });
      }
      throw error;
    }
    await fetchPackages();
  };

  const updatePackageItemQuantity = async (itemId: string, quantity: number) => {
    const { error } = await supabase.from('package_items').update({ quantity }).eq('id', itemId);
    if (error) fail('Update package item quantity failed', error);
    await fetchPackages();
  };

  const removeItemFromPackage = async (itemId: string) => {
    const { error } = await supabase.from('package_items').delete().eq('id', itemId);
    if (error) fail('Remove item from package failed', error);
    await fetchPackages();
  };

  const reorderPackageItems = async (packageId: string, orderedIds: string[]) => {
    // Optimistisch
    setPackages(prev => prev.map(pkg => {
      if (pkg.id !== packageId) return pkg;
      const map = new Map(pkg.items.map(i => [i.id, i]));
      return {
        ...pkg,
        items: orderedIds
          .map((id, idx) => {
            const item = map.get(id);
            return item ? { ...item, position: idx } : null;
          })
          .filter((i): i is PackageItem => i !== null),
      };
    }));
    // Persistieren
    const results = await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('package_items').update({ position: idx }).eq('id', id)
      )
    );
    const failed = results.find(r => r.error);
    if (failed?.error) {
      logger.error('usePackages', 'Reorder failed', failed.error);
      toast({ title: i18n.t('common.error'), variant: 'destructive' });
      // Roll back to the server state
      await fetchPackages();
    }
  };

  return {
    packages, loading, error, inventoryItems,
    createPackage, updatePackage, deletePackage,
    addItemToPackage, updatePackageItemQuantity, removeItemFromPackage,
    reorderPackageItems,
    refetch: fetchPackages,
  };
}

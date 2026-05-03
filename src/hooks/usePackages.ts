import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Package, PackageItem, PackageWithItems } from '@/types/project';
import { InventoryItem } from '@/types/inventory';

export function usePackages() {
  const [packages, setPackages] = useState<PackageWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPackages = useCallback(async () => {
    if (!user) { setPackages([]); setLoading(false); return; }
    try {
      const [pkgRes, itemsRes, invRes] = await Promise.all([
        supabase.from('packages').select('*').order('created_at', { ascending: false }),
        supabase.from('package_items').select('*').order('position', { ascending: true }),
        supabase.from('inventory_items').select('*').is('deleted_at', null),
      ]);
      if (pkgRes.error) throw pkgRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (invRes.error) throw invRes.error;

      const inv = (invRes.data ?? []) as unknown as InventoryItem[];
      setInventoryItems(inv);

      const enriched: PackageWithItems[] = (pkgRes.data ?? []).map(pkg => ({
        ...(pkg as Package),
        items: (itemsRes.data ?? [])
          .filter((pi: any) => pi.package_id === pkg.id)
          .map((pi: any): PackageItem => {
            const invItem = inv.find(i => i.id === pi.inventory_item_id);
            return {
              ...pi,
              item_name: invItem?.name,
              item_category: invItem?.category,
              item_location: invItem?.location,
            };
          }),
      }));
      setPackages(enriched);
    } catch {
      if (navigator.onLine) {
        toast({ title: 'Fehler', description: 'Pakete konnten nicht geladen werden.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const createPackage = async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    if (!user) return;
    const { data: pkg, error } = await supabase
      .from('packages')
      .insert({ ...data, user_id: user.id } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchPackages();
    return pkg as Package;
  };

  const updatePackage = async (id: string, updates: Partial<Pick<Package, 'name' | 'description' | 'color' | 'icon'>>) => {
    const { error } = await supabase.from('packages').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchPackages();
  };

  const deletePackage = async (id: string) => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
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
    } as any);
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Hinweis', description: 'Artikel ist bereits im Paket enthalten.' });
      } else {
        toast({ title: 'Fehler', variant: 'destructive' });
      }
      throw error;
    }
    await fetchPackages();
  };

  const updatePackageItemQuantity = async (itemId: string, quantity: number) => {
    const { error } = await supabase.from('package_items').update({ quantity } as any).eq('id', itemId);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchPackages();
  };

  const removeItemFromPackage = async (itemId: string) => {
    const { error } = await supabase.from('package_items').delete().eq('id', itemId);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchPackages();
  };

  const reorderPackageItems = async (packageId: string, orderedIds: string[]) => {
    // Optimistisch
    setPackages(prev => prev.map(pkg => {
      if (pkg.id !== packageId) return pkg;
      const map = Object.fromEntries(pkg.items.map(i => [i.id, i]));
      return { ...pkg, items: orderedIds.map((id, idx) => ({ ...map[id], position: idx })) };
    }));
    // Persistieren
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('package_items').update({ position: idx } as any).eq('id', id)
      )
    );
  };

  return {
    packages, loading, inventoryItems,
    createPackage, updatePackage, deletePackage,
    addItemToPackage, updatePackageItemQuantity, removeItemFromPackage,
    reorderPackageItems,
    refetch: fetchPackages,
  };
}
import { supabase } from "@/integrations/supabase/client";

/**
 * Removes all project_packages instances of a package and the project_items that
 * came from them, so the package itself can be deleted. Throws on the first error
 * instead of carrying on with a half-cleaned state.
 */
export async function deletePackageUsages(packageId: string): Promise<void> {
  const { data, error } = await supabase
    .from("project_packages")
    .select("id")
    .eq("package_id", packageId);
  if (error) throw error;

  const instanceIds = (data ?? []).map(row => row.id);
  if (instanceIds.length === 0) return;

  const items = await supabase.from("project_items").delete().in("package_instance_id", instanceIds);
  if (items.error) throw items.error;

  const instances = await supabase.from("project_packages").delete().eq("package_id", packageId);
  if (instances.error) throw instances.error;
}

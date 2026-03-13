
-- Helper function: check if a user_id belongs to the demo account
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND email = 'demo@rigflow.app'
  );
$$;

-- ============================================================
-- UPDATE policies: block demo user from updating
-- ============================================================

-- inventory_items
DROP POLICY IF EXISTS "Users can update their own inventory items" ON public.inventory_items;
CREATE POLICY "Users can update their own inventory items" ON public.inventory_items
  FOR UPDATE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- event_sets
DROP POLICY IF EXISTS "Users can update their own sets" ON public.event_sets;
CREATE POLICY "Users can update their own sets" ON public.event_sets
  FOR UPDATE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- event_set_items
DROP POLICY IF EXISTS "Users can update items in their sets" ON public.event_set_items;
CREATE POLICY "Users can update items in their sets" ON public.event_set_items
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

-- checklists
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklists;
CREATE POLICY "Users can update their own checklists" ON public.checklists
  FOR UPDATE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- checklist_items
DROP POLICY IF EXISTS "Users can update items in their checklists" ON public.checklist_items;
CREATE POLICY "Users can update items in their checklists" ON public.checklist_items
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM checklists WHERE checklists.id = checklist_items.checklist_id AND checklists.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

-- lending_history
DROP POLICY IF EXISTS "Users can update their own lending history" ON public.lending_history;
CREATE POLICY "Users can update their own lending history" ON public.lending_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- user_categories
DROP POLICY IF EXISTS "Users can update their own categories" ON public.user_categories;
CREATE POLICY "Users can update their own categories" ON public.user_categories
  FOR UPDATE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- dmx_instances
DROP POLICY IF EXISTS "Users can update their own dmx instances" ON public.dmx_instances;
CREATE POLICY "Users can update their own dmx instances" ON public.dmx_instances
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = dmx_instances.item_id AND inventory_items.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

-- ============================================================
-- DELETE policies: block demo user from deleting
-- ============================================================

-- inventory_items
DROP POLICY IF EXISTS "Users can delete their own inventory items" ON public.inventory_items;
CREATE POLICY "Users can delete their own inventory items" ON public.inventory_items
  FOR DELETE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- event_sets
DROP POLICY IF EXISTS "Users can delete their own sets" ON public.event_sets;
CREATE POLICY "Users can delete their own sets" ON public.event_sets
  FOR DELETE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- event_set_items
DROP POLICY IF EXISTS "Users can delete items from their sets" ON public.event_set_items;
CREATE POLICY "Users can delete items from their sets" ON public.event_set_items
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

-- checklists
DROP POLICY IF EXISTS "Users can delete their own checklists" ON public.checklists;
CREATE POLICY "Users can delete their own checklists" ON public.checklists
  FOR DELETE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- checklist_items
DROP POLICY IF EXISTS "Users can delete items from their checklists" ON public.checklist_items;
CREATE POLICY "Users can delete items from their checklists" ON public.checklist_items
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM checklists WHERE checklists.id = checklist_items.checklist_id AND checklists.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

-- lending_history
DROP POLICY IF EXISTS "Users can delete their own lending history" ON public.lending_history;
CREATE POLICY "Users can delete their own lending history" ON public.lending_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- user_categories
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.user_categories;
CREATE POLICY "Users can delete their own categories" ON public.user_categories
  FOR DELETE TO public USING (auth.uid() = user_id AND NOT public.is_demo_user(auth.uid()));

-- dmx_instances
DROP POLICY IF EXISTS "Users can delete their own dmx instances" ON public.dmx_instances;
CREATE POLICY "Users can delete their own dmx instances" ON public.dmx_instances
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = dmx_instances.item_id AND inventory_items.user_id = auth.uid())
    AND NOT public.is_demo_user(auth.uid())
  );

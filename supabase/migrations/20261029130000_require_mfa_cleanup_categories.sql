-- 1) Users who enabled 2FA can only reach their data with a fully verified
--    session (aal2). Before, a session after email + password but before the
--    TOTP code (aal1) could read and write everything through the API.
-- 2) Remove two functions left over from the never-deployed user_categories
--    feature (they reference a table that doesn't exist and have no triggers).

-- ─── 1. MFA requirement ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mfa_requirement_met()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
      OR NOT EXISTS (
           SELECT 1
             FROM auth.mfa_factors f
            WHERE f.user_id = auth.uid()
              AND f.status = 'verified'
         );
$$;

REVOKE EXECUTE ON FUNCTION public.mfa_requirement_met() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfa_requirement_met() TO authenticated;

-- Restrictive policies are AND-ed with the existing permissive ones, so they
-- can only take access away. "(SELECT …)" makes Postgres evaluate it once per query.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_log', 'category_attributes', 'checklist_items', 'checklists',
    'dmx_instances', 'event_set_items', 'event_sets', 'feature_requests',
    'feature_votes', 'inventory_items', 'item_tags', 'lending_history',
    'maintenance_records', 'package_items', 'packages', 'profiles',
    'project_dmx_instances', 'project_dmx_patches', 'project_items',
    'project_packages', 'project_todos', 'projects', 'tags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Require MFA when enrolled" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Require MFA when enrolled" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT public.mfa_requirement_met()))
         WITH CHECK ((SELECT public.mfa_requirement_met()))',
      t
    );
  END LOOP;
END;
$$;

-- ─── 2. Leftovers of user_categories ──────────────────────────────────────

DROP FUNCTION IF EXISTS public.seed_default_categories();
DROP FUNCTION IF EXISTS public.init_category_default_attributes();

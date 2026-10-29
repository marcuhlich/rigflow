-- Security hardening based on the Supabase security advisor (2026-10-29).
-- No data is changed except recomputing feature_requests.votes from feature_votes.

-- ─── 1. Wishlist: votes are counted by the database, only admins may edit ───
-- Before: every signed-in user could UPDATE any feature request (title,
-- description, status, votes) and the client wrote "votes ± 1" itself.

CREATE OR REPLACE FUNCTION public.sync_feature_request_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target uuid := COALESCE(NEW.request_id, OLD.request_id);
BEGIN
  UPDATE public.feature_requests
     SET votes = (SELECT count(*) FROM public.feature_votes WHERE request_id = target)
   WHERE id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS feature_votes_sync_count ON public.feature_votes;
CREATE TRIGGER feature_votes_sync_count
  AFTER INSERT OR DELETE ON public.feature_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feature_request_votes();

-- Bring existing counts in line with the actual votes
UPDATE public.feature_requests fr
   SET votes = (SELECT count(*) FROM public.feature_votes fv WHERE fv.request_id = fr.id);

DROP POLICY IF EXISTS "Eingeloggte können feature_requests updaten" ON public.feature_requests;
CREATE POLICY "Admins können Requests bearbeiten" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata' ->> 'is_admin'))::boolean = true)
  WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'is_admin'))::boolean = true);

-- New requests always start as "offen" without votes
DROP POLICY IF EXISTS "Eingeloggte können Requests erstellen" ON public.feature_requests;
CREATE POLICY "Eingeloggte können Requests erstellen" ON public.feature_requests
  FOR INSERT TO authenticated
  WITH CHECK (status = 'offen' AND votes = 0);

-- The anon role has no business with the wishlist
REVOKE ALL ON TABLE public.feature_requests FROM anon;
REVOKE ALL ON TABLE public.feature_votes FROM anon;

-- ─── 2. Trigger functions must not be callable through the REST API ───
-- (Triggers keep working: the privilege is checked when the trigger is created.)

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.init_category_default_attributes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_feature_request_votes() FROM PUBLIC, anon, authenticated;

-- is_demo_user() is used inside RLS policies, so signed-in users still need it.
REVOKE EXECUTE ON FUNCTION public.is_demo_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_user(uuid) TO authenticated;

-- ─── 3. Fixed search_path for trigger functions ───
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';

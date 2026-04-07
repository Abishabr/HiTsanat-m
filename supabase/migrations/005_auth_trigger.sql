-- ============================================================
-- 005_auth_trigger.sql
-- Auth trigger — only inserts system_users if member_id is provided.
-- If no member_id in metadata, skips silently (no error).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  -- Only proceed if member_id was passed in metadata
  BEGIN
    v_member_id := (NEW.raw_user_meta_data ->> 'member_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW; -- invalid uuid format — skip
  END;

  IF v_member_id IS NULL THEN
    RETURN NEW; -- no member_id — skip
  END IF;

  -- Check member exists before inserting
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE member_id = v_member_id) THEN
    RETURN NEW; -- member not found — skip
  END IF;

  INSERT INTO public.system_users (auth_user_id, member_id)
  VALUES (NEW.id, v_member_id)
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- 005_auth_trigger.sql
-- Auth trigger for new schema:
-- system_users links auth.users → members (no role/sub_dept)
-- Roles are managed in member_roles table
--
-- Expected user_metadata at signup:
--   member_id  UUID  (required — must exist in members table)
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
  v_member_id := (NEW.raw_user_meta_data ->> 'member_id')::uuid;

  IF v_member_id IS NULL THEN
    RETURN NEW; -- Skip if no member_id provided
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

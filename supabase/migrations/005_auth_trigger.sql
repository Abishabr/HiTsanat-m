-- ============================================================
-- 005_auth_trigger.sql
-- Postgres trigger: auto-create system_users row on Auth signup
--
-- When a new user signs up via Supabase Auth, this trigger
-- inserts a row into system_users using metadata passed at
-- signup time (role, sub_department_id, member_id).
--
-- Expected user_metadata keys at signup:
--   role              TEXT  (user_role enum value, e.g. 'SubDeptChairperson')
--   sub_department_id UUID  (nullable — required for subdept roles)
--   member_id         UUID  (nullable — links to normalized_members)
--
-- Example: supabase.auth.signUp({
--   email, password,
--   options: { data: {
--     role: 'SubDeptChairperson',
--     sub_department_id: '<uuid>',
--     member_id: '<uuid>'
--   }}
-- })
-- ============================================================

-- ── Function ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role              user_role;
  v_sub_department_id uuid;
  v_member_id         uuid;
BEGIN
  -- Extract metadata passed at signup
  v_role              := (NEW.raw_user_meta_data ->> 'role')::user_role;
  v_sub_department_id := (NEW.raw_user_meta_data ->> 'sub_department_id')::uuid;
  v_member_id         := (NEW.raw_user_meta_data ->> 'member_id')::uuid;

  -- Default role if none provided (prevents null constraint violation)
  IF v_role IS NULL THEN
    v_role := 'SubDeptSecretary';
  END IF;

  INSERT INTO public.system_users (
    auth_user_id,
    member_id,
    role,
    sub_department_id
  )
  VALUES (
    NEW.id,
    v_member_id,
    v_role,
    v_sub_department_id
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- OPTIONAL: Function to update system_users when user_metadata
-- is updated (e.g. role change by an admin).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role              user_role;
  v_sub_department_id uuid;
  v_member_id         uuid;
BEGIN
  v_role              := (NEW.raw_user_meta_data ->> 'role')::user_role;
  v_sub_department_id := (NEW.raw_user_meta_data ->> 'sub_department_id')::uuid;
  v_member_id         := (NEW.raw_user_meta_data ->> 'member_id')::uuid;

  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.system_users
  SET
    role              = v_role,
    sub_department_id = v_sub_department_id,
    member_id         = v_member_id
  WHERE auth_user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION handle_auth_user_updated();

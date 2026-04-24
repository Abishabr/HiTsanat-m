-- ============================================================
-- 006_auth_access_check.sql
--
-- Creates check_leadership_access(auth_user_id UUID) RPC and
-- updates the handle_new_auth_user trigger to write auth_user_id
-- directly to members.auth_user_id.
--
-- Depends on: 006b_auth_schema_prerequisites.sql
-- ============================================================


-- ============================================================
-- check_leadership_access(auth_user_id UUID)
--
-- Called by the app immediately after Supabase Auth sign-in.
-- Queries members → member_sub_departments → leadership_roles
-- → sub_departments to find the highest-priority active role.
--
-- Returns JSON:
--   { "has_access": true,  "role": "Chairperson", "sub_department": "Department" }
--   { "has_access": false, "role": null,           "sub_department": null         }
--
-- SECURITY DEFINER: bypasses RLS so it can always read members.
-- ============================================================

CREATE OR REPLACE FUNCTION check_leadership_access(auth_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role           TEXT;
  v_sub_department TEXT;
BEGIN
  SELECT
    lr.name,
    sd.name
  INTO
    v_role,
    v_sub_department
  FROM public.members m
  JOIN public.member_sub_departments msd
    ON msd.member_id = m.member_id
  JOIN public.leadership_roles lr
    ON lr.leadership_role_id = msd.leadership_role_id
  JOIN public.sub_departments sd
    ON sd.sub_department_id = msd.sub_department_id
  WHERE m.auth_user_id = check_leadership_access.auth_user_id
    AND msd.is_active   = true
    AND lr.name        <> 'Member'
  ORDER BY lr.hierarchy_level ASC
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN json_build_object(
      'has_access',     false,
      'role',           NULL,
      'sub_department', NULL
    );
  END IF;

  RETURN json_build_object(
    'has_access',     true,
    'role',           v_role,
    'sub_department', v_sub_department
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_leadership_access(UUID) TO authenticated;


-- ============================================================
-- Update handle_new_auth_user trigger
--
-- When a new auth user is created with member_id in metadata,
-- writes auth_user_id directly into members.auth_user_id.
-- (Replaces the old system_users insert from migration 005.)
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
  BEGIN
    v_member_id := (NEW.raw_user_meta_data ->> 'member_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  IF v_member_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members WHERE member_id = v_member_id
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE public.members
  SET auth_user_id = NEW.id
  WHERE member_id = v_member_id
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ============================================================
-- CORRECTED VERSION (applied manually)
-- The original function referenced public.members which does not
-- exist in this Supabase instance. The actual auth data lives in
-- public.profiles (id UUID, role TEXT, sub_department TEXT).
-- ============================================================

-- CREATE OR REPLACE FUNCTION check_leadership_access(auth_user_id UUID)
-- RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- DECLARE v_role TEXT; v_sub_department TEXT;
-- BEGIN
--   SELECT p.role, p.sub_department INTO v_role, v_sub_department
--   FROM public.profiles p WHERE p.id = check_leadership_access.auth_user_id LIMIT 1;
--   IF v_role IS NULL OR v_role = '' THEN
--     RETURN json_build_object('has_access', false, 'role', NULL, 'sub_department', NULL);
--   END IF;
--   RETURN json_build_object('has_access', true, 'role', v_role,
--     'sub_department', COALESCE(v_sub_department, 'Department'));
-- END; $$;
-- GRANT EXECUTE ON FUNCTION check_leadership_access(UUID) TO authenticated;

-- ============================================================
-- 006_auth_access_check.sql
-- Adds the check_leadership_access(auth_user_id UUID) RPC function
-- and updates the handle_new_auth_user trigger to write auth_user_id
-- directly to members.auth_user_id instead of the deprecated
-- system_users table.
-- ============================================================

-- ============================================================
-- check_leadership_access
-- Queries members → member_sub_departments → leadership_roles →
-- sub_departments to determine whether the given auth user holds
-- at least one active qualifying leadership role.
--
-- Returns JSON:
--   { "has_access": true,  "role": <name>,  "sub_department": <name> }
--   { "has_access": false, "role": null,     "sub_department": null   }
--
-- SECURITY DEFINER: runs with the privileges of the function owner
-- so it can bypass RLS on members / member_sub_departments.
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
      'has_access',    false,
      'role',          NULL,
      'sub_department', NULL
    );
  END IF;

  RETURN json_build_object(
    'has_access',    true,
    'role',          v_role,
    'sub_department', v_sub_department
  );
END;
$$;

-- ============================================================
-- Update handle_new_auth_user trigger
-- Writes auth_user_id to members.auth_user_id instead of
-- inserting into the deprecated system_users table.
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

  -- Check member exists before updating
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE member_id = v_member_id) THEN
    RETURN NEW; -- member not found — skip
  END IF;

  -- Write auth_user_id directly to members instead of system_users
  UPDATE public.members
  SET auth_user_id = NEW.id
  WHERE member_id = v_member_id
    AND auth_user_id IS NULL; -- only set if not already linked

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- 007_rls_and_access_functions.sql
--
-- SQL helper functions and RLS policies for all data tables.
--
-- Confirmed schema:
--   members:               member_id (PK), fullname, auth_user_id
--   sub_departments:       sub_department_id (PK), name
--   member_sub_departments: id (PK), member_id, sub_department_id,
--                           leadership_role_id, is_active
--   leadership_roles:      leadership_role_id (PK), name, hierarchy_level
--
-- Security model:
--   • Regular members → blocked entirely at DB level
--   • All 18 system users → can SELECT (scoped where applicable)
--   • Department leaders (sub_department name = 'Department') → full read/write
--   • Sub-department leaders → read/write only their sub-department rows
--   • DELETE → department leaders only on all tables
--
-- Depends on: 006b_auth_schema_prerequisites.sql
-- ============================================================


-- ============================================================
-- FUNCTION: is_system_user()
-- TRUE if the current auth user is one of the 18 leaders.
-- ============================================================

CREATE OR REPLACE FUNCTION is_system_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.member_sub_departments msd
      ON msd.member_id = m.member_id
    JOIN public.leadership_roles lr
      ON lr.leadership_role_id = msd.leadership_role_id
    WHERE m.auth_user_id = auth.uid()
      AND msd.is_active  = true
      AND lr.name       <> 'Member'
  );
END;
$$;


-- ============================================================
-- FUNCTION: is_department_leader()
-- TRUE if the current user holds a role in the 'Department'
-- sub-department (i.e. one of the 3 top-level leaders).
-- ============================================================

CREATE OR REPLACE FUNCTION is_department_leader()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.member_sub_departments msd
      ON msd.member_id = m.member_id
    JOIN public.sub_departments sd
      ON sd.sub_department_id = msd.sub_department_id
    JOIN public.leadership_roles lr
      ON lr.leadership_role_id = msd.leadership_role_id
    WHERE m.auth_user_id = auth.uid()
      AND msd.is_active  = true
      AND lr.name       <> 'Member'
      AND sd.name        = 'Department'
  );
END;
$$;


-- ============================================================
-- FUNCTION: get_user_access_scope()
-- Returns JSON describing the user's role and access boundaries:
--   {
--     "is_department_leader": true | false,
--     "role":                 "Chairperson" | ...,
--     "sub_department":       "Department" | "Timhert" | ...,
--     "led_sub_departments":  ["<uuid>", ...]
--   }
-- Returns NULL if the user is not a system user.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_access_scope()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role           TEXT;
  v_sub_department TEXT;
  v_led_sub_depts  UUID[];
BEGIN
  -- Highest-priority qualifying role
  SELECT lr.name, sd.name
  INTO   v_role, v_sub_department
  FROM public.members m
  JOIN public.member_sub_departments msd ON msd.member_id = m.member_id
  JOIN public.leadership_roles lr        ON lr.leadership_role_id = msd.leadership_role_id
  JOIN public.sub_departments sd         ON sd.sub_department_id  = msd.sub_department_id
  WHERE m.auth_user_id = auth.uid()
    AND msd.is_active  = true
    AND lr.name       <> 'Member'
  ORDER BY lr.hierarchy_level ASC
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN NULL;
  END IF;

  -- All sub-departments this user leads
  SELECT ARRAY_AGG(DISTINCT msd2.sub_department_id)
  INTO   v_led_sub_depts
  FROM public.members m2
  JOIN public.member_sub_departments msd2 ON msd2.member_id = m2.member_id
  JOIN public.leadership_roles lr2        ON lr2.leadership_role_id = msd2.leadership_role_id
  WHERE m2.auth_user_id = auth.uid()
    AND msd2.is_active  = true
    AND lr2.name       <> 'Member';

  RETURN json_build_object(
    'is_department_leader', v_sub_department = 'Department',
    'role',                 v_role,
    'sub_department',       v_sub_department,
    'led_sub_departments',  COALESCE(v_led_sub_depts, ARRAY[]::UUID[])
  );
END;
$$;


-- ============================================================
-- FUNCTION: get_accessible_sub_departments()
-- Returns UUID[] of sub-departments the current user can access.
--   Department leaders → all sub-department IDs
--   Sub-dept leaders   → only their assigned sub-dept IDs
--   Non-system users   → empty array
-- ============================================================

CREATE OR REPLACE FUNCTION get_accessible_sub_departments()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result UUID[];
BEGIN
  IF is_department_leader() THEN
    SELECT ARRAY_AGG(sub_department_id)
    INTO   v_result
    FROM   public.sub_departments
    WHERE  name <> 'Department';

    RETURN COALESCE(v_result, ARRAY[]::UUID[]);
  END IF;

  IF is_system_user() THEN
    SELECT ARRAY_AGG(DISTINCT msd.sub_department_id)
    INTO   v_result
    FROM public.members m
    JOIN public.member_sub_departments msd ON msd.member_id = m.member_id
    JOIN public.leadership_roles lr        ON lr.leadership_role_id = msd.leadership_role_id
    WHERE m.auth_user_id = auth.uid()
      AND msd.is_active  = true
      AND lr.name       <> 'Member';

    RETURN COALESCE(v_result, ARRAY[]::UUID[]);
  END IF;

  RETURN ARRAY[]::UUID[];
END;
$$;


-- ============================================================
-- Grant EXECUTE to authenticated role
-- ============================================================

GRANT EXECUTE ON FUNCTION is_system_user()                 TO authenticated;
GRANT EXECUTE ON FUNCTION is_department_leader()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_access_scope()          TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_sub_departments() TO authenticated;


-- ============================================================
-- Enable RLS on all data tables
-- ============================================================

ALTER TABLE public.members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_sub_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLE: members
-- Dept leaders: all rows
-- Subdept leaders: members in their sub-department(s)
-- ============================================================

DROP POLICY IF EXISTS "members_select" ON public.members;
CREATE POLICY "members_select" ON public.members FOR SELECT USING (
  is_system_user() AND (
    is_department_leader()
    OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd
      WHERE msd.member_id = members.member_id
        AND msd.sub_department_id = ANY(get_accessible_sub_departments())
        AND msd.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "members_insert" ON public.members;
CREATE POLICY "members_insert" ON public.members FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "members_update" ON public.members;
CREATE POLICY "members_update" ON public.members FOR UPDATE USING (
  is_system_user() AND (
    is_department_leader()
    OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd
      WHERE msd.member_id = members.member_id
        AND msd.sub_department_id = ANY(get_accessible_sub_departments())
        AND msd.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "members_delete" ON public.members;
CREATE POLICY "members_delete" ON public.members FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: member_sub_departments
-- All system users can read; only dept leaders can write.
-- ============================================================

DROP POLICY IF EXISTS "msd_select" ON public.member_sub_departments;
CREATE POLICY "msd_select" ON public.member_sub_departments FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "msd_insert" ON public.member_sub_departments;
CREATE POLICY "msd_insert" ON public.member_sub_departments FOR INSERT WITH CHECK (
  is_department_leader()
);

DROP POLICY IF EXISTS "msd_update" ON public.member_sub_departments;
CREATE POLICY "msd_update" ON public.member_sub_departments FOR UPDATE USING (
  is_department_leader()
);

DROP POLICY IF EXISTS "msd_delete" ON public.member_sub_departments;
CREATE POLICY "msd_delete" ON public.member_sub_departments FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: sub_departments  (lookup — read-only for all system users)
-- ============================================================

DROP POLICY IF EXISTS "subdepts_select" ON public.sub_departments;
CREATE POLICY "subdepts_select" ON public.sub_departments FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "subdepts_write" ON public.sub_departments;
CREATE POLICY "subdepts_write" ON public.sub_departments FOR ALL USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: leadership_roles  (lookup — read-only for all system users)
-- ============================================================

DROP POLICY IF EXISTS "leadership_roles_select" ON public.leadership_roles;
CREATE POLICY "leadership_roles_select" ON public.leadership_roles FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "leadership_roles_write" ON public.leadership_roles;
CREATE POLICY "leadership_roles_write" ON public.leadership_roles FOR ALL USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: children
-- All system users can read/write; only dept leaders can delete.
-- ============================================================

DROP POLICY IF EXISTS "children_select" ON public.children;
CREATE POLICY "children_select" ON public.children FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "children_insert" ON public.children;
CREATE POLICY "children_insert" ON public.children FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "children_update" ON public.children;
CREATE POLICY "children_update" ON public.children FOR UPDATE USING (
  is_system_user()
);

DROP POLICY IF EXISTS "children_delete" ON public.children;
CREATE POLICY "children_delete" ON public.children FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: programs (weekly programs)
-- Dept leaders: all rows
-- Subdept leaders: programs for their sub-department(s)
-- ============================================================

DROP POLICY IF EXISTS "programs_select" ON public.programs;
CREATE POLICY "programs_select" ON public.programs FOR SELECT USING (
  is_system_user() AND (
    is_department_leader()
    OR programs.sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "programs_insert" ON public.programs;
CREATE POLICY "programs_insert" ON public.programs FOR INSERT WITH CHECK (
  is_system_user() AND (
    is_department_leader()
    OR sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "programs_update" ON public.programs;
CREATE POLICY "programs_update" ON public.programs FOR UPDATE USING (
  is_system_user() AND (
    is_department_leader()
    OR programs.sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "programs_delete" ON public.programs;
CREATE POLICY "programs_delete" ON public.programs FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: attendance
-- All system users can read/write; dept leaders can delete.
-- ============================================================

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE USING (
  is_system_user()
);

DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;
CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: parents
-- All system users can read/write; dept leaders can delete.
-- ============================================================

DROP POLICY IF EXISTS "parents_select" ON public.parents;
CREATE POLICY "parents_select" ON public.parents FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "parents_insert" ON public.parents;
CREATE POLICY "parents_insert" ON public.parents FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "parents_update" ON public.parents;
CREATE POLICY "parents_update" ON public.parents FOR UPDATE USING (
  is_system_user()
);

DROP POLICY IF EXISTS "parents_delete" ON public.parents;
CREATE POLICY "parents_delete" ON public.parents FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- TABLE: program_assignments
-- Dept leaders: all rows; subdept leaders: their sub-dept only
-- ============================================================

DROP POLICY IF EXISTS "program_assignments_select" ON public.program_assignments;
CREATE POLICY "program_assignments_select" ON public.program_assignments FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "program_assignments_insert" ON public.program_assignments;
CREATE POLICY "program_assignments_insert" ON public.program_assignments FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "program_assignments_update" ON public.program_assignments;
CREATE POLICY "program_assignments_update" ON public.program_assignments FOR UPDATE USING (
  is_system_user()
);

DROP POLICY IF EXISTS "program_assignments_delete" ON public.program_assignments;
CREATE POLICY "program_assignments_delete" ON public.program_assignments FOR DELETE USING (
  is_department_leader()
);

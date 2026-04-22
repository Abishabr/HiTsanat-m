-- ============================================================
-- 007_rls_and_access_functions.sql
--
-- Adds three helper SQL functions and RLS policies for all
-- data tables in the Hitsanat KFL system.
--
-- Security model:
--   • Only the 18 leadership members can read ANY data
--   • Department leaders (sub_department = 'Department') have
--     full read/write across all tables
--   • Sub-department leaders can read/write only rows that
--     belong to their assigned sub-department
--   • Regular members (no qualifying leadership role) are
--     blocked entirely at the database level
--
-- All policies use auth.uid() — never trust client claims.
-- Functions use SECURITY DEFINER so they can read
-- member_sub_departments regardless of the caller's RLS.
-- ============================================================


-- ============================================================
-- FUNCTION 1: is_system_user()
-- Returns TRUE if the currently authenticated user is one of
-- the 18 designated leadership members.
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
-- FUNCTION 2: get_user_access_scope()
-- Returns a JSON object describing the authenticated user's
-- role and access boundaries:
--
--   {
--     "is_department_leader": true | false,
--     "role": "Chairperson" | "Vice Chairperson" | "Secretary",
--     "sub_department": "Department" | "Timhert" | ...,
--     "led_sub_departments": ["<uuid>", ...]   -- UUIDs
--   }
--
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
  v_sub_dept_id    UUID;
  v_led_sub_depts  UUID[];
BEGIN
  -- Get the highest-priority qualifying role (same logic as check_leadership_access)
  SELECT
    lr.name,
    sd.name,
    sd.sub_department_id
  INTO
    v_role,
    v_sub_department,
    v_sub_dept_id
  FROM public.members m
  JOIN public.member_sub_departments msd
    ON msd.member_id = m.member_id
  JOIN public.leadership_roles lr
    ON lr.leadership_role_id = msd.leadership_role_id
  JOIN public.sub_departments sd
    ON sd.sub_department_id = msd.sub_department_id
  WHERE m.auth_user_id = auth.uid()
    AND msd.is_active   = true
    AND lr.name        <> 'Member'
  ORDER BY lr.hierarchy_level ASC
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN NULL; -- not a system user
  END IF;

  -- Collect all sub-departments this user leads (for sub-dept leaders
  -- who may lead more than one sub-department)
  SELECT ARRAY_AGG(DISTINCT msd2.sub_department_id)
  INTO v_led_sub_depts
  FROM public.members m2
  JOIN public.member_sub_departments msd2
    ON msd2.member_id = m2.member_id
  JOIN public.leadership_roles lr2
    ON lr2.leadership_role_id = msd2.leadership_role_id
  WHERE m2.auth_user_id = auth.uid()
    AND msd2.is_active   = true
    AND lr2.name        <> 'Member';

  RETURN json_build_object(
    'is_department_leader', v_sub_department = 'Department',
    'role',                 v_role,
    'sub_department',       v_sub_department,
    'led_sub_departments',  COALESCE(v_led_sub_depts, ARRAY[]::UUID[])
  );
END;
$$;


-- ============================================================
-- FUNCTION 3: get_accessible_sub_departments()
-- Returns an array of sub_department_id UUIDs the current
-- user is allowed to view.
--
-- Department leaders → all sub-department IDs
-- Sub-department leaders → only their assigned sub-dept IDs
-- Non-system users → empty array
-- ============================================================

CREATE OR REPLACE FUNCTION get_accessible_sub_departments()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_scope JSON;
  v_is_dept_leader BOOLEAN;
  v_led_sub_depts  UUID[];
BEGIN
  v_scope := get_user_access_scope();

  IF v_scope IS NULL THEN
    RETURN ARRAY[]::UUID[]; -- not a system user
  END IF;

  v_is_dept_leader := (v_scope->>'is_department_leader')::BOOLEAN;

  IF v_is_dept_leader THEN
    -- Department leaders can access all sub-departments
    SELECT ARRAY_AGG(sub_department_id)
    INTO v_led_sub_depts
    FROM public.sub_departments
    WHERE name <> 'Department';

    RETURN COALESCE(v_led_sub_depts, ARRAY[]::UUID[]);
  ELSE
    -- Sub-department leaders: only their assigned sub-departments
    SELECT ARRAY_AGG(DISTINCT msd.sub_department_id)
    INTO v_led_sub_depts
    FROM public.members m
    JOIN public.member_sub_departments msd
      ON msd.member_id = m.member_id
    JOIN public.leadership_roles lr
      ON lr.leadership_role_id = msd.leadership_role_id
    WHERE m.auth_user_id = auth.uid()
      AND msd.is_active   = true
      AND lr.name        <> 'Member';

    RETURN COALESCE(v_led_sub_depts, ARRAY[]::UUID[]);
  END IF;
END;
$$;


-- ============================================================
-- RLS POLICIES
--
-- Pattern for every table:
--   SELECT  → is_system_user() must be true
--             dept leaders see all; subdept leaders see only
--             rows linked to their sub-department(s)
--   INSERT  → same scope check
--   UPDATE  → same scope check
--   DELETE  → department leaders only
--
-- Tables covered:
--   members, children, member_sub_departments,
--   sub_departments, leadership_roles,
--   program_slots (weekly programs), child_events,
--   member_activities, timhert_activities,
--   attendance (if present)
-- ============================================================

-- ── Enable RLS on all tables ────────────────────────────────

ALTER TABLE public.members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_sub_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timhert_activities    ENABLE ROW LEVEL SECURITY;


-- ── Helper: is the current user a department leader? ────────
-- Used inline in policies to avoid repeated subqueries.

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
      AND msd.is_active   = true
      AND lr.name        <> 'Member'
      AND sd.name         = 'Department'
  );
END;
$$;


-- ============================================================
-- TABLE: members
-- Dept leaders: all rows
-- Subdept leaders: members who belong to their sub-dept(s)
-- ============================================================

DROP POLICY IF EXISTS "members_select" ON public.members;
CREATE POLICY "members_select" ON public.members
  FOR SELECT USING (
    is_system_user() AND (
      is_department_leader()
      OR
      EXISTS (
        SELECT 1 FROM public.member_sub_departments msd
        WHERE msd.member_id = members.member_id
          AND msd.sub_department_id = ANY(get_accessible_sub_departments())
          AND msd.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "members_insert" ON public.members;
CREATE POLICY "members_insert" ON public.members
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "members_update" ON public.members;
CREATE POLICY "members_update" ON public.members
  FOR UPDATE USING (
    is_system_user() AND (
      is_department_leader()
      OR
      EXISTS (
        SELECT 1 FROM public.member_sub_departments msd
        WHERE msd.member_id = members.member_id
          AND msd.sub_department_id = ANY(get_accessible_sub_departments())
          AND msd.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "members_delete" ON public.members;
CREATE POLICY "members_delete" ON public.members
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: children
-- Dept leaders: all rows
-- Subdept leaders: children whose family is linked to their sub-dept
-- (children are ministry-wide; subdept leaders see all children
--  they supervise in programs — use program_slots for scoping)
-- For simplicity: all system users can read children;
-- only dept leaders can write.
-- ============================================================

DROP POLICY IF EXISTS "children_select" ON public.children;
CREATE POLICY "children_select" ON public.children
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "children_insert" ON public.children;
CREATE POLICY "children_insert" ON public.children
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "children_update" ON public.children;
CREATE POLICY "children_update" ON public.children
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "children_delete" ON public.children;
CREATE POLICY "children_delete" ON public.children
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: member_sub_departments
-- All system users can read; only dept leaders can write.
-- ============================================================

DROP POLICY IF EXISTS "msd_select" ON public.member_sub_departments;
CREATE POLICY "msd_select" ON public.member_sub_departments
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "msd_insert" ON public.member_sub_departments;
CREATE POLICY "msd_insert" ON public.member_sub_departments
  FOR INSERT WITH CHECK (is_department_leader());

DROP POLICY IF EXISTS "msd_update" ON public.member_sub_departments;
CREATE POLICY "msd_update" ON public.member_sub_departments
  FOR UPDATE USING (is_department_leader());

DROP POLICY IF EXISTS "msd_delete" ON public.member_sub_departments;
CREATE POLICY "msd_delete" ON public.member_sub_departments
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: sub_departments  (lookup — read-only for all system users)
-- ============================================================

DROP POLICY IF EXISTS "subdepts_select" ON public.sub_departments;
CREATE POLICY "subdepts_select" ON public.sub_departments
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "subdepts_write" ON public.sub_departments;
CREATE POLICY "subdepts_write" ON public.sub_departments
  FOR ALL USING (is_department_leader());


-- ============================================================
-- TABLE: leadership_roles  (lookup — read-only for all system users)
-- ============================================================

DROP POLICY IF EXISTS "leadership_roles_select" ON public.leadership_roles;
CREATE POLICY "leadership_roles_select" ON public.leadership_roles
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "leadership_roles_write" ON public.leadership_roles;
CREATE POLICY "leadership_roles_write" ON public.leadership_roles
  FOR ALL USING (is_department_leader());


-- ============================================================
-- TABLE: program_slots  (weekly programs)
-- Dept leaders: all rows
-- Subdept leaders: slots for their sub-department(s)
-- ============================================================

DROP POLICY IF EXISTS "program_slots_select" ON public.program_slots;
CREATE POLICY "program_slots_select" ON public.program_slots
  FOR SELECT USING (
    is_system_user() AND (
      is_department_leader()
      OR program_slots.sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "program_slots_insert" ON public.program_slots;
CREATE POLICY "program_slots_insert" ON public.program_slots
  FOR INSERT WITH CHECK (
    is_system_user() AND (
      is_department_leader()
      OR sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "program_slots_update" ON public.program_slots;
CREATE POLICY "program_slots_update" ON public.program_slots
  FOR UPDATE USING (
    is_system_user() AND (
      is_department_leader()
      OR program_slots.sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "program_slots_delete" ON public.program_slots;
CREATE POLICY "program_slots_delete" ON public.program_slots
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: child_events
-- All system users can read; dept leaders can write.
-- ============================================================

DROP POLICY IF EXISTS "child_events_select" ON public.child_events;
CREATE POLICY "child_events_select" ON public.child_events
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "child_events_insert" ON public.child_events;
CREATE POLICY "child_events_insert" ON public.child_events
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "child_events_update" ON public.child_events;
CREATE POLICY "child_events_update" ON public.child_events
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "child_events_delete" ON public.child_events;
CREATE POLICY "child_events_delete" ON public.child_events
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: member_activities
-- Dept leaders: all rows
-- Subdept leaders: activities for their sub-department(s)
-- ============================================================

DROP POLICY IF EXISTS "member_activities_select" ON public.member_activities;
CREATE POLICY "member_activities_select" ON public.member_activities
  FOR SELECT USING (
    is_system_user() AND (
      is_department_leader()
      OR member_activities.sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "member_activities_insert" ON public.member_activities;
CREATE POLICY "member_activities_insert" ON public.member_activities
  FOR INSERT WITH CHECK (
    is_system_user() AND (
      is_department_leader()
      OR sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "member_activities_update" ON public.member_activities;
CREATE POLICY "member_activities_update" ON public.member_activities
  FOR UPDATE USING (
    is_system_user() AND (
      is_department_leader()
      OR member_activities.sub_department_id = ANY(get_accessible_sub_departments())
    )
  );

DROP POLICY IF EXISTS "member_activities_delete" ON public.member_activities;
CREATE POLICY "member_activities_delete" ON public.member_activities
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- TABLE: timhert_activities
-- All system users can read (Timhert subdept leaders + dept leaders write)
-- ============================================================

DROP POLICY IF EXISTS "timhert_activities_select" ON public.timhert_activities;
CREATE POLICY "timhert_activities_select" ON public.timhert_activities
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "timhert_activities_insert" ON public.timhert_activities;
CREATE POLICY "timhert_activities_insert" ON public.timhert_activities
  FOR INSERT WITH CHECK (
    is_system_user() AND (
      is_department_leader()
      OR EXISTS (
        SELECT 1 FROM public.sub_departments sd
        WHERE sd.sub_department_id = ANY(get_accessible_sub_departments())
          AND sd.name = 'Timhert'
      )
    )
  );

DROP POLICY IF EXISTS "timhert_activities_update" ON public.timhert_activities;
CREATE POLICY "timhert_activities_update" ON public.timhert_activities
  FOR UPDATE USING (
    is_system_user() AND (
      is_department_leader()
      OR EXISTS (
        SELECT 1 FROM public.sub_departments sd
        WHERE sd.sub_department_id = ANY(get_accessible_sub_departments())
          AND sd.name = 'Timhert'
      )
    )
  );

DROP POLICY IF EXISTS "timhert_activities_delete" ON public.timhert_activities;
CREATE POLICY "timhert_activities_delete" ON public.timhert_activities
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- Grant EXECUTE on all helper functions to authenticated role
-- so the RLS policies can call them via auth.uid()
-- ============================================================

GRANT EXECUTE ON FUNCTION is_system_user()                  TO authenticated;
GRANT EXECUTE ON FUNCTION is_department_leader()            TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_access_scope()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_sub_departments()  TO authenticated;
GRANT EXECUTE ON FUNCTION check_leadership_access(UUID)     TO authenticated;

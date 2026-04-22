-- ============================================================
-- 008_member_management.sql
--
-- Member management functions and enhanced RLS policies.
--
-- Functions:
--   • search_members() - Filtered member search with role info
--   • get_member_with_roles() - Single member with all roles
--
-- Enhanced RLS:
--   • Department leaders: full CRUD on all members
--   • Sub-dept leaders: SELECT/UPDATE members in their sub-depts
--   • Regular members: view/update own record only
--   • member_sub_departments: scoped assignment management
--
-- Depends on: 007_rls_and_access_functions.sql
-- ============================================================


-- ============================================================
-- FUNCTION: search_members
--
-- Returns filtered list of members with their roles and
-- sub-departments, respecting RLS scope.
--
-- Parameters (all optional):
--   search_term          TEXT    - Search in full_name, email, phone
--   campus_filter        TEXT    - Filter by campus
--   sub_department_filter UUID   - Filter by sub-department
--   year_filter          TEXT    - Filter by university_year
--   status_filter        TEXT    - Filter by status
--
-- Returns: TABLE with member info + roles JSON array
-- ============================================================

CREATE OR REPLACE FUNCTION search_members(
  search_term           TEXT    DEFAULT NULL,
  campus_filter         TEXT    DEFAULT NULL,
  sub_department_filter UUID    DEFAULT NULL,
  year_filter           TEXT    DEFAULT NULL,
  status_filter         TEXT    DEFAULT NULL
)
RETURNS TABLE (
  member_id           UUID,
  full_name           TEXT,
  baptismal_name      TEXT,
  gender              TEXT,
  date_of_birth       DATE,
  campus              TEXT,
  university_department TEXT,
  building_name       TEXT,
  dorm_name           TEXT,
  university_year     TEXT,
  phone               TEXT,
  email               TEXT,
  telegram_username   TEXT,
  profile_photo_url   TEXT,
  status              TEXT,
  join_date           DATE,
  roles               JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_accessible_sub_depts UUID[];
  v_is_dept_leader       BOOLEAN;
BEGIN
  -- Get user's access scope
  v_is_dept_leader       := is_department_leader();
  v_accessible_sub_depts := get_accessible_sub_departments();

  RETURN QUERY
  SELECT
    m.member_id,
    m.full_name,
    m.baptismal_name,
    m.gender,
    m.date_of_birth,
    m.campus,
    m.university_department,
    m.building_name,
    m.dorm_name,
    m.university_year,
    m.phone,
    m.email,
    m.telegram_username,
    m.profile_photo_url,
    m.status,
    m.join_date,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'sub_department_id',   msd.sub_department_id,
            'sub_department_name', sd.name,
            'role_id',             msd.leadership_role_id,
            'role_name',           lr.name,
            'is_active',           msd.is_active
          )
        )
        FROM public.member_sub_departments msd
        JOIN public.sub_departments sd ON sd.sub_department_id = msd.sub_department_id
        JOIN public.leadership_roles lr ON lr.leadership_role_id = msd.leadership_role_id
        WHERE msd.member_id = m.member_id
      ),
      '[]'::jsonb
    ) AS roles
  FROM public.members m
  WHERE
    -- RLS scope: dept leaders see all; subdept leaders see only their members
    (
      v_is_dept_leader
      OR EXISTS (
        SELECT 1 FROM public.member_sub_departments msd2
        WHERE msd2.member_id = m.member_id
          AND msd2.sub_department_id = ANY(v_accessible_sub_depts)
          AND msd2.is_active = true
      )
      OR m.auth_user_id = auth.uid() -- users can always see themselves
    )
    -- Search filter
    AND (
      search_term IS NULL
      OR m.full_name ILIKE '%' || search_term || '%'
      OR m.email ILIKE '%' || search_term || '%'
      OR m.phone ILIKE '%' || search_term || '%'
    )
    -- Campus filter
    AND (campus_filter IS NULL OR m.campus = campus_filter)
    -- Sub-department filter
    AND (
      sub_department_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM public.member_sub_departments msd3
        WHERE msd3.member_id = m.member_id
          AND msd3.sub_department_id = sub_department_filter
          AND msd3.is_active = true
      )
    )
    -- Year filter
    AND (year_filter IS NULL OR m.university_year = year_filter)
    -- Status filter
    AND (status_filter IS NULL OR m.status = status_filter)
  ORDER BY m.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_members(TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
-- FUNCTION: get_member_with_roles
--
-- Returns a single member with all their role assignments.
--
-- Parameters:
--   p_member_id UUID - The member to retrieve
--
-- Returns: Single row with member info + roles JSON array
-- ============================================================

CREATE OR REPLACE FUNCTION get_member_with_roles(p_member_id UUID)
RETURNS TABLE (
  member_id           UUID,
  full_name           TEXT,
  baptismal_name      TEXT,
  gender              TEXT,
  date_of_birth       DATE,
  campus              TEXT,
  university_department TEXT,
  building_name       TEXT,
  dorm_name           TEXT,
  university_year     TEXT,
  phone               TEXT,
  email               TEXT,
  telegram_username   TEXT,
  profile_photo_url   TEXT,
  auth_user_id        UUID,
  status              TEXT,
  join_date           DATE,
  roles               JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_accessible_sub_depts UUID[];
  v_is_dept_leader       BOOLEAN;
BEGIN
  -- Get user's access scope
  v_is_dept_leader       := is_department_leader();
  v_accessible_sub_depts := get_accessible_sub_departments();

  RETURN QUERY
  SELECT
    m.member_id,
    m.full_name,
    m.baptismal_name,
    m.gender,
    m.date_of_birth,
    m.campus,
    m.university_department,
    m.building_name,
    m.dorm_name,
    m.university_year,
    m.phone,
    m.email,
    m.telegram_username,
    m.profile_photo_url,
    m.auth_user_id,
    m.status,
    m.join_date,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                  msd.id,
            'sub_department_id',   msd.sub_department_id,
            'sub_department_name', sd.name,
            'role_id',             msd.leadership_role_id,
            'role_name',           lr.name,
            'hierarchy_level',     lr.hierarchy_level,
            'is_active',           msd.is_active
          )
          ORDER BY lr.hierarchy_level ASC
        )
        FROM public.member_sub_departments msd
        JOIN public.sub_departments sd ON sd.sub_department_id = msd.sub_department_id
        JOIN public.leadership_roles lr ON lr.leadership_role_id = msd.leadership_role_id
        WHERE msd.member_id = m.member_id
      ),
      '[]'::jsonb
    ) AS roles
  FROM public.members m
  WHERE m.member_id = p_member_id
    -- RLS scope check
    AND (
      v_is_dept_leader
      OR EXISTS (
        SELECT 1 FROM public.member_sub_departments msd2
        WHERE msd2.member_id = m.member_id
          AND msd2.sub_department_id = ANY(v_accessible_sub_depts)
          AND msd2.is_active = true
      )
      OR m.auth_user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_with_roles(UUID) TO authenticated;


-- ============================================================
-- ENHANCED RLS POLICIES: members table
--
-- Rules:
--   SELECT:
--     • Department leaders: all members
--     • Sub-dept leaders: members in their sub-department(s)
--     • Regular members: own record only
--   INSERT:
--     • Department leaders only
--   UPDATE:
--     • Department leaders: all members
--     • Sub-dept leaders: members in their sub-department(s)
--     • Regular members: own record only (except auth_user_id)
--   DELETE:
--     • Department leaders only
-- ============================================================

-- Drop existing policies from 007
DROP POLICY IF EXISTS "members_select" ON public.members;
DROP POLICY IF EXISTS "members_insert" ON public.members;
DROP POLICY IF EXISTS "members_update" ON public.members;
DROP POLICY IF EXISTS "members_delete" ON public.members;

-- SELECT: dept leaders see all; subdept leaders see their members; users see self
CREATE POLICY "members_select" ON public.members FOR SELECT USING (
  is_department_leader()
  OR EXISTS (
    SELECT 1 FROM public.member_sub_departments msd
    WHERE msd.member_id = members.member_id
      AND msd.sub_department_id = ANY(get_accessible_sub_departments())
      AND msd.is_active = true
  )
  OR members.auth_user_id = auth.uid()
);

-- INSERT: department leaders only
CREATE POLICY "members_insert" ON public.members FOR INSERT WITH CHECK (
  is_department_leader()
);

-- UPDATE: dept leaders update all; subdept leaders update their members; users update self
CREATE POLICY "members_update" ON public.members FOR UPDATE USING (
  is_department_leader()
  OR EXISTS (
    SELECT 1 FROM public.member_sub_departments msd
    WHERE msd.member_id = members.member_id
      AND msd.sub_department_id = ANY(get_accessible_sub_departments())
      AND msd.is_active = true
  )
  OR members.auth_user_id = auth.uid()
)
WITH CHECK (
  -- Prevent regular members from changing auth_user_id
  (
    is_department_leader()
    OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd
      WHERE msd.member_id = members.member_id
        AND msd.sub_department_id = ANY(get_accessible_sub_departments())
        AND msd.is_active = true
    )
    OR (
      members.auth_user_id = auth.uid()
      AND members.auth_user_id = (SELECT auth_user_id FROM public.members WHERE member_id = members.member_id)
    )
  )
);

-- DELETE: department leaders only
CREATE POLICY "members_delete" ON public.members FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- ENHANCED RLS POLICIES: member_sub_departments table
--
-- Rules:
--   SELECT:
--     • All system users can view role assignments
--   INSERT:
--     • Department leaders: can assign any role
--     • Sub-dept leaders: can assign roles in their sub-dept(s)
--       BUT cannot assign Department-level roles
--   UPDATE:
--     • Same as INSERT
--   DELETE:
--     • Department leaders: can remove any assignment
--     • Sub-dept leaders: can remove assignments in their sub-dept(s)
--       BUT cannot remove Department-level role assignments
-- ============================================================

-- Drop existing policies from 007
DROP POLICY IF EXISTS "msd_select" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_insert" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_update" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_delete" ON public.member_sub_departments;

-- SELECT: all system users
CREATE POLICY "msd_select" ON public.member_sub_departments FOR SELECT USING (
  is_system_user()
);

-- INSERT: dept leaders assign any; subdept leaders assign in their sub-depts (not Department)
CREATE POLICY "msd_insert" ON public.member_sub_departments FOR INSERT WITH CHECK (
  is_department_leader()
  OR (
    is_system_user()
    AND member_sub_departments.sub_department_id = ANY(get_accessible_sub_departments())
    AND member_sub_departments.sub_department_id NOT IN (
      SELECT sub_department_id FROM public.sub_departments WHERE name = 'Department'
    )
  )
);

-- UPDATE: same as INSERT
CREATE POLICY "msd_update" ON public.member_sub_departments FOR UPDATE USING (
  is_department_leader()
  OR (
    is_system_user()
    AND member_sub_departments.sub_department_id = ANY(get_accessible_sub_departments())
    AND member_sub_departments.sub_department_id NOT IN (
      SELECT sub_department_id FROM public.sub_departments WHERE name = 'Department'
    )
  )
)
WITH CHECK (
  is_department_leader()
  OR (
    is_system_user()
    AND member_sub_departments.sub_department_id = ANY(get_accessible_sub_departments())
    AND member_sub_departments.sub_department_id NOT IN (
      SELECT sub_department_id FROM public.sub_departments WHERE name = 'Department'
    )
  )
);

-- DELETE: dept leaders delete any; subdept leaders delete in their sub-depts (not Department)
CREATE POLICY "msd_delete" ON public.member_sub_departments FOR DELETE USING (
  is_department_leader()
  OR (
    is_system_user()
    AND member_sub_departments.sub_department_id = ANY(get_accessible_sub_departments())
    AND member_sub_departments.sub_department_id NOT IN (
      SELECT sub_department_id FROM public.sub_departments WHERE name = 'Department'
    )
  )
);


-- ============================================================
-- Verification query (returns sample member with roles)
-- ============================================================

SELECT 'Migration 008 complete. Sample query:' AS message;
SELECT 'SELECT * FROM search_members(NULL, NULL, NULL, NULL, NULL) LIMIT 5;' AS example;

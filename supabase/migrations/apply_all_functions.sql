-- ============================================================
-- apply_all_functions.sql
--
-- Consolidated script — run this in the Supabase SQL Editor.
-- Applies all missing functions and RLS policies using the
-- LIVE schema column names:
--   members.id (PK)
--   member_sub_departments.role_id (FK to leadership_roles.id)
--   leadership_roles.id (PK)
--   sub_departments.id (PK)
-- ============================================================


-- ============================================================
-- 1. check_leadership_access  (login gate)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_leadership_access(auth_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role           TEXT;
  v_sub_department TEXT;
BEGIN
  SELECT lr.name, sd.name
  INTO   v_role, v_sub_department
  FROM   public.members m
  JOIN   public.member_sub_departments msd ON msd.member_id = m.id
  JOIN   public.leadership_roles lr        ON lr.id = msd.role_id
  JOIN   public.sub_departments sd         ON sd.id = msd.sub_department_id
  WHERE  m.auth_user_id = check_leadership_access.auth_user_id
    AND  msd.is_active  = true
    AND  lr.name       <> 'Member'
  ORDER BY lr.hierarchy_level ASC
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN json_build_object('has_access', false, 'role', NULL, 'sub_department', NULL);
  END IF;

  RETURN json_build_object('has_access', true, 'role', v_role, 'sub_department', v_sub_department);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_leadership_access(UUID) TO authenticated;


-- ============================================================
-- 2. is_system_user  (RLS helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_system_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   public.members m
    JOIN   public.member_sub_departments msd ON msd.member_id = m.id
    JOIN   public.leadership_roles lr        ON lr.id = msd.role_id
    WHERE  m.auth_user_id = auth.uid()
      AND  msd.is_active  = true
      AND  lr.name       <> 'Member'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_system_user() TO authenticated;


-- ============================================================
-- 3. is_department_leader  (RLS helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_department_leader()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   public.members m
    JOIN   public.member_sub_departments msd ON msd.member_id = m.id
    JOIN   public.sub_departments sd         ON sd.id = msd.sub_department_id
    JOIN   public.leadership_roles lr        ON lr.id = msd.role_id
    WHERE  m.auth_user_id = auth.uid()
      AND  msd.is_active  = true
      AND  lr.name       <> 'Member'
      AND  sd.name        = 'Department'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_department_leader() TO authenticated;


-- ============================================================
-- 4. get_accessible_sub_departments  (RLS helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_accessible_sub_departments()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result UUID[];
BEGIN
  IF public.is_department_leader() THEN
    SELECT ARRAY_AGG(id) INTO v_result
    FROM   public.sub_departments
    WHERE  name <> 'Department';
    RETURN COALESCE(v_result, ARRAY[]::UUID[]);
  END IF;

  IF public.is_system_user() THEN
    SELECT ARRAY_AGG(DISTINCT msd.sub_department_id) INTO v_result
    FROM   public.members m
    JOIN   public.member_sub_departments msd ON msd.member_id = m.id
    JOIN   public.leadership_roles lr        ON lr.id = msd.role_id
    WHERE  m.auth_user_id = auth.uid()
      AND  msd.is_active  = true
      AND  lr.name       <> 'Member';
    RETURN COALESCE(v_result, ARRAY[]::UUID[]);
  END IF;

  RETURN ARRAY[]::UUID[];
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_sub_departments() TO authenticated;


-- ============================================================
-- 5. get_user_access_scope  (used by app for role info)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_access_scope()
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
  SELECT lr.name, sd.name
  INTO   v_role, v_sub_department
  FROM   public.members m
  JOIN   public.member_sub_departments msd ON msd.member_id = m.id
  JOIN   public.leadership_roles lr        ON lr.id = msd.role_id
  JOIN   public.sub_departments sd         ON sd.id = msd.sub_department_id
  WHERE  m.auth_user_id = auth.uid()
    AND  msd.is_active  = true
    AND  lr.name       <> 'Member'
  ORDER BY lr.hierarchy_level ASC
  LIMIT 1;

  IF v_role IS NULL THEN RETURN NULL; END IF;

  SELECT ARRAY_AGG(DISTINCT msd2.sub_department_id) INTO v_led_sub_depts
  FROM   public.members m2
  JOIN   public.member_sub_departments msd2 ON msd2.member_id = m2.id
  JOIN   public.leadership_roles lr2        ON lr2.id = msd2.role_id
  WHERE  m2.auth_user_id = auth.uid()
    AND  msd2.is_active  = true
    AND  lr2.name       <> 'Member';

  RETURN json_build_object(
    'is_department_leader', v_sub_department = 'Department',
    'role',                 v_role,
    'sub_department',       v_sub_department,
    'led_sub_departments',  COALESCE(v_led_sub_depts, ARRAY[]::UUID[])
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_access_scope() TO authenticated;


-- ============================================================
-- 6. search_members  (member list page)
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_members(
  search_term           TEXT    DEFAULT NULL,
  campus_filter         TEXT    DEFAULT NULL,
  sub_department_filter UUID    DEFAULT NULL,
  year_filter           TEXT    DEFAULT NULL,
  status_filter         TEXT    DEFAULT NULL
)
RETURNS TABLE (
  member_id             UUID,
  full_name             TEXT,
  baptismal_name        TEXT,
  gender                TEXT,
  date_of_birth         DATE,
  campus                TEXT,
  university_department TEXT,
  building_name         TEXT,
  dorm_name             TEXT,
  university_year       TEXT,
  phone                 TEXT,
  email                 TEXT,
  telegram_username     TEXT,
  profile_photo_url     TEXT,
  status                TEXT,
  join_date             DATE,
  roles                 JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
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
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  msd.id,
        'sub_department_id',   msd.sub_department_id,
        'sub_department_name', sd.name,
        'role_id',             msd.role_id,
        'role_name',           lr.name,
        'hierarchy_level',     lr.hierarchy_level,
        'is_active',           msd.is_active
      ) ORDER BY lr.hierarchy_level)
      FROM   public.member_sub_departments msd
      JOIN   public.sub_departments sd ON sd.id = msd.sub_department_id
      JOIN   public.leadership_roles lr ON lr.id = msd.role_id
      WHERE  msd.member_id = m.id
    ), '[]'::jsonb) AS roles
  FROM public.members m
  WHERE
    (search_term IS NULL
      OR m.full_name ILIKE '%' || search_term || '%'
      OR m.email     ILIKE '%' || search_term || '%'
      OR m.phone     ILIKE '%' || search_term || '%')
    AND (campus_filter         IS NULL OR m.campus          = campus_filter)
    AND (year_filter           IS NULL OR m.university_year = year_filter)
    AND (status_filter         IS NULL OR m.status          = status_filter)
    AND (sub_department_filter IS NULL OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd2
      WHERE  msd2.member_id = m.id
        AND  msd2.sub_department_id = sub_department_filter
        AND  msd2.is_active = true
    ))
  ORDER BY m.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_members(TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
-- 7. get_member_with_roles  (member detail / role assignment)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_member_with_roles(p_member_id UUID)
RETURNS TABLE (
  member_id             UUID,
  full_name             TEXT,
  baptismal_name        TEXT,
  gender                TEXT,
  date_of_birth         DATE,
  campus                TEXT,
  university_department TEXT,
  building_name         TEXT,
  dorm_name             TEXT,
  university_year       TEXT,
  phone                 TEXT,
  email                 TEXT,
  telegram_username     TEXT,
  profile_photo_url     TEXT,
  auth_user_id          UUID,
  status                TEXT,
  join_date             DATE,
  roles                 JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
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
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  msd.id,
        'sub_department_id',   msd.sub_department_id,
        'sub_department_name', sd.name,
        'role_id',             msd.role_id,
        'role_name',           lr.name,
        'hierarchy_level',     lr.hierarchy_level,
        'is_active',           msd.is_active
      ) ORDER BY lr.hierarchy_level)
      FROM   public.member_sub_departments msd
      JOIN   public.sub_departments sd ON sd.id = msd.sub_department_id
      JOIN   public.leadership_roles lr ON lr.id = msd.role_id
      WHERE  msd.member_id = m.id
    ), '[]'::jsonb) AS roles
  FROM public.members m
  WHERE m.id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_with_roles(UUID) TO authenticated;


-- ============================================================
-- 8. RLS policies — using correct column names
-- ============================================================

-- members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_select" ON public.members;
DROP POLICY IF EXISTS "members_insert" ON public.members;
DROP POLICY IF EXISTS "members_update" ON public.members;
DROP POLICY IF EXISTS "members_delete" ON public.members;

CREATE POLICY "members_select" ON public.members FOR SELECT USING (
  public.is_system_user() AND (
    public.is_department_leader()
    OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd
      WHERE  msd.member_id = members.id
        AND  msd.sub_department_id = ANY(public.get_accessible_sub_departments())
        AND  msd.is_active = true
    )
    OR members.auth_user_id = auth.uid()
  )
);
CREATE POLICY "members_insert" ON public.members FOR INSERT WITH CHECK (public.is_system_user());
CREATE POLICY "members_update" ON public.members FOR UPDATE USING (
  public.is_system_user() AND (
    public.is_department_leader()
    OR EXISTS (
      SELECT 1 FROM public.member_sub_departments msd
      WHERE  msd.member_id = members.id
        AND  msd.sub_department_id = ANY(public.get_accessible_sub_departments())
        AND  msd.is_active = true
    )
    OR members.auth_user_id = auth.uid()
  )
);
CREATE POLICY "members_delete" ON public.members FOR DELETE USING (public.is_department_leader());

-- member_sub_departments
ALTER TABLE public.member_sub_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msd_select" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_insert" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_update" ON public.member_sub_departments;
DROP POLICY IF EXISTS "msd_delete" ON public.member_sub_departments;

CREATE POLICY "msd_select" ON public.member_sub_departments FOR SELECT USING (public.is_system_user());
CREATE POLICY "msd_insert" ON public.member_sub_departments FOR INSERT WITH CHECK (public.is_department_leader());
CREATE POLICY "msd_update" ON public.member_sub_departments FOR UPDATE USING (public.is_department_leader());
CREATE POLICY "msd_delete" ON public.member_sub_departments FOR DELETE USING (public.is_department_leader());

-- sub_departments
ALTER TABLE public.sub_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subdepts_select" ON public.sub_departments;
DROP POLICY IF EXISTS "subdepts_write"  ON public.sub_departments;
CREATE POLICY "subdepts_select" ON public.sub_departments FOR SELECT USING (public.is_system_user());
CREATE POLICY "subdepts_write"  ON public.sub_departments FOR ALL    USING (public.is_department_leader());

-- leadership_roles
ALTER TABLE public.leadership_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leadership_roles_select" ON public.leadership_roles;
DROP POLICY IF EXISTS "leadership_roles_write"  ON public.leadership_roles;
CREATE POLICY "leadership_roles_select" ON public.leadership_roles FOR SELECT USING (public.is_system_user());
CREATE POLICY "leadership_roles_write"  ON public.leadership_roles FOR ALL    USING (public.is_department_leader());

-- children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "children_select" ON public.children;
DROP POLICY IF EXISTS "children_insert" ON public.children;
DROP POLICY IF EXISTS "children_update" ON public.children;
DROP POLICY IF EXISTS "children_delete" ON public.children;
CREATE POLICY "children_select" ON public.children FOR SELECT USING (public.is_system_user());
CREATE POLICY "children_insert" ON public.children FOR INSERT WITH CHECK (public.is_system_user());
CREATE POLICY "children_update" ON public.children FOR UPDATE USING (public.is_system_user());
CREATE POLICY "children_delete" ON public.children FOR DELETE USING (public.is_department_leader());

-- families
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "families_select" ON public.families;
DROP POLICY IF EXISTS "families_insert" ON public.families;
DROP POLICY IF EXISTS "families_update" ON public.families;
DROP POLICY IF EXISTS "families_delete" ON public.families;
CREATE POLICY "families_select" ON public.families FOR SELECT USING (public.is_system_user());
CREATE POLICY "families_insert" ON public.families FOR INSERT WITH CHECK (public.is_system_user());
CREATE POLICY "families_update" ON public.families FOR UPDATE USING (public.is_system_user());
CREATE POLICY "families_delete" ON public.families FOR DELETE USING (public.is_department_leader());

-- child_parents
ALTER TABLE public.child_parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_parents_select" ON public.child_parents;
DROP POLICY IF EXISTS "child_parents_insert" ON public.child_parents;
DROP POLICY IF EXISTS "child_parents_update" ON public.child_parents;
DROP POLICY IF EXISTS "child_parents_delete" ON public.child_parents;
CREATE POLICY "child_parents_select" ON public.child_parents FOR SELECT USING (public.is_system_user());
CREATE POLICY "child_parents_insert" ON public.child_parents FOR INSERT WITH CHECK (public.is_system_user());
CREATE POLICY "child_parents_update" ON public.child_parents FOR UPDATE USING (public.is_system_user());
CREATE POLICY "child_parents_delete" ON public.child_parents FOR DELETE USING (public.is_department_leader());

-- kutr_levels (lookup — readable by all system users)
ALTER TABLE public.kutr_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kutr_levels_select" ON public.kutr_levels;
CREATE POLICY "kutr_levels_select" ON public.kutr_levels FOR SELECT USING (public.is_system_user());

-- confession_fathers (lookup — readable by all system users)
ALTER TABLE public.confession_fathers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "confession_fathers_select" ON public.confession_fathers;
CREATE POLICY "confession_fathers_select" ON public.confession_fathers FOR SELECT USING (public.is_system_user());


-- ============================================================
-- 9. get_kutr_levels  (children registration dropdown)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_kutr_levels()
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  min_age     INTEGER,
  max_age     INTEGER,
  description TEXT,
  color       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT kl.id, kl.name, kl.min_age, kl.max_age, kl.description, kl.color
  FROM   public.kutr_levels kl
  ORDER BY kl.min_age;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kutr_levels() TO authenticated;


-- ============================================================
-- 10. get_confession_fathers  (children registration dropdown)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_confession_fathers(p_status TEXT DEFAULT 'active')
RETURNS TABLE (
  id        UUID,
  full_name TEXT,
  title     TEXT,
  phone     TEXT,
  church    TEXT,
  status    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cf.id, cf.full_name, cf.title, cf.phone, cf.church, cf.status
  FROM   public.confession_fathers cf
  WHERE  (p_status IS NULL OR cf.status = p_status)
  ORDER BY cf.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_confession_fathers(TEXT) TO authenticated;


-- ============================================================
-- 11. handle_new_user upsert guard (prevents duplicate members)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (email, full_name, auth_user_id)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  )
  ON CONFLICT (email)
  DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  WHERE public.members.auth_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

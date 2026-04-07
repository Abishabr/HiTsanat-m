-- ============================================================
-- 003_normalized_leader_schema.sql
-- Full normalized schema for leader-only access system
-- Adds: ENUMs, system_users, departments, sub_departments,
--       normalized members/children, parents, programs,
--       program_assignments, attendance, storage bucket,
--       indexes, and RLS policies.
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'DepartmentChairperson',
    'DepartmentSecretary',
    'SubDeptChairperson',
    'SubDeptSecretary'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male', 'Female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kutr_level_type AS ENUM ('Kutr1', 'Kutr2', 'Kutr3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Present', 'Absent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- A. DEPARTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  department_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text UNIQUE NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- B. SUB_DEPARTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS sub_departments (
  sub_department_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id       uuid NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  name                text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

-- ============================================================
-- C. NORMALIZED MEMBERS TABLE
-- Replaces flat columns; keeps backward-compat id column
-- ============================================================

CREATE TABLE IF NOT EXISTS normalized_members (
  member_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          text NOT NULL,
  father_name         text NOT NULL,
  grandfather_name    text NOT NULL,
  christian_name      text,
  gender              gender_type NOT NULL,
  phone_number        text NOT NULL,
  email               text,
  telegram_username   text,
  profile_photo_url   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- D. MEMBER_SUB_DEPARTMENTS (join table)
-- ============================================================

CREATE TABLE IF NOT EXISTS member_sub_departments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES normalized_members(member_id) ON DELETE CASCADE,
  sub_department_id   uuid NOT NULL REFERENCES sub_departments(sub_department_id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, sub_department_id)
);

-- ============================================================
-- E. SYSTEM_USERS (authenticated leaders only)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_users (
  user_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid UNIQUE NOT NULL,   -- references auth.users(id)
  member_id           uuid REFERENCES normalized_members(member_id) ON DELETE SET NULL,
  role                user_role NOT NULL,
  sub_department_id   uuid REFERENCES sub_departments(sub_department_id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- F. NORMALIZED CHILDREN TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS normalized_children (
  child_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          text NOT NULL,
  father_name         text NOT NULL,
  grandfather_name    text NOT NULL,
  gender              gender_type NOT NULL,
  village             text,
  kutr_level          kutr_level_type NOT NULL,
  photo_url           text,
  registered_by       uuid REFERENCES system_users(user_id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- G. PARENTS (1-to-1 with child, father + mother)
-- ============================================================

CREATE TABLE IF NOT EXISTS parents (
  parent_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid NOT NULL REFERENCES normalized_children(child_id) ON DELETE CASCADE,
  father_full_name    text NOT NULL,
  father_phone        text,
  mother_full_name    text NOT NULL,
  mother_phone        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id)   -- one parents record per child
);

-- ============================================================
-- H. PROGRAMS (weekly schedule)
-- ============================================================

CREATE TABLE IF NOT EXISTS programs (
  program_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  sub_department_id   uuid NOT NULL REFERENCES sub_departments(sub_department_id) ON DELETE CASCADE,
  day_of_week         text NOT NULL CHECK (day_of_week IN ('Saturday', 'Sunday')),
  start_time          time NOT NULL,
  end_time            time NOT NULL,
  created_by          uuid REFERENCES system_users(user_id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- I. PROGRAM_ASSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS program_assignments (
  assignment_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          uuid NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES normalized_members(member_id) ON DELETE CASCADE,
  role_in_program     text NOT NULL,
  assigned_by         uuid REFERENCES system_users(user_id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, member_id)
);

-- ============================================================
-- J. ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS normalized_attendance (
  attendance_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid NOT NULL REFERENCES normalized_children(child_id) ON DELETE CASCADE,
  program_id          uuid NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  date                date NOT NULL,
  status              attendance_status NOT NULL,
  recorded_by         uuid REFERENCES system_users(user_id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, program_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_system_users_auth_user_id
  ON system_users (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_system_users_member_id
  ON system_users (member_id);

CREATE INDEX IF NOT EXISTS idx_system_users_sub_department_id
  ON system_users (sub_department_id);

CREATE INDEX IF NOT EXISTS idx_member_sub_departments_member_id
  ON member_sub_departments (member_id);

CREATE INDEX IF NOT EXISTS idx_member_sub_departments_sub_department_id
  ON member_sub_departments (sub_department_id);

CREATE INDEX IF NOT EXISTS idx_normalized_children_kutr_level
  ON normalized_children (kutr_level);

CREATE INDEX IF NOT EXISTS idx_normalized_children_registered_by
  ON normalized_children (registered_by);

CREATE INDEX IF NOT EXISTS idx_parents_child_id
  ON parents (child_id);

CREATE INDEX IF NOT EXISTS idx_programs_sub_department_id
  ON programs (sub_department_id);

CREATE INDEX IF NOT EXISTS idx_program_assignments_program_id
  ON program_assignments (program_id);

CREATE INDEX IF NOT EXISTS idx_program_assignments_member_id
  ON program_assignments (member_id);

CREATE INDEX IF NOT EXISTS idx_normalized_attendance_child_id
  ON normalized_attendance (child_id);

CREATE INDEX IF NOT EXISTS idx_normalized_attendance_program_id
  ON normalized_attendance (program_id);

CREATE INDEX IF NOT EXISTS idx_normalized_attendance_date
  ON normalized_attendance (date);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_departments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_sub_departments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_children     ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_attendance   ENABLE ROW LEVEL SECURITY;

-- ── Helper: resolve current user's system_users row ───────────────────────
-- Used in policies to avoid repeated subqueries.

CREATE OR REPLACE FUNCTION current_system_user()
RETURNS system_users
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM system_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── Helper: is current user a department-level leader? ────────────────────

CREATE OR REPLACE FUNCTION is_dept_leader()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM system_users
    WHERE auth_user_id = auth.uid()
      AND role IN ('DepartmentChairperson', 'DepartmentSecretary')
  );
$$;

-- ── Helper: is current user a subdept-level leader? ───────────────────────

CREATE OR REPLACE FUNCTION is_subdept_leader()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM system_users
    WHERE auth_user_id = auth.uid()
      AND role IN ('SubDeptChairperson', 'SubDeptSecretary')
  );
$$;

-- ── Helper: current user's sub_department_id ──────────────────────────────

CREATE OR REPLACE FUNCTION my_sub_department_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT sub_department_id FROM system_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- POLICIES: system_users
-- Users can only read their own record.
-- Department leaders can read all.
-- ============================================================

CREATE POLICY "system_users_self_select" ON system_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "system_users_dept_leader_select" ON system_users
  FOR SELECT
  USING (is_dept_leader());

CREATE POLICY "system_users_dept_leader_all" ON system_users
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

-- ============================================================
-- POLICIES: departments
-- All authenticated leaders can read.
-- Only department leaders can write.
-- ============================================================

CREATE POLICY "departments_authenticated_select" ON departments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "departments_dept_leader_write" ON departments
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

-- ============================================================
-- POLICIES: sub_departments
-- All authenticated leaders can read.
-- Only department leaders can write.
-- ============================================================

CREATE POLICY "sub_departments_authenticated_select" ON sub_departments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sub_departments_dept_leader_write" ON sub_departments
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

-- ============================================================
-- POLICIES: normalized_members
-- Department leaders: full access.
-- Subdept leaders: read members in their sub-department only.
-- ============================================================

CREATE POLICY "normalized_members_dept_leader_all" ON normalized_members
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "normalized_members_subdept_select" ON normalized_members
  FOR SELECT
  USING (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM member_sub_departments msd
      WHERE msd.member_id = normalized_members.member_id
        AND msd.sub_department_id = my_sub_department_id()
    )
  );

-- ============================================================
-- POLICIES: member_sub_departments
-- Department leaders: full access.
-- Subdept leaders: read their own sub-department assignments.
-- ============================================================

CREATE POLICY "member_sub_departments_dept_leader_all" ON member_sub_departments
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "member_sub_departments_subdept_select" ON member_sub_departments
  FOR SELECT
  USING (
    is_subdept_leader()
    AND sub_department_id = my_sub_department_id()
  );

CREATE POLICY "member_sub_departments_subdept_write" ON member_sub_departments
  FOR INSERT
  WITH CHECK (
    is_subdept_leader()
    AND sub_department_id = my_sub_department_id()
  );

-- ============================================================
-- POLICIES: normalized_children
-- Department leaders: full access.
-- Subdept leaders: read all children (attendance is cross-dept).
-- ============================================================

CREATE POLICY "normalized_children_dept_leader_all" ON normalized_children
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "normalized_children_subdept_select" ON normalized_children
  FOR SELECT
  USING (is_subdept_leader());

CREATE POLICY "normalized_children_subdept_insert" ON normalized_children
  FOR INSERT
  WITH CHECK (is_subdept_leader());

-- ============================================================
-- POLICIES: parents
-- Department leaders: full access.
-- Subdept leaders: read only.
-- ============================================================

CREATE POLICY "parents_dept_leader_all" ON parents
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "parents_subdept_select" ON parents
  FOR SELECT
  USING (is_subdept_leader());

-- ============================================================
-- POLICIES: programs
-- Department leaders: full access.
-- Subdept leaders: read all; write only their own sub-department.
-- ============================================================

CREATE POLICY "programs_dept_leader_all" ON programs
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "programs_subdept_select" ON programs
  FOR SELECT
  USING (is_subdept_leader());

CREATE POLICY "programs_subdept_insert" ON programs
  FOR INSERT
  WITH CHECK (
    is_subdept_leader()
    AND sub_department_id = my_sub_department_id()
  );

CREATE POLICY "programs_subdept_update" ON programs
  FOR UPDATE
  USING (
    is_subdept_leader()
    AND sub_department_id = my_sub_department_id()
  );

-- ============================================================
-- POLICIES: program_assignments
-- Department leaders: full access.
-- Subdept leaders: manage assignments within their sub-department.
-- ============================================================

CREATE POLICY "program_assignments_dept_leader_all" ON program_assignments
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "program_assignments_subdept_select" ON program_assignments
  FOR SELECT
  USING (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = program_assignments.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

CREATE POLICY "program_assignments_subdept_write" ON program_assignments
  FOR INSERT
  WITH CHECK (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = program_assignments.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

CREATE POLICY "program_assignments_subdept_update" ON program_assignments
  FOR UPDATE
  USING (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = program_assignments.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

-- ============================================================
-- POLICIES: normalized_attendance
-- Department leaders: full access.
-- Subdept leaders: read/write attendance for their programs.
-- ============================================================

CREATE POLICY "normalized_attendance_dept_leader_all" ON normalized_attendance
  FOR ALL
  USING (is_dept_leader())
  WITH CHECK (is_dept_leader());

CREATE POLICY "normalized_attendance_subdept_select" ON normalized_attendance
  FOR SELECT
  USING (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = normalized_attendance.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

CREATE POLICY "normalized_attendance_subdept_insert" ON normalized_attendance
  FOR INSERT
  WITH CHECK (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = normalized_attendance.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

CREATE POLICY "normalized_attendance_subdept_update" ON normalized_attendance
  FOR UPDATE
  USING (
    is_subdept_leader()
    AND EXISTS (
      SELECT 1 FROM programs p
      WHERE p.program_id = normalized_attendance.program_id
        AND p.sub_department_id = my_sub_department_id()
    )
  );

-- ============================================================
-- STORAGE BUCKET: profile-images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated leaders can upload
CREATE POLICY "profile_images_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid() IS NOT NULL
  );

-- Authenticated leaders can read
CREATE POLICY "profile_images_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'profile-images'
    AND auth.uid() IS NOT NULL
  );

-- Only department leaders can delete
CREATE POLICY "profile_images_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND is_dept_leader()
  );

-- ============================================================
-- EXAMPLE QUERIES
-- ============================================================

-- Insert a department
-- INSERT INTO departments (name) VALUES ('Hitsanat KFL');

-- Insert a sub-department
-- INSERT INTO sub_departments (department_id, name)
-- VALUES ('<dept_uuid>', 'Kuttr');

-- Insert a member
-- INSERT INTO normalized_members
--   (first_name, father_name, grandfather_name, gender, phone_number)
-- VALUES ('Kidist', 'Tesfaye', 'Bekele', 'Female', '+251911000001');

-- Link member to sub-department
-- INSERT INTO member_sub_departments (member_id, sub_department_id)
-- VALUES ('<member_uuid>', '<subdept_uuid>');

-- Create a system user (after Supabase Auth signup)
-- INSERT INTO system_users (auth_user_id, member_id, role, sub_department_id)
-- VALUES (auth.uid(), '<member_uuid>', 'SubDeptChairperson', '<subdept_uuid>');

-- Register a child
-- INSERT INTO normalized_children
--   (first_name, father_name, grandfather_name, gender, kutr_level, registered_by)
-- VALUES ('Liya', 'Mulugeta', 'Haile', 'Female', 'Kutr1', '<system_user_uuid>');

-- Record attendance
-- INSERT INTO normalized_attendance (child_id, program_id, date, status, recorded_by)
-- VALUES ('<child_uuid>', '<program_uuid>', '2025-04-05', 'Present', '<system_user_uuid>');

-- Attendance report for a sub-department's program
-- SELECT
--   nc.first_name || ' ' || nc.father_name AS child_name,
--   nc.kutr_level,
--   na.date,
--   na.status
-- FROM normalized_attendance na
-- JOIN normalized_children nc ON nc.child_id = na.child_id
-- JOIN programs p ON p.program_id = na.program_id
-- WHERE p.sub_department_id = '<subdept_uuid>'
-- ORDER BY na.date DESC, nc.first_name;

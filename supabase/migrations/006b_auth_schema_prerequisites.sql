-- ============================================================
-- 006b_auth_schema_prerequisites.sql
--
-- Adds the tables and columns required by the auth system
-- (006_auth_access_check.sql and 007_rls_and_access_functions.sql)
-- that do not yet exist in the database.
--
-- Safe to run multiple times — all statements use IF NOT EXISTS
-- or ADD COLUMN IF NOT EXISTS.
--
-- Run this BEFORE 006 and 007.
-- ============================================================


-- ============================================================
-- 1. Add auth_user_id to members
--    Your members table uses 'id' as PK (not 'member_id').
--    We add auth_user_id so Supabase Auth users can be linked.
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS member_id    UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS full_name    TEXT GENERATED ALWAYS AS (name) STORED;

-- Index for fast lookup by auth_user_id
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id
  ON public.members(auth_user_id);


-- ============================================================
-- 2. sub_departments table
--    Stores the 6 sub-departments: Department + 5 sub-depts.
--    'Department' represents the top-level department leaders.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sub_departments (
  sub_department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE
);

-- Seed the 6 sub-departments
INSERT INTO public.sub_departments (name) VALUES
  ('Department'),
  ('Timhert'),
  ('Mezmur'),
  ('Kinetibeb'),
  ('Kuttr'),
  ('Ekd')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 3. leadership_roles table
--    Stores qualifying roles with hierarchy_level.
--    Lower hierarchy_level = higher priority.
--    'Member' is the non-qualifying role (excluded from access).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leadership_roles (
  leadership_role_id UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT    NOT NULL UNIQUE,
  hierarchy_level    INTEGER NOT NULL
);

-- Seed the 4 roles
INSERT INTO public.leadership_roles (name, hierarchy_level) VALUES
  ('Chairperson',      1),
  ('Vice Chairperson', 2),
  ('Secretary',        3),
  ('Member',           99)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 4. member_sub_departments junction table
--    Links a member to a sub-department with a leadership role.
--    This is the table the RPC queries to determine access.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_sub_departments (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           UUID    NOT NULL REFERENCES public.members(member_id),
  sub_department_id   UUID    NOT NULL REFERENCES public.sub_departments(sub_department_id),
  leadership_role_id  UUID    NOT NULL REFERENCES public.leadership_roles(leadership_role_id),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, sub_department_id, leadership_role_id)
);

CREATE INDEX IF NOT EXISTS idx_msd_member_id
  ON public.member_sub_departments(member_id);

CREATE INDEX IF NOT EXISTS idx_msd_sub_department_id
  ON public.member_sub_departments(sub_department_id);


-- ============================================================
-- 5. Update 006's check_leadership_access to use members.id
--    as the fallback when member_id column is not yet populated.
--
--    NOTE: The members table uses 'id' as its primary key.
--    The member_sub_departments table references members.member_id
--    (the new UUID column added above). We need to keep them in sync.
--
--    This trigger copies 'id' into 'member_id' on insert so
--    existing rows and new rows both work.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_member_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.member_id IS NULL THEN
    NEW.member_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_id ON public.members;
CREATE TRIGGER trg_sync_member_id
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION sync_member_id();

-- Backfill member_id for existing rows
UPDATE public.members
SET member_id = id
WHERE member_id IS NULL;


-- ============================================================
-- 6. Verify — quick sanity check (returns row counts)
-- ============================================================

SELECT
  'sub_departments'       AS table_name, COUNT(*) AS rows FROM public.sub_departments
UNION ALL
SELECT
  'leadership_roles',                    COUNT(*) FROM public.leadership_roles
UNION ALL
SELECT
  'member_sub_departments',              COUNT(*) FROM public.member_sub_departments;

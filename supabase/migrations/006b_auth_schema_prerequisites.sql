-- ============================================================
-- 006b_auth_schema_prerequisites.sql
--
-- Adds the missing tables and columns required by the auth
-- system (006 and 007 migrations).
--
-- Your actual schema (confirmed):
--   members:               member_id, fullname, auth_user_id, ...
--   sub_departments:       sub_department_id, name, ...
--   member_sub_departments: id, member_id, sub_department_id
--                           (missing: leadership_role_id, is_active)
--
-- Safe to run multiple times — uses IF NOT EXISTS / IF NOT EXISTS.
-- Run this BEFORE 006_auth_access_check.sql and 007.
-- ============================================================


-- ============================================================
-- 1. Create leadership_roles table
--    Stores the 4 roles with hierarchy_level.
--    Lower hierarchy_level = higher priority.
--    'Member' is non-qualifying (excluded from access checks).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leadership_roles (
  leadership_role_id UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT    NOT NULL UNIQUE,
  hierarchy_level    INTEGER NOT NULL
);

INSERT INTO public.leadership_roles (name, hierarchy_level) VALUES
  ('Chairperson',      1),
  ('Vice Chairperson', 2),
  ('Secretary',        3),
  ('Member',           99)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 2. Add missing columns to member_sub_departments
-- ============================================================

ALTER TABLE public.member_sub_departments
  ADD COLUMN IF NOT EXISTS leadership_role_id UUID
    REFERENCES public.leadership_roles(leadership_role_id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_msd_leadership_role_id
  ON public.member_sub_departments(leadership_role_id);


-- ============================================================
-- 3. Ensure sub_departments has a 'Department' row
--    (represents the top-level department leaders)
--    department_id is NOT NULL, so we use the first department.
-- ============================================================

INSERT INTO public.sub_departments (sub_department_id, department_id, name)
SELECT 
  gen_random_uuid(), 
  (SELECT department_id FROM public.departments LIMIT 1),
  'Department'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sub_departments WHERE name = 'Department'
);


-- ============================================================
-- 4. Verify — returns row counts for confirmation
-- ============================================================

SELECT 'leadership_roles'       AS table_name, COUNT(*) AS rows FROM public.leadership_roles
UNION ALL
SELECT 'sub_departments',                       COUNT(*) FROM public.sub_departments
UNION ALL
SELECT 'member_sub_departments',                COUNT(*) FROM public.member_sub_departments;

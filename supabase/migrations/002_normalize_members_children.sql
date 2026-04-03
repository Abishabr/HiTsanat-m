-- ============================================================
-- 002_normalize_members_children.sql
-- Normalize members and children tables to match registration forms
-- ============================================================

-- ============================================================
-- MEMBERS: add all fields collected by MemberRegistrationForm
-- ============================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS given_name            text,
  ADD COLUMN IF NOT EXISTS father_name           text,
  ADD COLUMN IF NOT EXISTS grandfather_name      text,
  ADD COLUMN IF NOT EXISTS spiritual_name        text,
  ADD COLUMN IF NOT EXISTS gender                text CHECK (gender IN ('Male', 'Female')),
  ADD COLUMN IF NOT EXISTS date_of_birth         date,
  ADD COLUMN IF NOT EXISTS campus                text CHECK (campus IN ('Main', 'Gendeje', 'Station')),
  ADD COLUMN IF NOT EXISTS academic_department   text,
  ADD COLUMN IF NOT EXISTS telegram              text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS kehnet_roles          text[] NOT NULL DEFAULT '{}';

-- Back-fill given_name from existing name column so existing rows are not broken
UPDATE members SET given_name = name WHERE given_name IS NULL;

-- ============================================================
-- CHILDREN: add all fields collected by ChildrenRegistrationForm
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS given_name            text,
  ADD COLUMN IF NOT EXISTS father_name           text,
  ADD COLUMN IF NOT EXISTS grandfather_name      text,
  ADD COLUMN IF NOT EXISTS spiritual_name        text,
  ADD COLUMN IF NOT EXISTS gender                text CHECK (gender IN ('Male', 'Female')),
  ADD COLUMN IF NOT EXISTS date_of_birth         date,
  ADD COLUMN IF NOT EXISTS address               text,
  ADD COLUMN IF NOT EXISTS father_full_name      text,
  ADD COLUMN IF NOT EXISTS mother_full_name      text,
  ADD COLUMN IF NOT EXISTS father_phone          text,
  ADD COLUMN IF NOT EXISTS mother_phone          text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Back-fill given_name from existing name column
UPDATE children SET given_name = name WHERE given_name IS NULL;

-- ============================================================
-- 002_normalized_schema.sql
-- Full normalized schema based on UI forms and pages
-- Replaces the flat columns added in 001 with proper tables
-- ============================================================

-- ============================================================
-- FAMILIES (lookup table — replaces text[] families on members)
-- ============================================================

CREATE TABLE IF NOT EXISTS families (
  id          text PRIMARY KEY,           -- e.g. 'f1', 'f2'
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMBERS: normalized columns from MemberRegistrationForm
-- ============================================================

-- Name is kept as a computed/display column; split fields are the source of truth
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS given_name          text,
  ADD COLUMN IF NOT EXISTS father_name         text,
  ADD COLUMN IF NOT EXISTS grandfather_name    text,
  ADD COLUMN IF NOT EXISTS spiritual_name      text,
  ADD COLUMN IF NOT EXISTS gender              text CHECK (gender IN ('Male', 'Female')),
  ADD COLUMN IF NOT EXISTS date_of_birth       date,
  -- Campus & education (step 2)
  ADD COLUMN IF NOT EXISTS campus              text CHECK (campus IN ('Main', 'Gendeje', 'Station')),
  ADD COLUMN IF NOT EXISTS academic_department text,
  -- Contact (step 3)
  ADD COLUMN IF NOT EXISTS telegram            text,
  -- Kehnet (step 5)
  ADD COLUMN IF NOT EXISTS kehnet_roles        text[] NOT NULL DEFAULT '{}';

-- Back-fill given_name from existing name for any pre-existing rows
UPDATE members SET given_name = name WHERE given_name IS NULL;

-- ============================================================
-- MEMBER_EMERGENCY_CONTACTS (step 4 of member form)
-- One member can have multiple emergency contacts
-- ============================================================

CREATE TABLE IF NOT EXISTS member_emergency_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMBER_FAMILIES (junction: member ↔ family)
-- Replaces the text[] families column on members
-- ============================================================

CREATE TABLE IF NOT EXISTS member_families (
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  family_id   text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, family_id)
);

-- ============================================================
-- CHILDREN: normalized columns from ChildrenRegistrationForm
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS given_name       text,
  ADD COLUMN IF NOT EXISTS father_name      text,
  ADD COLUMN IF NOT EXISTS grandfather_name text,
  ADD COLUMN IF NOT EXISTS spiritual_name   text,
  ADD COLUMN IF NOT EXISTS gender           text CHECK (gender IN ('Male', 'Female')),
  ADD COLUMN IF NOT EXISTS date_of_birth    date,
  -- Address (step 2)
  ADD COLUMN IF NOT EXISTS address          text;

-- Back-fill given_name from existing name for any pre-existing rows
UPDATE children SET given_name = name WHERE given_name IS NULL;

-- ============================================================
-- CHILD_PARENTS (step 3 + 4 of children form)
-- Father and mother stored as separate rows with a role column
-- ============================================================

CREATE TABLE IF NOT EXISTS child_parents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('father', 'mother')),
  full_name   text NOT NULL,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, role)   -- one father, one mother per child
);

-- ============================================================
-- CHILD_EMERGENCY_CONTACTS (step 5 of children form)
-- ============================================================

CREATE TABLE IF NOT EXISTS child_emergency_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW-LEVEL SECURITY on new tables
-- ============================================================

ALTER TABLE families                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_emergency_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_families             ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_parents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_emergency_contacts    ENABLE ROW LEVEL SECURITY;

-- ── families ──────────────────────────────────────────────────────────────

CREATE POLICY "families_admin_all" ON families
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "families_read" ON families
  FOR SELECT
  USING (auth.jwt() -> 'user_metadata' ->> 'role' IS NOT NULL);

-- ── member_emergency_contacts ─────────────────────────────────────────────

CREATE POLICY "member_ec_admin_all" ON member_emergency_contacts
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "member_ec_read" ON member_emergency_contacts
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('subdept-leader', 'member')
  );

-- ── member_families ───────────────────────────────────────────────────────

CREATE POLICY "member_families_admin_all" ON member_families
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "member_families_read" ON member_families
  FOR SELECT
  USING (auth.jwt() -> 'user_metadata' ->> 'role' IS NOT NULL);

-- ── child_parents ─────────────────────────────────────────────────────────

CREATE POLICY "child_parents_admin_all" ON child_parents
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "child_parents_subdept_read" ON child_parents
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('subdept-leader', 'member')
  );

-- ── child_emergency_contacts ──────────────────────────────────────────────

CREATE POLICY "child_ec_admin_all" ON child_emergency_contacts
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "child_ec_subdept_read" ON child_emergency_contacts
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('subdept-leader', 'member')
  );

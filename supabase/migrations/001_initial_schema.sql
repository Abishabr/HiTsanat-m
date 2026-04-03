-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for Hitsanat KFL Management System
-- ============================================================

-- ============================================================
-- TABLE DEFINITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      text UNIQUE NOT NULL,
  name            text NOT NULL,
  year_of_study   int NOT NULL,
  phone           text NOT NULL,
  email           text NOT NULL,
  sub_departments text[] NOT NULL DEFAULT '{}',
  families        text[] NOT NULL DEFAULT '{}',
  join_date       date NOT NULL,
  photo           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS children (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  age                 int NOT NULL,
  kutr_level          int NOT NULL CHECK (kutr_level BETWEEN 1 AND 3),
  family_id           text NOT NULL,
  family_name         text NOT NULL,
  guardian_contact    text NOT NULL,
  registration_date   date NOT NULL,
  photo               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date NOT NULL,
  day                 text NOT NULL CHECK (day IN ('Saturday', 'Sunday')),
  kutr_levels         int[] NOT NULL DEFAULT '{}',
  start_time          time NOT NULL,
  end_time            time NOT NULL,
  sub_department_id   text NOT NULL,
  assigned_member_id  uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS day_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  day         text NOT NULL,
  child_id    uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by   text NOT NULL,
  marked_at   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT day_attendance_child_date_unique UNIQUE (child_id, date)
);

CREATE TABLE IF NOT EXISTS child_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('Timker', 'Hosana', 'Meskel', 'Other')),
  date        date NOT NULL,
  description text NOT NULL,
  participants int NOT NULL DEFAULT 0,
  supervisors text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_activities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  sub_department_id text NOT NULL,
  date              date NOT NULL,
  description       text NOT NULL,
  assigned_members  jsonb NOT NULL DEFAULT '[]',
  status            text NOT NULL CHECK (status IN ('planned', 'ongoing', 'completed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timhert_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('Midterm', 'Final', 'Assignment')),
  kutr_level  int NOT NULL CHECK (kutr_level BETWEEN 1 AND 3),
  max_score   int NOT NULL,
  date        date NOT NULL,
  status      text NOT NULL CHECK (status IN ('scheduled', 'completed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date          date NOT NULL,
  day           text NOT NULL,
  present_count int NOT NULL,
  absent_count  int NOT NULL,
  total_count   int NOT NULL,
  submitted_at  timestamptz NOT NULL,
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE children               ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_slots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE timhert_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: role and sub-department from JWT user_metadata
-- ============================================================
-- auth.jwt() -> user_metadata.role
-- auth.jwt() -> user_metadata.subDepartment

-- ============================================================
-- POLICIES: members
-- ============================================================

-- chairperson / vice-chairperson / secretary — full access
CREATE POLICY "members_admin_select" ON members
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "members_admin_insert" ON members
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "members_admin_update" ON members
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "members_admin_delete" ON members
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT only
CREATE POLICY "members_subdept_select" ON members
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- member — SELECT only
CREATE POLICY "members_member_select" ON members
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'member'
  );

-- ============================================================
-- POLICIES: children
-- ============================================================

CREATE POLICY "children_admin_select" ON children
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "children_admin_insert" ON children
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "children_admin_update" ON children
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "children_admin_delete" ON children
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT only
CREATE POLICY "children_subdept_select" ON children
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- member — SELECT only
CREATE POLICY "children_member_select" ON children
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'member'
  );

-- ============================================================
-- POLICIES: program_slots
-- ============================================================

CREATE POLICY "program_slots_admin_select" ON program_slots
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "program_slots_admin_insert" ON program_slots
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "program_slots_admin_update" ON program_slots
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "program_slots_admin_delete" ON program_slots
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT on all; INSERT and UPDATE on own sub-department only
CREATE POLICY "program_slots_subdept_select" ON program_slots
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

CREATE POLICY "program_slots_subdept_insert" ON program_slots
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
    AND sub_department_id = (auth.jwt() -> 'user_metadata' ->> 'subDepartment')
  );

CREATE POLICY "program_slots_subdept_update" ON program_slots
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
    AND sub_department_id = (auth.jwt() -> 'user_metadata' ->> 'subDepartment')
  );

-- member — SELECT only
CREATE POLICY "program_slots_member_select" ON program_slots
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'member'
  );

-- ============================================================
-- POLICIES: day_attendance
-- ============================================================

CREATE POLICY "day_attendance_admin_select" ON day_attendance
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "day_attendance_admin_insert" ON day_attendance
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "day_attendance_admin_update" ON day_attendance
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "day_attendance_admin_delete" ON day_attendance
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT on all; INSERT and UPDATE
CREATE POLICY "day_attendance_subdept_select" ON day_attendance
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

CREATE POLICY "day_attendance_subdept_insert" ON day_attendance
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

CREATE POLICY "day_attendance_subdept_update" ON day_attendance
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- member — SELECT only
CREATE POLICY "day_attendance_member_select" ON day_attendance
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'member'
  );

-- ============================================================
-- POLICIES: child_events
-- ============================================================

CREATE POLICY "child_events_admin_select" ON child_events
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "child_events_admin_insert" ON child_events
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "child_events_admin_update" ON child_events
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "child_events_admin_delete" ON child_events
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT only
CREATE POLICY "child_events_subdept_select" ON child_events
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- ============================================================
-- POLICIES: member_activities
-- ============================================================

CREATE POLICY "member_activities_admin_select" ON member_activities
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "member_activities_admin_insert" ON member_activities
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "member_activities_admin_update" ON member_activities
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "member_activities_admin_delete" ON member_activities
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT only
CREATE POLICY "member_activities_subdept_select" ON member_activities
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- ============================================================
-- POLICIES: timhert_activities
-- ============================================================

CREATE POLICY "timhert_activities_admin_select" ON timhert_activities
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "timhert_activities_admin_insert" ON timhert_activities
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "timhert_activities_admin_update" ON timhert_activities
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "timhert_activities_admin_delete" ON timhert_activities
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — SELECT only
CREATE POLICY "timhert_activities_subdept_select" ON timhert_activities
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- ============================================================
-- POLICIES: attendance_notifications
-- ============================================================

CREATE POLICY "attendance_notifications_admin_select" ON attendance_notifications
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "attendance_notifications_admin_insert" ON attendance_notifications
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "attendance_notifications_admin_update" ON attendance_notifications
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

CREATE POLICY "attendance_notifications_admin_delete" ON attendance_notifications
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );

-- subdept-leader — INSERT (to submit attendance notifications)
CREATE POLICY "attendance_notifications_subdept_insert" ON attendance_notifications
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

-- subdept-leader — SELECT (to see their own submissions)
CREATE POLICY "attendance_notifications_subdept_select" ON attendance_notifications
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'subdept-leader'
  );

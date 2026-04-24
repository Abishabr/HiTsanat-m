-- ============================================================
-- 013_member_activities.sql
--
-- Phase 7: Member Activities Management
--
-- Tracks member-focused programs: Adar Program, Sub-Dept
-- Projects, Training Sessions, Meetings, Community Service.
--
-- Existing tables altered (not recreated):
--   member_activities:            add activity_type, sub_department_id,
--                                 start_time, end_time, location,
--                                 max_participants, updated_at
--   member_activity_assignments:  add notes, attended, check_in_time,
--                                 assigned_by, updated_at
--
-- Functions:
--   get_member_activities()
--   get_activity_participants()
--   assign_member_to_activity()
--   mark_member_activity_attendance()
--   get_member_activity_report()
-- ============================================================


-- ============================================================
-- SECTION 1: ALTER EXISTING TABLES
-- ============================================================

-- member_activities: add missing columns
ALTER TABLE public.member_activities
  ADD COLUMN IF NOT EXISTS activity_type    TEXT
    CHECK (activity_type IN ('adar', 'project', 'training', 'meeting', 'community_service', 'other')),
  ADD COLUMN IF NOT EXISTS sub_department_id UUID REFERENCES public.sub_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_time       TIME,
  ADD COLUMN IF NOT EXISTS end_time         TIME,
  ADD COLUMN IF NOT EXISTS location         TEXT,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER CHECK (max_participants > 0);

-- Drop old status constraint and replace with correct values
ALTER TABLE public.member_activities
  DROP CONSTRAINT IF EXISTS member_activities_status_check;

ALTER TABLE public.member_activities
  ADD CONSTRAINT member_activities_status_check
  CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled'));

-- member_activity_assignments: add missing columns
ALTER TABLE public.member_activity_assignments
  ADD COLUMN IF NOT EXISTS notes         TEXT,
  ADD COLUMN IF NOT EXISTS attended      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by   UUID,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Drop old status constraint and replace
ALTER TABLE public.member_activity_assignments
  DROP CONSTRAINT IF EXISTS member_activity_assignments_status_check;

ALTER TABLE public.member_activity_assignments
  ADD CONSTRAINT member_activity_assignments_status_check
  CHECK (status IN ('assigned', 'confirmed', 'completed', 'absent', 'cancelled'));

-- UNIQUE constraint: one assignment per member per activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'member_activity_assignments'
      AND constraint_name = 'maa_activity_member_unique'
  ) THEN
    ALTER TABLE public.member_activity_assignments
      ADD CONSTRAINT maa_activity_member_unique
      UNIQUE (activity_id, member_id);
  END IF;
END $$;


-- ============================================================
-- SECTION 2: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ma_activity_type     ON public.member_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_ma_sub_department_id ON public.member_activities(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_ma_activity_date     ON public.member_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_ma_status            ON public.member_activities(status);
CREATE INDEX IF NOT EXISTS idx_maa_activity_id      ON public.member_activity_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_maa_member_id        ON public.member_activity_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_maa_status           ON public.member_activity_assignments(status);


-- ============================================================
-- SECTION 3: TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ma_updated_at ON public.member_activities;
CREATE TRIGGER trg_ma_updated_at
  BEFORE UPDATE ON public.member_activities
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_maa_updated_at ON public.member_activity_assignments;
CREATE TRIGGER trg_maa_updated_at
  BEFORE UPDATE ON public.member_activity_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 4: FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: get_member_activities
-- Returns activities with participant counts and sub-dept info.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_member_activities(
  p_activity_type    TEXT DEFAULT NULL,
  p_sub_department_id UUID DEFAULT NULL,
  p_status           TEXT DEFAULT NULL,
  p_search_term      TEXT DEFAULT NULL
)
RETURNS TABLE (
  activity_id         UUID,
  title               TEXT,
  activity_type       TEXT,
  activity_date       DATE,
  start_time          TIME,
  end_time            TIME,
  location            TEXT,
  description         TEXT,
  status              TEXT,
  sub_department_id   UUID,
  sub_department_name TEXT,
  max_participants    INTEGER,
  assigned_count      BIGINT,
  attended_count      BIGINT,
  created_at          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.id                                                       AS activity_id,
    ma.title,
    ma.activity_type,
    ma.activity_date,
    ma.start_time,
    ma.end_time,
    ma.location,
    ma.description,
    ma.status,
    ma.sub_department_id,
    sd.name                                                     AS sub_department_name,
    ma.max_participants,
    COUNT(maa.id)                                               AS assigned_count,
    COUNT(maa.id) FILTER (WHERE maa.attended = true)            AS attended_count,
    ma.created_at
  FROM public.member_activities ma
  LEFT JOIN public.sub_departments sd ON sd.id = ma.sub_department_id
  LEFT JOIN public.member_activity_assignments maa ON maa.activity_id = ma.id
  WHERE
    (p_activity_type     IS NULL OR ma.activity_type = p_activity_type)
    AND (p_sub_department_id IS NULL OR ma.sub_department_id = p_sub_department_id)
    AND (p_status            IS NULL OR ma.status = p_status)
    AND (p_search_term       IS NULL
         OR ma.title ILIKE '%' || p_search_term || '%'
         OR ma.description ILIKE '%' || p_search_term || '%')
  GROUP BY ma.id, ma.title, ma.activity_type, ma.activity_date,
           ma.start_time, ma.end_time, ma.location, ma.description,
           ma.status, ma.sub_department_id, sd.name,
           ma.max_participants, ma.created_at
  ORDER BY ma.activity_date DESC NULLS LAST, ma.title ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_activities(TEXT, UUID, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_activity_participants
-- Returns all members assigned to an activity with their status.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_activity_participants(p_activity_id UUID)
RETURNS TABLE (
  member_id    UUID,
  full_name    TEXT,
  phone        TEXT,
  campus       TEXT,
  role         TEXT,
  status       TEXT,
  attended     BOOLEAN,
  check_in_time TIMESTAMPTZ,
  notes        TEXT,
  assigned_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id            AS member_id,
    m.full_name,
    m.phone,
    m.campus,
    maa.role,
    maa.status,
    maa.attended,
    maa.check_in_time,
    maa.notes,
    maa.created_at  AS assigned_at
  FROM public.member_activity_assignments maa
  JOIN public.members m ON m.id = maa.member_id
  WHERE maa.activity_id = p_activity_id
  ORDER BY maa.attended DESC, m.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_participants(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: assign_member_to_activity
-- Assigns a member to an activity. Upserts on conflict.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION assign_member_to_activity(
  p_activity_id UUID,
  p_member_id   UUID,
  p_role        TEXT DEFAULT 'participant',
  p_notes       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.member_activity_assignments (
    activity_id, member_id, role, status, notes, assigned_by
  ) VALUES (
    p_activity_id, p_member_id, p_role, 'assigned', p_notes, auth.uid()
  )
  ON CONFLICT (activity_id, member_id) DO UPDATE SET
    role        = EXCLUDED.role,
    notes       = COALESCE(EXCLUDED.notes, member_activity_assignments.notes),
    updated_at  = NOW()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_member_to_activity(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: mark_member_activity_attendance
-- Marks a member's attendance for an activity.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_member_activity_attendance(
  p_activity_id UUID,
  p_member_id   UUID,
  p_attended    BOOLEAN,
  p_notes       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.member_activity_assignments (
    activity_id, member_id, role, status, attended, check_in_time, notes, assigned_by
  ) VALUES (
    p_activity_id, p_member_id, 'participant',
    CASE WHEN p_attended THEN 'completed' ELSE 'absent' END,
    p_attended,
    CASE WHEN p_attended THEN NOW() ELSE NULL END,
    p_notes, auth.uid()
  )
  ON CONFLICT (activity_id, member_id) DO UPDATE SET
    attended      = EXCLUDED.attended,
    status        = CASE WHEN EXCLUDED.attended THEN 'completed' ELSE 'absent' END,
    check_in_time = CASE
      WHEN EXCLUDED.attended AND member_activity_assignments.check_in_time IS NULL
        THEN NOW()
      ELSE member_activity_assignments.check_in_time
    END,
    notes         = COALESCE(EXCLUDED.notes, member_activity_assignments.notes),
    updated_at    = NOW()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_member_activity_attendance(UUID, UUID, BOOLEAN, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_member_activity_report
-- Returns a member's full activity participation history.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_member_activity_report(
  p_member_id UUID,
  p_from_date DATE DEFAULT NULL,
  p_to_date   DATE DEFAULT NULL
)
RETURNS TABLE (
  activity_id         UUID,
  title               TEXT,
  activity_type       TEXT,
  activity_date       DATE,
  sub_department_name TEXT,
  role                TEXT,
  status              TEXT,
  attended            BOOLEAN,
  check_in_time       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.id               AS activity_id,
    ma.title,
    ma.activity_type,
    ma.activity_date,
    sd.name             AS sub_department_name,
    maa.role,
    maa.status,
    maa.attended,
    maa.check_in_time
  FROM public.member_activity_assignments maa
  JOIN public.member_activities ma ON ma.id = maa.activity_id
  LEFT JOIN public.sub_departments sd ON sd.id = ma.sub_department_id
  WHERE maa.member_id = p_member_id
    AND (p_from_date IS NULL OR ma.activity_date >= p_from_date)
    AND (p_to_date   IS NULL OR ma.activity_date <= p_to_date)
  ORDER BY ma.activity_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_activity_report(UUID, DATE, DATE) TO authenticated;


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.member_activities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activity_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ma_select" ON public.member_activities;
CREATE POLICY "ma_select" ON public.member_activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ma_insert" ON public.member_activities;
CREATE POLICY "ma_insert" ON public.member_activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ma_update" ON public.member_activities;
CREATE POLICY "ma_update" ON public.member_activities
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ma_delete" ON public.member_activities;
CREATE POLICY "ma_delete" ON public.member_activities
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "maa_select" ON public.member_activity_assignments;
CREATE POLICY "maa_select" ON public.member_activity_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "maa_insert" ON public.member_activity_assignments;
CREATE POLICY "maa_insert" ON public.member_activity_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "maa_update" ON public.member_activity_assignments;
CREATE POLICY "maa_update" ON public.member_activity_assignments
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "maa_delete" ON public.member_activity_assignments;
CREATE POLICY "maa_delete" ON public.member_activity_assignments
  FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- SECTION 6: VERIFICATION
-- ============================================================

SELECT 'Migration 013 complete.' AS message;

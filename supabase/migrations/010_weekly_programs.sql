-- ============================================================
-- 010_weekly_programs.sql
--
-- Phase 4: Weekly Programs Management
--
-- New tables:
--   1. program_types        - Lookup: Lesson, Choir Practice, etc.
--   2. weekly_programs      - Recurring program definitions
--   3. program_sessions     - Individual session instances
--   4. program_assignments  - Member supervision per session
--   5. child_attendance     - Child attendance per session (Kuttr)
--
-- Functions:
--   generate_program_sessions()  - Auto-generate session rows
--   search_weekly_programs()     - Filtered program list
--   get_program_sessions()       - Sessions with stats
--   get_session_attendance()     - Children + attendance for session
--   mark_child_attendance()      - Upsert attendance record
--   assign_member_to_session()   - Upsert member assignment
--
-- View:
--   upcoming_sessions            - Scheduled sessions from today
--
-- Reuses from 007:
--   is_system_user()
--   is_department_leader()
--   get_accessible_sub_departments()
--
-- NOTE: members PK is member_id (UUID), not id.
--       weekly_programs and program_sessions already exist in
--       some Supabase instances — this migration uses
--       CREATE TABLE IF NOT EXISTS and DROP POLICY IF EXISTS
--       to be safe to re-run.
-- ============================================================


-- ============================================================
-- SECTION 1: LOOKUP TABLE — program_types
-- ============================================================

CREATE TABLE IF NOT EXISTS public.program_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT        NOT NULL DEFAULT '📋',
  color       TEXT        NOT NULL DEFAULT '#6b7280',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- program_types: lookup table for program categories

INSERT INTO public.program_types (name, description, icon, color) VALUES
  ('Lesson',            'Teaching and educational sessions',                    '📖', '#3b82f6'),
  ('Choir Practice',    'Music and hymn rehearsal sessions',                    '🎵', '#8b5cf6'),
  ('Arts Workshop',     'Visual arts, crafts and creative activities',          '🎨', '#f59e0b'),
  ('Film Showing',      'Educational or inspirational film screenings',         '🎬', '#ef4444'),
  ('Cultural Activity', 'Ethiopian Orthodox cultural and traditional programs', '🕍', '#10b981'),
  ('Attendance Review', 'Kuttr attendance tracking and review sessions',        '📋', '#06b6d4'),
  ('Planning Meeting',  'Leadership planning and coordination meetings',        '📅', '#64748b'),
  ('General Assembly',  'Full department gatherings and announcements',         '👥', '#f97316')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: weekly_programs
-- Defines a recurring program for a sub-department.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_programs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT        NOT NULL,
  description           TEXT,
  sub_department_id     UUID        REFERENCES public.sub_departments(id) ON DELETE SET NULL,
  program_type_id       UUID        REFERENCES public.program_types(id) ON DELETE SET NULL,
  day_of_week           TEXT        NOT NULL CHECK (day_of_week IN ('Saturday', 'Sunday')),
  start_time            TIME,
  end_time              TIME,
  location              TEXT,
  target_kutr_levels    UUID[],
  is_recurring          BOOLEAN     NOT NULL DEFAULT true,
  recurrence_start_date DATE,
  recurrence_end_date   DATE,
  max_capacity          INTEGER     CHECK (max_capacity > 0),
  status                TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- weekly_programs: recurring program definitions per sub-department

-- ------------------------------------------------------------
-- TABLE: program_sessions
-- Individual instances of a weekly_program.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.program_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID        NOT NULL REFERENCES public.weekly_programs(id) ON DELETE CASCADE,
  session_date DATE       NOT NULL,
  start_time  TIME,
  end_time    TIME,
  topic       TEXT,
  description TEXT,
  location    TEXT,
  status      TEXT        NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_id, session_date)
);

-- program_sessions: individual session instances

-- ------------------------------------------------------------
-- TABLE: program_assignments
-- Which members supervise which sessions.
-- Replaces the old program_assignments table referenced in 007.
-- ------------------------------------------------------------

-- Drop old RLS policies from 007 before altering/recreating
DROP POLICY IF EXISTS "program_assignments_select" ON public.program_assignments;
DROP POLICY IF EXISTS "program_assignments_insert" ON public.program_assignments;
DROP POLICY IF EXISTS "program_assignments_update" ON public.program_assignments;
DROP POLICY IF EXISTS "program_assignments_delete" ON public.program_assignments;

CREATE TABLE IF NOT EXISTS public.program_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  member_id       UUID        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'assistant'
                    CHECK (role IN ('lead', 'co_lead', 'assistant', 'supervisor', 'teacher', 'helper')),
  approval_status TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  attended        BOOLEAN     NOT NULL DEFAULT false,
  check_in_time   TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, member_id)
);

-- program_assignments: member supervision per session

-- ------------------------------------------------------------
-- TABLE: child_attendance
-- Kuttr sub-department tracks child attendance per session.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_attendance (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID        NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  session_id    UUID        NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'absent'
                  CHECK (status IN ('present', 'absent', 'excused', 'late', 'left_early')),
  check_in_time  TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  recorded_by   UUID,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, session_id)
);

-- child_attendance: Kuttr attendance tracking per session


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_wp_sub_department_id  ON public.weekly_programs(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_wp_program_type_id    ON public.weekly_programs(program_type_id);
CREATE INDEX IF NOT EXISTS idx_wp_day_of_week        ON public.weekly_programs(day_of_week);
CREATE INDEX IF NOT EXISTS idx_wp_status             ON public.weekly_programs(status);

CREATE INDEX IF NOT EXISTS idx_ps_program_id         ON public.program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_ps_session_date       ON public.program_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_ps_status             ON public.program_sessions(status);

CREATE INDEX IF NOT EXISTS idx_pa_session_id         ON public.program_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_pa_member_id          ON public.program_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_pa_approval_status    ON public.program_assignments(approval_status);

CREATE INDEX IF NOT EXISTS idx_ca_child_id           ON public.child_attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_ca_session_id         ON public.child_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_ca_status             ON public.child_attendance(status);
CREATE INDEX IF NOT EXISTS idx_ca_recorded_by        ON public.child_attendance(recorded_by);


-- ============================================================
-- SECTION 4: TRIGGERS — auto-update updated_at
-- ============================================================

-- fn_set_updated_at() already created in 009; reuse it.
-- If 009 was not run, create it here as a fallback.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_wp_updated_at ON public.weekly_programs;
CREATE TRIGGER trg_wp_updated_at
  BEFORE UPDATE ON public.weekly_programs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_ps_updated_at ON public.program_sessions;
CREATE TRIGGER trg_ps_updated_at
  BEFORE UPDATE ON public.program_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_ca_updated_at ON public.child_attendance;
CREATE TRIGGER trg_ca_updated_at
  BEFORE UPDATE ON public.child_attendance
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 5: FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: generate_program_sessions
-- Auto-generates session rows for a recurring program between
-- two dates, respecting the program's day_of_week.
-- Skips dates that already have a session (ON CONFLICT DO NOTHING).
-- Returns the count of newly created sessions.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_program_sessions(
  p_program_id UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program       RECORD;
  v_current_date  DATE;
  v_target_dow    INTEGER;  -- 0=Sun, 6=Sat in PostgreSQL EXTRACT
  v_created_count INTEGER := 0;
BEGIN
  -- Load program details
  SELECT * INTO v_program
  FROM public.weekly_programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program % not found', p_program_id;
  END IF;

  -- Map day_of_week text to PostgreSQL DOW integer
  -- EXTRACT(DOW FROM date): 0=Sunday, 6=Saturday
  v_target_dow := CASE v_program.day_of_week
    WHEN 'Sunday'   THEN 0
    WHEN 'Saturday' THEN 6
    ELSE NULL
  END;

  IF v_target_dow IS NULL THEN
    RAISE EXCEPTION 'Invalid day_of_week: %', v_program.day_of_week;
  END IF;

  -- Walk through date range, inserting on matching days
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    IF EXTRACT(DOW FROM v_current_date)::INTEGER = v_target_dow THEN
      INSERT INTO public.program_sessions (
        program_id,
        session_date,
        start_time,
        end_time,
        location,
        status,
        created_by
      )
      VALUES (
        p_program_id,
        v_current_date,
        v_program.start_time,
        v_program.end_time,
        v_program.location,
        'scheduled',
        v_program.created_by
      )
      ON CONFLICT (program_id, session_date) DO NOTHING;

      IF FOUND THEN
        v_created_count := v_created_count + 1;
      END IF;
    END IF;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_created_count;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_program_sessions(UUID, DATE, DATE) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: search_weekly_programs
-- Returns programs with sub-department and type info.
-- Respects RLS: only shows programs in user's accessible sub-depts.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_weekly_programs(
  p_search_term        TEXT DEFAULT NULL,
  p_sub_department_id  UUID DEFAULT NULL,
  p_day_filter         TEXT DEFAULT NULL,
  p_status_filter      TEXT DEFAULT NULL
)
RETURNS TABLE (
  program_id            UUID,
  title                 TEXT,
  description           TEXT,
  day_of_week           TEXT,
  start_time            TIME,
  end_time              TIME,
  location              TEXT,
  status                TEXT,
  is_recurring          BOOLEAN,
  recurrence_start_date DATE,
  recurrence_end_date   DATE,
  max_capacity          INTEGER,
  sub_department_id     UUID,
  sub_department_name   TEXT,
  program_type_id       UUID,
  program_type_name     TEXT,
  program_type_icon     TEXT,
  program_type_color    TEXT,
  session_count         BIGINT,
  next_session_date     DATE,
  created_at            TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_accessible UUID[];
BEGIN
  v_accessible := get_accessible_sub_departments();

  RETURN QUERY
  SELECT
    wp.id                                                     AS program_id,
    wp.title,
    wp.description,
    wp.day_of_week,
    wp.start_time,
    wp.end_time,
    wp.location,
    wp.status,
    wp.is_recurring,
    wp.recurrence_start_date,
    wp.recurrence_end_date,
    wp.max_capacity,
    wp.sub_department_id,
    sd.name                                                   AS sub_department_name,
    wp.program_type_id,
    pt.name                                                   AS program_type_name,
    pt.icon                                                   AS program_type_icon,
    pt.color                                                  AS program_type_color,
    (SELECT COUNT(*) FROM public.program_sessions ps
     WHERE ps.program_id = wp.id)                            AS session_count,
    (SELECT MIN(ps2.session_date)
     FROM public.program_sessions ps2
     WHERE ps2.program_id = wp.id
       AND ps2.session_date >= CURRENT_DATE
       AND ps2.status = 'scheduled')                         AS next_session_date,
    wp.created_at
  FROM public.weekly_programs wp
  LEFT JOIN public.sub_departments sd ON sd.sub_department_id = wp.sub_department_id
  LEFT JOIN public.program_types   pt ON pt.id = wp.program_type_id
  WHERE
    -- RLS scope
    (is_department_leader() OR wp.sub_department_id = ANY(v_accessible))
    -- Search
    AND (p_search_term IS NULL
         OR wp.title ILIKE '%' || p_search_term || '%'
         OR wp.description ILIKE '%' || p_search_term || '%'
         OR sd.name ILIKE '%' || p_search_term || '%')
    -- Sub-department filter
    AND (p_sub_department_id IS NULL OR wp.sub_department_id = p_sub_department_id)
    -- Day filter
    AND (p_day_filter IS NULL OR wp.day_of_week = p_day_filter)
    -- Status filter
    AND (p_status_filter IS NULL OR wp.status = p_status_filter)
  ORDER BY sd.name ASC, wp.day_of_week ASC, wp.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_weekly_programs(TEXT, UUID, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_program_sessions
-- Returns sessions with attendance and assignment statistics.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_program_sessions(
  p_program_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT NULL
)
RETURNS TABLE (
  session_id             UUID,
  program_id             UUID,
  session_date           DATE,
  start_time             TIME,
  end_time               TIME,
  topic                  TEXT,
  location               TEXT,
  status                 TEXT,
  notes                  TEXT,
  total_children         BIGINT,
  present_count          BIGINT,
  absent_count           BIGINT,
  excused_count          BIGINT,
  late_count             BIGINT,
  assigned_members_count BIGINT,
  attendance_marked      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id                                                         AS session_id,
    ps.program_id,
    ps.session_date,
    ps.start_time,
    ps.end_time,
    ps.topic,
    ps.location,
    ps.status,
    ps.notes,
    COUNT(DISTINCT ca.child_id)                                   AS total_children,
    COUNT(DISTINCT ca.child_id) FILTER (WHERE ca.status = 'present')  AS present_count,
    COUNT(DISTINCT ca.child_id) FILTER (WHERE ca.status = 'absent')   AS absent_count,
    COUNT(DISTINCT ca.child_id) FILTER (WHERE ca.status = 'excused')  AS excused_count,
    COUNT(DISTINCT ca.child_id) FILTER (WHERE ca.status = 'late')     AS late_count,
    COUNT(DISTINCT pa.member_id)                                  AS assigned_members_count,
    (COUNT(DISTINCT ca.child_id) > 0)                             AS attendance_marked
  FROM public.program_sessions ps
  LEFT JOIN public.child_attendance   ca ON ca.session_id = ps.id
  LEFT JOIN public.program_assignments pa ON pa.session_id = ps.id
  WHERE ps.program_id = p_program_id
    AND (p_start_date IS NULL OR ps.session_date >= p_start_date)
    AND (p_end_date   IS NULL OR ps.session_date <= p_end_date)
  GROUP BY ps.id, ps.program_id, ps.session_date, ps.start_time,
           ps.end_time, ps.topic, ps.location, ps.status, ps.notes
  ORDER BY ps.session_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_program_sessions(UUID, DATE, DATE) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_session_attendance
-- Returns all children with their attendance status for a session.
-- Includes children who have no record yet (status = NULL).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_session_attendance(p_session_id UUID)
RETURNS TABLE (
  child_id          UUID,
  full_name         TEXT,
  baptismal_name    TEXT,
  gender            TEXT,
  age               INTEGER,
  kutr_level_name   TEXT,
  kutr_level_color  TEXT,
  attendance_id     UUID,
  attendance_status TEXT,
  check_in_time     TIMESTAMPTZ,
  check_out_time    TIMESTAMPTZ,
  recorded_by_name  TEXT,
  notes             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Load session to get program's target kutr levels
  SELECT ps.*, wp.target_kutr_levels
  INTO v_session
  FROM public.program_sessions ps
  JOIN public.weekly_programs wp ON wp.id = ps.program_id
  WHERE ps.id = p_session_id;

  RETURN QUERY
  SELECT
    c.id                                                      AS child_id,
    c.full_name,
    c.baptismal_name,
    c.gender,
    c.age,
    kl.name                                                   AS kutr_level_name,
    kl.color                                                  AS kutr_level_color,
    ca.id                                                     AS attendance_id,
    ca.status                                                 AS attendance_status,
    ca.check_in_time,
    ca.check_out_time,
    m.full_name                                               AS recorded_by_name,
    ca.notes
  FROM public.children c
  LEFT JOIN public.kutr_levels kl ON kl.id = c.kutr_level_id
  LEFT JOIN public.child_attendance ca
    ON ca.child_id = c.id AND ca.session_id = p_session_id
  LEFT JOIN public.members m ON m.member_id = ca.recorded_by
  WHERE c.status = 'active'
    -- If program has target kutr levels, filter to those; otherwise show all
    AND (
      v_session.target_kutr_levels IS NULL
      OR array_length(v_session.target_kutr_levels, 1) IS NULL
      OR c.kutr_level_id = ANY(v_session.target_kutr_levels)
    )
  ORDER BY kl.min_age ASC NULLS LAST, c.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_attendance(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: mark_child_attendance
-- Upserts an attendance record. Auto-sets check_in_time for
-- present/late status. Records the current user as recorder.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_child_attendance(
  p_session_id UUID,
  p_child_id   UUID,
  p_status     TEXT,
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recorder_id UUID;
  v_record_id   UUID;
  v_check_in    TIMESTAMPTZ;
BEGIN
  -- Get current user's member_id
  SELECT member_id INTO v_recorder_id
  FROM public.members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Auto-set check_in_time for present/late
  v_check_in := CASE
    WHEN p_status IN ('present', 'late') THEN NOW()
    ELSE NULL
  END;

  INSERT INTO public.child_attendance (
    child_id, session_id, status, check_in_time, recorded_by, notes
  )
  VALUES (
    p_child_id, p_session_id, p_status, v_check_in, v_recorder_id, p_notes
  )
  ON CONFLICT (child_id, session_id) DO UPDATE SET
    status        = EXCLUDED.status,
    check_in_time = CASE
      WHEN EXCLUDED.status IN ('present', 'late') AND child_attendance.check_in_time IS NULL
        THEN NOW()
      ELSE child_attendance.check_in_time
    END,
    recorded_by   = EXCLUDED.recorded_by,
    notes         = COALESCE(EXCLUDED.notes, child_attendance.notes),
    updated_at    = NOW()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_child_attendance(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: assign_member_to_session
-- Upserts a member supervision assignment for a session.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION assign_member_to_session(
  p_session_id UUID,
  p_member_id  UUID,
  p_role       TEXT DEFAULT 'assistant',
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.program_assignments (
    session_id, member_id, role, notes, approval_status
  )
  VALUES (
    p_session_id, p_member_id, p_role, p_notes, 'pending'
  )
  ON CONFLICT (session_id, member_id) DO UPDATE SET
    role            = EXCLUDED.role,
    notes           = COALESCE(EXCLUDED.notes, program_assignments.notes),
    approval_status = CASE
      WHEN program_assignments.approval_status = 'rejected' THEN 'pending'
      ELSE program_assignments.approval_status
    END
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_member_to_session(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.program_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_attendance  ENABLE ROW LEVEL SECURITY;

-- ── program_types: read-only for all authenticated users ────

DROP POLICY IF EXISTS "program_types_select" ON public.program_types;
CREATE POLICY "program_types_select" ON public.program_types
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "program_types_write" ON public.program_types;
CREATE POLICY "program_types_write" ON public.program_types
  FOR ALL USING (is_department_leader());

-- ── weekly_programs ──────────────────────────────────────────
-- Dept leaders: full CRUD
-- Subdept leaders: SELECT/INSERT/UPDATE in their sub-depts only
-- No DELETE for subdept leaders (use status = 'cancelled')

DROP POLICY IF EXISTS "wp_select" ON public.weekly_programs;
CREATE POLICY "wp_select" ON public.weekly_programs FOR SELECT USING (
  is_department_leader()
  OR weekly_programs.sub_department_id = ANY(get_accessible_sub_departments())
);

DROP POLICY IF EXISTS "wp_insert" ON public.weekly_programs;
CREATE POLICY "wp_insert" ON public.weekly_programs FOR INSERT WITH CHECK (
  is_department_leader()
  OR (
    is_system_user()
    AND sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "wp_update" ON public.weekly_programs;
CREATE POLICY "wp_update" ON public.weekly_programs FOR UPDATE USING (
  is_department_leader()
  OR (
    is_system_user()
    AND weekly_programs.sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "wp_delete" ON public.weekly_programs;
CREATE POLICY "wp_delete" ON public.weekly_programs FOR DELETE USING (
  is_department_leader()
);

-- ── program_sessions ─────────────────────────────────────────
-- Access scoped through parent weekly_program's sub_department_id

DROP POLICY IF EXISTS "ps_select" ON public.program_sessions;
CREATE POLICY "ps_select" ON public.program_sessions FOR SELECT USING (
  is_department_leader()
  OR EXISTS (
    SELECT 1 FROM public.weekly_programs wp
    WHERE wp.id = program_sessions.program_id
      AND wp.sub_department_id = ANY(get_accessible_sub_departments())
  )
);

DROP POLICY IF EXISTS "ps_insert" ON public.program_sessions;
CREATE POLICY "ps_insert" ON public.program_sessions FOR INSERT WITH CHECK (
  is_department_leader()
  OR (
    is_system_user()
    AND EXISTS (
      SELECT 1 FROM public.weekly_programs wp
      WHERE wp.id = program_id
        AND wp.sub_department_id = ANY(get_accessible_sub_departments())
    )
  )
);

DROP POLICY IF EXISTS "ps_update" ON public.program_sessions;
CREATE POLICY "ps_update" ON public.program_sessions FOR UPDATE USING (
  is_department_leader()
  OR (
    is_system_user()
    AND EXISTS (
      SELECT 1 FROM public.weekly_programs wp
      WHERE wp.id = program_sessions.program_id
        AND wp.sub_department_id = ANY(get_accessible_sub_departments())
    )
  )
);

DROP POLICY IF EXISTS "ps_delete" ON public.program_sessions;
CREATE POLICY "ps_delete" ON public.program_sessions FOR DELETE USING (
  is_department_leader()
);

-- ── program_assignments ──────────────────────────────────────

DROP POLICY IF EXISTS "pa_select" ON public.program_assignments;
CREATE POLICY "pa_select" ON public.program_assignments FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "pa_insert" ON public.program_assignments;
CREATE POLICY "pa_insert" ON public.program_assignments FOR INSERT WITH CHECK (
  is_department_leader()
  OR (
    is_system_user()
    AND EXISTS (
      SELECT 1 FROM public.program_sessions ps
      JOIN public.weekly_programs wp ON wp.id = ps.program_id
      WHERE ps.id = session_id
        AND wp.sub_department_id = ANY(get_accessible_sub_departments())
    )
  )
);

DROP POLICY IF EXISTS "pa_update" ON public.program_assignments;
CREATE POLICY "pa_update" ON public.program_assignments FOR UPDATE USING (
  is_department_leader()
  OR (
    is_system_user()
    AND EXISTS (
      SELECT 1 FROM public.program_sessions ps
      JOIN public.weekly_programs wp ON wp.id = ps.program_id
      WHERE ps.id = program_assignments.session_id
        AND wp.sub_department_id = ANY(get_accessible_sub_departments())
    )
  )
);

DROP POLICY IF EXISTS "pa_delete" ON public.program_assignments;
CREATE POLICY "pa_delete" ON public.program_assignments FOR DELETE USING (
  is_department_leader()
);

-- ── child_attendance ─────────────────────────────────────────
-- All system users can read/write; dept leaders can delete.
-- Kuttr leaders can mark attendance for any session.

DROP POLICY IF EXISTS "ca_select" ON public.child_attendance;
CREATE POLICY "ca_select" ON public.child_attendance FOR SELECT USING (
  is_system_user()
);

DROP POLICY IF EXISTS "ca_insert" ON public.child_attendance;
CREATE POLICY "ca_insert" ON public.child_attendance FOR INSERT WITH CHECK (
  is_system_user()
);

DROP POLICY IF EXISTS "ca_update" ON public.child_attendance;
CREATE POLICY "ca_update" ON public.child_attendance FOR UPDATE USING (
  is_system_user()
);

DROP POLICY IF EXISTS "ca_delete" ON public.child_attendance;
CREATE POLICY "ca_delete" ON public.child_attendance FOR DELETE USING (
  is_department_leader()
);


-- ============================================================
-- SECTION 7: VIEW — upcoming_sessions
-- Shows all scheduled sessions from today onward.
-- ============================================================

CREATE OR REPLACE VIEW public.upcoming_sessions AS
SELECT
  ps.id                                         AS session_id,
  ps.session_date,
  ps.start_time,
  ps.end_time,
  ps.topic,
  ps.location                                   AS session_location,
  ps.status                                     AS session_status,
  wp.id                                         AS program_id,
  wp.title                                      AS program_title,
  wp.day_of_week,
  wp.location                                   AS program_location,
  wp.max_capacity,
  sd.sub_department_id,
  sd.name                                       AS sub_department_name,
  pt.name                                       AS program_type_name,
  pt.icon                                       AS program_type_icon,
  pt.color                                      AS program_type_color,
  (
    SELECT COUNT(*)
    FROM public.program_assignments pa
    WHERE pa.session_id = ps.id
  )                                             AS assigned_members_count,
  (
    SELECT COUNT(*)
    FROM public.child_attendance ca
    WHERE ca.session_id = ps.id
  )                                             AS attendance_marked_count,
  (
    SELECT COUNT(*)
    FROM public.child_attendance ca
    WHERE ca.session_id = ps.id AND ca.status = 'present'
  )                                             AS present_count
FROM public.program_sessions ps
JOIN public.weekly_programs wp ON wp.id = ps.program_id
LEFT JOIN public.sub_departments sd ON sd.sub_department_id = wp.sub_department_id
LEFT JOIN public.program_types   pt ON pt.id = wp.program_type_id
WHERE ps.session_date >= CURRENT_DATE
  AND ps.status IN ('scheduled', 'in_progress')
  AND wp.status = 'active'
ORDER BY ps.session_date ASC, ps.start_time ASC;

-- upcoming_sessions: scheduled sessions from today with stats

-- Grant SELECT on the view to authenticated users
-- (RLS on underlying tables still applies via SECURITY INVOKER)
GRANT SELECT ON public.upcoming_sessions TO authenticated;


-- ============================================================
-- SECTION 8: VERIFICATION
-- ============================================================

SELECT 'Migration 010 complete.' AS message;

SELECT
  relname  AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE relname IN (
  'program_types', 'weekly_programs', 'program_sessions',
  'program_assignments', 'child_attendance'
)
ORDER BY relname;

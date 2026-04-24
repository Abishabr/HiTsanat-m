-- ============================================================
-- 012_children_events.sql
--
-- Phase 6: Children Events Management
-- Events: Timker (Epiphany), Hosana (Palm Sunday), Meskel
--
-- Existing tables altered (not recreated):
--   children_events:           add missing columns
--   children_event_assignments: renamed concept → child_event_attendance
--
-- New tables:
--   child_event_registrations  - pre-event registration
--   event_member_assignments   - member supervision per event
--
-- Functions:
--   register_child_for_event()
--   mark_event_attendance()
--   get_event_attendance()
--   get_event_statistics()
--   get_child_event_history()
-- ============================================================


-- ============================================================
-- SECTION 1: ALTER EXISTING TABLES
-- ============================================================

-- children_events: add missing columns
ALTER TABLE public.children_events
-- Ensure event_type has correct values — drop old constraint first
ALTER TABLE public.children_events
  DROP CONSTRAINT IF EXISTS children_events_event_type_check;

ALTER TABLE public.children_events
  ADD COLUMN IF NOT EXISTS event_type TEXT
    CHECK (event_type IN ('timket', 'hosana', 'meskel', 'other'));
  ADD COLUMN IF NOT EXISTS start_time              TIME,
  ADD COLUMN IF NOT EXISTS end_time                TIME,
  ADD COLUMN IF NOT EXISTS location                TEXT,
  ADD COLUMN IF NOT EXISTS requires_performance_score BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_performance_score   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS name                    TEXT;

-- Backfill name from title if title exists
UPDATE public.children_events
SET name = title
WHERE name IS NULL AND title IS NOT NULL;

-- Ensure status has correct values (existing rows may have different values)
-- Add check constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'children_events'
      AND constraint_name = 'children_events_status_check'
  ) THEN
    ALTER TABLE public.children_events
      ADD CONSTRAINT children_events_status_check
      CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled'));
  END IF;
EXCEPTION WHEN others THEN
  -- Existing rows may violate constraint; skip silently
  NULL;
END $$;

-- children_event_assignments: add missing columns to use as attendance table
ALTER TABLE public.children_event_assignments
  ADD COLUMN IF NOT EXISTS attendance_status  TEXT
    CHECK (attendance_status IN ('registered', 'attended', 'absent', 'excused')),
  ADD COLUMN IF NOT EXISTS performance_score  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS check_in_time      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recorded_by        UUID,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS registration_date  DATE DEFAULT CURRENT_DATE;

-- UNIQUE constraint on (child_id, event_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'children_event_assignments'
      AND constraint_name = 'cea_child_event_unique'
  ) THEN
    ALTER TABLE public.children_event_assignments
      ADD CONSTRAINT cea_child_event_unique
      UNIQUE (child_id, event_id);
  END IF;
END $$;


-- ============================================================
-- SECTION 2: NEW TABLES
-- ============================================================

-- child_event_registrations: pre-event registration list
CREATE TABLE IF NOT EXISTS public.child_event_registrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID        NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  event_id          UUID        NOT NULL REFERENCES public.children_events(id) ON DELETE CASCADE,
  registration_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  registered_by     UUID,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, event_id)
);

-- event_member_assignments: which members supervise which events
CREATE TABLE IF NOT EXISTS public.event_member_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES public.children_events(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'helper'
                CHECK (role IN ('coordinator', 'supervisor', 'helper')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE (event_id, member_id)
);


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ce_event_date    ON public.children_events(event_date);
CREATE INDEX IF NOT EXISTS idx_ce_event_type    ON public.children_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ce_status        ON public.children_events(status);
CREATE INDEX IF NOT EXISTS idx_cea_event_id     ON public.children_event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_cea_child_id     ON public.children_event_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_cer_event_id     ON public.child_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_cer_child_id     ON public.child_event_registrations(child_id);
CREATE INDEX IF NOT EXISTS idx_ema_event_id     ON public.event_member_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_ema_member_id    ON public.event_member_assignments(member_id);


-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ce_updated_at ON public.children_events;
CREATE TRIGGER trg_ce_updated_at
  BEFORE UPDATE ON public.children_events
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 5: FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: register_child_for_event
-- Registers a child for an event (pre-registration).
-- Also creates an attendance record with status 'registered'.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION register_child_for_event(
  p_event_id UUID,
  p_child_id UUID,
  p_notes    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id UUID;
BEGIN
  -- Insert registration record
  INSERT INTO public.child_event_registrations (
    child_id, event_id, notes, registered_by
  ) VALUES (
    p_child_id, p_event_id, p_notes, auth.uid()
  )
  ON CONFLICT (child_id, event_id) DO NOTHING
  RETURNING id INTO v_reg_id;

  -- Create attendance record with 'registered' status
  INSERT INTO public.children_event_assignments (
    child_id, event_id, attendance_status, registration_date, recorded_by
  ) VALUES (
    p_child_id, p_event_id, 'registered', CURRENT_DATE, auth.uid()
  )
  ON CONFLICT (child_id, event_id) DO NOTHING;

  RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_child_for_event(UUID, UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: mark_event_attendance
-- Marks attendance for a child at an event.
-- Optionally records a performance score.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_event_attendance(
  p_event_id         UUID,
  p_child_id         UUID,
  p_status           TEXT,
  p_performance_score NUMERIC DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.children_event_assignments (
    child_id, event_id, attendance_status, performance_score,
    check_in_time, recorded_by, notes
  ) VALUES (
    p_child_id, p_event_id, p_status, p_performance_score,
    CASE WHEN p_status = 'attended' THEN NOW() ELSE NULL END,
    auth.uid(), p_notes
  )
  ON CONFLICT (child_id, event_id) DO UPDATE SET
    attendance_status = EXCLUDED.attendance_status,
    performance_score = COALESCE(EXCLUDED.performance_score, children_event_assignments.performance_score),
    check_in_time     = CASE
      WHEN EXCLUDED.attendance_status = 'attended' AND children_event_assignments.check_in_time IS NULL
        THEN NOW()
      ELSE children_event_assignments.check_in_time
    END,
    recorded_by       = EXCLUDED.recorded_by,
    notes             = COALESCE(EXCLUDED.notes, children_event_assignments.notes)
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_event_attendance(UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_event_attendance
-- Returns all children with their attendance status for an event.
-- Includes children registered but not yet marked.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_attendance(p_event_id UUID)
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
  performance_score NUMERIC,
  check_in_time     TIMESTAMPTZ,
  notes             TEXT,
  is_registered     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                                          AS child_id,
    c.full_name,
    c.baptismal_name,
    c.gender,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.date_of_birth))::INTEGER AS age,
    kl.name                                                       AS kutr_level_name,
    kl.color                                                      AS kutr_level_color,
    cea.id                                                        AS attendance_id,
    cea.attendance_status,
    cea.performance_score,
    cea.check_in_time,
    cea.notes,
    (cer.id IS NOT NULL)                                          AS is_registered
  FROM public.children c
  LEFT JOIN public.kutr_levels kl ON kl.id = c.kutr_level_id
  LEFT JOIN public.children_event_assignments cea
    ON cea.child_id = c.id AND cea.event_id = p_event_id
  LEFT JOIN public.child_event_registrations cer
    ON cer.child_id = c.id AND cer.event_id = p_event_id
  WHERE c.status = 'active'
    AND (cea.id IS NOT NULL OR cer.id IS NOT NULL)
  ORDER BY kl.min_age ASC NULLS LAST, c.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_attendance(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_event_statistics
-- Returns aggregate stats for an event.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_statistics(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'event_id',          p_event_id,
      'registered_count',  (SELECT COUNT(*) FROM public.child_event_registrations WHERE event_id = p_event_id),
      'total_marked',      COUNT(*),
      'attended_count',    COUNT(*) FILTER (WHERE attendance_status = 'attended'),
      'absent_count',      COUNT(*) FILTER (WHERE attendance_status = 'absent'),
      'excused_count',     COUNT(*) FILTER (WHERE attendance_status = 'excused'),
      'avg_performance',   ROUND(AVG(performance_score) FILTER (WHERE performance_score IS NOT NULL), 2),
      'max_performance',   MAX(performance_score),
      'min_performance',   MIN(performance_score),
      'attendance_rate',   CASE
        WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE attendance_status = 'attended')::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END
    )
    FROM public.children_event_assignments
    WHERE event_id = p_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_statistics(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_child_event_history
-- Returns all events a child has participated in.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_child_event_history(p_child_id UUID)
RETURNS TABLE (
  event_id          UUID,
  event_name        TEXT,
  event_type        TEXT,
  event_date        DATE,
  location          TEXT,
  attendance_status TEXT,
  performance_score NUMERIC,
  check_in_time     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id                   AS event_id,
    COALESCE(ce.name, ce.title) AS event_name,
    ce.event_type,
    ce.event_date,
    ce.location,
    cea.attendance_status,
    cea.performance_score,
    cea.check_in_time
  FROM public.children_event_assignments cea
  JOIN public.children_events ce ON ce.id = cea.event_id
  WHERE cea.child_id = p_child_id
  ORDER BY ce.event_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_child_event_history(UUID) TO authenticated;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.children_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children_event_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_member_assignments    ENABLE ROW LEVEL SECURITY;

-- children_events
DROP POLICY IF EXISTS "ce_select" ON public.children_events;
CREATE POLICY "ce_select" ON public.children_events
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ce_insert" ON public.children_events;
CREATE POLICY "ce_insert" ON public.children_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ce_update" ON public.children_events;
CREATE POLICY "ce_update" ON public.children_events
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ce_delete" ON public.children_events;
CREATE POLICY "ce_delete" ON public.children_events
  FOR DELETE USING (auth.role() = 'authenticated');

-- children_event_assignments (attendance)
DROP POLICY IF EXISTS "cea_select" ON public.children_event_assignments;
CREATE POLICY "cea_select" ON public.children_event_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cea_insert" ON public.children_event_assignments;
CREATE POLICY "cea_insert" ON public.children_event_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cea_update" ON public.children_event_assignments;
CREATE POLICY "cea_update" ON public.children_event_assignments
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cea_delete" ON public.children_event_assignments;
CREATE POLICY "cea_delete" ON public.children_event_assignments
  FOR DELETE USING (auth.role() = 'authenticated');

-- child_event_registrations
DROP POLICY IF EXISTS "cer_select" ON public.child_event_registrations;
CREATE POLICY "cer_select" ON public.child_event_registrations
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cer_insert" ON public.child_event_registrations;
CREATE POLICY "cer_insert" ON public.child_event_registrations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cer_update" ON public.child_event_registrations;
CREATE POLICY "cer_update" ON public.child_event_registrations
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cer_delete" ON public.child_event_registrations;
CREATE POLICY "cer_delete" ON public.child_event_registrations
  FOR DELETE USING (auth.role() = 'authenticated');

-- event_member_assignments
DROP POLICY IF EXISTS "ema_select" ON public.event_member_assignments;
CREATE POLICY "ema_select" ON public.event_member_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ema_insert" ON public.event_member_assignments;
CREATE POLICY "ema_insert" ON public.event_member_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ema_update" ON public.event_member_assignments;
CREATE POLICY "ema_update" ON public.event_member_assignments
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ema_delete" ON public.event_member_assignments;
CREATE POLICY "ema_delete" ON public.event_member_assignments
  FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- SECTION 7: SAMPLE DATA
-- ============================================================

INSERT INTO public.children_events (name, title, event_type, event_date, status, description)
VALUES
  ('Timket 2025',  'Timket 2025',  'timket', '2025-01-19', 'planned', 'Ethiopian Epiphany celebration'),
  ('Hosana 2025',  'Hosana 2025',  'hosana', '2025-04-13', 'planned', 'Palm Sunday celebration'),
  ('Meskel 2025',  'Meskel 2025',  'meskel', '2025-09-27', 'planned', 'Finding of the True Cross')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 8: VERIFICATION
-- ============================================================

SELECT 'Migration 012 complete.' AS message;

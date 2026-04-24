-- ============================================================
-- 010b_weekly_programs_alter.sql
--
-- Applied manually to existing tables (tables already existed
-- with old schema from a previous manual setup).
--
-- Actual schema found:
--   weekly_programs:    id, title, program_date, sub_department(text),
--                       description, status, created_by, created_at, updated_at
--   program_sessions:   id, program_id, session_date, start_time, end_time,
--                       topic, description, location, status, notes,
--                       created_by, created_at, updated_at
--   program_assignments: id, program_id, member_id, role, created_at
--   child_attendance:   id, child_id, session_id, status, check_in_time,
--                       check_out_time, recorded_by, notes, created_at, updated_at
--   program_types:      id, name, description, icon, color, created_at
--   sub_departments:    id (not sub_department_id), name, description,
--                       leader_id, created_at
--
-- Actions taken:
--   1. Inserted 8 program_types rows
--   2. Added missing columns to weekly_programs via ALTER TABLE
--   3. Added UNIQUE(program_id, session_date) to program_sessions
--   4. Added missing columns + UNIQUE(session_id, member_id) to program_assignments
--   5. Added UNIQUE(child_id, session_id) to child_attendance
--   6. Created indexes
--   7. Created triggers
-- ============================================================

-- 1. program_types data
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

-- 2. weekly_programs: add missing columns
ALTER TABLE public.weekly_programs
  ADD COLUMN IF NOT EXISTS sub_department_id     UUID REFERENCES public.sub_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_type_id       UUID REFERENCES public.program_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day_of_week           TEXT CHECK (day_of_week IN ('Saturday', 'Sunday')),
  ADD COLUMN IF NOT EXISTS start_time            TIME,
  ADD COLUMN IF NOT EXISTS end_time              TIME,
  ADD COLUMN IF NOT EXISTS location              TEXT,
  ADD COLUMN IF NOT EXISTS target_kutr_levels    UUID[],
  ADD COLUMN IF NOT EXISTS is_recurring          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurrence_start_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_end_date   DATE,
  ADD COLUMN IF NOT EXISTS max_capacity          INTEGER CHECK (max_capacity > 0);

-- 3. program_sessions: UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'program_sessions'
      AND constraint_name = 'program_sessions_program_id_session_date_key'
  ) THEN
    ALTER TABLE public.program_sessions
      ADD CONSTRAINT program_sessions_program_id_session_date_key
      UNIQUE (program_id, session_date);
  END IF;
END $$;

-- 4. program_assignments: missing columns + UNIQUE
ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by     UUID,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_time   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes           TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'program_assignments'
      AND constraint_name = 'program_assignments_session_id_member_id_key'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_session_id_member_id_key
      UNIQUE (session_id, member_id);
  END IF;
END $$;

-- 5. child_attendance: UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'child_attendance'
      AND constraint_name = 'child_attendance_child_id_session_id_key'
  ) THEN
    ALTER TABLE public.child_attendance
      ADD CONSTRAINT child_attendance_child_id_session_id_key
      UNIQUE (child_id, session_id);
  END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_wp_sub_department_id ON public.weekly_programs(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_wp_program_type_id   ON public.weekly_programs(program_type_id);
CREATE INDEX IF NOT EXISTS idx_wp_day_of_week       ON public.weekly_programs(day_of_week);
CREATE INDEX IF NOT EXISTS idx_wp_status            ON public.weekly_programs(status);
CREATE INDEX IF NOT EXISTS idx_ps_program_id        ON public.program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_ps_session_date      ON public.program_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_ps_status            ON public.program_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pa_session_id        ON public.program_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_pa_member_id         ON public.program_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_ca_child_id          ON public.child_attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_ca_session_id        ON public.child_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_ca_status            ON public.child_attendance(status);

-- 7. Triggers
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

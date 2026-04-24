-- ============================================================
-- 011_timhert_academic.sql
--
-- Phase 5: Timhert Academic Module
--
-- Business rules:
--   • 3 activity types: Midterm (30%), Final (50%), Assignment (20%)
--   • Activities are per kutr_level
--   • Scores auto-calculate percentage and grade letter
--   • Only Timhert + Department leaders can manage
--
-- Existing tables (altered, not recreated):
--   timhert_activities: id, title, activity_date, max_score,
--                       description, created_by, created_at
--   timhert_scores:     id, activity_id, child_id, score,
--                       recorded_by, created_at
--
-- New columns added via ALTER TABLE:
--   timhert_activities: activity_type, kutr_level_id, passing_score,
--                       academic_year, status, updated_at
--   timhert_scores:     percentage, grade_letter, notes, updated_at
--
-- Functions:
--   get_timhert_activities(kutr_level_id, activity_type, academic_year)
--   get_activity_scores(activity_id)
--   get_child_academic_report(child_id, academic_year)
--   get_kutr_level_report(kutr_level_id, academic_year)
--   upsert_child_score(activity_id, child_id, score, notes)
--   calculate_final_grade(child_id, kutr_level_id, academic_year)
-- ============================================================


-- ============================================================
-- SECTION 1: ALTER EXISTING TABLES
-- ============================================================

-- timhert_activities: add missing columns
ALTER TABLE public.timhert_activities
  ADD COLUMN IF NOT EXISTS activity_type  TEXT CHECK (activity_type IN ('Midterm', 'Final', 'Assignment')),
  ADD COLUMN IF NOT EXISTS kutr_level_id  UUID REFERENCES public.kutr_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS passing_score  NUMERIC CHECK (passing_score >= 0),
  ADD COLUMN IF NOT EXISTS academic_year  TEXT,
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- timhert_scores: add computed + metadata columns
ALTER TABLE public.timhert_scores
  ADD COLUMN IF NOT EXISTS percentage   NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN score IS NOT NULL AND score >= 0 THEN NULL  -- placeholder; real calc in trigger
      ELSE NULL
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS grade_letter TEXT,
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- NOTE: PostgreSQL GENERATED columns cannot reference other tables.
-- percentage and grade_letter are computed via trigger instead.
-- Drop the generated column and replace with a plain column + trigger.

ALTER TABLE public.timhert_scores
  DROP COLUMN IF EXISTS percentage;

ALTER TABLE public.timhert_scores
  ADD COLUMN IF NOT EXISTS percentage NUMERIC;

-- UNIQUE constraint: one score per child per activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'timhert_scores'
      AND constraint_name = 'timhert_scores_activity_child_key'
  ) THEN
    ALTER TABLE public.timhert_scores
      ADD CONSTRAINT timhert_scores_activity_child_key
      UNIQUE (activity_id, child_id);
  END IF;
END $$;


-- ============================================================
-- SECTION 2: WEIGHT LOOKUP TABLE
-- Stores the fixed weights for each activity type.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timhert_activity_weights (
  activity_type TEXT PRIMARY KEY CHECK (activity_type IN ('Midterm', 'Final', 'Assignment')),
  weight        NUMERIC NOT NULL CHECK (weight > 0 AND weight <= 100),
  description   TEXT
);

INSERT INTO public.timhert_activity_weights (activity_type, weight, description) VALUES
  ('Midterm',    30, '30% of final grade'),
  ('Final',      50, '50% of final grade'),
  ('Assignment', 20, '20% of final grade')
ON CONFLICT (activity_type) DO NOTHING;


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ta_kutr_level_id  ON public.timhert_activities(kutr_level_id);
CREATE INDEX IF NOT EXISTS idx_ta_activity_type  ON public.timhert_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_ta_academic_year  ON public.timhert_activities(academic_year);
CREATE INDEX IF NOT EXISTS idx_ta_status         ON public.timhert_activities(status);
CREATE INDEX IF NOT EXISTS idx_ts_activity_id    ON public.timhert_scores(activity_id);
CREATE INDEX IF NOT EXISTS idx_ts_child_id       ON public.timhert_scores(child_id);
CREATE INDEX IF NOT EXISTS idx_ts_grade_letter   ON public.timhert_scores(grade_letter);


-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- fn_set_updated_at already exists from 009/010; reuse it.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ta_updated_at ON public.timhert_activities;
CREATE TRIGGER trg_ta_updated_at
  BEFORE UPDATE ON public.timhert_activities
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_ts_updated_at ON public.timhert_scores
  ;
CREATE TRIGGER trg_ts_updated_at
  BEFORE UPDATE ON public.timhert_scores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-calculate percentage and grade_letter on INSERT/UPDATE of score
CREATE OR REPLACE FUNCTION fn_calculate_score_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max_score NUMERIC;
  v_pct       NUMERIC;
BEGIN
  -- Get max_score from the activity
  SELECT max_score INTO v_max_score
  FROM public.timhert_activities
  WHERE id = NEW.activity_id;

  IF v_max_score IS NOT NULL AND v_max_score > 0 AND NEW.score IS NOT NULL THEN
    v_pct := ROUND((NEW.score / v_max_score) * 100, 2);
    NEW.percentage := v_pct;

    -- Grade letter: A(90+), B(80-89), C(70-79), D(60-69), F(<60)
    NEW.grade_letter := CASE
      WHEN v_pct >= 90 THEN 'A'
      WHEN v_pct >= 80 THEN 'B'
      WHEN v_pct >= 70 THEN 'C'
      WHEN v_pct >= 60 THEN 'D'
      ELSE 'F'
    END;
  ELSE
    NEW.percentage   := NULL;
    NEW.grade_letter := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ts_calculate_grade ON public.timhert_scores;
CREATE TRIGGER trg_ts_calculate_grade
  BEFORE INSERT OR UPDATE OF score ON public.timhert_scores
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_score_grade();


-- ============================================================
-- SECTION 5: FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: get_timhert_activities
-- Returns activities filtered by kutr_level, type, year.
-- Includes score statistics per activity.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_timhert_activities(
  p_kutr_level_id UUID    DEFAULT NULL,
  p_activity_type TEXT    DEFAULT NULL,
  p_academic_year TEXT    DEFAULT NULL,
  p_status        TEXT    DEFAULT 'active'
)
RETURNS TABLE (
  activity_id     UUID,
  title           TEXT,
  activity_type   TEXT,
  activity_date   DATE,
  max_score       NUMERIC,
  passing_score   NUMERIC,
  academic_year   TEXT,
  status          TEXT,
  kutr_level_id   UUID,
  kutr_level_name TEXT,
  weight          NUMERIC,
  scored_count    BIGINT,
  avg_score       NUMERIC,
  avg_percentage  NUMERIC,
  pass_count      BIGINT,
  fail_count      BIGINT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id                                                       AS activity_id,
    ta.title,
    ta.activity_type,
    ta.activity_date,
    ta.max_score,
    ta.passing_score,
    ta.academic_year,
    ta.status,
    ta.kutr_level_id,
    kl.name                                                     AS kutr_level_name,
    taw.weight,
    COUNT(ts.id)                                                AS scored_count,
    ROUND(AVG(ts.score), 2)                                     AS avg_score,
    ROUND(AVG(ts.percentage), 2)                                AS avg_percentage,
    COUNT(ts.id) FILTER (WHERE ts.score >= COALESCE(ta.passing_score, ta.max_score * 0.5)) AS pass_count,
    COUNT(ts.id) FILTER (WHERE ts.score <  COALESCE(ta.passing_score, ta.max_score * 0.5)) AS fail_count,
    ta.created_at
  FROM public.timhert_activities ta
  LEFT JOIN public.kutr_levels kl
    ON kl.id = ta.kutr_level_id
  LEFT JOIN public.timhert_activity_weights taw
    ON taw.activity_type = ta.activity_type
  LEFT JOIN public.timhert_scores ts
    ON ts.activity_id = ta.id
  WHERE
    (p_kutr_level_id IS NULL OR ta.kutr_level_id = p_kutr_level_id)
    AND (p_activity_type IS NULL OR ta.activity_type = p_activity_type)
    AND (p_academic_year IS NULL OR ta.academic_year = p_academic_year)
    AND (p_status IS NULL OR ta.status = p_status)
  GROUP BY
    ta.id, ta.title, ta.activity_type, ta.activity_date, ta.max_score,
    ta.passing_score, ta.academic_year, ta.status, ta.kutr_level_id,
    kl.name, taw.weight, ta.created_at
  ORDER BY ta.activity_date DESC NULLS LAST, ta.activity_type ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_timhert_activities(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_activity_scores
-- Returns all children with their score for a specific activity.
-- Includes children who have no score yet (score = NULL).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_activity_scores(p_activity_id UUID)
RETURNS TABLE (
  child_id        UUID,
  full_name       TEXT,
  baptismal_name  TEXT,
  gender          TEXT,
  age             INTEGER,
  kutr_level_name TEXT,
  score_id        UUID,
  score           NUMERIC,
  percentage      NUMERIC,
  grade_letter    TEXT,
  notes           TEXT,
  recorded_by     UUID,
  scored_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_activity RECORD;
BEGIN
  SELECT * INTO v_activity
  FROM public.timhert_activities
  WHERE id = p_activity_id;

  RETURN QUERY
  SELECT
    c.id                                                        AS child_id,
    c.full_name,
    c.baptismal_name,
    c.gender,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.date_of_birth))::INTEGER AS age,
    kl.name                                                     AS kutr_level_name,
    ts.id                                                       AS score_id,
    ts.score,
    ts.percentage,
    ts.grade_letter,
    ts.notes,
    ts.recorded_by,
    ts.created_at                                               AS scored_at
  FROM public.children c
  LEFT JOIN public.kutr_levels kl ON kl.id = c.kutr_level_id
  LEFT JOIN public.timhert_scores ts
    ON ts.child_id = c.id AND ts.activity_id = p_activity_id
  WHERE c.status = 'active'
    AND (
      v_activity.kutr_level_id IS NULL
      OR c.kutr_level_id = v_activity.kutr_level_id
    )
  ORDER BY c.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_scores(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: upsert_child_score
-- Insert or update a child's score for an activity.
-- Percentage and grade_letter are auto-calculated by trigger.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_child_score(
  p_activity_id UUID,
  p_child_id    UUID,
  p_score       NUMERIC,
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
  INSERT INTO public.timhert_scores (
    activity_id, child_id, score, notes, recorded_by
  ) VALUES (
    p_activity_id, p_child_id, p_score, p_notes, auth.uid()
  )
  ON CONFLICT (activity_id, child_id) DO UPDATE SET
    score       = EXCLUDED.score,
    notes       = COALESCE(EXCLUDED.notes, timhert_scores.notes),
    recorded_by = EXCLUDED.recorded_by,
    updated_at  = NOW()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_child_score(UUID, UUID, NUMERIC, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_child_academic_report
-- Returns a child's full academic report for a given year.
-- Includes weighted final grade calculation.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_child_academic_report(
  p_child_id      UUID,
  p_academic_year TEXT DEFAULT NULL
)
RETURNS TABLE (
  child_id        UUID,
  full_name       TEXT,
  kutr_level_name TEXT,
  activity_id     UUID,
  activity_title  TEXT,
  activity_type   TEXT,
  activity_date   DATE,
  max_score       NUMERIC,
  passing_score   NUMERIC,
  weight          NUMERIC,
  score           NUMERIC,
  percentage      NUMERIC,
  grade_letter    TEXT,
  weighted_score  NUMERIC,
  passed          BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                                        AS child_id,
    c.full_name,
    kl.name                                                     AS kutr_level_name,
    ta.id                                                       AS activity_id,
    ta.title                                                    AS activity_title,
    ta.activity_type,
    ta.activity_date,
    ta.max_score,
    ta.passing_score,
    taw.weight,
    ts.score,
    ts.percentage,
    ts.grade_letter,
    ROUND(COALESCE(ts.percentage, 0) * taw.weight / 100, 2)    AS weighted_score,
    (ts.score >= COALESCE(ta.passing_score, ta.max_score * 0.5)) AS passed
  FROM public.children c
  LEFT JOIN public.kutr_levels kl ON kl.id = c.kutr_level_id
  JOIN public.timhert_activities ta
    ON ta.kutr_level_id = c.kutr_level_id
    AND ta.status = 'active'
    AND (p_academic_year IS NULL OR ta.academic_year = p_academic_year)
  LEFT JOIN public.timhert_activity_weights taw
    ON taw.activity_type = ta.activity_type
  LEFT JOIN public.timhert_scores ts
    ON ts.activity_id = ta.id AND ts.child_id = c.id
  WHERE c.id = p_child_id
  ORDER BY ta.activity_type ASC, ta.activity_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_child_academic_report(UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_kutr_level_report
-- Returns all children in a kutr level with their weighted
-- final grades for a given academic year.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_kutr_level_report(
  p_kutr_level_id UUID,
  p_academic_year TEXT DEFAULT NULL
)
RETURNS TABLE (
  child_id          UUID,
  full_name         TEXT,
  baptismal_name    TEXT,
  gender            TEXT,
  midterm_score     NUMERIC,
  midterm_pct       NUMERIC,
  final_score       NUMERIC,
  final_pct         NUMERIC,
  assignment_score  NUMERIC,
  assignment_pct    NUMERIC,
  weighted_total    NUMERIC,
  overall_grade     TEXT,
  activities_taken  BIGINT,
  activities_passed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                                        AS child_id,
    c.full_name,
    c.baptismal_name,
    c.gender,
    -- Midterm
    MAX(ts.score)       FILTER (WHERE ta.activity_type = 'Midterm')    AS midterm_score,
    MAX(ts.percentage)  FILTER (WHERE ta.activity_type = 'Midterm')    AS midterm_pct,
    -- Final
    MAX(ts.score)       FILTER (WHERE ta.activity_type = 'Final')      AS final_score,
    MAX(ts.percentage)  FILTER (WHERE ta.activity_type = 'Final')      AS final_pct,
    -- Assignment (average if multiple)
    AVG(ts.score)       FILTER (WHERE ta.activity_type = 'Assignment') AS assignment_score,
    AVG(ts.percentage)  FILTER (WHERE ta.activity_type = 'Assignment') AS assignment_pct,
    -- Weighted total: Midterm*0.3 + Final*0.5 + Assignment*0.2
    ROUND(
      COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Midterm'),    0) * 0.30 +
      COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Final'),      0) * 0.50 +
      COALESCE(AVG(ts.percentage) FILTER (WHERE ta.activity_type = 'Assignment'), 0) * 0.20,
      2
    )                                                           AS weighted_total,
    -- Overall grade from weighted total
    CASE
      WHEN ROUND(
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Midterm'),    0) * 0.30 +
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Final'),      0) * 0.50 +
        COALESCE(AVG(ts.percentage) FILTER (WHERE ta.activity_type = 'Assignment'), 0) * 0.20,
        2
      ) >= 90 THEN 'A'
      WHEN ROUND(
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Midterm'),    0) * 0.30 +
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Final'),      0) * 0.50 +
        COALESCE(AVG(ts.percentage) FILTER (WHERE ta.activity_type = 'Assignment'), 0) * 0.20,
        2
      ) >= 80 THEN 'B'
      WHEN ROUND(
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Midterm'),    0) * 0.30 +
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Final'),      0) * 0.50 +
        COALESCE(AVG(ts.percentage) FILTER (WHERE ta.activity_type = 'Assignment'), 0) * 0.20,
        2
      ) >= 70 THEN 'C'
      WHEN ROUND(
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Midterm'),    0) * 0.30 +
        COALESCE(MAX(ts.percentage) FILTER (WHERE ta.activity_type = 'Final'),      0) * 0.50 +
        COALESCE(AVG(ts.percentage) FILTER (WHERE ta.activity_type = 'Assignment'), 0) * 0.20,
        2
      ) >= 60 THEN 'D'
      ELSE 'F'
    END                                                         AS overall_grade,
    COUNT(DISTINCT ts.id)                                       AS activities_taken,
    COUNT(DISTINCT ts.id) FILTER (
      WHERE ts.score >= COALESCE(ta.passing_score, ta.max_score * 0.5)
    )                                                           AS activities_passed
  FROM public.children c
  LEFT JOIN public.timhert_activities ta
    ON ta.kutr_level_id = c.kutr_level_id
    AND ta.status = 'active'
    AND (p_academic_year IS NULL OR ta.academic_year = p_academic_year)
  LEFT JOIN public.timhert_activity_weights taw
    ON taw.activity_type = ta.activity_type
  LEFT JOIN public.timhert_scores ts
    ON ts.activity_id = ta.id AND ts.child_id = c.id
  WHERE c.kutr_level_id = p_kutr_level_id
    AND c.status = 'active'
  GROUP BY c.id, c.full_name, c.baptismal_name, c.gender
  ORDER BY weighted_total DESC NULLS LAST, c.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_kutr_level_report(UUID, TEXT) TO authenticated;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.timhert_activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timhert_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timhert_activity_weights ENABLE ROW LEVEL SECURITY;

-- timhert_activity_weights: read-only for all authenticated
DROP POLICY IF EXISTS "taw_select" ON public.timhert_activity_weights;
CREATE POLICY "taw_select" ON public.timhert_activity_weights
  FOR SELECT USING (auth.role() = 'authenticated');

-- timhert_activities: authenticated users can read/write
-- (proper Timhert-scoped RLS added once members table exists)
DROP POLICY IF EXISTS "ta_select" ON public.timhert_activities;
CREATE POLICY "ta_select" ON public.timhert_activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ta_insert" ON public.timhert_activities;
CREATE POLICY "ta_insert" ON public.timhert_activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ta_update" ON public.timhert_activities;
CREATE POLICY "ta_update" ON public.timhert_activities
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ta_delete" ON public.timhert_activities;
CREATE POLICY "ta_delete" ON public.timhert_activities
  FOR DELETE USING (auth.role() = 'authenticated');

-- timhert_scores: authenticated users can read/write
DROP POLICY IF EXISTS "ts_select" ON public.timhert_scores;
CREATE POLICY "ts_select" ON public.timhert_scores
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ts_insert" ON public.timhert_scores;
CREATE POLICY "ts_insert" ON public.timhert_scores
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ts_update" ON public.timhert_scores;
CREATE POLICY "ts_update" ON public.timhert_scores
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ts_delete" ON public.timhert_scores;
CREATE POLICY "ts_delete" ON public.timhert_scores
  FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- SECTION 7: VERIFICATION
-- ============================================================

SELECT 'Migration 011 complete.' AS message;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('timhert_activities', 'timhert_scores')
ORDER BY table_name, ordinal_position;

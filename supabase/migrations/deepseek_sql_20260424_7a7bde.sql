-- ============================================
-- HITSANAT KFL - COMPLETE DATABASE SCHEMA
-- Ethiopian Orthodox Tewahedo Church
-- Children's Ministry Management System
-- ============================================
-- Phases 1-8: All tables, functions, policies
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PHASE 1: CORE STRUCTURE
-- ============================================

-- Sub-Departments
CREATE TABLE IF NOT EXISTS sub_departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_amharic TEXT,
  type TEXT CHECK (type IN ('main', 'support')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sub_departments (id, name, name_amharic, type, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Department', 'መምሪያ', 'main', 'Overall Department Leadership')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sub_departments (name, name_amharic, type, description) VALUES
  ('Timhert', 'ትምህርት', 'main', 'Lessons & Exams for Children'),
  ('Mezmur', 'መዝሙር', 'main', 'Choir Practice & Music'),
  ('Kinetibeb', 'ኪነጥበብ', 'main', 'Arts, Film & Cultural Activities'),
  ('Kuttr', 'ቁጥር', 'support', 'Attendance Tracking'),
  ('Ekd', 'እቅድ', 'support', 'Administrative & Auxiliary Support')
ON CONFLICT (name) DO NOTHING;

-- Leadership Roles
CREATE TABLE IF NOT EXISTS leadership_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hierarchy_level INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO leadership_roles (name, hierarchy_level, description) VALUES
  ('Chairperson', 1, 'Highest leader of department or sub-department'),
  ('Vice Chairperson', 2, 'Second in command'),
  ('Secretary', 3, 'Administrative secretary'),
  ('Member', 4, 'Regular member with no leadership authority')
ON CONFLICT (name) DO NOTHING;

-- Members Table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Personal Info
  full_name TEXT NOT NULL,
  baptismal_name TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth DATE,
  
  -- University Info
  campus TEXT CHECK (campus IN ('Main', 'HIT', 'VET')),
  university_department TEXT,
  building_name TEXT,
  dorm_name TEXT,
  university_year TEXT CHECK (university_year IN ('1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC')),
  
  -- Contact
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  
  -- Profile
  profile_photo_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'alumni')),
  join_date DATE DEFAULT CURRENT_DATE,
  
  -- Auth
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  medical_notes TEXT
);

-- Member Sub-Department Assignments
CREATE TABLE IF NOT EXISTS member_sub_departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  sub_department_id UUID REFERENCES sub_departments(id) ON DELETE CASCADE,
  role_id UUID REFERENCES leadership_roles(id),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES members(id),
  UNIQUE(member_id, sub_department_id)
);

-- ============================================
-- PHASE 3: CHILDREN MANAGEMENT
-- ============================================

-- Kutr Levels
CREATE TABLE IF NOT EXISTS kutr_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  min_age INTEGER,
  max_age INTEGER,
  description TEXT,
  color TEXT DEFAULT '#3498db',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kutr_levels (name, min_age, max_age, description, color) VALUES
  ('Kutr 1', 3, 6, 'Young children ages 3-6', '#3498db'),
  ('Kutr 2', 7, 10, 'Middle children ages 7-10', '#2ecc71'),
  ('Kutr 3', 11, 14, 'Older children ages 11-14', '#f39c12')
ON CONFLICT (name) DO UPDATE SET
  min_age = EXCLUDED.min_age,
  max_age = EXCLUDED.max_age;

-- Confession Fathers
CREATE TABLE IF NOT EXISTS confession_fathers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  church TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO confession_fathers (full_name, title) VALUES
  ('Memhir Tesfaye', 'Memhir'),
  ('Kes Gebre', 'Kes'),
  ('Memhir Daniel', 'Memhir')
ON CONFLICT DO NOTHING;

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  street_address TEXT,
  city TEXT,
  sub_city TEXT,
  woreda TEXT,
  house_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Families
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  family_name TEXT UNIQUE NOT NULL,
  primary_contact_name TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT,
  address_id UUID REFERENCES addresses(id),
  home_church TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Parents
CREATE TABLE IF NOT EXISTS parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT CHECK (relationship IN ('Father', 'Mother', 'Guardian')),
  phone TEXT,
  email TEXT,
  occupation TEXT,
  is_primary_contact BOOLEAN DEFAULT false
);

-- Children
CREATE TABLE IF NOT EXISTS children (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Core Info
  full_name TEXT NOT NULL,
  baptismal_name TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth DATE,
  age INTEGER,
  
  -- Assignments
  kutr_level_id UUID REFERENCES kutr_levels(id),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  confession_father_id UUID REFERENCES confession_fathers(id),
  
  -- Academic
  level TEXT,
  grade TEXT,
  
  -- Contact
  address_id UUID REFERENCES addresses(id),
  
  -- Medical
  medical_notes TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Photo
  photo_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  graduation_date DATE,
  
  -- Tracking
  registered_by UUID REFERENCES members(id),
  
  -- Notes
  notes TEXT
);

-- Child-Parent Junction
CREATE TABLE IF NOT EXISTS child_parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'biological',
  is_primary_guardian BOOLEAN DEFAULT false,
  UNIQUE(child_id, parent_id)
);

-- ============================================
-- PHASE 4: WEEKLY PROGRAMS
-- ============================================

-- Program Types
CREATE TABLE IF NOT EXISTS program_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO program_types (name, description, icon, color) VALUES
  ('Lesson', 'Timhert teaching session', '📚', '#3498db'),
  ('Choir Practice', 'Mezmur rehearsal', '🎵', '#2ecc71'),
  ('Arts Workshop', 'Kinetibeb creative session', '🎨', '#f39c12'),
  ('Film Showing', 'Kinetibeb film/movie session', '🎬', '#e74c3c'),
  ('Cultural Activity', 'Traditional and cultural programs', '🏛️', '#9b59b6'),
  ('Attendance Review', 'Kuttr attendance tracking', '📋', '#1abc9c'),
  ('Planning Meeting', 'Ekd administrative meeting', '📝', '#34495e'),
  ('General Assembly', 'All sub-departments gathering', '👥', '#e67e22')
ON CONFLICT (name) DO NOTHING;

-- Weekly Programs
CREATE TABLE IF NOT EXISTS weekly_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  sub_department_id UUID REFERENCES sub_departments(id) ON DELETE CASCADE NOT NULL,
  program_type_id UUID REFERENCES program_types(id),
  day_of_week TEXT CHECK (day_of_week IN ('Saturday', 'Sunday')) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  target_kutr_levels UUID[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT true,
  recurrence_start_date DATE,
  recurrence_end_date DATE,
  max_capacity INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_by UUID REFERENCES members(id)
);

-- Program Sessions
CREATE TABLE IF NOT EXISTS program_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  program_id UUID REFERENCES weekly_programs(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  topic TEXT,
  description TEXT,
  location TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES members(id),
  UNIQUE(program_id, session_date)
);

-- Program Member Assignments
CREATE TABLE IF NOT EXISTS program_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES program_sessions(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('lead', 'co_lead', 'assistant', 'supervisor', 'teacher', 'helper')) NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES members(id),
  approved_at TIMESTAMPTZ,
  attended BOOLEAN DEFAULT false,
  check_in_time TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(session_id, member_id)
);

-- Child Attendance
CREATE TABLE IF NOT EXISTS child_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES program_sessions(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'excused', 'late', 'left_early')) NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  recorded_by UUID REFERENCES members(id),
  notes TEXT,
  UNIQUE(child_id, session_id)
);

-- ============================================
-- PHASE 5: TIMHERT ACADEMIC MODULE
-- ============================================

-- Academic Activity Types
CREATE TABLE IF NOT EXISTS academic_activity_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  weight_percentage NUMERIC(5,2) DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO academic_activity_types (name, description, weight_percentage, icon, color) VALUES
  ('Midterm', 'Mid-semester examination', 30, '📝', '#e74c3c'),
  ('Final', 'End of semester examination', 50, '📋', '#c0392b'),
  ('Assignment', 'Homework or classwork assignment', 20, '📄', '#3498db')
ON CONFLICT (name) DO NOTHING;

-- Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'upcoming')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, academic_year)
);

-- Academic Activities
CREATE TABLE IF NOT EXISTS timhert_academic_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  activity_type_id UUID REFERENCES academic_activity_types(id) NOT NULL,
  term_id UUID REFERENCES academic_terms(id),
  kutr_level_id UUID REFERENCES kutr_levels(id) NOT NULL,
  scheduled_date DATE,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  passing_score NUMERIC(5,2) DEFAULT 50,
  teacher_id UUID REFERENCES members(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed', 'graded', 'cancelled')),
  instructions TEXT,
  created_by UUID REFERENCES members(id)
);

-- Academic Scores
CREATE TABLE IF NOT EXISTS timhert_academic_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activity_id UUID REFERENCES timhert_academic_activities(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  percentage NUMERIC(5,2),
  grade_letter TEXT,
  passed BOOLEAN,
  recorded_by UUID REFERENCES members(id),
  remarks TEXT,
  UNIQUE(activity_id, child_id)
);

-- Trigger to auto-calculate percentage, grade_letter, passed on score insert/update
CREATE OR REPLACE FUNCTION fn_calculate_academic_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_max_score     NUMERIC(5,2);
  v_passing_score NUMERIC(5,2);
  v_pct           NUMERIC(5,2);
BEGIN
  SELECT max_score, passing_score
  INTO   v_max_score, v_passing_score
  FROM   timhert_academic_activities
  WHERE  id = NEW.activity_id;

  IF v_max_score IS NOT NULL AND v_max_score > 0 THEN
    v_pct := (NEW.score / v_max_score) * 100;
    NEW.percentage := ROUND(v_pct, 2);
    NEW.grade_letter := CASE
      WHEN v_pct >= 95 THEN 'A+'
      WHEN v_pct >= 90 THEN 'A'
      WHEN v_pct >= 85 THEN 'B+'
      WHEN v_pct >= 80 THEN 'B'
      WHEN v_pct >= 75 THEN 'C+'
      WHEN v_pct >= 70 THEN 'C'
      WHEN v_pct >= 60 THEN 'D'
      ELSE 'F'
    END;
    NEW.passed := NEW.score >= COALESCE(v_passing_score, v_max_score * 0.5);
  ELSE
    NEW.percentage   := 0;
    NEW.grade_letter := 'N/A';
    NEW.passed       := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_academic_score ON timhert_academic_scores;
CREATE TRIGGER trg_calculate_academic_score
  BEFORE INSERT OR UPDATE OF score ON timhert_academic_scores
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_academic_score();

-- ============================================
-- PHASE 6: CHILDREN EVENTS
-- ============================================

-- Children Events
CREATE TABLE IF NOT EXISTS children_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('Timker', 'Hosana', 'Meskel', 'Other')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  requires_performance_score BOOLEAN DEFAULT false,
  max_performance_score NUMERIC(5,2),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES members(id)
);

-- Child Event Registrations
CREATE TABLE IF NOT EXISTS child_event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES children_events(id) ON DELETE CASCADE NOT NULL,
  registration_date DATE DEFAULT CURRENT_DATE,
  registered_by UUID REFERENCES members(id),
  notes TEXT,
  UNIQUE(child_id, event_id)
);

-- Child Event Attendance
CREATE TABLE IF NOT EXISTS child_event_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES children_events(id) ON DELETE CASCADE NOT NULL,
  attendance_status TEXT CHECK (attendance_status IN ('registered', 'attended', 'absent', 'excused')),
  performance_score NUMERIC(5,2),
  check_in_time TIMESTAMPTZ,
  recorded_by UUID REFERENCES members(id),
  notes TEXT,
  UNIQUE(child_id, event_id)
);

-- Event Member Assignments
CREATE TABLE IF NOT EXISTS event_member_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_id UUID REFERENCES children_events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('coordinator', 'supervisor', 'helper')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES members(id),
  UNIQUE(event_id, member_id)
);

-- ============================================
-- PHASE 7: MEMBER ACTIVITIES
-- ============================================

-- Member Activities
CREATE TABLE IF NOT EXISTS member_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT CHECK (activity_type IN ('Adar Program', 'Project', 'Training', 'Meeting', 'Community Service', 'Other')) NOT NULL,
  sub_department_id UUID REFERENCES sub_departments(id),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  requires_completion BOOLEAN DEFAULT false,
  max_participants INTEGER,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES members(id),
  notes TEXT
);

-- Member Activity Participation
CREATE TABLE IF NOT EXISTS member_activity_participation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activity_id UUID REFERENCES member_activities(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('leader', 'co_leader', 'assistant', 'participant', 'observer')) NOT NULL,
  participation_status TEXT DEFAULT 'assigned' CHECK (participation_status IN ('assigned', 'confirmed', 'attended', 'absent', 'excused')),
  check_in_time TIMESTAMPTZ,
  completion_status TEXT CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'incomplete')),
  contribution_notes TEXT,
  score NUMERIC(5,2),
  recorded_by UUID REFERENCES members(id),
  UNIQUE(activity_id, member_id)
);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('member-photos', 'member-photos', true),
  ('child-photos', 'child-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public can view member photos" ON storage.objects;
CREATE POLICY "Public can view member photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Auth users can upload member photos" ON storage.objects;
CREATE POLICY "Auth users can upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Public can view child photos" ON storage.objects;
CREATE POLICY "Public can view child photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'child-photos');

DROP POLICY IF EXISTS "Auth users can upload child photos" ON storage.objects;
CREATE POLICY "Auth users can upload child photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'child-photos');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user is any leader
CREATE OR REPLACE FUNCTION is_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members m
    JOIN member_sub_departments msd ON m.id = msd.member_id
    JOIN leadership_roles lr ON msd.role_id = lr.id
    WHERE m.auth_user_id = auth.uid()
    AND lr.name IN ('Chairperson', 'Vice Chairperson', 'Secretary')
    AND msd.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is department leader
CREATE OR REPLACE FUNCTION is_department_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members m
    JOIN member_sub_departments msd ON m.id = msd.member_id
    JOIN leadership_roles lr ON msd.role_id = lr.id
    WHERE m.auth_user_id = auth.uid()
    AND lr.name IN ('Chairperson', 'Vice Chairperson', 'Secretary')
    AND msd.sub_department_id = '00000000-0000-0000-0000-000000000001'
    AND msd.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a system user
CREATE OR REPLACE FUNCTION is_system_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_leader();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get accessible sub-departments
CREATE OR REPLACE FUNCTION get_accessible_sub_departments()
RETURNS UUID[] AS $$
DECLARE
  is_dept_leader BOOLEAN;
  sub_dept_ids UUID[];
BEGIN
  SELECT is_department_leader() INTO is_dept_leader;
  
  IF is_dept_leader THEN
    SELECT ARRAY_AGG(id) INTO sub_dept_ids 
    FROM sub_departments 
    WHERE id != '00000000-0000-0000-0000-000000000001';
  ELSE
    SELECT ARRAY_AGG(DISTINCT msd.sub_department_id) INTO sub_dept_ids
    FROM members m
    JOIN member_sub_departments msd ON m.id = msd.member_id AND msd.is_active = true
    JOIN leadership_roles lr ON msd.role_id = lr.id
    WHERE m.auth_user_id = auth.uid() 
    AND lr.name IN ('Chairperson', 'Vice Chairperson', 'Secretary')
    AND msd.sub_department_id != '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN COALESCE(sub_dept_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role info
CREATE OR REPLACE FUNCTION get_current_user_roles()
RETURNS TABLE (
  member_id UUID,
  full_name TEXT,
  email TEXT,
  role_name TEXT,
  hierarchy_level INTEGER,
  sub_department_id UUID,
  sub_department_name TEXT,
  is_department_leader BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.full_name,
    m.email,
    lr.name,
    lr.hierarchy_level,
    msd.sub_department_id,
    sd.name,
    (lr.name IN ('Chairperson', 'Vice Chairperson', 'Secretary') 
     AND msd.sub_department_id = '00000000-0000-0000-0000-000000000001')
  FROM members m
  JOIN member_sub_departments msd ON m.id = msd.member_id AND msd.is_active = true
  JOIN leadership_roles lr ON msd.role_id = lr.id
  LEFT JOIN sub_departments sd ON msd.sub_department_id = sd.id
  WHERE m.auth_user_id = auth.uid()
  ORDER BY lr.hierarchy_level ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (email, full_name, auth_user_id)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign Kutr level by age
CREATE OR REPLACE FUNCTION assign_kutr_level()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.date_of_birth))::INTEGER;
    SELECT id INTO NEW.kutr_level_id
    FROM kutr_levels
    WHERE NEW.age BETWEEN min_age AND max_age
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_kutr_level ON children;
CREATE TRIGGER trigger_assign_kutr_level
  BEFORE INSERT OR UPDATE OF date_of_birth ON children
  FOR EACH ROW EXECUTE FUNCTION assign_kutr_level();

-- Generate program sessions
CREATE OR REPLACE FUNCTION generate_program_sessions(
  p_program_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_program RECORD;
  v_current_date DATE;
  v_session_count INTEGER := 0;
  v_day_of_week INTEGER;
BEGIN
  SELECT * INTO v_program FROM weekly_programs WHERE id = p_program_id;
  
  IF v_program IS NULL THEN
    RAISE EXCEPTION 'Program not found';
  END IF;
  
  IF v_program.day_of_week = 'Sunday' THEN
    v_day_of_week := 0;
  ELSE
    v_day_of_week := 6;
  END IF;
  
  v_current_date := p_start_date;
  WHILE EXTRACT(DOW FROM v_current_date) != v_day_of_week LOOP
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO program_sessions (program_id, session_date, start_time, end_time, status)
    VALUES (p_program_id, v_current_date, v_program.start_time, v_program.end_time, 'scheduled')
    ON CONFLICT (program_id, session_date) DO NOTHING;
    
    v_session_count := v_session_count + 1;
    v_current_date := v_current_date + INTERVAL '7 days';
  END LOOP;
  
  RETURN v_session_count;
END;
$$ LANGUAGE plpgsql;

-- Record child score
CREATE OR REPLACE FUNCTION record_child_score(
  p_activity_id UUID,
  p_child_id UUID,
  p_score NUMERIC(5,2),
  p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
  v_score_id UUID;
  v_max_score NUMERIC(5,2);
BEGIN
  SELECT m.id INTO v_member_id FROM members m WHERE m.auth_user_id = auth.uid();
  SELECT max_score INTO v_max_score FROM timhert_academic_activities WHERE id = p_activity_id;

  IF p_score < 0 THEN
    RAISE EXCEPTION 'Score cannot be negative';
  END IF;
  IF p_score > v_max_score THEN
    RAISE EXCEPTION 'Score cannot exceed maximum score';
  END IF;

  INSERT INTO timhert_academic_scores (activity_id, child_id, score, recorded_by, remarks)
  VALUES (p_activity_id, p_child_id, p_score, v_member_id, p_remarks)
  ON CONFLICT (activity_id, child_id)
  DO UPDATE SET score = EXCLUDED.score, recorded_by = v_member_id, 
                remarks = EXCLUDED.remarks, updated_at = NOW()
  RETURNING id INTO v_score_id;

  RETURN v_score_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark child attendance
CREATE OR REPLACE FUNCTION mark_child_attendance(
  p_session_id UUID,
  p_child_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT m.id INTO v_member_id FROM members m WHERE m.auth_user_id = auth.uid();

  INSERT INTO child_attendance (child_id, session_id, status, recorded_by, check_in_time, notes)
  VALUES (p_child_id, p_session_id, p_status, v_member_id, 
    CASE WHEN p_status IN ('present', 'late') THEN NOW() ELSE NULL END, p_notes)
  ON CONFLICT (child_id, session_id)
  DO UPDATE SET status = EXCLUDED.status,
    check_in_time = CASE WHEN EXCLUDED.status IN ('present', 'late') 
                         AND child_attendance.check_in_time IS NULL 
                    THEN NOW() ELSE child_attendance.check_in_time END,
    recorded_by = v_member_id, notes = EXCLUDED.notes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES - ENABLE ON ALL TABLES
-- ============================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- ============================================
-- RLS POLICIES - MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Dept leaders full access to members" ON members;
CREATE POLICY "Dept leaders full access to members" ON members
  FOR ALL TO authenticated USING (is_department_leader());

DROP POLICY IF EXISTS "Sub-dept leaders can view members" ON members;
CREATE POLICY "Sub-dept leaders can view members" ON members
  FOR SELECT TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Users can view own record" ON members;
CREATE POLICY "Users can view own record" ON members
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own record" ON members;
CREATE POLICY "Users can update own record" ON members
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- ============================================
-- RLS POLICIES - CHILDREN
-- ============================================
DROP POLICY IF EXISTS "Leaders full access to children" ON children;
CREATE POLICY "Leaders full access to children" ON children
  FOR ALL TO authenticated USING (is_leader());

-- ============================================
-- RLS POLICIES - LOOKUP TABLES
-- ============================================
DROP POLICY IF EXISTS "Auth users can read sub_departments" ON sub_departments;
CREATE POLICY "Auth users can read sub_departments" ON sub_departments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can read leadership_roles" ON leadership_roles;
CREATE POLICY "Auth users can read leadership_roles" ON leadership_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can read kutr_levels" ON kutr_levels;
CREATE POLICY "Auth users can read kutr_levels" ON kutr_levels
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can read program_types" ON program_types;
CREATE POLICY "Auth users can read program_types" ON program_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can read academic_activity_types" ON academic_activity_types;
CREATE POLICY "Auth users can read academic_activity_types" ON academic_activity_types
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- RLS POLICIES - REMAINING TABLES (Leaders only)
-- ============================================
DROP POLICY IF EXISTS "Leaders access to families" ON families;
CREATE POLICY "Leaders access to families" ON families
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to parents" ON parents;
CREATE POLICY "Leaders access to parents" ON parents
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to addresses" ON addresses;
CREATE POLICY "Leaders access to addresses" ON addresses
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to weekly_programs" ON weekly_programs;
CREATE POLICY "Leaders access to weekly_programs" ON weekly_programs
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to program_sessions" ON program_sessions;
CREATE POLICY "Leaders access to program_sessions" ON program_sessions
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to program_assignments" ON program_assignments;
CREATE POLICY "Leaders access to program_assignments" ON program_assignments
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to child_attendance" ON child_attendance;
CREATE POLICY "Leaders access to child_attendance" ON child_attendance
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to academic_activities" ON timhert_academic_activities;
CREATE POLICY "Leaders access to academic_activities" ON timhert_academic_activities
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to academic_scores" ON timhert_academic_scores;
CREATE POLICY "Leaders access to academic_scores" ON timhert_academic_scores
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to children_events" ON children_events;
CREATE POLICY "Leaders access to children_events" ON children_events
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to member_activities" ON member_activities;
CREATE POLICY "Leaders access to member_activities" ON member_activities
  FOR ALL TO authenticated USING (is_leader());

DROP POLICY IF EXISTS "Leaders access to member_sub_departments" ON member_sub_departments;
CREATE POLICY "Leaders access to member_sub_departments" ON member_sub_departments
  FOR ALL TO authenticated USING (is_leader());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DO $$
DECLARE
    triggers TEXT[][] := ARRAY[
        ARRAY['members', 'trigger_update_members_timestamp'],
        ARRAY['families', 'trigger_update_families_timestamp'],
        ARRAY['children', 'trigger_update_children_timestamp'],
        ARRAY['weekly_programs', 'trigger_update_programs_timestamp'],
        ARRAY['program_sessions', 'trigger_update_sessions_timestamp'],
        ARRAY['timhert_academic_activities', 'trigger_update_academic_activities_timestamp'],
        ARRAY['timhert_academic_scores', 'trigger_update_academic_scores_timestamp'],
        ARRAY['children_events', 'trigger_update_events_timestamp'],
        ARRAY['member_activities', 'trigger_update_member_activities_timestamp'],
        ARRAY['member_activity_participation', 'trigger_update_participation_timestamp']
    ];
    t TEXT[];
BEGIN
    FOREACH t SLICE 1 IN ARRAY triggers
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I;', t[2], t[1]);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t[2], t[1]);
    END LOOP;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_campus ON members(campus);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_children_full_name ON children(full_name);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_kutr_level ON children(kutr_level_id);
CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_children_dob ON children(date_of_birth);

CREATE INDEX IF NOT EXISTS idx_parents_family ON parents(family_id);
CREATE INDEX IF NOT EXISTS idx_families_name ON families(family_name);

CREATE INDEX IF NOT EXISTS idx_weekly_programs_sub_dept ON weekly_programs(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_weekly_programs_day ON weekly_programs(day_of_week);
CREATE INDEX IF NOT EXISTS idx_weekly_programs_status ON weekly_programs(status);

CREATE INDEX IF NOT EXISTS idx_program_sessions_date ON program_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program ON program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_sessions_status ON program_sessions(status);

CREATE INDEX IF NOT EXISTS idx_program_assignments_session ON program_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_member ON program_assignments(member_id);

CREATE INDEX IF NOT EXISTS idx_child_attendance_child ON child_attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_child_attendance_session ON child_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_child_attendance_status ON child_attendance(status);

CREATE INDEX IF NOT EXISTS idx_academic_activities_kutr ON timhert_academic_activities(kutr_level_id);
CREATE INDEX IF NOT EXISTS idx_academic_activities_term ON timhert_academic_activities(term_id);
CREATE INDEX IF NOT EXISTS idx_academic_activities_status ON timhert_academic_activities(status);
CREATE INDEX IF NOT EXISTS idx_academic_activities_type ON timhert_academic_activities(activity_type_id);

CREATE INDEX IF NOT EXISTS idx_academic_scores_activity ON timhert_academic_scores(activity_id);
CREATE INDEX IF NOT EXISTS idx_academic_scores_child ON timhert_academic_scores(child_id);
CREATE INDEX IF NOT EXISTS idx_academic_scores_passed ON timhert_academic_scores(passed);

CREATE INDEX IF NOT EXISTS idx_events_date ON children_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON children_events(event_type);

CREATE INDEX IF NOT EXISTS idx_member_activities_sub_dept ON member_activities(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_date ON member_activities(start_date);
CREATE INDEX IF NOT EXISTS idx_member_activities_status ON member_activities(status);

CREATE INDEX IF NOT EXISTS idx_member_participation_activity ON member_activity_participation(activity_id);
CREATE INDEX IF NOT EXISTS idx_member_participation_member ON member_activity_participation(member_id);

CREATE INDEX IF NOT EXISTS idx_member_sub_dept_member ON member_sub_departments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_sub_dept_sub_dept ON member_sub_departments(sub_department_id);

-- ============================================
-- VIEWS
-- ============================================

-- Upcoming Sessions View
CREATE OR REPLACE VIEW upcoming_sessions AS
SELECT 
  ps.id,
  ps.session_date,
  ps.start_time,
  ps.end_time,
  ps.topic AS session_topic,
  ps.status AS session_status,
  wp.title AS program_title,
  wp.day_of_week,
  sd.name AS sub_department_name,
  pt.name AS program_type_name,
  pt.color AS program_type_color,
  wp.location,
  COUNT(DISTINCT pa.id) AS assigned_members_count,
  COUNT(DISTINCT ca.id) AS attendance_marked_count
FROM program_sessions ps
JOIN weekly_programs wp ON ps.program_id = wp.id
JOIN sub_departments sd ON wp.sub_department_id = sd.id
LEFT JOIN program_types pt ON wp.program_type_id = pt.id
LEFT JOIN program_assignments pa ON ps.id = pa.session_id
LEFT JOIN child_attendance ca ON ps.id = ca.session_id
WHERE ps.session_date >= CURRENT_DATE
  AND ps.status != 'cancelled'
GROUP BY ps.id, ps.session_date, ps.start_time, ps.end_time, ps.topic, ps.status,
         wp.title, wp.day_of_week, sd.name, pt.name, pt.color, wp.location
ORDER BY ps.session_date, ps.start_time;

-- ============================================
-- DONE!
-- ============================================
-- Total tables created: 22
-- Total functions: 10
-- Total views: 1
-- All phases complete: 1-7 (Phase 8 functions to be added separately)
-- ============================================
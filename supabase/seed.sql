-- ============================================================
-- seed.sql
-- Seed data for Hitsanat KFL Management System
-- Sourced from src/app/data/mockData.ts
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

-- ============================================================
-- MEMBERS
-- ============================================================

INSERT INTO members (id, student_id, name, year_of_study, phone, email, sub_departments, families, join_date)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'STU001', 'Almaz Tesfaye',  3, '+251 911 100001', 'almaz@email.com',  ARRAY['Timhert'],           ARRAY['f1','f2'], '2023-09-01'),
  ('00000000-0000-0000-0000-000000000002', 'STU002', 'Dawit Mengistu', 4, '+251 911 100002', 'dawit@email.com',  ARRAY['Timhert','Mezmur'],  ARRAY['f3'],      '2022-09-01'),
  ('00000000-0000-0000-0000-000000000003', 'STU003', 'Tsion Haile',    2, '+251 911 100003', 'tsion@email.com',  ARRAY['Mezmur'],            ARRAY['f4','f5'], '2024-01-15'),
  ('00000000-0000-0000-0000-000000000004', 'STU004', 'Daniel Assefa',  5, '+251 911 100004', 'daniel@email.com', ARRAY['Kinetibeb'],         ARRAY['f6'],      '2021-09-01'),
  ('00000000-0000-0000-0000-000000000005', 'STU005', 'Kidus Worku',    3, '+251 911 100005', 'kidus@email.com',  ARRAY['Kuttr'],             ARRAY['f7'],      '2023-09-01'),
  ('00000000-0000-0000-0000-000000000006', 'STU006', 'Martha Negash',  4, '+251 911 100006', 'martha@email.com', ARRAY['Ekd','Kuttr'],       ARRAY['f1'],      '2022-09-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CHILDREN
-- ============================================================

INSERT INTO children (id, name, age, kutr_level, family_id, family_name, guardian_contact, registration_date)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Abigail Tekle',     8,  1, 'f1', 'Tekle Family',     '+251 911 111111', '2024-01-15'),
  ('00000000-0000-0000-0000-000000000102', 'Bemnet Hailu',      10, 2, 'f2', 'Hailu Family',     '+251 911 222222', '2024-01-20'),
  ('00000000-0000-0000-0000-000000000103', 'Caleb Mekonnen',    12, 3, 'f3', 'Mekonnen Family',  '+251 911 333333', '2024-02-01'),
  ('00000000-0000-0000-0000-000000000104', 'Dagmawit Yosef',    7,  1, 'f1', 'Tekle Family',     '+251 911 111111', '2024-02-10'),
  ('00000000-0000-0000-0000-000000000105', 'Elias Gebru',       11, 2, 'f4', 'Gebru Family',     '+251 911 444444', '2024-02-15'),
  ('00000000-0000-0000-0000-000000000106', 'Feven Abraham',     13, 3, 'f5', 'Abraham Family',   '+251 911 555555', '2024-03-01'),
  ('00000000-0000-0000-0000-000000000107', 'Gelila Shiferaw',   9,  2, 'f6', 'Shiferaw Family',  '+251 911 666666', '2024-03-10'),
  ('00000000-0000-0000-0000-000000000108', 'Henok Alemayehu',   8,  1, 'f7', 'Alemayehu Family', '+251 911 777777', '2024-03-15')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PROGRAM SLOTS (from mockWeeklyPrograms)
-- program_slots has no natural unique key in the schema, so we
-- use the fixed UUIDs and rely on the PK conflict to be idempotent.
-- ============================================================

INSERT INTO program_slots (id, date, day, kutr_levels, start_time, end_time, sub_department_id, assigned_member_id)
VALUES
  ('00000000-0000-0000-0000-000000000201', '2026-04-05', 'Saturday', ARRAY[1,2,3], '09:00', '11:00', 'sd1', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000202', '2026-04-05', 'Saturday', ARRAY[1,2,3], '09:00', '11:00', 'sd2', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000203', '2026-04-06', 'Sunday',   ARRAY[1,2,3], '09:00', '11:00', 'sd1', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000204', '2026-04-06', 'Sunday',   ARRAY[1,2,3], '09:00', '11:00', 'sd3', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CHILD EVENTS
-- ============================================================

INSERT INTO child_events (id, name, type, date, description, participants, supervisors, status)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'Timker Celebration', 'Timker', '2026-01-19', 'Annual Timker celebration with baptism ceremony',  45, ARRAY['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'], 'completed'),
  ('00000000-0000-0000-0000-000000000302', 'Hosana Festival',    'Hosana', '2026-04-13', 'Palm Sunday celebration and procession',           52, ARRAY['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005'], 'upcoming'),
  ('00000000-0000-0000-0000-000000000303', 'Meskel Celebration', 'Meskel', '2026-09-27', 'Finding of the True Cross celebration',             0, ARRAY[]::text[], 'upcoming')
ON CONFLICT DO NOTHING;

-- ============================================================
-- MEMBER ACTIVITIES
-- ============================================================

INSERT INTO member_activities (id, name, sub_department_id, date, description, assigned_members, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    'Adar Program Planning',
    'sd1',
    '2026-04-15',
    'Monthly Adar program preparation and coordination',
    '[{"memberId":"00000000-0000-0000-0000-000000000001","role":"Leader"},{"memberId":"00000000-0000-0000-0000-000000000002","role":"Assistant"}]'::jsonb,
    'planned'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    'Mezmur Recording Session',
    'sd2',
    '2026-04-20',
    'Studio recording for new hymn album',
    '[{"memberId":"00000000-0000-0000-0000-000000000003","role":"Coordinator"}]'::jsonb,
    'planned'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIMHERT ACTIVITIES
-- ============================================================

INSERT INTO timhert_activities (id, name, type, kutr_level, max_score, date, status)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'Midterm Exam - January', 'Midterm',    1, 50,  '2026-01-25', 'completed'),
  ('00000000-0000-0000-0000-000000000502', 'Final Exam - March',     'Final',      1, 100, '2026-03-20', 'completed'),
  ('00000000-0000-0000-0000-000000000503', 'Assignment - April',     'Assignment', 2, 25,  '2026-04-10', 'scheduled'),
  ('00000000-0000-0000-0000-000000000504', 'Midterm Exam - April',   'Midterm',    3, 50,  '2026-04-28', 'scheduled')
ON CONFLICT DO NOTHING;

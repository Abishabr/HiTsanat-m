-- ============================================================
-- SEED: 18 System Users
-- 3 Department leaders + 15 Sub-department leaders (3 per sub-dept)
-- Run AFTER the schema (deepseek_sql_20260424_7a7bde.sql) is applied.
--
-- NOTE: These members have no auth_user_id yet.
-- After creating auth users in Supabase Dashboard, link them with:
--   UPDATE members SET auth_user_id = '<auth-uuid>' WHERE email = '<email>';
-- ============================================================

-- Step 1: Insert 18 members
INSERT INTO members (id, full_name, baptismal_name, gender, campus, university_year, phone, email, status, join_date) VALUES

  -- DEPARTMENT LEADERS (3)
  ('11111111-0000-0000-0000-000000000001', 'Mahider Demelash',    'Maryam',    'Female', 'Main', '4th Year', '+251911100001', 'mahider@hitsanat.com',     'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000002', 'Luel Seged Tadesse',  'Gebre',     'Male',   'Main', '3rd Year', '+251911100002', 'luel@hitsanat.com',        'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000003', 'Hana Girma',          'Selam',     'Female', 'HIT',  '4th Year', '+251911100003', 'hana@hitsanat.com',        'active', '2022-01-01'),

  -- TIMHERT LEADERS (3)
  ('11111111-0000-0000-0000-000000000004', 'Abrham Habtamu',      'Mikael',    'Male',   'Main', '3rd Year', '+251911100004', 'abrham.t@hitsanat.com',    'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000005', 'Tigist Bekele',       'Hirut',     'Female', 'Main', '2nd Year', '+251911100005', 'tigist.t@hitsanat.com',    'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000006', 'Yonas Alemu',         'Yohannes',  'Male',   'HIT',  '4th Year', '+251911100006', 'yonas.t@hitsanat.com',     'active', '2022-01-01'),

  -- MEZMUR LEADERS (3)
  ('11111111-0000-0000-0000-000000000007', 'Bezawit Girma',       'Tsion',     'Female', 'Main', '3rd Year', '+251911100007', 'bezawit.m@hitsanat.com',   'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000008', 'Dawit Tesfaye',       'Dawit',     'Male',   'Main', '4th Year', '+251911100008', 'dawit.m@hitsanat.com',     'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000009', 'Meron Tadesse',       'Marta',     'Female', 'VET',  '2nd Year', '+251911100009', 'meron.m@hitsanat.com',     'active', '2022-01-01'),

  -- KINETIBEB LEADERS (3)
  ('11111111-0000-0000-0000-000000000010', 'Kidist Ymechewale',   'Kidist',    'Female', 'Main', '3rd Year', '+251911100010', 'kidist.k@hitsanat.com',    'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000011', 'Samuel Kebede',       'Samson',    'Male',   'HIT',  '4th Year', '+251911100011', 'samuel.k@hitsanat.com',    'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000012', 'Rahel Haile',         'Rahel',     'Female', 'Main', '2nd Year', '+251911100012', 'rahel.k@hitsanat.com',     'active', '2022-01-01'),

  -- KUTTR LEADERS (3)
  ('11111111-0000-0000-0000-000000000013', 'Kenenissa Bekele',    'Kiros',     'Male',   'Main', '4th Year', '+251911100013', 'kenenissa.ku@hitsanat.com','active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000014', 'Selamawit Tesfaye',   'Selamawit', 'Female', 'VET',  '3rd Year', '+251911100014', 'selam.ku@hitsanat.com',    'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000015', 'Biruk Alemu',         'Biruk',     'Male',   'Main', '2nd Year', '+251911100015', 'biruk.ku@hitsanat.com',    'active', '2022-01-01'),

  -- EKD LEADERS (3)
  ('11111111-0000-0000-0000-000000000016', 'Natnael Girma',       'Natnael',   'Male',   'Main', '4th Year', '+251911100016', 'natnael.e@hitsanat.com',   'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000017', 'Fikirte Habtamu',     'Fikirte',   'Female', 'HIT',  '3rd Year', '+251911100017', 'fikirte.e@hitsanat.com',   'active', '2022-01-01'),
  ('11111111-0000-0000-0000-000000000018', 'Henok Tadesse',       'Henok',     'Male',   'Main', '2nd Year', '+251911100018', 'henok.e@hitsanat.com',     'active', '2022-01-01')

ON CONFLICT (id) DO NOTHING;


-- Step 2: Assign roles to sub-departments
INSERT INTO member_sub_departments (member_id, sub_department_id, role_id, is_active) VALUES

  -- DEPARTMENT LEADERS
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true),

  -- TIMHERT
  ('11111111-0000-0000-0000-000000000004', (SELECT id FROM sub_departments WHERE name = 'Timhert'),    (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000005', (SELECT id FROM sub_departments WHERE name = 'Timhert'),    (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000006', (SELECT id FROM sub_departments WHERE name = 'Timhert'),    (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true),

  -- MEZMUR
  ('11111111-0000-0000-0000-000000000007', (SELECT id FROM sub_departments WHERE name = 'Mezmur'),     (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000008', (SELECT id FROM sub_departments WHERE name = 'Mezmur'),     (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000009', (SELECT id FROM sub_departments WHERE name = 'Mezmur'),     (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true),

  -- KINETIBEB
  ('11111111-0000-0000-0000-000000000010', (SELECT id FROM sub_departments WHERE name = 'Kinetibeb'),  (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000011', (SELECT id FROM sub_departments WHERE name = 'Kinetibeb'),  (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000012', (SELECT id FROM sub_departments WHERE name = 'Kinetibeb'),  (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true),

  -- KUTTR
  ('11111111-0000-0000-0000-000000000013', (SELECT id FROM sub_departments WHERE name = 'Kuttr'),      (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000014', (SELECT id FROM sub_departments WHERE name = 'Kuttr'),      (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000015', (SELECT id FROM sub_departments WHERE name = 'Kuttr'),      (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true),

  -- EKD
  ('11111111-0000-0000-0000-000000000016', (SELECT id FROM sub_departments WHERE name = 'Ekd'),        (SELECT id FROM leadership_roles WHERE name = 'Chairperson'),      true),
  ('11111111-0000-0000-0000-000000000017', (SELECT id FROM sub_departments WHERE name = 'Ekd'),        (SELECT id FROM leadership_roles WHERE name = 'Vice Chairperson'), true),
  ('11111111-0000-0000-0000-000000000018', (SELECT id FROM sub_departments WHERE name = 'Ekd'),        (SELECT id FROM leadership_roles WHERE name = 'Secretary'),        true)

ON CONFLICT (member_id, sub_department_id) DO NOTHING;


-- ============================================================
-- After running this seed, create auth users in Supabase Dashboard
-- then link them to members:
--
-- UPDATE members SET auth_user_id = '<auth-uuid>'
-- WHERE email = 'mahider@hitsanat.com';
--
-- Credentials for auth users:
--   mahider@hitsanat.com     / Mahider@1234   (Dept Chairperson)
--   luel@hitsanat.com        / Luel@1234      (Dept Vice Chair)
--   hana@hitsanat.com        / Hana@1234      (Dept Secretary)
--   abrham.t@hitsanat.com    / Abrham@1234    (Timhert Chair)
--   tigist.t@hitsanat.com    / Tigist@1234    (Timhert Vice)
--   yonas.t@hitsanat.com     / Yonas@1234     (Timhert Secretary)
--   bezawit.m@hitsanat.com   / Bezawit@1234   (Mezmur Chair)
--   dawit.m@hitsanat.com     / Dawit@1234     (Mezmur Vice)
--   meron.m@hitsanat.com     / Meron@1234     (Mezmur Secretary)
--   kidist.k@hitsanat.com    / Kidist@1234    (Kinetibeb Chair)
--   samuel.k@hitsanat.com    / Samuel@1234    (Kinetibeb Vice)
--   rahel.k@hitsanat.com     / Rahel@1234     (Kinetibeb Secretary)
--   kenenissa.ku@hitsanat.com/ Kenenissa@1234 (Kuttr Chair)
--   selam.ku@hitsanat.com    / Selam@1234     (Kuttr Vice)
--   biruk.ku@hitsanat.com    / Biruk@1234     (Kuttr Secretary)
--   natnael.e@hitsanat.com   / Natnael@1234   (Ekd Chair)
--   fikirte.e@hitsanat.com   / Fikirte@1234   (Ekd Vice)
--   henok.e@hitsanat.com     / Henok@1234     (Ekd Secretary)
-- ============================================================

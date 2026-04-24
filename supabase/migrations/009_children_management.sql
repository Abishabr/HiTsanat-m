-- ============================================================
-- 009_children_management.sql
--
-- Fully normalized 3NF schema for Children Management.
--
-- Tables (in dependency order):
--   1. kutr_levels          - Age-based grouping reference
--   2. confession_fathers   - Spiritual fathers reference
--   3. addresses            - Normalized address table
--   4. families             - Family unit (links to address)
--   5. child_parents        - Parents/guardians per family
--   6. children             - Core child records
--   7. child_parent_links   - Junction: child ↔ parent
--
-- Functions:
--   search_children()         - Filtered search with joined data
--   get_child_details()       - Full child JSON with siblings
--   get_family_with_members() - Family JSON with parents+children
--   get_children_statistics() - Aggregate counts
--   search_families()         - Family search with counts
--   get_kutr_levels()         - Ordered kutr level list
--   get_confession_fathers()  - Confession father list
--
-- Triggers:
--   auto_assign_kutr_level    - Sets kutr_level_id from DOB
--   update_children_updated_at
--   update_families_updated_at
--
-- RLS: reuses is_system_user() / is_department_leader() from 007
--
-- Depends on: 007_rls_and_access_functions.sql, 008_member_management.sql
-- ============================================================


-- ============================================================
-- SECTION 1: LOOKUP TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: kutr_levels
-- Age-based grouping for children ministry.
-- Kutr 1: 3-6 yrs, Kutr 2: 7-10 yrs, Kutr 3: 11-14 yrs
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kutr_levels (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  min_age     INTEGER NOT NULL CHECK (min_age >= 0),
  max_age     INTEGER NOT NULL CHECK (max_age > min_age),
  description TEXT,
  color       TEXT    NOT NULL DEFAULT '#6b7280',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.kutr_levels IS
  'Age-based grouping levels for children ministry (Kutr 1/2/3).';

-- ------------------------------------------------------------
-- TABLE: confession_fathers
-- Spiritual/confession fathers (Yebetesubu Nseha Abat).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.confession_fathers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  title      TEXT,
  phone      TEXT,
  church     TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confession_fathers IS
  'Spiritual/confession fathers (Yebetesubu Nseha Abat) reference table.';


-- ============================================================
-- SECTION 2: CORE NORMALIZED TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: addresses
-- Separate address table — multiple families can share one.
-- Satisfies 3NF: address data depends only on address PK.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_address TEXT,
  city           TEXT,
  sub_city       TEXT,
  woreda         TEXT,
  house_number   TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.addresses IS
  'Normalized address table. Multiple families can share one address row.';

-- ------------------------------------------------------------
-- TABLE: families
-- A family unit groups parents and children together.
-- Satisfies 3NF: all non-key columns depend only on family PK.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.families (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name           TEXT NOT NULL UNIQUE,
  primary_contact_name  TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT CHECK (
    primary_contact_email IS NULL
    OR primary_contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  address_id            UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  home_church           TEXT,
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.families IS
  'Family unit linking parents and children. Each family has one address.';

-- ------------------------------------------------------------
-- TABLE: child_parents  (renamed from "parents" to avoid
-- collision with the existing parents table used by children
-- in the old schema — this is the NEW normalized parents table)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_parents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id          UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  relationship       TEXT NOT NULL
                       CHECK (relationship IN ('Father', 'Mother', 'Guardian')),
  phone              TEXT,
  email              TEXT CHECK (
    email IS NULL
    OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  occupation         TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Phone unique per family (siblings share parents, not across families)
  UNIQUE (family_id, phone)
);

COMMENT ON TABLE public.child_parents IS
  'Parents and guardians. Linked to a family; siblings share the same parent rows.';


-- ------------------------------------------------------------
-- TABLE: children
-- Core child record. References families, kutr_levels,
-- confession_fathers, and members (registered_by).
--
-- Generated columns:
--   full_name  = first_name || ' ' || last_name
--   age        = years between date_of_birth and today
--
-- Constraints:
--   date_of_birth cannot be in the future
--   graduation_date must be after enrollment_date
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.children (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name                   TEXT NOT NULL,
  last_name                    TEXT NOT NULL,
  full_name                    TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  baptismal_name               TEXT,
  gender                       TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth                DATE CHECK (date_of_birth <= CURRENT_DATE),
  age                          INTEGER GENERATED ALWAYS AS (
                                 EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))::INTEGER
                               ) STORED,
  family_id                    UUID REFERENCES public.families(id) ON DELETE SET NULL,
  kutr_level_id                UUID REFERENCES public.kutr_levels(id) ON DELETE SET NULL,
  confession_father_id         UUID REFERENCES public.confession_fathers(id) ON DELETE SET NULL,
  level                        TEXT,
  grade                        TEXT,
  photo_url                    TEXT,
  medical_notes                TEXT,
  allergies                    TEXT,
  emergency_contact_name       TEXT,
  emergency_contact_phone      TEXT,
  emergency_contact_relationship TEXT,
  status                       TEXT NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive', 'graduated')),
  enrollment_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  graduation_date              DATE CHECK (
                                 graduation_date IS NULL
                                 OR graduation_date > enrollment_date
                               ),
  registered_by                UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.children IS
  'Core child records. age and full_name are generated columns.';

-- ------------------------------------------------------------
-- TABLE: child_parent_links  (junction table)
-- Many-to-many: a child can have multiple parents/guardians,
-- and a parent can have multiple children (siblings).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_parent_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id           UUID NOT NULL REFERENCES public.child_parents(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL DEFAULT 'biological'
                        CHECK (relationship_type IN ('biological', 'step', 'guardian', 'other')),
  is_primary_guardian BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (child_id, parent_id)
);

COMMENT ON TABLE public.child_parent_links IS
  'Junction table linking children to their parents/guardians.';


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- children
CREATE INDEX IF NOT EXISTS idx_children_full_name
  ON public.children(full_name);
CREATE INDEX IF NOT EXISTS idx_children_status
  ON public.children(status);
CREATE INDEX IF NOT EXISTS idx_children_kutr_level_id
  ON public.children(kutr_level_id);
CREATE INDEX IF NOT EXISTS idx_children_family_id
  ON public.children(family_id);
CREATE INDEX IF NOT EXISTS idx_children_date_of_birth
  ON public.children(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_children_confession_father_id
  ON public.children(confession_father_id);

-- families
CREATE INDEX IF NOT EXISTS idx_families_family_name
  ON public.families(family_name);
CREATE INDEX IF NOT EXISTS idx_families_status
  ON public.families(status);
CREATE INDEX IF NOT EXISTS idx_families_address_id
  ON public.families(address_id);

-- child_parents
CREATE INDEX IF NOT EXISTS idx_child_parents_family_id
  ON public.child_parents(family_id);
CREATE INDEX IF NOT EXISTS idx_child_parents_full_name
  ON public.child_parents(full_name);
CREATE INDEX IF NOT EXISTS idx_child_parents_phone
  ON public.child_parents(phone);

-- addresses
CREATE INDEX IF NOT EXISTS idx_addresses_city
  ON public.addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_sub_city
  ON public.addresses(sub_city);

-- child_parent_links
CREATE INDEX IF NOT EXISTS idx_cpl_child_id
  ON public.child_parent_links(child_id);
CREATE INDEX IF NOT EXISTS idx_cpl_parent_id
  ON public.child_parent_links(parent_id);


-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- TRIGGER FUNCTION: auto_assign_kutr_level
-- Automatically sets kutr_level_id on INSERT or UPDATE
-- when date_of_birth changes.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_auto_assign_kutr_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_age       INTEGER;
  v_kutr_id   UUID;
BEGIN
  -- Only run when date_of_birth is provided
  IF NEW.date_of_birth IS NULL THEN
    RETURN NEW;
  END IF;

  v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.date_of_birth))::INTEGER;

  SELECT id INTO v_kutr_id
  FROM public.kutr_levels
  WHERE v_age BETWEEN min_age AND max_age
  ORDER BY min_age ASC
  LIMIT 1;

  -- Assign if found; leave existing value if no range matches
  IF v_kutr_id IS NOT NULL THEN
    NEW.kutr_level_id := v_kutr_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_kutr_level ON public.children;
CREATE TRIGGER trg_auto_assign_kutr_level
  BEFORE INSERT OR UPDATE OF date_of_birth
  ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_assign_kutr_level();

-- ------------------------------------------------------------
-- TRIGGER FUNCTION: update updated_at timestamp
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_children_updated_at ON public.children;
CREATE TRIGGER trg_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_families_updated_at ON public.families;
CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 5: QUERY FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: search_children
-- Returns filtered children with all joined data.
-- All parameters are optional (NULL = no filter).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_children(
  p_search_term        TEXT    DEFAULT NULL,
  p_kutr_level_id      UUID    DEFAULT NULL,
  p_gender             TEXT    DEFAULT NULL,
  p_status             TEXT    DEFAULT NULL,
  p_family_id          UUID    DEFAULT NULL,
  p_confession_father  UUID    DEFAULT NULL
)
RETURNS TABLE (
  child_id             UUID,
  full_name            TEXT,
  first_name           TEXT,
  last_name            TEXT,
  baptismal_name       TEXT,
  gender               TEXT,
  date_of_birth        DATE,
  age                  INTEGER,
  level                TEXT,
  grade                TEXT,
  photo_url            TEXT,
  status               TEXT,
  enrollment_date      DATE,
  kutr_level_name      TEXT,
  kutr_level_color     TEXT,
  family_name          TEXT,
  family_id            UUID,
  address_summary      TEXT,
  confession_father    TEXT,
  father_name          TEXT,
  father_phone         TEXT,
  mother_name          TEXT,
  mother_phone         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                                    AS child_id,
    c.full_name,
    c.first_name,
    c.last_name,
    c.baptismal_name,
    c.gender,
    c.date_of_birth,
    c.age,
    c.level,
    c.grade,
    c.photo_url,
    c.status,
    c.enrollment_date,
    kl.name                                                 AS kutr_level_name,
    kl.color                                                AS kutr_level_color,
    f.family_name,
    f.id                                                    AS family_id,
    CONCAT_WS(', ',
      NULLIF(a.sub_city, ''),
      NULLIF(a.woreda, ''),
      NULLIF(a.city, '')
    )                                                       AS address_summary,
    CONCAT_WS(' ', cf.title, cf.full_name)                  AS confession_father,
    MAX(CASE WHEN cp.relationship = 'Father' THEN cp.full_name END)
                                                            AS father_name,
    MAX(CASE WHEN cp.relationship = 'Father' THEN cp.phone END)
                                                            AS father_phone,
    MAX(CASE WHEN cp.relationship = 'Mother' THEN cp.full_name END)
                                                            AS mother_name,
    MAX(CASE WHEN cp.relationship = 'Mother' THEN cp.phone END)
                                                            AS mother_phone
  FROM public.children c
  LEFT JOIN public.kutr_levels       kl ON kl.id = c.kutr_level_id
  LEFT JOIN public.families           f  ON f.id  = c.family_id
  LEFT JOIN public.addresses          a  ON a.id  = f.address_id
  LEFT JOIN public.confession_fathers cf ON cf.id = c.confession_father_id
  LEFT JOIN public.child_parent_links cpl ON cpl.child_id = c.id
  LEFT JOIN public.child_parents      cp  ON cp.id = cpl.parent_id
  WHERE
    -- Search filter
    (p_search_term IS NULL
      OR c.full_name ILIKE '%' || p_search_term || '%'
      OR c.baptismal_name ILIKE '%' || p_search_term || '%'
      OR f.family_name ILIKE '%' || p_search_term || '%')
    -- Kutr level filter
    AND (p_kutr_level_id IS NULL OR c.kutr_level_id = p_kutr_level_id)
    -- Gender filter
    AND (p_gender IS NULL OR c.gender = p_gender)
    -- Status filter
    AND (p_status IS NULL OR c.status = p_status)
    -- Family filter
    AND (p_family_id IS NULL OR c.family_id = p_family_id)
    -- Confession father filter
    AND (p_confession_father IS NULL OR c.confession_father_id = p_confession_father)
  GROUP BY
    c.id, c.full_name, c.first_name, c.last_name, c.baptismal_name,
    c.gender, c.date_of_birth, c.age, c.level, c.grade, c.photo_url,
    c.status, c.enrollment_date,
    kl.name, kl.color,
    f.family_name, f.id,
    a.sub_city, a.woreda, a.city,
    cf.title, cf.full_name
  ORDER BY c.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_children(TEXT, UUID, TEXT, TEXT, UUID, UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_child_details
-- Returns complete child information as a JSON object,
-- including family, both parents, address, kutr level,
-- confession father, and siblings list.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_child_details(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'child', jsonb_build_object(
      'id',                           c.id,
      'first_name',                   c.first_name,
      'last_name',                    c.last_name,
      'full_name',                    c.full_name,
      'baptismal_name',               c.baptismal_name,
      'gender',                       c.gender,
      'date_of_birth',                c.date_of_birth,
      'age',                          c.age,
      'level',                        c.level,
      'grade',                        c.grade,
      'photo_url',                    c.photo_url,
      'medical_notes',                c.medical_notes,
      'allergies',                    c.allergies,
      'emergency_contact_name',       c.emergency_contact_name,
      'emergency_contact_phone',      c.emergency_contact_phone,
      'emergency_contact_relationship', c.emergency_contact_relationship,
      'status',                       c.status,
      'enrollment_date',              c.enrollment_date,
      'graduation_date',              c.graduation_date,
      'created_at',                   c.created_at
    ),
    'kutr_level', CASE WHEN kl.id IS NOT NULL THEN jsonb_build_object(
      'id',          kl.id,
      'name',        kl.name,
      'color',       kl.color,
      'min_age',     kl.min_age,
      'max_age',     kl.max_age,
      'description', kl.description
    ) ELSE NULL END,
    'confession_father', CASE WHEN cf.id IS NOT NULL THEN jsonb_build_object(
      'id',        cf.id,
      'full_name', cf.full_name,
      'title',     cf.title,
      'phone',     cf.phone,
      'church',    cf.church
    ) ELSE NULL END,
    'family', CASE WHEN f.id IS NOT NULL THEN jsonb_build_object(
      'id',                    f.id,
      'family_name',           f.family_name,
      'home_church',           f.home_church,
      'primary_contact_name',  f.primary_contact_name,
      'primary_contact_phone', f.primary_contact_phone,
      'status',                f.status
    ) ELSE NULL END,
    'address', CASE WHEN a.id IS NOT NULL THEN jsonb_build_object(
      'id',             a.id,
      'street_address', a.street_address,
      'sub_city',       a.sub_city,
      'woreda',         a.woreda,
      'city',           a.city,
      'house_number',   a.house_number
    ) ELSE NULL END,
    'parents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  cp.id,
        'full_name',           cp.full_name,
        'relationship',        cp.relationship,
        'phone',               cp.phone,
        'email',               cp.email,
        'occupation',          cp.occupation,
        'is_primary_contact',  cp.is_primary_contact,
        'relationship_type',   cpl.relationship_type,
        'is_primary_guardian', cpl.is_primary_guardian
      ) ORDER BY cp.relationship ASC)
      FROM public.child_parent_links cpl
      JOIN public.child_parents cp ON cp.id = cpl.parent_id
      WHERE cpl.child_id = c.id
    ), '[]'::jsonb),
    'siblings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',        sib.id,
        'full_name', sib.full_name,
        'gender',    sib.gender,
        'age',       sib.age,
        'status',    sib.status
      ) ORDER BY sib.full_name ASC)
      FROM public.children sib
      WHERE sib.family_id = c.family_id
        AND sib.id <> c.id
        AND sib.status <> 'inactive'
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.children c
  LEFT JOIN public.kutr_levels       kl ON kl.id = c.kutr_level_id
  LEFT JOIN public.confession_fathers cf ON cf.id = c.confession_father_id
  LEFT JOIN public.families           f  ON f.id  = c.family_id
  LEFT JOIN public.addresses          a  ON a.id  = f.address_id
  WHERE c.id = p_child_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_child_details(UUID) TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: get_family_with_members
-- Returns full family JSON: info, address, all parents,
-- all children.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_family_with_members(p_family_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'family', jsonb_build_object(
      'id',                    f.id,
      'family_name',           f.family_name,
      'primary_contact_name',  f.primary_contact_name,
      'primary_contact_phone', f.primary_contact_phone,
      'primary_contact_email', f.primary_contact_email,
      'home_church',           f.home_church,
      'notes',                 f.notes,
      'status',                f.status,
      'created_at',            f.created_at
    ),
    'address', CASE WHEN a.id IS NOT NULL THEN jsonb_build_object(
      'id',             a.id,
      'street_address', a.street_address,
      'sub_city',       a.sub_city,
      'woreda',         a.woreda,
      'city',           a.city,
      'house_number',   a.house_number,
      'notes',          a.notes
    ) ELSE NULL END,
    'parents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                 cp.id,
        'full_name',          cp.full_name,
        'relationship',       cp.relationship,
        'phone',              cp.phone,
        'email',              cp.email,
        'occupation',         cp.occupation,
        'is_primary_contact', cp.is_primary_contact
      ) ORDER BY cp.relationship ASC)
      FROM public.child_parents cp
      WHERE cp.family_id = f.id
    ), '[]'::jsonb),
    'children', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',             c.id,
        'full_name',      c.full_name,
        'gender',         c.gender,
        'age',            c.age,
        'grade',          c.grade,
        'kutr_level',     kl.name,
        'kutr_color',     kl.color,
        'status',         c.status,
        'photo_url',      c.photo_url
      ) ORDER BY c.full_name ASC)
      FROM public.children c
      LEFT JOIN public.kutr_levels kl ON kl.id = c.kutr_level_id
      WHERE c.family_id = f.id
        AND c.status <> 'inactive'
    ), '[]'::jsonb),
    'child_count', (
      SELECT COUNT(*) FROM public.children
      WHERE family_id = f.id AND status = 'active'
    )
  )
  INTO v_result
  FROM public.families f
  LEFT JOIN public.addresses a ON a.id = f.address_id
  WHERE f.id = p_family_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_family_with_members(UUID) TO authenticated;

-- ------------------------------------------------------------
-- FUNCTION: get_children_statistics
-- Returns aggregate counts for dashboard widgets.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_children_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total',          COUNT(*),
      'active',         COUNT(*) FILTER (WHERE status = 'active'),
      'inactive',       COUNT(*) FILTER (WHERE status = 'inactive'),
      'graduated',      COUNT(*) FILTER (WHERE status = 'graduated'),
      'male',           COUNT(*) FILTER (WHERE gender = 'Male'),
      'female',         COUNT(*) FILTER (WHERE gender = 'Female'),
      'by_kutr_level',  (
        SELECT jsonb_agg(jsonb_build_object(
          'kutr_level', kl.name,
          'color',      kl.color,
          'count',      COUNT(c.id)
        ))
        FROM public.kutr_levels kl
        LEFT JOIN public.children c
          ON c.kutr_level_id = kl.id AND c.status = 'active'
        GROUP BY kl.id, kl.name, kl.color, kl.min_age
        ORDER BY kl.min_age ASC
      ),
      'by_age_range',   jsonb_build_object(
        '3_6',   COUNT(*) FILTER (WHERE age BETWEEN 3  AND 6  AND status = 'active'),
        '7_10',  COUNT(*) FILTER (WHERE age BETWEEN 7  AND 10 AND status = 'active'),
        '11_14', COUNT(*) FILTER (WHERE age BETWEEN 11 AND 14 AND status = 'active'),
        'other', COUNT(*) FILTER (WHERE (age < 3 OR age > 14) AND status = 'active')
      )
    )
    FROM public.children
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_children_statistics() TO authenticated;


-- ------------------------------------------------------------
-- FUNCTION: search_families
-- Returns families with parent/child counts and address.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_families(
  p_search_term TEXT DEFAULT NULL,
  p_status      TEXT DEFAULT NULL
)
RETURNS TABLE (
  family_id             UUID,
  family_name           TEXT,
  primary_contact_name  TEXT,
  primary_contact_phone TEXT,
  home_church           TEXT,
  status                TEXT,
  address_summary       TEXT,
  parent_count          BIGINT,
  child_count           BIGINT,
  created_at            TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id                                                      AS family_id,
    f.family_name,
    f.primary_contact_name,
    f.primary_contact_phone,
    f.home_church,
    f.status,
    CONCAT_WS(', ',
      NULLIF(a.sub_city, ''),
      NULLIF(a.woreda, ''),
      NULLIF(a.city, '')
    )                                                         AS address_summary,
    (SELECT COUNT(*) FROM public.child_parents cp
     WHERE cp.family_id = f.id)                              AS parent_count,
    (SELECT COUNT(*) FROM public.children c
     WHERE c.family_id = f.id AND c.status = 'active')       AS child_count,
    f.created_at
  FROM public.families f
  LEFT JOIN public.addresses a ON a.id = f.address_id
  WHERE
    (p_search_term IS NULL
      OR f.family_name ILIKE '%' || p_search_term || '%'
      OR f.primary_contact_name ILIKE '%' || p_search_term || '%'
      OR f.primary_contact_phone ILIKE '%' || p_search_term || '%')
    AND (p_status IS NULL OR f.status = p_status)
  ORDER BY f.family_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_families(TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- FUNCTION: get_kutr_levels
-- Returns all kutr levels ordered by min_age.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_kutr_levels()
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  min_age     INTEGER,
  max_age     INTEGER,
  description TEXT,
  color       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT kl.id, kl.name, kl.min_age, kl.max_age, kl.description, kl.color
  FROM public.kutr_levels kl
  ORDER BY kl.min_age ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_kutr_levels() TO authenticated;

-- ------------------------------------------------------------
-- FUNCTION: get_confession_fathers
-- Returns confession fathers, optionally filtered by status.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_confession_fathers(
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  id        UUID,
  full_name TEXT,
  title     TEXT,
  phone     TEXT,
  church    TEXT,
  status    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cf.id, cf.full_name, cf.title, cf.phone, cf.church, cf.status
  FROM public.confession_fathers cf
  WHERE (p_status IS NULL OR cf.status = p_status)
  ORDER BY cf.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_confession_fathers(TEXT) TO authenticated;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- Reuses is_system_user() and is_department_leader() from 007.
-- ============================================================

ALTER TABLE public.kutr_levels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_fathers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_parents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_parent_links ENABLE ROW LEVEL SECURITY;

-- ── kutr_levels: read-only for all authenticated users ──────

DROP POLICY IF EXISTS "kutr_levels_select" ON public.kutr_levels;
CREATE POLICY "kutr_levels_select" ON public.kutr_levels
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kutr_levels_write" ON public.kutr_levels;
CREATE POLICY "kutr_levels_write" ON public.kutr_levels
  FOR ALL USING (is_department_leader());

-- ── confession_fathers: read-only for all authenticated ─────

DROP POLICY IF EXISTS "confession_fathers_select" ON public.confession_fathers;
CREATE POLICY "confession_fathers_select" ON public.confession_fathers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "confession_fathers_write" ON public.confession_fathers;
CREATE POLICY "confession_fathers_write" ON public.confession_fathers
  FOR ALL USING (is_system_user());

-- ── addresses: system users read/write; dept leaders delete ─

DROP POLICY IF EXISTS "addresses_select" ON public.addresses;
CREATE POLICY "addresses_select" ON public.addresses
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "addresses_insert" ON public.addresses;
CREATE POLICY "addresses_insert" ON public.addresses
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "addresses_update" ON public.addresses;
CREATE POLICY "addresses_update" ON public.addresses
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "addresses_delete" ON public.addresses;
CREATE POLICY "addresses_delete" ON public.addresses
  FOR DELETE USING (is_department_leader());

-- ── families: system users read/write; dept leaders delete ──

DROP POLICY IF EXISTS "families_select" ON public.families;
CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "families_insert" ON public.families;
CREATE POLICY "families_insert" ON public.families
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "families_update" ON public.families;
CREATE POLICY "families_update" ON public.families
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "families_delete" ON public.families;
CREATE POLICY "families_delete" ON public.families
  FOR DELETE USING (is_department_leader());

-- ── child_parents: system users read/write; dept leaders delete

DROP POLICY IF EXISTS "child_parents_select" ON public.child_parents;
CREATE POLICY "child_parents_select" ON public.child_parents
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "child_parents_insert" ON public.child_parents;
CREATE POLICY "child_parents_insert" ON public.child_parents
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "child_parents_update" ON public.child_parents;
CREATE POLICY "child_parents_update" ON public.child_parents
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "child_parents_delete" ON public.child_parents;
CREATE POLICY "child_parents_delete" ON public.child_parents
  FOR DELETE USING (is_department_leader());

-- ── children: system users read/write; dept leaders delete ──
-- (Replaces the basic policies set in 007)

DROP POLICY IF EXISTS "children_select" ON public.children;
CREATE POLICY "children_select" ON public.children
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "children_insert" ON public.children;
CREATE POLICY "children_insert" ON public.children
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "children_update" ON public.children;
CREATE POLICY "children_update" ON public.children
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "children_delete" ON public.children;
CREATE POLICY "children_delete" ON public.children
  FOR DELETE USING (is_department_leader());

-- ── child_parent_links: system users read/write; dept leaders delete

DROP POLICY IF EXISTS "cpl_select" ON public.child_parent_links;
CREATE POLICY "cpl_select" ON public.child_parent_links
  FOR SELECT USING (is_system_user());

DROP POLICY IF EXISTS "cpl_insert" ON public.child_parent_links;
CREATE POLICY "cpl_insert" ON public.child_parent_links
  FOR INSERT WITH CHECK (is_system_user());

DROP POLICY IF EXISTS "cpl_update" ON public.child_parent_links;
CREATE POLICY "cpl_update" ON public.child_parent_links
  FOR UPDATE USING (is_system_user());

DROP POLICY IF EXISTS "cpl_delete" ON public.child_parent_links;
CREATE POLICY "cpl_delete" ON public.child_parent_links
  FOR DELETE USING (is_department_leader());


-- ============================================================
-- SECTION 7: STORAGE BUCKET
-- child-photos: authenticated upload, public read.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'child-photos',
  'child-photos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
DROP POLICY IF EXISTS "child_photos_upload" ON storage.objects;
CREATE POLICY "child_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'child-photos'
    AND auth.role() = 'authenticated'
  );

-- Public can view
DROP POLICY IF EXISTS "child_photos_select" ON storage.objects;
CREATE POLICY "child_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'child-photos');

-- Authenticated users can update their uploads
DROP POLICY IF EXISTS "child_photos_update" ON storage.objects;
CREATE POLICY "child_photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'child-photos'
    AND auth.role() = 'authenticated'
  );

-- Only department leaders can delete photos
DROP POLICY IF EXISTS "child_photos_delete" ON storage.objects;
CREATE POLICY "child_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'child-photos'
    AND is_department_leader()
  );


-- ============================================================
-- SECTION 8: SAMPLE DATA
-- ============================================================

-- ── Kutr Levels ─────────────────────────────────────────────

INSERT INTO public.kutr_levels (id, name, min_age, max_age, description, color)
VALUES
  (
    gen_random_uuid(),
    'Kutr 1',
    3, 6,
    'Young children aged 3-6 years. Focus on basic Bible stories and songs.',
    '#3b82f6'   -- blue
  ),
  (
    gen_random_uuid(),
    'Kutr 2',
    7, 10,
    'Children aged 7-10 years. Introduction to church teachings and prayers.',
    '#10b981'   -- green
  ),
  (
    gen_random_uuid(),
    'Kutr 3',
    11, 14,
    'Older children aged 11-14 years. Deeper study of faith and service.',
    '#8b5cf6'   -- purple
  )
ON CONFLICT (name) DO NOTHING;

-- ── Confession Fathers ───────────────────────────────────────

INSERT INTO public.confession_fathers (full_name, title, phone, church, status)
VALUES
  (
    'Melaku Tadesse',
    'Memhir',
    '+251911000001',
    'Kidist Selassie Church',
    'active'
  ),
  (
    'Girma Bekele',
    'Kes',
    '+251911000002',
    'Bete Mariam Church',
    'active'
  ),
  (
    'Tesfaye Alemu',
    'Memhir',
    '+251911000003',
    'Debre Birhan Selassie Church',
    'active'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 9: VERIFICATION
-- ============================================================

SELECT 'Migration 009 complete.' AS message;

SELECT
  table_name,
  (xpath('/row/cnt/text()',
    query_to_xml(
      format('SELECT COUNT(*) AS cnt FROM public.%I', table_name),
      false, true, ''
    )
  ))[1]::text::int AS row_count
FROM (VALUES
  ('kutr_levels'),
  ('confession_fathers'),
  ('addresses'),
  ('families'),
  ('child_parents'),
  ('children'),
  ('child_parent_links')
) AS t(table_name);

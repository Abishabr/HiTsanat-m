# Supabase Setup

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`)
- A Supabase project created at [supabase.com](https://supabase.com) (or a local instance via `supabase start`)

---

## 1. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project credentials:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Settings → API**.

---

## 2. Apply migrations

Migrations must be applied in order. Each file is idempotent (`IF NOT EXISTS` / `IF NOT EXISTS`).

### Option A — Supabase CLI (recommended)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — Supabase Dashboard SQL editor

Run each file in order via **SQL Editor**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_normalized_schema.sql`

---

## 3. Run the seed script

The seed script inserts all mock records and is **idempotent** — running it multiple times will not create duplicate rows (`INSERT ... ON CONFLICT DO NOTHING`).

### Option A — Supabase CLI

```bash
supabase db reset --linked   # applies migrations + seed in one step
```

Or apply the seed independently after migrations are in place:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Replace `$DATABASE_URL` with your project's direct connection string (**Settings → Database → Connection string → URI**).

### Option B — Supabase Dashboard SQL editor

Run the contents of `supabase/seed.sql` in the **SQL Editor**.

---

## 4. Local development with demo mode

To run the app without a live Supabase project, set:

```
VITE_DEMO_MODE=true
```

In demo mode the app uses the preset-user card login flow and falls back to in-memory/localStorage data — no Supabase connection is required.

---

## Schema overview

### Core tables (migration 001)

| Table | Description |
|---|---|
| `members` | University student members |
| `children` | Children registered in the program |
| `program_slots` | Weekly Saturday/Sunday schedule slots |
| `day_attendance` | Per-child attendance records |
| `child_events` | Special events (Timker, Hosana, Meskel, Other) |
| `member_activities` | Sub-department projects and Adar programs |
| `timhert_activities` | Academic exams and assignments |
| `attendance_notifications` | Notifications sent when attendance is submitted |

### Normalized tables (migration 002)

| Table | Description |
|---|---|
| `families` | Family lookup table (replaces `text[]` on children) |
| `member_families` | Junction: member ↔ family |
| `member_emergency_contacts` | Emergency contacts for members (from registration form step 4) |
| `child_parents` | Father/mother per child with `role` column (from registration form steps 3–4) |
| `child_emergency_contacts` | Emergency contacts for children (from registration form step 5) |

### Leader-only normalized schema (migration 003)

| Table | Description |
|---|---|
| `departments` | Top-level department (e.g. Hitsanat KFL) |
| `sub_departments` | Sub-departments (Kuttr, Mezmur, Timhert, Kinetibeb, EKD) |
| `normalized_members` | Fully normalized member records (3NF) |
| `member_sub_departments` | Junction: member ↔ sub-department |
| `system_users` | Authenticated leaders only — linked to `auth.users` |
| `normalized_children` | Normalized children with `kutr_level` enum |
| `parents` | Father + mother contact info per child |
| `programs` | Weekly Saturday/Sunday program schedule |
| `program_assignments` | Member assignments to programs |
| `normalized_attendance` | Per-child, per-program, per-date attendance |

**ENUMs defined in migration 003:**
- `user_role`: `DepartmentChairperson`, `DepartmentSecretary`, `SubDeptChairperson`, `SubDeptSecretary`
- `gender_type`: `Male`, `Female`
- `kutr_level_type`: `Kutr1`, `Kutr2`, `Kutr3`
- `attendance_status`: `Present`, `Absent`

**RLS helper functions:**
- `is_dept_leader()` — true for `DepartmentChairperson` / `DepartmentSecretary`
- `is_subdept_leader()` — true for `SubDeptChairperson` / `SubDeptSecretary`
- `my_sub_department_id()` — returns the caller's `sub_department_id`

**Storage:** `profile-images` bucket — authenticated upload/read, dept-leader-only delete.

### Key normalization decisions

- **`child_parents`** — father and mother are stored as separate rows with `role IN ('father', 'mother')` and a `UNIQUE (child_id, role)` constraint. This replaces the flat `father_full_name`, `mother_full_name`, `father_phone`, `mother_phone` columns.
- **`member_emergency_contacts` / `child_emergency_contacts`** — emergency contact info is stored in dedicated tables rather than flat columns, allowing multiple contacts per person.
- **`families`** — the `families` text[] on members is supplemented by the `member_families` junction table for proper relational integrity.

---

## File reference

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Core tables, constraints, RLS policies |
| `supabase/migrations/002_normalized_schema.sql` | Normalized columns and relation tables |
| `supabase/migrations/003_normalized_leader_schema.sql` | ENUMs, system_users, departments, programs, attendance, RLS helper functions, storage bucket |
| `supabase/migrations/004_seed_normalized.sql` | Seed data for normalized schema: 1 department, 5 sub-departments, 8 system users, 12 children, 5 programs, 4 weeks of attendance |
| `supabase/seed.sql` | Seed data for legacy tables (members, children, program_slots) |
| `.env.example` | Template for required environment variables |

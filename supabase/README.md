# Supabase Setup

## Prerequisites

- A Supabase project at [supabase.com](https://supabase.com)

---

## 1. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project credentials:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_DEMO_MODE=false
```

Both values are available in your Supabase project under **Settings → API**.

---

## 2. Apply the schema

The user's schema (tables, enums, RLS policies) was created directly in the Supabase dashboard.
The auth trigger in `005_auth_trigger.sql` must be applied via the SQL editor:

**SQL Editor → New query → paste and run `supabase/migrations/005_auth_trigger.sql`**

This trigger auto-creates a `system_users` row whenever a new user signs up via Supabase Auth.

---

## 3. Schema overview

### Enum types

| Enum | Values |
|---|---|
| `role_type` | `DepartmentChairperson`, `DepartmentSecretary`, `SubDeptChairperson`, `SubDeptSecretary` |
| `gender_type` | `Male`, `Female` |
| `kutr_level_type` | `Kutr1`, `Kutr2`, `Kutr3` |
| `attendance_status_type` | `Present`, `Absent` |
| `day_type` | `Saturday`, `Sunday` |

### Tables

| Table | Description |
|---|---|
| `members` | Department members (first_name, father_name, grandfather_name, phone_number, etc.) |
| `departments` | Top-level department |
| `sub_departments` | Sub-departments (Kuttr, Mezmur, Timhert, Kinetibeb, EKD) |
| `member_sub_departments` | Junction: member ↔ sub-department |
| `system_users` | Authenticated users — linked to `auth.users` via `auth_user_id` |
| `children` | Children registered in the program (kutr_level enum) |
| `parents` | Father + mother contact info per child |
| `programs` | Weekly Saturday/Sunday program schedule |
| `program_assignments` | Member assignments to programs |
| `attendance` | Per-child, per-program, per-date attendance records |

### Role mapping (app ↔ database)

| Database `role_type` | App role |
|---|---|
| `DepartmentChairperson` | `chairperson` |
| `DepartmentSecretary` | `secretary` |
| `SubDeptChairperson` | `subdept-leader` |
| `SubDeptSecretary` | `subdept-vice-leader` |

---

## 4. Creating users

Users are created via Supabase Auth. Pass role metadata at signup:

```ts
supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: 'SubDeptChairperson',       // role_type enum value
      sub_department_id: '<uuid>',       // from sub_departments table
      member_id: '<uuid>',               // from members table (optional)
    },
  },
});
```

The `on_auth_user_created` trigger automatically inserts a `system_users` row.

---

## 5. Demo mode

To run without a live Supabase connection:

```
VITE_DEMO_MODE=true
```

Demo mode uses preset user cards on the login screen and stores data in localStorage.

---

## File reference

| File | Purpose |
|---|---|
| `supabase/migrations/005_auth_trigger.sql` | Auth trigger — **apply this in Supabase SQL editor** |
| `.env.example` | Template for required environment variables |

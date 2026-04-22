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

## 2. Apply migrations in order

All migrations must be applied via **SQL Editor → New query** in the Supabase dashboard.
Run them in order — each one depends on the previous.

### Migration 005 — Auth trigger (already applied if you set up the project earlier)

File: `supabase/migrations/005_auth_trigger.sql`

Creates the `on_auth_user_created` trigger that links new auth users to the `members` table.

### Migration 006 — Leadership access check RPC

File: `supabase/migrations/006_auth_access_check.sql`

- Creates `check_leadership_access(auth_user_id UUID)` — the RPC the app calls after login
- Replaces the old trigger to write `auth_user_id` into `members.auth_user_id` instead of `system_users`

**Prerequisite:** The `members` table must have an `auth_user_id UUID` column and the `leadership_roles` table must exist. Run these first if needed:

```sql
-- Add auth_user_id to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create leadership_roles table
CREATE TABLE IF NOT EXISTS public.leadership_roles (
  leadership_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  hierarchy_level    INT  NOT NULL
);

-- Seed leadership roles
INSERT INTO public.leadership_roles (name, hierarchy_level) VALUES
  ('Chairperson',      1),
  ('Vice Chairperson', 2),
  ('Secretary',        3),
  ('Member',           99)
ON CONFLICT DO NOTHING;

-- Add leadership_role_id and is_active to member_sub_departments
ALTER TABLE public.member_sub_departments
  ADD COLUMN IF NOT EXISTS leadership_role_id UUID REFERENCES public.leadership_roles(leadership_role_id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
```

### Migration 007 — RLS policies and access functions

File: `supabase/migrations/007_rls_and_access_functions.sql`

Creates four SQL helper functions and RLS policies on all data tables.

---

## 3. SQL functions reference

| Function | Returns | Description |
|---|---|---|
| `is_system_user()` | `BOOLEAN` | `TRUE` if the current auth user is one of the 18 leaders |
| `is_department_leader()` | `BOOLEAN` | `TRUE` if the user holds a role in the `Department` sub-department |
| `get_user_access_scope()` | `JSON` | Full access scope: `is_department_leader`, `role`, `sub_department`, `led_sub_departments` |
| `get_accessible_sub_departments()` | `UUID[]` | Array of sub-department IDs the user can view/edit |
| `check_leadership_access(uuid)` | `JSON` | Used by the app after login: `{ has_access, role, sub_department }` |

All functions use `SECURITY DEFINER` and `auth.uid()` — never trust client-side claims.

### Example: call from the app

```ts
// Get the current user's access scope
const { data } = await supabase.rpc('get_user_access_scope');
// { is_department_leader: true, role: 'Chairperson', sub_department: 'Department', led_sub_departments: [...] }

// Get accessible sub-department IDs
const { data: subDeptIds } = await supabase.rpc('get_accessible_sub_departments');
```

---

## 4. RLS policy summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `members` | system users, scoped by sub-dept | system users | system users, scoped | dept leaders only |
| `children` | all system users | all system users | all system users | dept leaders only |
| `member_sub_departments` | all system users | dept leaders | dept leaders | dept leaders |
| `sub_departments` | all system users | dept leaders | dept leaders | dept leaders |
| `leadership_roles` | all system users | dept leaders | dept leaders | dept leaders |
| `program_slots` | system users, scoped by sub-dept | system users, scoped | system users, scoped | dept leaders only |
| `child_events` | all system users | all system users | all system users | dept leaders only |
| `member_activities` | system users, scoped by sub-dept | system users, scoped | system users, scoped | dept leaders only |
| `timhert_activities` | all system users | dept leaders + Timhert leaders | dept leaders + Timhert leaders | dept leaders only |

**"scoped by sub-dept"** means sub-department leaders only see rows linked to their assigned sub-department(s). Department leaders always see everything.

---

## 5. Creating the 18 leadership users

Create each user via the Supabase dashboard (**Authentication → Users → Invite**) or via the service-role API. Pass the `member_id` in the user metadata so the trigger links them automatically:

```ts
// Using the service-role client (server-side only — never expose service key to browser)
await supabase.auth.admin.createUser({
  email: 'leader@example.com',
  password: 'secure-password',
  user_metadata: { member_id: '<uuid-from-members-table>' },
  email_confirm: true,
});
```

The `on_auth_user_created` trigger will write `auth_user_id` into `members.auth_user_id` automatically.

### Backfill existing users

If you already have users in `auth.users` from the old `system_users` approach:

```sql
UPDATE public.members m
SET auth_user_id = su.auth_user_id
FROM public.system_users su
WHERE su.member_id = m.member_id
  AND m.auth_user_id IS NULL;
```

---

## 6. Verify the setup

Test the RPC directly in the SQL Editor with a known leader's auth UUID:

```sql
-- Should return { "has_access": true, "role": "Chairperson", "sub_department": "Department" }
SELECT check_leadership_access('<auth-user-uuid>');

-- Should return true for a leader
SELECT is_system_user();  -- run as the authenticated user

-- Should return the full scope object
SELECT get_user_access_scope();
```

---

## 7. Demo mode

To run without a live Supabase connection:

```
VITE_DEMO_MODE=true
```

Demo mode uses preset user cards on the login screen and stores data in localStorage.

---

## File reference

| File | Purpose |
|---|---|
| `supabase/migrations/005_auth_trigger.sql` | Auth trigger linking new auth users to members |
| `supabase/migrations/006_auth_access_check.sql` | `check_leadership_access` RPC + updated trigger |
| `supabase/migrations/007_rls_and_access_functions.sql` | RLS policies + `is_system_user`, `get_user_access_scope`, `get_accessible_sub_departments` |
| `.env.example` | Template for required environment variables |

# Tasks

## Task List

- [x] 1. Install Supabase dependency and create client singleton
  - [x] 1.1 Run `npm install @supabase/supabase-js` to add the Supabase JS client
  - [x] 1.2 Create `src/lib/supabase.ts` with env-var validation and singleton export
  - [x] 1.3 Create `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` placeholders

- [x] 2. Create database schema migration
  - [x] 2.1 Create `supabase/migrations/001_initial_schema.sql` with all eight tables (members, children, program_slots, day_attendance, child_events, member_activities, timhert_activities, attendance_notifications)
  - [x] 2.2 Add unique constraint on `day_attendance(child_id, date)` in the migration
  - [x] 2.3 Add RLS enable statements and all role-based policies for each table in the migration

- [x] 3. Create seed data
  - [x] 3.1 Create `supabase/seed.sql` that inserts all records from `mockData.ts` using `INSERT ... ON CONFLICT DO NOTHING`
  - [x] 3.2 Create `supabase/README.md` with setup instructions for applying migrations and running the seed

- [x] 4. Update AuthContext with Supabase Auth
  - [x] 4.1 Update `src/app/context/AuthContext.tsx` to call `supabase.auth.getSession()` on mount and restore session
  - [x] 4.2 Update `login` to call `supabase.auth.signInWithPassword` in live mode; keep preset-user card flow when `VITE_DEMO_MODE=true`
  - [x] 4.3 Update `logout` to call `supabase.auth.signOut()`
  - [x] 4.4 Add `supabase.auth.onAuthStateChange` listener to keep `user` in sync across tabs
  - [x] 4.5 Map `session.user.user_metadata` fields (`role`, `subDepartment`, `name`, `phone`) to the existing `User` interface
  - [x] 4.6 Expose `error: string | null` in the context value for login failure messages

- [x] 5. Update Login page
  - [x] 5.1 Update `src/app/pages/Login.tsx` to render an email/password form when `VITE_DEMO_MODE` is not `"true"`
  - [x] 5.2 Wire the form's submit handler to the updated `login` function and display `error` from `AuthContext`
  - [x] 5.3 Retain the existing preset-user card grid as the demo mode fallback (rendered when `VITE_DEMO_MODE=true`)

- [x] 6. Update DataStore with Supabase CRUD and Realtime
  - [x] 6.1 Update `src/app/context/DataStore.tsx` to fetch `members` and `children` from Supabase on mount; set `isLoading` accordingly
  - [x] 6.2 Update `addMember` / `updateMember` / `deleteMember` to perform optimistic local updates then Supabase writes, reverting on error
  - [x] 6.3 Update `addChild` / `updateChild` / `deleteChild` with the same optimistic pattern
  - [x] 6.4 Add camelCase ↔ snake_case mapping helpers for `Member` and `Child` types
  - [x] 6.5 Subscribe to Supabase Realtime on `members` and `children` tables; apply INSERT/UPDATE/DELETE events to local state
  - [x] 6.6 Expose `isLoading: boolean` and `lastError: string | null` in the context value

- [x] 7. Update ScheduleStore with Supabase CRUD and Realtime
  - [x] 7.1 Update `src/app/context/ScheduleStore.tsx` to fetch `program_slots`, `day_attendance`, and `attendance_notifications` from Supabase on mount
  - [x] 7.2 Update `addSlot` / `removeSlot` / `assignMember` to write to `program_slots` with optimistic updates
  - [x] 7.3 Update `markAttendance` to upsert into `day_attendance` using `(child_id, date)` as the conflict key, then insert a row into `attendance_notifications`
  - [x] 7.4 Update `markNotificationsRead` to update all unread rows in `attendance_notifications` to `read = true`
  - [x] 7.5 Subscribe to Realtime on `program_slots`, `day_attendance`, and `attendance_notifications`
  - [x] 7.6 Update `getMemberName` and `getChildName` helpers to read from live context state instead of static mock arrays
  - [x] 7.7 Expose `isLoading: boolean` in the context value

- [x] 8. Update EventsManagement page
  - [x] 8.1 Replace `useState(mockChildEvents)` in `src/app/pages/EventsManagement.tsx` with a `useChildEvents` hook that fetches from `child_events` on mount
  - [x] 8.2 Wire the "Create Event" dialog submit button to insert a new row into `child_events` and update local state
  - [x] 8.3 Display an inline error alert if any Supabase operation fails

- [x] 9. Update MemberActivities page
  - [x] 9.1 Replace `mockMemberActivities` import in `src/app/pages/MemberActivities.tsx` with a `useMemberActivities` hook that fetches from `member_activities` on mount
  - [x] 9.2 Wire the "Create Activity" button to insert a new row into `member_activities`

- [x] 10. Update TimhertAcademic page
  - [x] 10.1 Replace `useState(mockTimhertActivities)` in `src/app/pages/TimhertAcademic.tsx` with a `useTimhertActivities` hook that fetches from `timhert_activities` on mount
  - [x] 10.2 Wire the "Create Activity" dialog submit button to insert a new row into `timhert_activities`
  - [x] 10.3 Wire the "Enter Scores" / status update action to update the matching row's `status` to `completed`

- [-] 11. Write tests
  - [x] 11.1 Write unit test for `src/lib/supabase.ts`: assert throws with correct message when each env var is missing
  - [x] 11.2 Write property test (fast-check) for missing env var combinations — Feature: supabase-backend, Property 1
  - [x] 11.3 Write unit tests for AuthContext: demo mode login, live mode login, logout, onAuthStateChange, error on failure
  - [x] 11.4 Write property test for auth session restoration — Feature: supabase-backend, Property 7
  - [x] 11.5 Write property test for role derived from user_metadata — Feature: supabase-backend, Property 8
  - [x] 11.6 Write property test for Member/Child CRUD round trip — Feature: supabase-backend, Property 2
  - [x] 11.7 Write property test for optimistic revert on write failure — Feature: supabase-backend, Property 3
  - [x] 11.8 Write property test for attendance upsert idempotence — Feature: supabase-backend, Property 4
  - [x] 11.9 Write property test for notification created on attendance submission — Feature: supabase-backend, Property 5
  - [x] 11.10 Write property test for markNotificationsRead idempotence — Feature: supabase-backend, Property 6
  - [x] 11.11 Write property test for seed idempotence (upsert logic) — Feature: supabase-backend, Property 9
  - [~] 11.12 Write property test for context API surface preservation — Feature: supabase-backend, Property 10

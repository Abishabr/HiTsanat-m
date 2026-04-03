# Requirements Document

## Introduction

This feature replaces the in-memory mock data layer of the Hitsanat KFL Management System with a Supabase backend (PostgreSQL + Auth + Realtime). The app currently stores all state in `localStorage` and static arrays in `mockData.ts`. The goal is to persist all data in Supabase while keeping the existing React context API surface (`useDataStore`, `useSchedule`, `useAuth`) intact so that pages require minimal or no changes.

The integration covers: authentication, members, children, sub-departments, weekly program slots, attendance records, child events, member activities, and Timhert academic activities.

## Glossary

- **Supabase_Client**: The `@supabase/supabase-js` singleton instance used to communicate with the Supabase project.
- **Auth_Context**: The existing `AuthContext.tsx` React context that exposes `user`, `login`, and `logout`.
- **DataStore**: The existing `DataStore.tsx` React context that exposes CRUD operations for `Member` and `Child` entities.
- **ScheduleStore**: The existing `ScheduleStore.tsx` React context that manages `ProgramSlot` and `DayAttendance` entities.
- **Member**: A university student who participates in one or more sub-departments.
- **Child**: A child registered in the Hitsanat KFL program, assigned to a Kutr level (1, 2, or 3).
- **SubDepartment**: One of the five fixed organizational units: Timhert, Mezmur, Kinetibeb, Kuttr, Ekd.
- **ProgramSlot**: A scheduled time block on a Saturday or Sunday assigned to a sub-department and optionally to a member.
- **DayAttendance**: A single attendance record linking a child or member to a date with a status of present, absent, late, or excused.
- **ChildEvent**: A special event (Timker, Hosana, Meskel, Other) for children.
- **MemberActivity**: A sub-department project or Adar program assigned to one or more members.
- **TimhertActivity**: An academic activity (Midterm, Final, Assignment) for a specific Kutr level.
- **UserRole**: One of: `chairperson`, `vice-chairperson`, `secretary`, `subdept-leader`, `member`.
- **RLS**: Row-Level Security — Supabase PostgreSQL policies that restrict data access per authenticated user.
- **Realtime**: Supabase's WebSocket-based change notification system.
- **Migration**: A versioned SQL file that creates or alters database schema.

---

## Requirements

### Requirement 1: Supabase Project Configuration

**User Story:** As a developer, I want a single configured Supabase client available throughout the app, so that all data operations use a consistent, authenticated connection.

#### Acceptance Criteria

1. THE Supabase_Client SHALL be initialized once using environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. IF either environment variable is missing at startup, THEN THE Supabase_Client SHALL throw a descriptive error identifying which variable is absent.
3. THE Supabase_Client SHALL be exported as a singleton from a dedicated module (e.g., `src/lib/supabase.ts`) so that all contexts import the same instance.
4. THE Supabase_Client SHALL be configured with `persistSession: true` so that authenticated sessions survive page reloads.

---

### Requirement 2: Database Schema

**User Story:** As a developer, I want a well-structured PostgreSQL schema in Supabase, so that all app entities are stored relationally with proper constraints and referential integrity.

#### Acceptance Criteria

1. THE Database SHALL contain a `members` table with columns: `id` (uuid PK), `student_id` (text unique), `name` (text), `year_of_study` (int), `phone` (text), `email` (text), `sub_departments` (text[]), `families` (text[]), `join_date` (date), `photo` (text nullable), `created_at` (timestamptz).
2. THE Database SHALL contain a `children` table with columns: `id` (uuid PK), `name` (text), `age` (int), `kutr_level` (int check 1–3), `family_id` (text), `family_name` (text), `guardian_contact` (text), `registration_date` (date), `photo` (text nullable), `created_at` (timestamptz).
3. THE Database SHALL contain a `program_slots` table with columns: `id` (uuid PK), `date` (date), `day` (text check Saturday/Sunday), `kutr_levels` (int[]), `start_time` (time), `end_time` (time), `sub_department_id` (text), `assigned_member_id` (uuid nullable FK → members.id), `created_at` (timestamptz).
4. THE Database SHALL contain a `day_attendance` table with columns: `id` (uuid PK), `date` (date), `day` (text), `child_id` (uuid FK → children.id), `status` (text check present/absent/late/excused), `marked_by` (text), `marked_at` (timestamptz), `created_at` (timestamptz).
5. THE Database SHALL contain a `child_events` table with columns: `id` (uuid PK), `name` (text), `type` (text check Timker/Hosana/Meskel/Other), `date` (date), `description` (text), `participants` (int default 0), `supervisors` (text[]), `status` (text check upcoming/ongoing/completed), `created_at` (timestamptz).
6. THE Database SHALL contain a `member_activities` table with columns: `id` (uuid PK), `name` (text), `sub_department_id` (text), `date` (date), `description` (text), `assigned_members` (jsonb), `status` (text check planned/ongoing/completed), `created_at` (timestamptz).
7. THE Database SHALL contain a `timhert_activities` table with columns: `id` (uuid PK), `name` (text), `type` (text check Midterm/Final/Assignment), `kutr_level` (int check 1–3), `max_score` (int), `date` (date), `status` (text check scheduled/completed), `created_at` (timestamptz).
8. THE Database SHALL contain an `attendance_notifications` table with columns: `id` (uuid PK), `date` (date), `day` (text), `present_count` (int), `absent_count` (int), `total_count` (int), `submitted_at` (timestamptz), `read` (boolean default false), `created_at` (timestamptz).
9. THE Database SHALL enforce a unique constraint on `day_attendance(child_id, date)` so that duplicate attendance records for the same child on the same date are rejected at the database level.
10. THE Database SHALL provide versioned migration SQL files under `supabase/migrations/` so that schema changes are reproducible and trackable.

---

### Requirement 3: Authentication

**User Story:** As a user, I want to log in with my email and password via Supabase Auth, so that my session is securely managed and my role is enforced server-side.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Auth_Context SHALL call `supabase.auth.signInWithPassword` and store the resulting session.
2. WHEN a user logs out, THE Auth_Context SHALL call `supabase.auth.signOut` and clear the local session state.
3. WHEN the app loads, THE Auth_Context SHALL call `supabase.auth.getSession` to restore any existing session without requiring re-login.
4. WHEN the Supabase session changes (e.g., token refresh or sign-out from another tab), THE Auth_Context SHALL update the local `user` state via `supabase.auth.onAuthStateChange`.
5. THE Auth_Context SHALL derive the `UserRole` and `subDepartment` from a `user_metadata` field stored in the Supabase Auth user record, so that role-based UI rendering continues to work without changes to consuming pages.
6. IF authentication fails (wrong credentials or network error), THEN THE Auth_Context SHALL expose an `error` string describing the failure so the Login page can display it.
7. THE Login page SHALL replace the preset-user card selection with an email/password form that calls the updated `login` function.
8. WHERE a `VITE_DEMO_MODE` environment variable is set to `"true"`, THE Auth_Context SHALL retain the existing preset-user card login flow to support local development without a live Supabase project.

---

### Requirement 4: Member Data Persistence

**User Story:** As a chairperson, I want member records to be stored in Supabase, so that additions, edits, and deletions are persisted across sessions and visible to all users in real time.

#### Acceptance Criteria

1. WHEN the DataStore mounts, THE DataStore SHALL fetch all rows from the `members` table via `supabase.from('members').select('*')` and populate the `members` state.
2. WHEN `addMember` is called, THE DataStore SHALL insert a new row into the `members` table and append the returned record (with its server-generated `id`) to the local `members` state.
3. WHEN `updateMember` is called, THE DataStore SHALL update the matching row in the `members` table and reflect the change in local state.
4. WHEN `deleteMember` is called, THE DataStore SHALL delete the matching row from the `members` table and remove it from local state.
5. IF a Supabase write operation fails, THEN THE DataStore SHALL revert the optimistic local state change and expose the error via a `lastError` field in the context value.
6. THE DataStore SHALL subscribe to Supabase Realtime changes on the `members` table so that inserts, updates, and deletes made by other sessions are reflected in the local state within 2 seconds.
7. THE DataStore context value interface SHALL remain identical to the current interface (`members`, `addMember`, `updateMember`, `deleteMember`) so that no consuming page requires changes.

---

### Requirement 5: Children Data Persistence

**User Story:** As a chairperson, I want children records to be stored in Supabase, so that registrations and deletions are persisted and visible to all users.

#### Acceptance Criteria

1. WHEN the DataStore mounts, THE DataStore SHALL fetch all rows from the `children` table and populate the `children` state.
2. WHEN `addChild` is called, THE DataStore SHALL insert a new row into the `children` table and append the returned record to local state.
3. WHEN `updateChild` is called, THE DataStore SHALL update the matching row in the `children` table and reflect the change in local state.
4. WHEN `deleteChild` is called, THE DataStore SHALL delete the matching row from the `children` table and remove it from local state.
5. IF a Supabase write operation fails, THEN THE DataStore SHALL revert the optimistic local state change and expose the error.
6. THE DataStore SHALL subscribe to Supabase Realtime changes on the `children` table so that changes from other sessions are reflected within 2 seconds.

---

### Requirement 6: Program Slot Persistence

**User Story:** As a chairperson, I want weekly program slots to be stored in Supabase, so that the schedule is shared across all users and survives page reloads.

#### Acceptance Criteria

1. WHEN the ScheduleStore mounts, THE ScheduleStore SHALL fetch all rows from the `program_slots` table and populate the `slots` state.
2. WHEN `addSlot` is called, THE ScheduleStore SHALL insert a new row into `program_slots` and append the returned record to local state.
3. WHEN `removeSlot` is called, THE ScheduleStore SHALL delete the matching row from `program_slots` and remove it from local state.
4. WHEN `assignMember` is called, THE ScheduleStore SHALL update the `assigned_member_id` column of the matching row and reflect the change in local state.
5. THE ScheduleStore SHALL subscribe to Supabase Realtime changes on the `program_slots` table so that slot assignments made by sub-department leaders are visible to the chairperson within 2 seconds.
6. THE ScheduleStore context value interface SHALL remain identical to the current interface so that no consuming page requires changes.

---

### Requirement 7: Attendance Persistence

**User Story:** As a Kuttr sub-department leader, I want attendance records to be stored in Supabase, so that the chairperson can view submitted attendance in real time.

#### Acceptance Criteria

1. WHEN the ScheduleStore mounts, THE ScheduleStore SHALL fetch all rows from the `day_attendance` table and populate the `attendance` state.
2. WHEN `markAttendance` is called with a list of records, THE ScheduleStore SHALL upsert all records into the `day_attendance` table using `(child_id, date)` as the conflict key, then update local state.
3. THE ScheduleStore SHALL subscribe to Supabase Realtime changes on the `day_attendance` table so that attendance submitted by the Kuttr leader is visible to the chairperson within 2 seconds.
4. WHEN `markAttendance` is called, THE ScheduleStore SHALL insert a corresponding row into the `attendance_notifications` table so the chairperson receives a notification.
5. WHEN `markNotificationsRead` is called, THE ScheduleStore SHALL update all unread rows in `attendance_notifications` to `read = true`.
6. THE ScheduleStore SHALL fetch unread notifications on mount and subscribe to Realtime changes on `attendance_notifications` so the chairperson's notification badge updates within 2 seconds.

---

### Requirement 8: Child Events Persistence

**User Story:** As a chairperson, I want child events to be stored in Supabase, so that event records are shared and persistent.

#### Acceptance Criteria

1. WHEN the EventsManagement page mounts, THE System SHALL fetch all rows from the `child_events` table and display them.
2. WHEN a new event is created via the form, THE System SHALL insert a row into `child_events` and add it to the displayed list.
3. WHEN an event is updated, THE System SHALL update the matching row in `child_events` and reflect the change in the UI.
4. IF a write to `child_events` fails, THEN THE System SHALL display an error message to the user without navigating away from the page.

---

### Requirement 9: Member Activities Persistence

**User Story:** As a sub-department leader, I want member activities to be stored in Supabase, so that activity records are shared across the team.

#### Acceptance Criteria

1. WHEN the MemberActivities page mounts, THE System SHALL fetch all rows from the `member_activities` table and display them.
2. WHEN a new activity is created, THE System SHALL insert a row into `member_activities` and add it to the displayed list.
3. WHEN an activity status is updated, THE System SHALL update the matching row in `member_activities` and reflect the change in the UI.

---

### Requirement 10: Timhert Academic Activities Persistence

**User Story:** As a Timhert sub-department leader, I want academic activity records stored in Supabase, so that exam and assignment data is persistent and shared.

#### Acceptance Criteria

1. WHEN the TimhertAcademic page mounts, THE System SHALL fetch all rows from the `timhert_activities` table and display them.
2. WHEN a new Timhert activity is created, THE System SHALL insert a row into `timhert_activities` and add it to the displayed list.
3. WHEN a Timhert activity status changes to `completed`, THE System SHALL update the matching row in `timhert_activities`.

---

### Requirement 11: Row-Level Security

**User Story:** As a system administrator, I want database access controlled by RLS policies, so that users can only read and write data appropriate to their role.

#### Acceptance Criteria

1. THE Database SHALL enable RLS on all tables listed in Requirement 2.
2. WHILE a user is authenticated with role `chairperson` or `vice-chairperson` or `secretary`, THE Database SHALL permit SELECT, INSERT, UPDATE, and DELETE on all tables.
3. WHILE a user is authenticated with role `subdept-leader`, THE Database SHALL permit SELECT on all tables, INSERT and UPDATE on `program_slots` (for their own sub-department only), and INSERT and UPDATE on `day_attendance`.
4. WHILE a user is authenticated with role `member`, THE Database SHALL permit SELECT on `members`, `children`, `program_slots`, and `day_attendance`.
5. IF an unauthenticated request reaches any table, THEN THE Database SHALL deny the request and return a 401 error.
6. THE RLS policies SHALL be defined in the versioned migration files so they are applied consistently across environments.

---

### Requirement 12: Loading and Error States

**User Story:** As a user, I want to see loading indicators while data is being fetched and clear error messages when something goes wrong, so that I understand the app's state at all times.

#### Acceptance Criteria

1. WHILE the DataStore is fetching initial data from Supabase, THE DataStore SHALL expose an `isLoading: true` flag in its context value.
2. WHEN the initial fetch completes (successfully or with error), THE DataStore SHALL set `isLoading` to `false`.
3. WHILE the ScheduleStore is fetching initial data, THE ScheduleStore SHALL expose an `isLoading: true` flag.
4. IF any Supabase operation returns an error, THEN THE System SHALL log the error to the browser console with sufficient context (operation name, table, error message).
5. THE DataStore and ScheduleStore context value interfaces SHALL each include an `isLoading: boolean` field so that consuming pages can render skeleton states.

---

### Requirement 13: Data Migration from localStorage

**User Story:** As a developer, I want a one-time migration utility that seeds the Supabase database from the existing mock data, so that the app can be bootstrapped without manual data entry.

#### Acceptance Criteria

1. THE System SHALL provide a seed SQL file (or TypeScript seed script) that inserts all records from `mockData.ts` into the corresponding Supabase tables.
2. WHEN the seed script is run against an empty database, THE System SHALL insert all mock members, children, program slots, child events, member activities, and Timhert activities without errors.
3. THE seed script SHALL be idempotent: running it twice SHALL NOT create duplicate rows (use `INSERT ... ON CONFLICT DO NOTHING` or equivalent).
4. THE System SHALL provide instructions in a `supabase/README.md` file describing how to apply migrations and run the seed script.

---

### Requirement 14: Backward Compatibility and Context API Preservation

**User Story:** As a developer, I want the existing React context API surface to remain unchanged, so that all existing page components continue to work without modification.

#### Acceptance Criteria

1. THE DataStore context value SHALL continue to expose exactly: `members`, `children`, `addMember`, `updateMember`, `deleteMember`, `addChild`, `updateChild`, `deleteChild`.
2. THE ScheduleStore context value SHALL continue to expose exactly: `slots`, `attendance`, `addSlot`, `removeSlot`, `assignMember`, `markAttendance`, `notifications`, `markNotificationsRead`.
3. THE Auth_Context value SHALL continue to expose exactly: `user`, `login`, `logout` (with `user` typed as the existing `User` interface).
4. THE `mockData.ts` file SHALL be retained as a fallback seed source and for type definitions; its static arrays SHALL no longer be used as the live data source once Supabase is connected.
5. THE helper functions `getMemberName`, `getChildName`, `getSubDeptName`, `getSubDeptColor` in ScheduleStore SHALL continue to work by reading from the live `members` and `children` state rather than the static mock arrays.

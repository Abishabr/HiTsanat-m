# Requirements Document

## Introduction

The Authentication System for **Hitsanat KFL** (ሕፃናት ክፍለ ፍቅር ለዓለም) is the access-control layer for the Children's Ministry Management System of the Ethiopian Orthodox Tewahedo Church. Only 18 specific leadership members may log in: 3 Department-level leaders (Chairperson, Vice Chairperson, Secretary) and 15 Sub-Department leaders (Chairperson, Vice Chairperson, Secretary across 5 sub-departments: Timhert, Mezmur, Kinetibeb, Kuttr, Ekd). Regular members and children have no system access.

The system uses Supabase Auth (email + password) as the identity provider. After a successful Supabase Auth sign-in, the system queries the existing relational schema (`members`, `member_sub_departments`, `leadership_roles`, `sub_departments`) to determine whether the authenticated user holds a qualifying leadership role. The existing `AuthContext` must be rewritten to use this schema, and a new Supabase migration must add a database-level RPC function for the access check. Protected routes redirect unauthenticated users to `/login`, and sessions persist across page refreshes.

---

## Glossary

- **Auth_System**: The complete authentication and session management subsystem described in this document.
- **Supabase_Auth**: The Supabase-managed identity service that handles email/password credential verification and JWT session tokens.
- **AuthContext**: The React context (`src/app/context/AuthContext.tsx`) that exposes the current user, login, logout, and loading state to the application.
- **Member**: A row in the `members` table representing a registered person in the ministry.
- **Leadership_Role**: A row in the `leadership_roles` table. Qualifying roles are `Chairperson`, `Vice Chairperson`, and `Secretary`. The `Member` role is non-qualifying.
- **Sub_Department**: A row in the `sub_departments` table. Valid values: `Department`, `Timhert`, `Mezmur`, `Kinetibeb`, `Kuttr`, `Ekd`.
- **Member_Sub_Department**: A row in the `member_sub_departments` join table linking a Member to a Sub_Department with a Leadership_Role.
- **App_Role**: The application-level role type (`UserRole`) used by the RBAC helpers in `src/app/lib/permissions.ts`. Values: `chairperson`, `vice-chairperson`, `secretary`, `subdept-leader`, `subdept-vice-leader`, `member`, `teacher`, `kuttr-member`, `viewer`.
- **Authenticated_User**: A Member who has completed Supabase Auth sign-in AND holds at least one active qualifying Leadership_Role in any Sub_Department.
- **Protected_Route**: Any application route other than `/login` that requires an Authenticated_User session.
- **RPC_Function**: A PostgreSQL function callable via `supabase.rpc()` that performs the leadership access check server-side.
- **Session**: The Supabase Auth JWT session that persists across page refreshes via `localStorage`.
- **Demo_Mode**: An optional mode (controlled by `VITE_DEMO_MODE=true`) that bypasses Supabase Auth and uses preset user objects for local development.

---

## Requirements

### Requirement 1: Email and Password Authentication

**User Story:** As a ministry leader, I want to sign in with my email address and password, so that I can access the management system securely.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password via the login form, THE Auth_System SHALL call `supabase.auth.signInWithPassword` with those credentials.
2. WHEN Supabase_Auth returns a successful session, THE Auth_System SHALL proceed to the leadership access check before granting application access.
3. WHEN Supabase_Auth returns an authentication error (invalid credentials, unconfirmed email, etc.), THE Auth_System SHALL display the error message returned by Supabase_Auth in the login form.
4. WHILE a sign-in request is in flight, THE Auth_System SHALL disable the submit button and display a loading indicator.
5. THE Auth_System SHALL use the Supabase client configured in `src/lib/supabase.ts` with `persistSession: true` for all authentication calls.

---

### Requirement 2: Leadership Access Check

**User Story:** As a system administrator, I want only the 18 designated leadership members to access the system, so that regular members and children cannot view or modify ministry data.

#### Acceptance Criteria

1. WHEN a Supabase_Auth session is established, THE Auth_System SHALL query `member_sub_departments` joined with `leadership_roles` and `sub_departments` to retrieve all active role assignments for the authenticated Member.
2. WHEN the query returns at least one active `member_sub_departments` row where `leadership_roles.name` is `Chairperson`, `Vice Chairperson`, or `Secretary`, THE Auth_System SHALL grant application access.
3. WHEN the query returns only rows where `leadership_roles.name` is `Member`, or returns no rows, THE Auth_System SHALL deny access, sign the user out of Supabase_Auth, and display the message "Access denied. You do not have permission to access this system."
4. WHEN the leadership check query fails due to a database error, THE Auth_System SHALL deny access, sign the user out of Supabase_Auth, and display the message "Unable to verify access. Please try again."
5. THE Auth_System SHALL perform the leadership check via a Supabase RPC_Function named `check_leadership_access` that accepts `auth_user_id UUID` and returns a JSON object containing `has_access BOOLEAN`, `role TEXT`, and `sub_department TEXT`.
6. THE Auth_System SHALL complete the leadership check within 5 seconds; IF the check does not complete within 5 seconds, THEN THE Auth_System SHALL deny access and display a timeout error message.

---

### Requirement 3: Role Resolution and App_Role Mapping

**User Story:** As a ministry leader, I want the system to recognize my specific role and sub-department, so that I see only the features and data relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN access is granted, THE Auth_System SHALL map the highest-priority qualifying Leadership_Role to an App_Role according to the following table:
   - `Chairperson` in `Department` → `chairperson`
   - `Vice Chairperson` in `Department` → `vice-chairperson`
   - `Secretary` in `Department` → `secretary`
   - `Chairperson` in any other Sub_Department → `subdept-leader`
   - `Vice Chairperson` in any other Sub_Department → `subdept-vice-leader`
   - `Secretary` in any other Sub_Department → `subdept-vice-leader`
2. WHEN a Member holds multiple qualifying roles, THE Auth_System SHALL select the role with the highest hierarchy level as defined by `leadership_roles.hierarchy_level` (lower numeric value = higher priority).
3. WHEN access is granted, THE Auth_System SHALL populate the `AuthContext` user object with: `id` (Member UUID), `name` (Member `full_name`), `role` (mapped App_Role), `subDepartment` (Sub_Department name, if not `Department`), `email`, and `phone`.
4. THE Auth_System SHALL expose the resolved user object through the `useAuth()` hook so all application components can read the current user's role and sub-department.

---

### Requirement 4: Session Persistence

**User Story:** As a ministry leader, I want my session to persist when I refresh the page or reopen the browser, so that I do not have to sign in repeatedly.

#### Acceptance Criteria

1. THE Auth_System SHALL configure Supabase_Auth with `persistSession: true` so that the JWT session token is stored in `localStorage`.
2. WHEN the application loads and a valid Supabase_Auth session exists in `localStorage`, THE Auth_System SHALL restore the Authenticated_User state without requiring a new sign-in.
3. WHEN the application loads and a valid session exists, THE Auth_System SHALL re-run the leadership access check to confirm the user's role is still active before restoring access.
4. WHEN the application loads and no valid session exists in `localStorage`, THE Auth_System SHALL set the user state to `null` and redirect to `/login`.
5. WHILE the Auth_System is restoring a session on application load, THE Auth_System SHALL display a loading state and SHALL NOT render Protected_Routes.

---

### Requirement 5: Protected Routes and Redirect Behavior

**User Story:** As a system administrator, I want unauthenticated users to be redirected to the login page, so that no ministry data is exposed without authentication.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to any Protected_Route, THE Auth_System SHALL redirect the user to `/login`.
2. WHEN an Authenticated_User navigates to `/login`, THE Auth_System SHALL redirect the user to the application root `/`.
3. THE Auth_System SHALL protect all routes defined in `src/app/routes.tsx` under the `Layout` component as Protected_Routes.
4. WHILE the Auth_System is loading (session restoration in progress), THE Auth_System SHALL render a full-screen loading indicator instead of the Protected_Route content or the login redirect.
5. WHEN an Authenticated_User's session expires or is invalidated by Supabase_Auth, THE Auth_System SHALL redirect the user to `/login` and clear the user state.

---

### Requirement 6: Sign-Out

**User Story:** As a ministry leader, I want to sign out of the system, so that my session is terminated and the system is secured.

#### Acceptance Criteria

1. WHEN a user triggers the sign-out action, THE Auth_System SHALL call `supabase.auth.signOut()`.
2. WHEN sign-out completes, THE Auth_System SHALL clear the user state in `AuthContext` and redirect the user to `/login`.
3. WHEN sign-out fails due to a network error, THE Auth_System SHALL still clear the local user state and redirect to `/login`.

---

### Requirement 7: Database Migration for Access Check

**User Story:** As a developer, I want a database-level RPC function to perform the leadership access check, so that access control logic is enforced server-side and cannot be bypassed by client-side manipulation.

#### Acceptance Criteria

1. THE Auth_System SHALL include a Supabase migration file at `supabase/migrations/006_auth_access_check.sql` that creates the `check_leadership_access(auth_user_id UUID)` RPC_Function.
2. THE `check_leadership_access` function SHALL query `members`, `member_sub_departments`, `leadership_roles`, and `sub_departments` to determine access.
3. THE `check_leadership_access` function SHALL return a JSON object with fields: `has_access` (BOOLEAN), `role` (TEXT — the `leadership_roles.name` of the highest-priority active role), and `sub_department` (TEXT — the `sub_departments.name` of that role's sub-department).
4. WHEN no qualifying active role is found for the given `auth_user_id`, THE `check_leadership_access` function SHALL return `{ "has_access": false, "role": null, "sub_department": null }`.
5. THE `check_leadership_access` function SHALL be defined with `SECURITY DEFINER` so it can read the `members` and `member_sub_departments` tables regardless of the calling user's RLS policies.
6. THE migration SHALL update the existing auth trigger in `supabase/migrations/005_auth_trigger.sql` to link `auth.users` to `members` via `members.auth_user_id` instead of the deprecated `system_users` table.

---

### Requirement 8: AuthContext Rewrite

**User Story:** As a developer, I want the `AuthContext` to use the new database schema, so that the application correctly resolves user roles from `members`, `member_sub_departments`, `leadership_roles`, and `sub_departments`.

#### Acceptance Criteria

1. THE Auth_System SHALL rewrite `src/app/context/AuthContext.tsx` to remove all references to the deprecated `system_users` and `member_roles` tables.
2. THE Auth_System SHALL use the `check_leadership_access` RPC_Function to resolve user roles instead of direct table queries to `system_users` and `member_roles`.
3. THE Auth_System SHALL expose the same `AuthContextValue` interface (`user`, `isLoading`, `login`, `logout`, `error`) so that no other component requires changes to its `useAuth()` call signature.
4. WHERE `VITE_DEMO_MODE=true`, THE Auth_System SHALL bypass Supabase_Auth and allow direct injection of a preset `User` object, preserving the existing demo-mode behavior in `src/app/pages/Login.tsx`.
5. THE Auth_System SHALL subscribe to `supabase.auth.onAuthStateChange` to handle session events (`INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`) and update the user state accordingly.

---

### Requirement 9: Git Commit Per Implementation Task

**User Story:** As a developer, I want each implementation task committed separately with a descriptive message, so that the git history is clean and each change is traceable.

#### Acceptance Criteria

1. WHEN an implementation task is completed, THE Auth_System implementation SHALL produce a git commit with a message following the format: `feat(auth): <short description of the task>`.
2. THE commit message SHALL reference the task number from the implementation plan (e.g., `feat(auth): task 1 — add check_leadership_access RPC migration`).
3. THE Auth_System implementation SHALL NOT combine multiple unrelated tasks into a single commit.

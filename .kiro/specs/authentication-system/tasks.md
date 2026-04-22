# Implementation Plan: Authentication System

## Overview

This plan implements a two-phase authentication system for Hitsanat KFL: (1) Supabase email/password authentication, (2) server-side leadership access check via RPC. The implementation replaces the deprecated `system_users` / `member_roles` schema with direct queries against `members`, `member_sub_departments`, `leadership_roles`, and `sub_departments`. The `AuthContext` interface remains unchanged to avoid breaking existing components. Each task is committed separately with the format `feat(auth): task N — <description>`.

## Tasks

- [x] 1. Create database migration for leadership access check
  - Create `supabase/migrations/006_auth_access_check.sql`
  - Implement `check_leadership_access(auth_user_id UUID)` RPC function with `SECURITY DEFINER`
  - Function queries `members` → `member_sub_departments` → `leadership_roles` → `sub_departments`
  - Function filters on `is_active = true` and excludes `leadership_roles.name = 'Member'`
  - Function orders by `leadership_roles.hierarchy_level ASC` and returns first row
  - Function returns JSON: `{ has_access: BOOLEAN, role: TEXT, sub_department: TEXT }`
  - Update `handle_new_auth_user` trigger to write `auth_user_id` to `members.auth_user_id` instead of `system_users`
  - _Requirements: 2.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - **Commit message:** `feat(auth): task 1 — add check_leadership_access RPC migration`

- [x] 1.1 Write integration test for check_leadership_access RPC
  - **Property 6: RPC return value always has the correct shape**
  - **Validates: Requirements 7.3**
  - Test against local Supabase CLI instance
  - Test with known user with qualifying role → `has_access: true`
  - Test with user with only `Member` role → `has_access: false`
  - Test with unknown `auth_user_id` → `has_access: false`
  - Test return shape always has `has_access`, `role`, `sub_department` fields

- [ ] 2. Rewrite AuthContext to use new schema
  - [x] 2.1 Remove all references to `system_users` and `member_roles` tables
    - Delete `SystemUserRow`, `MemberRoleRow` interfaces
    - Delete `ROLE_PRIORITY`, `ROLE_MAP` constants
    - Delete `fetchSystemUser` function
    - _Requirements: 8.1, 8.2_
  
  - [x] 2.2 Implement `checkLeadershipAccess` helper function
    - Accept `authUserId: string` and `email: string` parameters
    - Call `supabase.rpc('check_leadership_access', { auth_user_id: authUserId })`
    - Wrap RPC call in `Promise.race` with 5-second timeout
    - On timeout: call `supabase.auth.signOut()`, set error, return `null`
    - On RPC error: call `supabase.auth.signOut()`, set error, return `null`
    - On `has_access: false`: call `supabase.auth.signOut()`, set error "Access denied. You do not have permission to access this system.", return `null`
    - On `has_access: true`: map `role` + `sub_department` to `App_Role`, fetch member name and phone, return `User` object
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 3.3_
  
  - [x] 2.3 Implement role mapping logic
    - Create `mapToAppRole(role: string, subDepartment: string): UserRole` function
    - Map `(Chairperson, Department)` → `chairperson`
    - Map `(Vice Chairperson, Department)` → `vice-chairperson`
    - Map `(Secretary, Department)` → `secretary`
    - Map `(Chairperson, other)` → `subdept-leader`
    - Map `(Vice Chairperson, other)` → `subdept-vice-leader`
    - Map `(Secretary, other)` → `subdept-vice-leader`
    - _Requirements: 3.1_
  
  - [x] 2.4 Update `onAuthStateChange` subscription to call `checkLeadershipAccess`
    - On `INITIAL_SESSION` / `SIGNED_IN`: call `checkLeadershipAccess(session.user.id, session.user.email)`
    - On `SIGNED_OUT`: clear user state
    - On `TOKEN_REFRESHED` with session: re-run `checkLeadershipAccess`
    - Set `isLoading = false` after check completes
    - _Requirements: 4.2, 4.3, 8.5_
  
  - [x] 2.5 Update `login` function to use new flow
    - In live mode: call `supabase.auth.signInWithPassword({ email, password })`
    - On auth error: set `error = authError.message`
    - On auth success: `onAuthStateChange` will trigger leadership check
    - In demo mode: preserve existing behavior (accept `User` object)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.4_
  
  - [x] 2.6 Preserve `AuthContextValue` interface
    - Ensure interface still exposes `user`, `isLoading`, `login`, `logout`, `error`
    - No changes to public API
    - _Requirements: 8.3_
  
  - **Commit message:** `feat(auth): task 2 — rewrite AuthContext to use check_leadership_access RPC`

- [x] 2.7 Write unit tests for AuthContext
  - Test `login()` calls `signInWithPassword` with correct arguments
  - Test auth error sets `error` field
  - Test successful auth triggers `checkLeadershipAccess` RPC call
  - Test `has_access: false` calls `signOut()` and sets access-denied error
  - Test RPC error calls `signOut()` and sets retry error
  - Test RPC timeout (5s) denies access
  - Test `logout()` calls `signOut()` and clears user
  - Test `signOut()` error still clears user state
  - Test `INITIAL_SESSION` with valid session restores user
  - Test `INITIAL_SESSION` with no session sets `user = null`
  - Test demo mode `login(userObject)` sets user without calling Supabase

- [x] 2.8 Write property tests for role mapping
  - **Property 3: Role mapping is correct for all valid (role, sub_department) combinations**
  - **Validates: Requirements 3.1**
  - Use `fc.constantFrom` to generate all combinations from mapping table
  - For each combination, assert `mapToAppRole(role, subDept)` returns expected `App_Role`
  - Run 100 iterations

- [x] 2.9 Write property test for error message propagation
  - **Property 1: Error messages are propagated without modification**
  - **Validates: Requirements 1.3**
  - Generate arbitrary non-empty strings as mock Supabase error messages
  - Mock `signInWithPassword` to return each error
  - Assert `useAuth().error === generatedMessage`
  - Run 100 iterations

- [x] 2.10 Write property test for User object population
  - **Property 2: Access granted produces a fully-populated User object**
  - **Validates: Requirements 2.2, 3.3**
  - Generate arbitrary `{ has_access: true, role, sub_department }` objects with valid values
  - Mock RPC to return each response
  - Assert resulting `user` has all required fields (`id`, `name`, `role`, `email` non-empty)
  - Assert `subDepartment` is set when `sub_department !== 'Department'`
  - Assert `subDepartment` is `undefined` when `sub_department === 'Department'`
  - Run 100 iterations

- [x] 2.11 Write property test for highest-priority role selection
  - **Property 4: Highest-priority role is always selected**
  - **Validates: Requirements 3.2**
  - Generate non-empty arrays of role objects with random `hierarchy_level` values (1–100)
  - For each array, call role-selection logic
  - Assert returned role has minimum `hierarchy_level` in array
  - Run 100 iterations

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create ProtectedRoute component
  - Create `src/app/components/ProtectedRoute.tsx`
  - Accept `children: ReactNode` prop
  - Use `useAuth()` hook to get `user`, `isLoading`
  - If `isLoading === true`: render full-screen spinner
  - If `user === null`: render `<Navigate to="/login" replace />`
  - Otherwise: render `children`
  - _Requirements: 5.1, 5.4_
  - **Commit message:** `feat(auth): task 4 — create ProtectedRoute component`

- [x] 4.1 Write unit tests for ProtectedRoute
  - Test `isLoading = true` renders spinner
  - Test `user = null` and `isLoading = false` redirects to `/login`
  - Test `user` set renders children

- [x] 4.2 Write property test for unauthenticated redirect
  - **Property 5: Unauthenticated users are always redirected to /login**
  - **Validates: Requirements 5.1**
  - Generate arbitrary route path strings (e.g., `/children`, `/members`, `/reports/xyz`)
  - For each path, render `<ProtectedRoute>` with `user = null` and `isLoading = false`
  - Assert rendered output is redirect to `/login`
  - Run 100 iterations

- [x] 5. Update routes.tsx to use ProtectedRoute
  - Wrap the `Layout` route in `<ProtectedRoute><Layout /></ProtectedRoute>`
  - Add `/login` route outside the protected wrapper: `{ path: "/login", Component: Login }`
  - Import `ProtectedRoute` from `src/app/components/ProtectedRoute`
  - Import `Login` from `src/app/pages/Login`
  - _Requirements: 5.3_
  - **Commit message:** `feat(auth): task 5 — wrap Layout in ProtectedRoute and add /login route`

- [x] 6. Wire Login page to redirect when authenticated
  - In `src/app/pages/Login.tsx`, import `Navigate` from `react-router`
  - Get `user` and `isLoading` from `useAuth()`
  - Add redirect logic: `if (!isLoading && user) return <Navigate to="/" replace />;`
  - _Requirements: 5.2_
  - **Commit message:** `feat(auth): task 6 — add authenticated redirect to Login page`

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** with Vitest (minimum 100 iterations)
- Integration tests run against local Supabase CLI instance
- Each task is committed separately with format: `feat(auth): task N — <description>`
- The `check_leadership_access` RPC function uses `SECURITY DEFINER`
- The `members` table uses `auth_user_id` column (not `system_users` table)
- The `member_sub_departments` table uses `role_id` FK to `leadership_roles`
- The `leadership_roles` table has `hierarchy_level` column (lower = higher priority)
- The existing `AuthContextValue` interface must not change
- Demo mode (`VITE_DEMO_MODE=true`) must be preserved
- The `ProtectedRoute` component goes in `src/app/components/ProtectedRoute.tsx`
- Routes update: wrap the Layout route in `ProtectedRoute` in `src/app/routes.tsx`
- The `/login` route must be outside the `ProtectedRoute` wrapper

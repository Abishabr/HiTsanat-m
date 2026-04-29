# Tasks

## Implementation Plan

### 1. Database Migration — Upsert Guard for `handle_new_user()`

- [x] 1.1 Create migration file `supabase/migrations/008_handle_new_user_upsert.sql` that replaces `handle_new_user()` with an upsert version using `ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id WHERE members.auth_user_id IS NULL`
- [x] 1.2 Verify the migration applies cleanly against the existing schema (the `email UNIQUE NOT NULL` constraint already exists)

---

### 2. Edge Function — `admin-user-management`

- [x] 2.1 Create `supabase/functions/admin-user-management/index.ts` with Deno/TypeScript boilerplate (CORS headers, JSON request parsing, error response helpers)
- [x] 2.2 Implement JWT verification: extract `Authorization` header, call `supabase.auth.getUser(jwt)` using the service role client, return 401 if invalid
- [x] 2.3 Implement role authorization helper: query `members → member_sub_departments → leadership_roles → sub_departments` to determine the caller's role and sub-department
- [x] 2.4 Implement `create_user` operation: require Chairperson of Department (return 403 otherwise), call Supabase Admin API `POST /auth/v1/admin/users` with `{ email, password, email_confirm: true, user_metadata: { full_name } }`, return `{ auth_user_id }` on success
- [x] 2.5 Implement `update_password` operation: require any dept leader (Chairperson/Vice Chairperson/Secretary of Department), call Supabase Admin API `PUT /auth/v1/admin/users/{auth_user_id}` with `{ password }`, return success/error
- [x] 2.6 Forward Supabase Admin API error messages to the client with the appropriate HTTP status code
- [x] 2.7 Set CORS headers to allow the deployed app origin and `http://localhost:*`

---

### 3. Client-side API Utility

- [x] 3.1 Create `src/app/lib/adminApi.ts` with `callAdminFunction(operation, payload)` that retrieves the current JWT from `supabase.auth.getSession()` and POSTs to the Edge Function URL
- [x] 3.2 Handle network errors (catch fetch exceptions) and return `{ data: null, error: 'Network error. Please check your connection and try again.' }`
- [x] 3.3 Handle non-2xx responses by parsing the response body and returning the error message

---

### 4. Permission Helpers

- [x] 4.1 Add `canAccessUserManagement(role: UserRole): boolean` to `src/app/lib/permissions.ts` — returns true for `chairperson`, `vice-chairperson`, `secretary`
- [x] 4.2 Add `canCreateAuthAccounts(role: UserRole): boolean` to `src/app/lib/permissions.ts` — returns true for `chairperson` only

---

### 5. Validation Utilities

- [x] 5.1 Create `src/app/lib/validation.ts` (or add to existing) with `validatePassword(s: string): boolean` — checks length ≥ 8, uppercase, digit, special character
- [x] 5.2 Create `validateEmail(s: string): boolean` in the same file — checks RFC 5322 simplified email format
- [x] 5.3 Create `getPasswordErrors(s: string): string[]` that returns an array of specific failure messages for inline display

---

### 6. `CreateAccountDialog` Component

- [x] 6.1 Create `src/app/components/CreateAccountDialog.tsx` with two modes: "Link Existing Member" (pre-fills email from selected member) and "Create New Member" (full_name + email + password)
- [x] 6.2 Implement client-side validation using `validateEmail` and `validatePassword`; show inline error messages per field
- [x] 6.3 On submit, call `callAdminFunction('create_user', payload)` and handle loading state (disable submit button, show spinner)
- [x] 6.4 On success, call `onSuccess(memberId: string)` prop with the member's UUID (for "link" mode: the existing member's id; for "new member" mode: query `members WHERE auth_user_id = returned_uuid`)
- [x] 6.5 On error, display the error as a toast and keep form values populated
- [x] 6.6 Handle the "email already registered" error with the specific message from Requirement 3.6

---

### 7. `ResetPasswordDialog` Component

- [x] 7.1 Create `src/app/components/ResetPasswordDialog.tsx` with `newPassword` and `confirmPassword` fields
- [x] 7.2 Validate that both fields match before submission; show "Passwords do not match" inline if they differ
- [x] 7.3 Validate password complexity using `validatePassword`; show inline errors
- [x] 7.4 On submit, call `callAdminFunction('update_password', { auth_user_id, new_password })`
- [x] 7.5 Show success toast on completion; show error toast with the API error message on failure

---

### 8. `UserManagementPage` Component

- [x] 8.1 Create `src/app/pages/UserManagementPage.tsx` with access guard: if `!canAccessUserManagement(user.role)`, redirect to `/`
- [x] 8.2 Implement data loading: query `members WHERE auth_user_id IS NULL` for unlinked list and `members WHERE auth_user_id IS NOT NULL` for linked list, including role assignments via join or RPC
- [x] 8.3 Implement real-time search filter: filter both lists by `full_name` or `email` containing `searchTerm` (case-insensitive)
- [x] 8.4 Render the Unlinked Members tab: show `full_name`, `email`, role badges; show "Create Account" button only if `canCreateAuthAccounts(user.role)`
- [x] 8.5 Render the Linked Members tab: show `full_name`, `email`, truncated `auth_user_id`, role badges; show "Reset Password" action for all admin roles
- [x] 8.6 Show empty-state message when the unlinked list is empty: "All members have login accounts"
- [x] 8.7 Wire up `CreateAccountDialog`: open on "Create Account" click, pass selected member; on `onSuccess`, open `RoleAssignmentDialog` with the returned member ID
- [x] 8.8 Show the role-assignment skip warning: after `RoleAssignmentDialog` closes without a role being assigned, display "This user will not be able to log in until a leadership role is assigned."
- [x] 8.9 Wire up `ResetPasswordDialog`: open on "Reset Password" click, pass the selected member's `auth_user_id`
- [x] 8.10 Refresh the unlinked/linked lists after each successful create or link operation

---

### 9. Routing and Navigation

- [x] 9.1 Add the `/user-management` route to `src/app/App.tsx` wrapped in `ProtectedRoute` with `allowedRoles={['chairperson', 'vice-chairperson', 'secretary']}`
- [x] 9.2 Add a "User Management" nav item to `src/app/components/Layout.tsx` visible only to `chairperson`, `vice-chairperson`, and `secretary` roles

---

### 10. Property-Based Tests

- [x] 10.1 Create `src/app/lib/__tests__/permissions.property.test.ts` — Property 1: for any `UserRole`, `canAccessUserManagement` returns true iff role ∈ `{chairperson, vice-chairperson, secretary}` (100+ iterations with `fast-check`)
- [x] 10.2 Add to the same file — Property 2: for any `UserRole`, `canCreateAuthAccounts` returns true iff role === `chairperson`
- [x] 10.3 Create `src/app/lib/__tests__/validation.property.test.ts` — Property 8: for any string, `validatePassword` returns true iff all four criteria are met (100+ iterations)
- [x] 10.4 Add to the same file — Property 9: for any string, `validateEmail` returns true iff the string is a valid email format
- [x] 10.5 Create `src/app/pages/__tests__/UserManagementPage.property.test.ts` — Property 5: for any array of members with mixed `auth_user_id` values, the unlinked filter returns exactly those with `auth_user_id === null`
- [x] 10.6 Add to the same file — Property 10: for any member array and search term, the search filter returns exactly those members whose `full_name` or `email` contains the term (case-insensitive)
- [x] 10.7 Create `supabase/migrations/__tests__/handle_new_user.property.test.ts` (or equivalent) — Property 7: for any valid email, the upsert logic applied twice results in exactly one `members` row

---

### 11. Unit Tests

- [x] 11.1 Create `src/app/pages/__tests__/UserManagementPage.test.tsx` — test redirect for non-admin roles, correct rendering for each of the three admin roles, empty-state message
- [x] 11.2 Create `src/app/components/__tests__/CreateAccountDialog.test.tsx` — test email pre-fill, inline validation errors, success callback, error toast, form value preservation on failure
- [x] 11.3 Create `src/app/components/__tests__/ResetPasswordDialog.test.tsx` — test "Passwords do not match" message, password complexity errors, success/failure toasts
- [x] 11.4 Create `src/app/lib/__tests__/adminApi.test.ts` — test JWT attachment, network error handling, non-2xx error parsing

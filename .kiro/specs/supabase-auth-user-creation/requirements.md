# Requirements Document

## Introduction

The **Supabase User Creation** feature provides an admin-controlled workflow for provisioning login credentials for ministry members in the Hitsanat KFL system. Currently, the system has 18 designated leadership members who need Supabase Auth accounts linked to their existing `members` table rows. New members may also need to be created from scratch.

The feature covers two scenarios:
1. **Linking existing members** — a member row already exists in the `members` table; an admin creates a Supabase Auth account and links it via `members.auth_user_id`.
2. **Creating new members with login** — a new member record and a Supabase Auth account are created together in one operation.

After account creation, the admin can assign the new user to one or more sub-departments with a leadership role so they can log in and access the system. The existing `handle_new_user()` trigger auto-creates a `members` row when a new auth user is created, so the workflow must account for this to avoid duplicate member records.

The feature is implemented as an admin UI page within the existing React application. Creating login accounts and assigning sub-department leadership roles is restricted to the **Chairperson** of the `Department` sub-department. Vice Chairpersons and Secretaries may view the user list and perform password resets, but cannot create accounts or assign roles. A Node.js script (`scripts/create-users.mjs`) already exists for bulk provisioning; this feature complements it with an interactive UI for ongoing user management.

---

## Glossary

- **User_Creation_System**: The complete feature described in this document, including the admin UI page, Supabase service functions, and database operations.
- **Chairperson_Admin**: The Chairperson of the `Department` sub-department — the only role permitted to create login accounts and assign sub-department leadership roles.
- **Viewer_Admin**: A Vice Chairperson or Secretary of the `Department` sub-department — permitted to view the user list and reset passwords, but NOT to create accounts or assign roles.
- **Admin**: Either a Chairperson_Admin or Viewer_Admin.
- **Auth_User**: A row in `auth.users` managed by Supabase Auth, identified by a UUID and an email address.
- **Member**: A row in the `members` table representing a registered person in the ministry.
- **Linked_Member**: A Member whose `auth_user_id` column references an Auth_User, enabling login.
- **Unlinked_Member**: A Member whose `auth_user_id` is NULL, meaning they have no login credentials.
- **Supabase_Admin_API**: The Supabase Auth Admin REST API (`/auth/v1/admin/users`) accessible only with the service role key, used to create and manage Auth_Users server-side.
- **Service_Role_Key**: The Supabase service role secret key that grants full database and Auth Admin API access, stored in environment variables and never exposed to the browser.
- **Edge_Function**: A Supabase Edge Function (Deno) deployed server-side that wraps the Supabase_Admin_API calls, keeping the Service_Role_Key out of the browser.
- **Leadership_Role**: A row in the `leadership_roles` table. Qualifying roles for system access are `Chairperson`, `Vice Chairperson`, and `Secretary`.
- **Sub_Department**: A row in the `sub_departments` table. Valid values: `Department`, `Timhert`, `Mezmur`, `Kinetibeb`, `Kuttr`, `Ekd`.
- **Role_Assignment**: A row in the `member_sub_departments` table linking a Member to a Sub_Department with a Leadership_Role.
- **handle_new_user_trigger**: The PostgreSQL trigger on `auth.users` that calls `public.handle_new_user()` to auto-insert a `members` row when a new Auth_User is created.
- **Duplicate_Member_Guard**: Logic that prevents the `handle_new_user_trigger` from creating a second `members` row when an Auth_User is linked to an already-existing Member.

---

## Requirements

### Requirement 1: Admin Access Control

**User Story:** As a Chairperson, I want only I can create login accounts and assign sub-department leaders, so that Vice Chairpersons and Secretaries cannot provision users or change role assignments.

#### Acceptance Criteria

1. THE User_Creation_System SHALL restrict access to the user management page to authenticated users whose role in the `Department` sub-department is `Chairperson`, `Vice Chairperson`, or `Secretary`.
2. WHEN a user with an insufficient role navigates to the user management page, THE User_Creation_System SHALL redirect the user to the application root `/`.
3. THE User_Creation_System SHALL display the "Create Account" and "Assign Role" actions ONLY to a Chairperson_Admin; these actions SHALL be hidden from Viewer_Admins.
4. WHEN a Viewer_Admin accesses the page, THE User_Creation_System SHALL display the member lists and password reset action only.
5. THE User_Creation_System SHALL not expose the Service_Role_Key to the browser at any point.
6. THE User_Creation_System SHALL perform all Supabase_Admin_API calls through a server-side Edge_Function, not directly from the React client.
7. THE Edge_Function SHALL enforce Chairperson_Admin authorization server-side for `create_user` and `assign_role` operations, returning HTTP 403 if the caller is not a Chairperson of the `Department` sub-department.

---

### Requirement 2: View Unlinked Members

**User Story:** As an admin, I want to see a list of members who do not yet have login credentials, so that I can identify who still needs an account created.

#### Acceptance Criteria

1. WHEN an Admin loads the user creation page, THE User_Creation_System SHALL query the `members` table and display all rows where `auth_user_id IS NULL`.
2. THE User_Creation_System SHALL display each Unlinked_Member's `full_name`, `email`, and current sub-department role assignments.
3. WHEN no Unlinked_Members exist, THE User_Creation_System SHALL display an empty-state message indicating all members have login accounts.
4. THE User_Creation_System SHALL refresh the Unlinked_Member list after each successful user creation operation.

---

### Requirement 3: Create Auth User for Existing Member

**User Story:** As an admin, I want to create a Supabase login account for an existing member, so that they can sign in to the system without creating a duplicate member record.

#### Acceptance Criteria

1. WHEN an Admin selects an Unlinked_Member and submits a valid email and password, THE User_Creation_System SHALL call the Edge_Function to create an Auth_User via the Supabase_Admin_API with `email_confirm: true`.
2. WHEN the Auth_User is created successfully, THE User_Creation_System SHALL update the existing `members` row by setting `auth_user_id` to the new Auth_User's UUID.
3. WHEN `auth_user_id` is set on an existing Member, THE User_Creation_System SHALL ensure the `handle_new_user_trigger` does NOT create a duplicate `members` row for that Auth_User.
4. THE User_Creation_System SHALL pre-fill the email field with the Member's existing `members.email` value and allow the Admin to override it.
5. THE password field SHALL require a minimum of 8 characters, at least one uppercase letter, at least one digit, and at least one special character.
6. IF the email address is already registered in Supabase_Auth, THEN THE User_Creation_System SHALL display the error "This email is already registered. Use a different email or link the existing account."
7. WHEN the operation completes successfully, THE User_Creation_System SHALL display a success notification and remove the member from the Unlinked_Member list.

---

### Requirement 4: Create New Member with Login

**User Story:** As an admin, I want to create a brand-new member record and login account in one step, so that new members can be onboarded quickly.

#### Acceptance Criteria

1. WHEN an Admin submits the new-member form with `full_name`, `email`, and `password`, THE User_Creation_System SHALL call the Edge_Function to create an Auth_User via the Supabase_Admin_API with `email_confirm: true` and `user_metadata.full_name` set to the provided name.
2. WHEN the Auth_User is created, THE `handle_new_user_trigger` SHALL automatically insert a `members` row with `email`, `full_name`, and `auth_user_id` populated from the new Auth_User.
3. THE User_Creation_System SHALL NOT perform a separate `INSERT INTO members` when using the new-member flow, relying solely on the trigger.
4. THE password field SHALL enforce the same complexity rules as Requirement 3.5.
5. IF the email address is already registered in Supabase_Auth, THEN THE User_Creation_System SHALL display the error "This email is already registered."
6. WHEN the operation completes successfully, THE User_Creation_System SHALL display a success notification with the new member's name and email.

---

### Requirement 5: Duplicate Member Guard

**User Story:** As a developer, I want the database trigger to skip member creation when an auth user is linked to an existing member, so that the system never has two member records for the same person.

#### Acceptance Criteria

1. THE `handle_new_user()` trigger function SHALL check whether a `members` row with the same `email` already exists before inserting a new row.
2. WHEN a `members` row with the same `email` already exists, THE `handle_new_user()` function SHALL update that row's `auth_user_id` to the new Auth_User's UUID instead of inserting a new row.
3. WHEN no `members` row with the same `email` exists, THE `handle_new_user()` function SHALL insert a new `members` row as before.
4. THE updated `handle_new_user()` function SHALL be delivered as a new Supabase migration file.
5. FOR ALL valid email addresses, running the trigger twice with the same email SHALL result in exactly one `members` row (idempotence property).

---

### Requirement 6: Role Assignment After User Creation

**User Story:** As a Chairperson, I want to assign a sub-department and leadership role to a newly created user immediately after account creation, so that they can log in and access the correct parts of the system.

#### Acceptance Criteria

1. WHEN a Chairperson_Admin creates a user account successfully, THE User_Creation_System SHALL present the `RoleAssignmentDialog` component to assign a sub-department and role.
2. THE User_Creation_System SHALL pass the newly created or linked Member's UUID to the `RoleAssignmentDialog`.
3. WHEN the Chairperson_Admin assigns a role, THE User_Creation_System SHALL insert a row into `member_sub_departments` with the selected `sub_department_id`, `role_id`, `member_id`, and `is_active = true`.
4. WHEN the Chairperson_Admin skips role assignment, THE User_Creation_System SHALL allow the operation to complete without a role assignment, and the new user will be denied system access until a role is assigned.
5. THE User_Creation_System SHALL display a warning when the Chairperson_Admin skips role assignment: "This user will not be able to log in until a leadership role is assigned."
6. THE User_Creation_System SHALL NOT display the role assignment option to Viewer_Admins (Vice Chairperson, Secretary).

---

### Requirement 7: Password Reset for Existing Auth Users

**User Story:** As an admin, I want to reset the password of an existing login user, so that I can help members who have forgotten their credentials.

#### Acceptance Criteria

1. WHEN an Admin selects a Linked_Member and submits a new password, THE User_Creation_System SHALL call the Edge_Function to update the Auth_User's password via the Supabase_Admin_API.
2. THE new password SHALL enforce the same complexity rules as Requirement 3.5.
3. WHEN the password update succeeds, THE User_Creation_System SHALL display a success notification.
4. WHEN the password update fails, THE User_Creation_System SHALL display the error message returned by the Supabase_Admin_API.
5. THE User_Creation_System SHALL require the Admin to confirm the new password by entering it twice; IF the two entries do not match, THEN THE User_Creation_System SHALL display "Passwords do not match" and SHALL NOT submit the request.

---

### Requirement 8: Edge Function for Admin API Calls

**User Story:** As a developer, I want all Supabase Admin API calls to go through a server-side Edge Function, so that the service role key is never exposed in the browser bundle.

#### Acceptance Criteria

1. THE User_Creation_System SHALL include a Supabase Edge Function at `supabase/functions/admin-user-management/index.ts` that handles the following operations: `create_user`, `update_password`.
2. THE Edge_Function SHALL authenticate the calling user by verifying the Supabase JWT from the `Authorization` header before executing any Admin API operation.
3. WHEN the calling user's JWT does not correspond to a department-level leader (Chairperson, Vice Chairperson, or Secretary of the `Department` sub-department), THE Edge_Function SHALL return HTTP 403 with the body `{ "error": "Forbidden" }`.
4. FOR `create_user` and `assign_role` operations, WHEN the calling user is not a Chairperson of the `Department` sub-department, THE Edge_Function SHALL return HTTP 403 with the body `{ "error": "Only the Chairperson can perform this action" }`.
4. THE Edge_Function SHALL use the `SUPABASE_SERVICE_ROLE_KEY` environment variable (set in Supabase project settings) and SHALL NOT accept the service role key as a request parameter.
5. WHEN the Supabase_Admin_API returns an error, THE Edge_Function SHALL forward the error message to the client with the appropriate HTTP status code.
6. THE Edge_Function SHALL accept requests only from the application's origin (CORS restricted to the deployed app URL and `localhost` for development).

---

### Requirement 9: Input Validation and Error Handling

**User Story:** As an admin, I want clear validation feedback on all form inputs, so that I can correct mistakes before submitting.

#### Acceptance Criteria

1. THE User_Creation_System SHALL validate that the email field contains a syntactically valid email address before submission.
2. THE User_Creation_System SHALL validate password complexity (minimum 8 characters, at least one uppercase letter, at least one digit, at least one special character) client-side before submission.
3. WHEN a required field is empty on form submission, THE User_Creation_System SHALL display an inline error message next to the empty field.
4. WHEN a network error occurs during an Edge_Function call, THE User_Creation_System SHALL display "Network error. Please check your connection and try again."
5. WHEN any operation fails, THE User_Creation_System SHALL leave the form populated with the previously entered values so the Admin can correct and resubmit without re-entering all data.

---

### Requirement 10: Audit Visibility

**User Story:** As an admin, I want to see which members already have login accounts and when they were created, so that I can audit the system's user list.

#### Acceptance Criteria

1. THE User_Creation_System SHALL display a separate list of Linked_Members showing `full_name`, `email`, and `auth_user_id` (truncated UUID for display).
2. THE User_Creation_System SHALL allow the Admin to initiate a password reset from the Linked_Member list.
3. THE User_Creation_System SHALL display each Linked_Member's active role assignments alongside their record.
4. WHEN the Admin searches by name or email, THE User_Creation_System SHALL filter both the Unlinked_Member and Linked_Member lists in real time.

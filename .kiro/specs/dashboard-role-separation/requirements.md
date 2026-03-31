# Requirements Document

## Introduction

This feature separates the existing unified Dashboard into distinct, role-based views. The Chairperson sees a high-level overview of all sub-departments and organization-wide metrics. Each sub-department (Timhert Academic, Tmezmur, Kinetibeb, EKD, and Kuttr) gets a focused dashboard scoped to their own data, members, programs, and activities. The routing and navigation system must direct users to the correct dashboard based on their assigned role.

## Glossary

- **Dashboard**: The landing page rendered at the root route (`/`) of the application.
- **Chairperson_Dashboard**: The dashboard view rendered for users with the `chairperson` role, showing organization-wide metrics across all sub-departments.
- **SubDept_Dashboard**: The dashboard view rendered for users with the `subdept-leader` role, scoped to their assigned sub-department.
- **Role**: The `role` field on the `User` object, one of: `chairperson`, `vice-chairperson`, `secretary`, `subdept-leader`, `member`.
- **Sub-department**: One of the five organizational units: Timhert Academic (mapped from `Timhert`), Tmezmur (mapped from `Mezmur`), Kinetibeb, EKD (mapped from `Ekd`), Kuttr.
- **currentUser**: The active user object exported from `mockData.ts`, used to determine role and sub-department assignment.
- **Router**: The React Router instance defined in `routes.tsx`.
- **Layout**: The shared shell component wrapping all pages, defined in `Layout.tsx`.

---

## Requirements

### Requirement 1: Role-Based Dashboard Routing

**User Story:** As a user, I want to be automatically directed to the dashboard appropriate for my role, so that I see only the information relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN a user with the `chairperson` role navigates to `/`, THE Router SHALL render the Chairperson_Dashboard component.
2. WHEN a user with the `subdept-leader` role navigates to `/`, THE Router SHALL render the SubDept_Dashboard component scoped to that user's assigned sub-department.
3. WHEN a user with the `vice-chairperson` or `secretary` role navigates to `/`, THE Router SHALL render the Chairperson_Dashboard component.
4. IF a `subdept-leader` user has no `subDepartment` value set, THEN THE Router SHALL render a fallback message indicating the sub-department assignment is missing.
5. THE Router SHALL determine the dashboard to render using the `currentUser` object from `mockData.ts` without requiring a separate login step.

---

### Requirement 2: Chairperson Dashboard

**User Story:** As a chairperson, I want a unified overview of all sub-departments and organization-wide activity, so that I can monitor the health of the entire organization.

#### Acceptance Criteria

1. THE Chairperson_Dashboard SHALL display aggregate statistics covering all sub-departments, including total children, total members, upcoming programs, and upcoming events.
2. THE Chairperson_Dashboard SHALL display a per-sub-department activity summary showing program count and attendance rate for each of the five sub-departments.
3. THE Chairperson_Dashboard SHALL display a member distribution chart showing the proportion of members across all sub-departments.
4. THE Chairperson_Dashboard SHALL display attendance trend charts aggregated across all sub-departments.
5. THE Chairperson_Dashboard SHALL provide navigation links to each of the five sub-department dashboards.
6. THE Chairperson_Dashboard SHALL display upcoming weekly programs and upcoming child events across all sub-departments.
7. THE Chairperson_Dashboard SHALL display a quick-actions panel with links to: Add Child, Add Member, Schedule Program, and Mark Attendance.

---

### Requirement 3: Sub-Department Dashboard — Scoped View

**User Story:** As a sub-department leader, I want a dashboard focused on my sub-department's data, so that I can manage my team and programs without distraction from other departments.

#### Acceptance Criteria

1. WHEN a `subdept-leader` user views their dashboard, THE SubDept_Dashboard SHALL display statistics scoped exclusively to their assigned sub-department, including member count, active program count, average attendance, and performance score.
2. THE SubDept_Dashboard SHALL display only the members belonging to the user's assigned sub-department.
3. THE SubDept_Dashboard SHALL display only the weekly programs associated with the user's assigned sub-department.
4. THE SubDept_Dashboard SHALL display the leadership team (chairperson, vice-chairperson, secretary) of the assigned sub-department.
5. THE SubDept_Dashboard SHALL display activity trend charts (programs and attendance) scoped to the assigned sub-department.
6. THE SubDept_Dashboard SHALL display a task list scoped to the assigned sub-department.
7. THE SubDept_Dashboard SHALL display quick-action buttons for: Create Program, Add Member, Generate Report, and Send Announcement.
8. IF the current user's role is `subdept-leader` and their `subDepartment` matches the displayed sub-department, THEN THE SubDept_Dashboard SHALL show management controls (add task, schedule program, export report).

---

### Requirement 4: Sub-Department Identity and Branding

**User Story:** As a sub-department leader, I want my dashboard to visually reflect my sub-department's identity, so that the experience feels tailored to my team.

#### Acceptance Criteria

1. THE SubDept_Dashboard SHALL display the sub-department's name as the page heading.
2. THE SubDept_Dashboard SHALL apply the sub-department's designated color (from `subDepartments` data) to accent elements including stat card borders, chart bars, and action buttons.
3. THE SubDept_Dashboard SHALL display the sub-department's description as a subtitle beneath the heading.
4. THE SubDept_Dashboard SHALL display a two-letter avatar derived from the sub-department name, styled with the sub-department's color.

---

### Requirement 5: Navigation Awareness

**User Story:** As a user, I want the navigation sidebar to reflect my role, so that I only see menu items relevant to my access level.

#### Acceptance Criteria

1. WHEN the current user's role is `chairperson`, `vice-chairperson`, or `secretary`, THE Layout SHALL display navigation links to all five sub-department dashboards in addition to the standard menu items.
2. WHEN the current user's role is `subdept-leader`, THE Layout SHALL display a navigation link only to that user's own sub-department dashboard, not to other sub-departments.
3. THE Layout SHALL display the current user's name and role in the sidebar or header.
4. WHEN the current user's role is `subdept-leader`, THE Layout SHALL not display navigation links to sub-departments other than the user's own.

---

### Requirement 6: Sub-Department Name Mapping

**User Story:** As a developer, I want the five sub-department display names to match the feature specification, so that the UI is consistent with organizational naming.

#### Acceptance Criteria

1. THE SubDept_Dashboard SHALL display "Timhert Academic" as the label for the sub-department with `name: 'Timhert'` in `mockData.ts`.
2. THE SubDept_Dashboard SHALL display "Tmezmur" as the label for the sub-department with `name: 'Mezmur'` in `mockData.ts`.
3. THE SubDept_Dashboard SHALL display "Kinetibeb" as the label for the sub-department with `name: 'Kinetibeb'` in `mockData.ts`.
4. THE SubDept_Dashboard SHALL display "EKD" as the label for the sub-department with `name: 'Ekd'` in `mockData.ts`.
5. THE SubDept_Dashboard SHALL display "Kuttr" as the label for the sub-department with `name: 'Kuttr'` in `mockData.ts`.

# Implementation Plan: Dashboard Role Separation

## Overview

Implement role-based dashboard routing by adding a `SUBDEPT_DISPLAY_NAMES` mapping and utility to `mockData.ts`, creating a `RoleRouter` component, refactoring `Dashboard.tsx` into `ChairpersonDashboard.tsx`, updating `SubDepartmentDashboard.tsx` to accept an optional `subDepartmentName` prop with display name mapping, wiring `RoleRouter` into `routes.tsx`, and making `Layout.tsx` role-aware for sub-department navigation links.

## Tasks

- [x] 1. Add sub-department display name mapping and utility to mockData.ts
  - Add `SUBDEPT_DISPLAY_NAMES` constant mapping internal names to display names (Timhert→"Timhert Academic", Mezmur→"Tmezmur", Kinetibeb→"Kinetibeb", Kuttr→"Kuttr", Ekd→"EKD")
  - Add `getSubDeptDisplayName(name: string): string` pure function that returns the mapped display name or falls back to the input
  - Export both from `src/app/data/mockData.ts`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 1.1 Write property test for sub-department name mapping
    - **Property 11: Sub-department name mapping is correct**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Use fast-check to assert `getSubDeptDisplayName` returns the correct display name for all five internal names and returns the input unchanged for unknown names
    - Tag: `// Feature: dashboard-role-separation, Property 11: Sub-department name mapping is correct`

- [x] 2. Create RoleRouter component
  - Create `src/app/pages/RoleRouter.tsx` as a stateless component with no props
  - Read `currentUser` from `mockData.ts` and dispatch based on `currentUser.role`:
    - `chairperson | vice-chairperson | secretary` → render `<ChairpersonDashboard />`
    - `subdept-leader` with non-empty `currentUser.subDepartment` → render `<SubDepartmentDashboard subDepartmentName={currentUser.subDepartment} />`
    - `subdept-leader` with missing/empty `subDepartment` → render inline fallback: "Sub-department not assigned. Please contact your administrator."
    - Unknown role → fall back to `<ChairpersonDashboard />`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.1 Write property test for RoleRouter — org-wide roles
    - **Property 1: Chairperson roles see ChairpersonDashboard**
    - **Validates: Requirements 1.1, 1.3**
    - Use fast-check to generate users with role in `['chairperson', 'vice-chairperson', 'secretary']` and assert `RoleRouter` renders `ChairpersonDashboard`
    - Tag: `// Feature: dashboard-role-separation, Property 1: Chairperson roles see ChairpersonDashboard`

  - [x] 2.2 Write property test for RoleRouter — subdept-leader with valid assignment
    - **Property 2: Sub-department leader sees scoped dashboard**
    - **Validates: Requirements 1.2**
    - Use fast-check to generate `subdept-leader` users with a valid `subDepartment` from the five known values and assert `RoleRouter` renders `SubDepartmentDashboard` scoped to that sub-department
    - Tag: `// Feature: dashboard-role-separation, Property 2: Sub-department leader sees scoped dashboard`

  - [x] 2.3 Write property test for RoleRouter — missing sub-department fallback
    - **Property 3: Missing sub-department assignment shows fallback**
    - **Validates: Requirements 1.4**
    - Use fast-check to generate `subdept-leader` users with `subDepartment` set to `undefined` or `''` and assert the fallback message is rendered (no crash, no `SubDepartmentDashboard`)
    - Tag: `// Feature: dashboard-role-separation, Property 3: Missing sub-department assignment shows fallback`

- [x] 3. Refactor Dashboard.tsx into ChairpersonDashboard.tsx
  - Rename `src/app/pages/Dashboard.tsx` to `src/app/pages/ChairpersonDashboard.tsx` and update the component name to `ChairpersonDashboard`
  - Remove the role badge section (role display is now handled by `Layout.tsx`)
  - Add sub-department navigation cards section linking to `/subdepartment/:id` for all five sub-departments, using `getSubDeptDisplayName` for labels and each department's color for styling
  - Keep all existing sections: aggregate stat cards, sub-department activity summary with progress bars, member distribution pie chart, attendance trend line chart, upcoming programs list, upcoming events list, and quick-actions panel
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.1 Write property test for ChairpersonDashboard — all sub-department links present
    - **Property 4: Chairperson dashboard contains all sub-department links**
    - **Validates: Requirements 2.5**
    - Use fast-check to render `ChairpersonDashboard` and assert all five sub-department display names appear as navigation links
    - Tag: `// Feature: dashboard-role-separation, Property 4: Chairperson dashboard contains all sub-department links`

  - [x] 3.2 Write property test for ChairpersonDashboard — aggregate stats present
    - **Property 5: Chairperson dashboard shows all aggregate stats**
    - **Validates: Requirements 2.1, 2.2, 2.6**
    - Render `ChairpersonDashboard` and assert all four stat cards (total children, total members, upcoming programs, upcoming events) are present and non-empty
    - Tag: `// Feature: dashboard-role-separation, Property 5: Chairperson dashboard shows all aggregate stats`

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update SubDepartmentDashboard.tsx with optional prop and display name mapping
  - Add an optional `subDepartmentName?: string` prop to `SubDepartmentDashboard`
  - Update the sub-department lookup: if `subDepartmentName` prop is provided, find by `sd.name === subDepartmentName`; otherwise fall back to the existing `useParams` `id` lookup (`sd.id === id`)
  - Apply `getSubDeptDisplayName` to the sub-department name for the page heading and all display labels
  - Ensure the two-letter avatar uses the first two characters of the display name (via `getSubDeptDisplayName`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.1 Write property test for SubDepartmentDashboard — member scoping
    - **Property 6: SubDeptDashboard members are scoped to the sub-department**
    - **Validates: Requirements 3.1, 3.2**
    - For each of the five sub-departments, render `SubDepartmentDashboard` and assert every displayed member belongs to that sub-department and no members from other sub-departments appear
    - Tag: `// Feature: dashboard-role-separation, Property 6: SubDeptDashboard members are scoped to the sub-department`

  - [x] 5.2 Write property test for SubDepartmentDashboard — program scoping
    - **Property 7: SubDeptDashboard programs are scoped to the sub-department**
    - **Validates: Requirements 3.3**
    - For each of the five sub-departments, render `SubDepartmentDashboard` and assert every displayed program has the matching `subDepartmentId`
    - Tag: `// Feature: dashboard-role-separation, Property 7: SubDeptDashboard programs are scoped to the sub-department`

  - [x] 5.3 Write property test for SubDepartmentDashboard — management controls visibility
    - **Property 8: Management controls visibility matches leader status**
    - **Validates: Requirements 3.8**
    - Use fast-check to generate users with varying roles and sub-department assignments; assert management controls (schedule program, export report, add task) are visible if and only if the user is a `subdept-leader` whose `subDepartment` matches the displayed sub-department
    - Tag: `// Feature: dashboard-role-separation, Property 8: Management controls visibility matches leader status`

  - [x] 5.4 Write property test for SubDepartmentDashboard — sub-department identity rendering
    - **Property 9: SubDeptDashboard reflects sub-department identity**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - For each of the five sub-departments, render `SubDepartmentDashboard` and assert the correct display name heading, description subtitle, department color on accent elements, and two-letter avatar derived from the display name
    - Tag: `// Feature: dashboard-role-separation, Property 9: SubDeptDashboard reflects sub-department identity`

- [x] 6. Update routes.tsx to use RoleRouter at the index route
  - Import `RoleRouter` from `./pages/RoleRouter`
  - Replace the `{ index: true, Component: Dashboard }` entry with `{ index: true, Component: RoleRouter }`
  - Keep the existing `Dashboard` import removed (or replaced) since `ChairpersonDashboard` is now used internally by `RoleRouter`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Update Layout.tsx for role-aware sub-department navigation and user display
  - Import `getSubDeptDisplayName` from `mockData.ts`
  - Replace the unconditional `subDepartments.map(...)` in the sidebar with a filtered list:
    - `subdept-leader`: show only the link matching `currentUser.subDepartment`
    - all other roles: show all five sub-department links
  - Apply `getSubDeptDisplayName` to each sub-department name in the sidebar links
  - Ensure the user section already displays `currentUser.name` and role (already present — verify it remains correct)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.1 Write property test for Layout — sidebar sub-department link visibility
    - **Property 10: Layout shows correct sub-department links per role**
    - **Validates: Requirements 5.1, 5.2, 5.4**
    - Use fast-check to generate users with all possible roles; assert the sidebar contains links to all five sub-departments for org-wide roles and exactly one link for `subdept-leader`
    - Tag: `// Feature: dashboard-role-separation, Property 10: Layout shows correct sub-department links per role`

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) and should run a minimum of 100 iterations each
- Each property test must include the tag comment in the format: `// Feature: dashboard-role-separation, Property N: <property text>`
- `currentUser` in `mockData.ts` can be mutated in tests to simulate different roles — restore it after each test
- The existing `/subdepartment/:id` route and `SubDepartmentDashboard` URL-param behavior must remain intact alongside the new prop-based entry point

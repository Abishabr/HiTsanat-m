# Implementation Plan: Coming Soon Pages

## Overview

This implementation replaces the AttendanceTracking page with the ComingSoon component to provide consistent messaging for incomplete features. The ComingSoon component already exists and is used by other pages. This is a straightforward refactoring task that simplifies the AttendanceTracking page while maintaining all routes and navigation.

## Tasks

- [x] 1. Replace AttendanceTracking page with ComingSoon component
  - Open `src/app/pages/AttendanceTracking.tsx`
  - Replace entire file content with ComingSoon component import and usage
  - Pass title: "Attendance Tracking"
  - Pass description: "Attendance is recorded within weekly programs by the Kuttr sub-department."
  - Remove all unused imports (useState, useMemo, useAuth, useSchedule, useDataStore, icons, permissions, toast)
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

- [x] 1.1 Write unit test for AttendanceTracking page
  - Create test file `src/app/pages/__tests__/AttendanceTracking.test.tsx`
  - Test that AttendanceTracking renders ComingSoon component
  - Test that correct title prop is passed
  - Test that correct description prop is passed
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Verify navigation and routing
  - Ensure `/attendance` route still works
  - Verify sidebar navigation to attendance page functions correctly
  - Confirm no console errors when navigating to the page
  - _Requirements: 3.2, 4.1_

- [~] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The ComingSoon component already exists at `src/app/components/ComingSoon.tsx` and requires no modifications
- All routes remain unchanged; only the page implementation is simplified
- Task 1.1 is marked optional for faster implementation
- This is a refactoring task with minimal risk since we're replacing complex logic with a simple component

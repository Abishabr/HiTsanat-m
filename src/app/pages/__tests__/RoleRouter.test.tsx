import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import * as mockDataModule from '../../data/mockData';

// Mock child components to avoid rendering their full trees
vi.mock('../ChairpersonDashboard', () => ({
  default: () => <div data-testid="chairperson-dashboard">ChairpersonDashboard</div>,
}));

vi.mock('../SubDepartmentDashboard', () => ({
  default: ({ subDepartmentName }: { subDepartmentName?: string }) => (
    <div data-testid="subdepartment-dashboard" data-subdept={subDepartmentName}>
      SubDepartmentDashboard
    </div>
  ),
}));

// Import RoleRouter after mocks are set up
import RoleRouter from '../RoleRouter';

const VALID_SUBDEPTS = ['Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'] as const;

// Save original currentUser values to restore after each test
let originalRole: mockDataModule.UserRole;
let originalSubDepartment: string | undefined;

beforeEach(() => {
  originalRole = mockDataModule.currentUser.role;
  originalSubDepartment = mockDataModule.currentUser.subDepartment;
});

afterEach(() => {
  mockDataModule.currentUser.role = originalRole;
  mockDataModule.currentUser.subDepartment = originalSubDepartment;
});

// Feature: dashboard-role-separation, Property 1: Chairperson roles see ChairpersonDashboard
describe('Property 1: Chairperson roles see ChairpersonDashboard', () => {
  it('renders ChairpersonDashboard for any org-wide role', () => {
    // Validates: Requirements 1.1, 1.3
    const orgWideRoles: mockDataModule.UserRole[] = ['chairperson', 'vice-chairperson', 'secretary'];

    fc.assert(
      fc.property(
        fc.constantFrom(...orgWideRoles),
        (role) => {
          mockDataModule.currentUser.role = role;
          mockDataModule.currentUser.subDepartment = undefined;

          const { unmount } = render(<RoleRouter />);
          const dashboard = screen.getByTestId('chairperson-dashboard');
          expect(dashboard).toBeTruthy();
          const subdeptDashboard = screen.queryByTestId('subdepartment-dashboard');
          expect(subdeptDashboard).toBeNull();
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// Feature: dashboard-role-separation, Property 2: Sub-department leader sees scoped dashboard
describe('Property 2: Sub-department leader sees scoped dashboard', () => {
  it('renders SubDepartmentDashboard scoped to the assigned sub-department', () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        (subDept) => {
          mockDataModule.currentUser.role = 'subdept-leader';
          mockDataModule.currentUser.subDepartment = subDept;

          const { unmount } = render(<RoleRouter />);
          const dashboard = screen.getByTestId('subdepartment-dashboard');
          expect(dashboard).toBeTruthy();
          expect(dashboard.getAttribute('data-subdept')).toBe(subDept);
          const chairDashboard = screen.queryByTestId('chairperson-dashboard');
          expect(chairDashboard).toBeNull();
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// Feature: dashboard-role-separation, Property 3: Missing sub-department assignment shows fallback
describe('Property 3: Missing sub-department assignment shows fallback', () => {
  it('renders fallback message when subdept-leader has no sub-department', () => {
    // Validates: Requirements 1.4
    const missingValues = [undefined, ''] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...missingValues),
        (subDept) => {
          mockDataModule.currentUser.role = 'subdept-leader';
          mockDataModule.currentUser.subDepartment = subDept as string | undefined;

          const { unmount } = render(<RoleRouter />);
          const fallbackText = screen.getByText(
            'Sub-department not assigned. Please contact your administrator.'
          );
          expect(fallbackText).toBeTruthy();
          expect(screen.queryByTestId('subdepartment-dashboard')).toBeNull();
          expect(screen.queryByTestId('chairperson-dashboard')).toBeNull();
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});

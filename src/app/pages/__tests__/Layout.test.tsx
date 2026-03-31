import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import * as fc from 'fast-check';
import * as mockDataModule from '../../data/mockData';
import Layout from '../../components/Layout';
import { AuthProvider } from '../../context/AuthContext';

const VALID_SUBDEPTS = ['Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'] as const;
type SubDeptName = typeof VALID_SUBDEPTS[number];

const EXPECTED_DISPLAY_NAMES = [
  'Timhert Academic',
  'Tmezmur',
  'Kinetibeb',
  'Kuttr',
  'EKD',
];

let originalRole: mockDataModule.UserRole;
let originalSubDepartment: string | undefined;

beforeEach(() => {
  originalRole = mockDataModule.currentUser.role;
  originalSubDepartment = mockDataModule.currentUser.subDepartment;
});

afterEach(() => {
  mockDataModule.currentUser.role = originalRole;
  mockDataModule.currentUser.subDepartment = originalSubDepartment;
  cleanup();
});

function renderFresh(ui: React.ReactElement) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const result = render(ui, { container: div });
  return { ...result, div };
}

// Feature: dashboard-role-separation, Property 10: Layout shows correct sub-department links per role
describe('Property 10: Layout shows correct sub-department links per role', () => {
  it('shows all five sub-department links for org-wide roles', () => {
    // Validates: Requirements 5.1, 5.2, 5.4
    const orgWideRoles: mockDataModule.UserRole[] = ['chairperson', 'vice-chairperson', 'secretary'];

    fc.assert(
      fc.property(
        fc.constantFrom(...orgWideRoles),
        (role) => {
          mockDataModule.currentUser.role = role;
          mockDataModule.currentUser.subDepartment = undefined;

          const { div, unmount } = renderFresh(
            <AuthProvider>
              <MemoryRouter>
                <Layout />
              </MemoryRouter>
            </AuthProvider>
          );

          try {
            const subdeptNav = div.querySelector('[data-testid="subdept-nav"]');
            expect(subdeptNav, 'Expected subdept-nav element').toBeTruthy();
            const navScope = within(subdeptNav as HTMLElement);

            for (const displayName of EXPECTED_DISPLAY_NAMES) {
              const links = navScope.queryAllByRole('link', { name: new RegExp(displayName, 'i') });
              expect(
                links.length,
                `Expected link for "${displayName}" with role=${role}`
              ).toBeGreaterThan(0);
            }
          } finally {
            unmount();
            div.remove();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('shows exactly one sub-department link for subdept-leader matching their sub-department', () => {
    // Validates: Requirements 5.1, 5.4
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        (subDept: SubDeptName) => {
          mockDataModule.currentUser.role = 'subdept-leader';
          mockDataModule.currentUser.subDepartment = subDept;

          const { div, unmount } = renderFresh(
            <AuthProvider>
              <MemoryRouter>
                <Layout />
              </MemoryRouter>
            </AuthProvider>
          );

          try {
            const subdeptNav = div.querySelector('[data-testid="subdept-nav"]');
            expect(subdeptNav, 'Expected subdept-nav element').toBeTruthy();
            const navScope = within(subdeptNav as HTMLElement);
            const ownDisplayName = mockDataModule.getSubDeptDisplayName(subDept);

            // Own sub-department link must be present
            const ownLinks = navScope.queryAllByRole('link', { name: new RegExp(ownDisplayName, 'i') });
            expect(
              ownLinks.length,
              `Expected link for own sub-dept "${ownDisplayName}" (${subDept})`
            ).toBeGreaterThan(0);

            // Other sub-departments must NOT appear
            for (const otherDisplayName of EXPECTED_DISPLAY_NAMES) {
              if (otherDisplayName === ownDisplayName) continue;
              const otherLinks = navScope.queryAllByRole('link', { name: new RegExp(otherDisplayName, 'i') });
              expect(
                otherLinks.length,
                `Expected NO link for "${otherDisplayName}" when leader of "${subDept}"`
              ).toBe(0);
            }
          } finally {
            unmount();
            div.remove();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

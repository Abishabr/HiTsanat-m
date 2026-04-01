import { describe, it, expect, afterEach } from 'vitest';
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

afterEach(() => { cleanup(); });

function renderLayout(role: mockDataModule.UserRole, subDepartment?: string) {
  const user = { ...mockDataModule.currentUser, role, subDepartment };
  const div = document.createElement('div');
  document.body.appendChild(div);
  const result = render(
    <AuthProvider initialUser={user}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </AuthProvider>,
    { container: div }
  );
  return { ...result, div };
}

// Feature: dashboard-role-separation, Property 10: Layout shows correct sub-department links per role
describe('Property 10: Layout shows correct sub-department links per role', () => {
  it('shows no sub-department links for org-wide roles', () => {
    const orgWideRoles: mockDataModule.UserRole[] = ['chairperson', 'vice-chairperson', 'secretary'];
    fc.assert(
      fc.property(fc.constantFrom(...orgWideRoles), (role) => {
        const { div, unmount } = renderLayout(role);
        try {
          const nav = div.querySelector('[data-testid="subdept-nav"]');
          expect(nav, 'Expected no subdept-nav for org-wide roles').toBeNull();
        } finally { unmount(); div.remove(); }
      }),
      { numRuns: 20 }
    );
  }, 30000);

  it('shows exactly one sub-department link for subdept-leader', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_SUBDEPTS), (subDept: SubDeptName) => {
        const { div, unmount } = renderLayout('subdept-leader', subDept);
        try {
          const nav = div.querySelector('[data-testid="subdept-nav"]');
          expect(nav, 'Expected subdept-nav').toBeTruthy();
          const scope = within(nav as HTMLElement);
          const ownName = mockDataModule.getSubDeptDisplayName(subDept);
          expect(scope.queryAllByRole('link', { name: new RegExp(ownName, 'i') }).length,
            `Expected own link "${ownName}"`).toBeGreaterThan(0);
          for (const other of EXPECTED_DISPLAY_NAMES) {
            if (other === ownName) continue;
            expect(scope.queryAllByRole('link', { name: new RegExp(other, 'i') }).length,
              `Expected NO link for "${other}" when leader of "${subDept}"`).toBe(0);
          }
        } finally { unmount(); div.remove(); }
      }),
      { numRuns: 20 }
    );
  }, 30000);
});

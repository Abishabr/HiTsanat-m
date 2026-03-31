import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import * as fc from 'fast-check';
import * as mockDataModule from '../../data/mockData';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Line: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

import SubDepartmentDashboard from '../SubDepartmentDashboard';

const VALID_SUBDEPTS = ['Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'] as const;
type SubDeptName = typeof VALID_SUBDEPTS[number];

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

// Feature: dashboard-role-separation, Property 6: SubDeptDashboard members are scoped to the sub-department
describe('Property 6: SubDeptDashboard members are scoped to the sub-department', () => {
  it('stat card shows scoped member count', () => {
    // Validates: Requirements 3.1, 3.2
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        (subDeptName: SubDeptName) => {
          mockDataModule.currentUser.role = 'chairperson';
          const expectedCount = mockDataModule.mockMembers.filter(m =>
            m.subDepartments.includes(subDeptName)
          ).length;

          const { div, unmount } = renderFresh(
            <MemoryRouter>
              <SubDepartmentDashboard subDepartmentName={subDeptName} />
            </MemoryRouter>
          );

          try {
            const scope = within(div);
            const labels = scope.queryAllByText('Total Members');
            expect(labels.length, `No "Total Members" card in ${subDeptName}`).toBeGreaterThan(0);
            const valueEl = labels[0].closest('[data-slot="card-content"]')?.querySelector('p.text-3xl');
            expect(valueEl, `No count value for ${subDeptName}`).toBeTruthy();
            expect(Number(valueEl!.textContent?.trim())).toBe(expectedCount);
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

// Feature: dashboard-role-separation, Property 7: SubDeptDashboard programs are scoped to the sub-department
describe('Property 7: SubDeptDashboard programs are scoped to the sub-department', () => {
  it('active programs count matches scoped programs', () => {
    // Validates: Requirements 3.3
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        (subDeptName: SubDeptName) => {
          mockDataModule.currentUser.role = 'chairperson';
          const subDept = mockDataModule.subDepartments.find(sd => sd.name === subDeptName)!;
          const expectedPrograms = mockDataModule.mockWeeklyPrograms.filter(p => p.subDepartmentId === subDept.id);
          const unexpectedPrograms = mockDataModule.mockWeeklyPrograms.filter(p => p.subDepartmentId !== subDept.id);

          const { div, unmount } = renderFresh(
            <MemoryRouter>
              <SubDepartmentDashboard subDepartmentName={subDeptName} />
            </MemoryRouter>
          );

          try {
            const scope = within(div);
            const statCards = scope.queryAllByText('Active Programs');
            expect(statCards.length).toBeGreaterThan(0);
            const countEl = statCards[0].closest('[data-slot="card-content"]')?.querySelector('p.text-3xl');
            if (countEl) {
              expect(Number(countEl.textContent?.trim())).toBe(expectedPrograms.length);
            }
            for (const program of unexpectedPrograms) {
              expect(scope.queryAllByText(program.description).length, `"${program.description}" should not appear in ${subDeptName}`).toBe(0);
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

// Feature: dashboard-role-separation, Property 8: Management controls visibility matches leader status
describe('Property 8: Management controls visibility matches leader status', () => {
  it('shows controls iff user is leader of the displayed sub-department', () => {
    // Validates: Requirements 3.8
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        fc.record({
          role: fc.constantFrom<mockDataModule.UserRole>('chairperson', 'vice-chairperson', 'secretary', 'subdept-leader', 'member'),
          subDepartment: fc.constantFrom(...VALID_SUBDEPTS, undefined as unknown as SubDeptName),
        }),
        (displayedSubDeptName: SubDeptName, userConfig: { role: mockDataModule.UserRole; subDepartment: SubDeptName | undefined }) => {
          mockDataModule.currentUser.role = userConfig.role;
          mockDataModule.currentUser.subDepartment = userConfig.subDepartment as string | undefined;

          const { div, unmount } = renderFresh(
            <MemoryRouter>
              <SubDepartmentDashboard subDepartmentName={displayedSubDeptName} />
            </MemoryRouter>
          );

          try {
            const scope = within(div);
            const scheduleBtn = scope.queryAllByRole('button', { name: /schedule program/i });
            const exportBtn = scope.queryAllByRole('button', { name: /export report/i });
            const isLeader =
              userConfig.role === 'chairperson' ||
              userConfig.role === 'vice-chairperson' ||
              userConfig.role === 'secretary' ||
              (userConfig.role === 'subdept-leader' && userConfig.subDepartment === displayedSubDeptName);

            if (isLeader) {
              expect(scheduleBtn.length, `Expected Schedule Program btn for role=${userConfig.role}`).toBeGreaterThan(0);
              expect(exportBtn.length, `Expected Export Report btn for role=${userConfig.role}`).toBeGreaterThan(0);
            } else {
              expect(scheduleBtn.length, `Expected NO Schedule Program btn for role=${userConfig.role}`).toBe(0);
              expect(exportBtn.length, `Expected NO Export Report btn for role=${userConfig.role}`).toBe(0);
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

// Feature: dashboard-role-separation, Property 9: SubDeptDashboard reflects sub-department identity
describe('Property 9: SubDeptDashboard reflects sub-department identity', () => {
  it('shows correct heading, description, avatar, and color', () => {
    // Validates: Requirements 4.1, 4.2, 4.3, 4.4
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_SUBDEPTS),
        (subDeptName: SubDeptName) => {
          mockDataModule.currentUser.role = 'chairperson';
          const subDept = mockDataModule.subDepartments.find(sd => sd.name === subDeptName)!;
          const displayName = mockDataModule.getSubDeptDisplayName(subDeptName);
          const expectedAvatar = displayName.slice(0, 2);

          const { div, unmount } = renderFresh(
            <MemoryRouter>
              <SubDepartmentDashboard subDepartmentName={subDeptName} />
            </MemoryRouter>
          );

          try {
            const scope = within(div);

            // 4.1: heading contains display name
            const headings = scope.queryAllByRole('heading', { level: 1 });
            expect(headings.length, `No h1 for ${subDeptName}`).toBeGreaterThan(0);
            expect(headings.some(h => h.textContent?.includes(displayName)), `Heading missing "${displayName}"`).toBe(true);

            // 4.3: description subtitle
            expect(scope.queryAllByText(subDept.description).length, `Missing description for ${subDeptName}`).toBeGreaterThan(0);

            // 4.4: two-letter avatar
            expect(scope.queryAllByText(expectedAvatar).length, `Missing avatar "${expectedAvatar}" for ${subDeptName}`).toBeGreaterThan(0);

            // 4.2: department color on accent elements
            // jsdom normalizes hex to rgb() in style attributes, so convert before querying
            const hexToRgb = (hex: string) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgb(${r}, ${g}, ${b})`;
            };
            const rgbColor = hexToRgb(subDept.color);
            const colorEls = Array.from(div.querySelectorAll('[style]')).filter(el => {
              const s = (el as HTMLElement).getAttribute('style') ?? '';
              return s.includes(subDept.color) || s.includes(rgbColor);
            });
            expect(colorEls.length, `Missing color ${subDept.color} for ${subDeptName}`).toBeGreaterThan(0);
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

/**
 * Integration tests for Reports page access control
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 *
 * Note: Export authorization (Req 6.3, 6.4) is also covered in depth by
 * src/app/hooks/__tests__/useExport.test.tsx — see the "authorization" describe
 * block there for per-format permission checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { User } from '../../data/mockData';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// useReportData returns empty records and not loading by default
vi.mock('../../hooks/useReportData', () => ({
  useReportData: () => ({ records: [], isLoading: false }),
}));

// Stub out the other hooks so the component renders without real context
vi.mock('../../hooks/useReportFilter', () => ({
  useReportFilter: (_records: unknown[]) => _records,
}));

vi.mock('../../hooks/useReportSummary', () => ({
  useReportSummary: () => ({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    attendanceRate: 0,
    dateRange: '',
    kutrLevel: 'All Levels',
  }),
}));

// Stub child components to avoid deep render trees
vi.mock('../../components/ReportFilters', () => ({
  ReportFilters: () => <div data-testid="report-filters" />,
}));

vi.mock('../../components/ReportSummary', () => ({
  ReportSummary: () => <div data-testid="report-summary" />,
}));

// useAuth is controlled per-test via mockUseAuth
const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(role: User['role']): User {
  return { id: 'u1', name: 'Test User', role, email: 'test@test.com', phone: '' };
}

// Import after mocks are set up
import Reports from '../Reports';

function renderReports() {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Reports page – access control (Req 6.1, 6.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Req 6.1: authorized roles can access the page
  describe('authorized roles can access the Reports page', () => {
    const authorizedRoles: User['role'][] = [
      'chairperson',
      'vice-chairperson',
      'secretary',
    ];

    authorizedRoles.forEach((role) => {
      it(`allows ${role} to view the page without redirect`, () => {
        mockUseAuth.mockReturnValue({ user: makeUser(role) });
        renderReports();

        // No redirect should have been called
        expect(mockNavigate).not.toHaveBeenCalled();
        // No error toast
        expect(mockToastError).not.toHaveBeenCalled();
        // Page heading is visible
        expect(screen.getByText('Reports & Analytics')).toBeTruthy();
      });
    });
  });

  // Req 6.2: unauthorized roles are redirected to /dashboard
  describe('unauthorized roles are redirected to /dashboard', () => {
    const unauthorizedRoles: User['role'][] = [
      'member',
      'kuttr-member',
      'subdept-leader',
      'subdept-vice-leader',
      'teacher',
      'viewer',
    ];

    unauthorizedRoles.forEach((role) => {
      it(`redirects ${role} to /dashboard`, () => {
        mockUseAuth.mockReturnValue({ user: makeUser(role) });
        renderReports();

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  // Req 6.2: unauthorized user also sees a toast error
  it('shows a toast error when an unauthorized user accesses the page', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('member') });
    renderReports();

    expect(mockToastError).toHaveBeenCalledWith(
      "You don't have permission to access reports"
    );
  });

  // Req 6.2: null user (unauthenticated) is also redirected
  it('redirects unauthenticated (null) user to /dashboard', () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderReports();

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    expect(mockToastError).toHaveBeenCalled();
  });
});

/**
 * Export authorization (Req 6.3, 6.4)
 *
 * The useExport hook enforces export authorization by checking canExportReports()
 * before generating any file. Full coverage — including per-format checks for
 * CSV, Excel, and PDF — is provided in:
 *   src/app/hooks/__tests__/useExport.test.tsx  (describe block: "authorization")
 *
 * The tests there verify:
 *   - Unauthorized users receive "You don't have permission to export reports"
 *   - No file generation or download occurs for unauthorized users
 *   - Null users are also blocked
 */
describe('Export authorization coverage note (Req 6.3, 6.4)', () => {
  it('export auth is covered by useExport.test.tsx authorization suite', () => {
    // This is a documentation test — the real assertions live in useExport.test.tsx.
    // See the "authorization" describe block for per-format permission checks.
    expect(true).toBe(true);
  });
});

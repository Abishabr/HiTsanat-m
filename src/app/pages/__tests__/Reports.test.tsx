/**
 * Unit tests for Reports page component
 * 
 * Tests the main Reports page integration including:
 * - Authorization checks
 * - Data loading states
 * - Empty states
 * - Filter integration
 * - Summary display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Reports from '../Reports';
import * as AuthContext from '../../context/AuthContext';
import * as ReportHooks from '../../hooks';

// Mock dependencies
vi.mock('../../context/AuthContext');
vi.mock('../../hooks');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should allow chairperson to access reports', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([]);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No date selected',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow vice-chairperson to access reports', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Vice', role: 'vice-chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([]);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No date selected',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow secretary to access reports', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Secretary', role: 'secretary' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([]);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No date selected',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect unauthorized users to dashboard', async () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Member', role: 'member' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect when user is null', async () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: null,
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: true,
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no attendance records exist', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [],
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([]);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No date selected',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('No Attendance Records Found')).toBeInTheDocument();
      expect(
        screen.getByText(/Attendance records will appear here once they are submitted/)
      ).toBeInTheDocument();
    });

    it('should display filtered empty state when no records match filters', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      // Mock data exists but filtered results are empty
      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [
          {
            id: '1',
            date: '2024-01-15',
            day: 'Saturday',
            childId: 'child1',
            status: 'present',
            markedBy: 'user1',
            markedAt: '2024-01-15T10:00:00Z',
            childName: 'John Doe',
            childKutrLevel: 1,
            familyName: 'Doe',
          },
        ] as any,
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([]);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No date selected',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('No Records Found')).toBeInTheDocument();
      expect(
        screen.getByText(/No attendance records match your current filters/)
      ).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display summary statistics when data is available', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      const mockRecords = [
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: 1,
          familyName: 'Doe',
        },
        {
          id: '2',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child2',
          status: 'absent',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'Jane Smith',
          childKutrLevel: 2,
          familyName: 'Smith',
        },
      ] as any;

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: mockRecords,
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue(mockRecords);
      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 2,
        presentCount: 1,
        absentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 50,
        dateRange: 'Jan 15, 2024',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
      expect(screen.getByText('Total Records')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display page header and description', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [
          {
            id: '1',
            date: '2024-01-15',
            day: 'Saturday',
            childId: 'child1',
            status: 'present',
            markedBy: 'user1',
            markedAt: '2024-01-15T10:00:00Z',
            childName: 'John Doe',
            childKutrLevel: 1,
            familyName: 'Doe',
          },
        ] as any,
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: 1,
          familyName: 'Doe',
        },
      ] as any);

      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 1,
        presentCount: 1,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 100,
        dateRange: 'Jan 15, 2024',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
      expect(
        screen.getByText('View and analyze attendance reports with flexible filtering options')
      ).toBeInTheDocument();
    });

    it('should display placeholder for future features', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: '1', name: 'Chair', role: 'chairperson' },
      } as any);

      vi.mocked(ReportHooks.useReportData).mockReturnValue({
        records: [
          {
            id: '1',
            date: '2024-01-15',
            day: 'Saturday',
            childId: 'child1',
            status: 'present',
            markedBy: 'user1',
            markedAt: '2024-01-15T10:00:00Z',
            childName: 'John Doe',
            childKutrLevel: 1,
            familyName: 'Doe',
          },
        ] as any,
        isLoading: false,
      });

      vi.mocked(ReportHooks.useReportFilter).mockReturnValue([
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: 1,
          familyName: 'Doe',
        },
      ] as any);

      vi.mocked(ReportHooks.useReportSummary).mockReturnValue({
        totalRecords: 1,
        presentCount: 1,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 100,
        dateRange: 'Jan 15, 2024',
        kutrLevel: 'All Levels',
      });

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      expect(screen.getByText('Additional Features Coming Soon')).toBeInTheDocument();
      expect(
        screen.getByText(/Data table, charts, and export functionality/)
      ).toBeInTheDocument();
    });
  });
});

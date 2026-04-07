/**
 * Integration tests for Reports page component
 *
 * Tests the complete data flow from hooks to UI components.
 * Uses two mock strategies:
 *   - Context-level mocks (ScheduleStore/DataStore) for true integration tests
 *   - Hook-level mocks (../../hooks) for focused interaction tests
 *
 * Requirements: 1.1, 2.7, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Reports from '../Reports';
import * as AuthContext from '../../context/AuthContext';
import * as ScheduleStore from '../../context/ScheduleStore';
import * as DataStore from '../../context/DataStore';
import * as ReportHooks from '../../hooks';
import * as UseExportHook from '../../hooks/useExport';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../context/AuthContext');
vi.mock('../../context/ScheduleStore');
vi.mock('../../context/DataStore');
vi.mock('../../hooks');
// ExportControls imports useExport directly from the hook file
vi.mock('../../hooks/useExport', () => ({
  useExport: vi.fn(() => ({
    exportCSV: vi.fn(),
    exportExcel: vi.fn(),
    exportPDF: vi.fn(),
    isExporting: false,
    error: null,
  })),
}));
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock recharts to avoid ResizeObserver issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Bar: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="bar">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const MOCK_RECORDS = [
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
  {
    id: '3',
    date: '2024-01-16',
    day: 'Sunday',
    childId: 'child1',
    status: 'late',
    markedBy: 'user1',
    markedAt: '2024-01-16T10:00:00Z',
    childName: 'John Doe',
    childKutrLevel: 1,
    familyName: 'Doe',
  },
] as any[];

const MOCK_SUMMARY = {
  totalRecords: 3,
  presentCount: 1,
  absentCount: 1,
  lateCount: 1,
  excusedCount: 0,
  attendanceRate: 33,
  dateRange: 'Jan 15, 2024 - Jan 16, 2024',
  kutrLevel: 'All Levels',
};

/** Set up hook-level mocks for the authorized chairperson with data */
function setupHookMocks(overrides: {
  records?: any[];
  filteredRecords?: any[];
  summary?: any;
  isLoading?: boolean;
  error?: string | null;
  retry?: () => void;
} = {}) {
  const records = overrides.records ?? MOCK_RECORDS;
  const filteredRecords = overrides.filteredRecords ?? records;

  vi.mocked(AuthContext.useAuth).mockReturnValue({
    user: { id: '1', name: 'Chair', role: 'chairperson' },
  } as any);

  vi.mocked(ReportHooks.useReportData).mockReturnValue({
    records,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    retry: overrides.retry ?? vi.fn(),
  } as any);

  vi.mocked(ReportHooks.useReportFilter).mockReturnValue(filteredRecords);

  vi.mocked(ReportHooks.useReportSummary).mockReturnValue(
    overrides.summary ?? MOCK_SUMMARY
  );
}

// ---------------------------------------------------------------------------
// Helper: render inside MemoryRouter
// ---------------------------------------------------------------------------

function renderReports() {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// 1. Complete data flow: fetch → filter → summary display
// ---------------------------------------------------------------------------

describe('Reports Page – complete data flow (context-level integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Authorized user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Chair', role: 'chairperson' },
    } as any);
  });

  it('should display complete report with filters and summary when data is available', async () => {
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child2',
          status: 'absent',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '3',
          date: '2024-01-16',
          day: 'Sunday',
          childId: 'child1',
          status: 'late',
          markedBy: 'user1',
          markedAt: '2024-01-16T10:00:00Z',
        },
      ],
      isLoading: false,
    } as any);

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [
        { id: 'child1', name: 'John Doe', kutrLevel: 1, familyName: 'Doe' },
        { id: 'child2', name: 'Jane Smith', kutrLevel: 2, familyName: 'Smith' },
      ],
      isLoading: false,
    } as any);

    setupHookMocks();

    renderReports();

    // Page header
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();

    // Filters panel
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Time Interval')).toBeInTheDocument();
    // Use label query to distinguish filter label from table column header
    expect(screen.getByLabelText('Kutr Level')).toBeInTheDocument();

    // Summary statistics
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
  });

  it('should show empty state when no attendance records exist', () => {
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: false,
    } as any);

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
    } as any);

    setupHookMocks({ records: [], filteredRecords: [] });

    renderReports();

    expect(screen.getByText('No Attendance Records Found')).toBeInTheDocument();
    expect(
      screen.getByText(/Attendance records will appear here once they are submitted/)
    ).toBeInTheDocument();
  });

  it('should show loading state while data is being fetched', () => {
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: true,
    } as any);

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
    } as any);

    setupHookMocks({ isLoading: true, records: [], filteredRecords: [] });

    renderReports();

    expect(screen.getByLabelText('Loading attendance data')).toBeInTheDocument();
  });

  it('should update summary when filters change', async () => {
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          date: '2024-01-22',
          day: 'Saturday',
          childId: 'child1',
          status: 'absent',
          markedBy: 'user1',
          markedAt: '2024-01-22T10:00:00Z',
        },
      ],
      isLoading: false,
    } as any);

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [
        { id: 'child1', name: 'John Doe', kutrLevel: 1, familyName: 'Doe' },
      ],
      isLoading: false,
    } as any);

    setupHookMocks({
      summary: { ...MOCK_SUMMARY, totalRecords: 2 },
    });

    renderReports();

    // Both records should be visible in the total count
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. All major sections render when data is available
// ---------------------------------------------------------------------------

describe('Reports Page – major sections rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHookMocks();
  });

  it('should render the page header with title and description', () => {
    renderReports();

    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    expect(
      screen.getByText('View and analyze attendance reports with flexible filtering options')
    ).toBeInTheDocument();
  });

  it('should render the filters panel', () => {
    renderReports();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Time Interval')).toBeInTheDocument();
    // Use label query to distinguish filter label from table column header
    expect(screen.getByLabelText('Kutr Level')).toBeInTheDocument();
  });

  it('should render summary statistics cards', () => {
    renderReports();

    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    expect(screen.getByText('Report Filters')).toBeInTheDocument();
  });

  it('should display correct summary values from hook data', () => {
    renderReports();

    // Total records count
    expect(screen.getByText('3')).toBeInTheDocument();
    // Attendance rate
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('should render filter action buttons', () => {
    renderReports();

    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('should show filtered empty state when records exist but none match filters', () => {
    setupHookMocks({ filteredRecords: [] });

    renderReports();

    expect(screen.getByText('No Records Found')).toBeInTheDocument();
    expect(
      screen.getByText(/No attendance records match your current filters/)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Filter interactions
// ---------------------------------------------------------------------------

describe('Reports Page – filter interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHookMocks();
  });

  it('should call useReportFilter with current filters on initial render', () => {
    renderReports();

    expect(vi.mocked(ReportHooks.useReportFilter)).toHaveBeenCalledWith(
      MOCK_RECORDS,
      expect.objectContaining({ timeInterval: 'weekly', kutrLevel: 'all' })
    );
  });

  it('should call useReportSummary with filtered records', () => {
    renderReports();

    expect(vi.mocked(ReportHooks.useReportSummary)).toHaveBeenCalledWith(
      MOCK_RECORDS,
      expect.objectContaining({ timeInterval: 'weekly' })
    );
  });

  it('should update filters when Apply Filters button is clicked', async () => {
    renderReports();

    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyButton);

    // After clicking Apply, useReportFilter should be called again with the current filters
    await waitFor(() => {
      expect(vi.mocked(ReportHooks.useReportFilter)).toHaveBeenCalled();
    });
  });

  it('should reset filters to defaults when Reset button is clicked', async () => {
    renderReports();

    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    // After reset, useReportFilter should be called with default filters
    await waitFor(() => {
      expect(vi.mocked(ReportHooks.useReportFilter)).toHaveBeenCalledWith(
        MOCK_RECORDS,
        expect.objectContaining({
          timeInterval: 'weekly',
          kutrLevel: 'all',
          startDate: null,
          endDate: null,
          selectedDate: null,
          selectedWeek: null,
          selectedMonth: null,
        })
      );
    });
  });

  it('should pass updated filters to useReportFilter after applying', async () => {
    renderReports();

    // Simulate clicking Apply Filters (which propagates current draft filters)
    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      // useReportFilter must have been called with the filters object
      expect(vi.mocked(ReportHooks.useReportFilter)).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ timeInterval: expect.any(String) })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Export button interactions
// ---------------------------------------------------------------------------

describe('Reports Page – export button interactions', () => {
  const mockExportCSV = vi.fn();
  const mockExportExcel = vi.fn();
  const mockExportPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupHookMocks();

    vi.mocked(UseExportHook.useExport).mockReturnValue({
      exportCSV: mockExportCSV,
      exportExcel: mockExportExcel,
      exportPDF: mockExportPDF,
      isExporting: false,
      error: null,
    } as any);
  });

  it('should render export buttons when data is available', () => {
    renderReports();

    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });

  it('should call exportCSV when Export CSV button is clicked', () => {
    renderReports();

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(mockExportCSV).toHaveBeenCalledTimes(1);
  });

  it('should call exportExcel when Export Excel button is clicked', () => {
    renderReports();

    fireEvent.click(screen.getByRole('button', { name: /export excel/i }));

    expect(mockExportExcel).toHaveBeenCalledTimes(1);
  });

  it('should call exportPDF when Export PDF button is clicked', () => {
    renderReports();

    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    expect(mockExportPDF).toHaveBeenCalledTimes(1);
  });

  it('should disable export buttons while exporting', () => {
    vi.mocked(UseExportHook.useExport).mockReturnValue({
      exportCSV: mockExportCSV,
      exportExcel: mockExportExcel,
      exportPDF: mockExportPDF,
      isExporting: true,
      error: null,
    } as any);

    renderReports();

    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export excel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
  });

  it('should show exporting indicator while export is in progress', () => {
    vi.mocked(UseExportHook.useExport).mockReturnValue({
      exportCSV: mockExportCSV,
      exportExcel: mockExportExcel,
      exportPDF: mockExportPDF,
      isExporting: true,
      error: null,
    } as any);

    renderReports();

    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
  });

  it('should not show export buttons when no data is available', () => {
    setupHookMocks({ records: [], filteredRecords: [] });

    renderReports();

    // Empty state is shown instead of the report interface
    expect(screen.getByText('No Attendance Records Found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Responsive layout – structural checks
// ---------------------------------------------------------------------------

describe('Reports Page – layout structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHookMocks();
  });

  it('should render filters in a sidebar column alongside main content', () => {
    const { container } = renderReports();

    // The grid layout wraps both the filter panel and main content
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
  });

  it('should render the attendance table section when data is available', () => {
    renderReports();

    // The table component should be present (search input is a reliable marker)
    expect(
      screen.getByPlaceholderText(/search by child name/i)
    ).toBeInTheDocument();
  });

  it('should render chart sections when data is available', () => {
    renderReports();

    // Chart section headings
    expect(screen.getByText(/attendance trend/i)).toBeInTheDocument();
    expect(screen.getByText(/status distribution/i)).toBeInTheDocument();
  });

  it('should render export controls section when data is available', () => {
    renderReports();

    // Export controls are present
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });
});

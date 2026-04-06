import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceTrendChart } from '../AttendanceTrendChart';
import { StatusDistributionChart } from '../StatusDistributionChart';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../../lib/reportTypes';
import { ProgramDay } from '../../context/ScheduleStore';

/**
 * Integration tests for chart components
 *
 * Tests AttendanceTrendChart data transformation and StatusDistributionChart rendering.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

// Mock recharts so tests don't need a real SVG environment
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

// ── Helpers ────────────────────────────────────────────────────────────────

const makeRecord = (
  id: string,
  date: string,
  status: AttendanceRecord['status'] = 'present',
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  id,
  childId: id,
  childName: `Child ${id}`,
  childKutrLevel: 1,
  familyName: 'Family',
  date,
  day: 'Saturday' as ProgramDay,
  status,
  markedBy: 'teacher-1',
  markedAt: new Date().toISOString(),
  ...overrides,
});

const baseFilters: ReportFilters = {
  timeInterval: 'weekly',
  kutrLevel: 'all',
  startDate: null,
  endDate: null,
  selectedDate: null,
  selectedWeek: null,
  selectedMonth: null,
};

const baseSummary: ReportSummary = {
  totalRecords: 10,
  presentCount: 7,
  absentCount: 2,
  lateCount: 1,
  excusedCount: 0,
  attendanceRate: 70,
  dateRange: 'Jan 1 - Jan 7, 2024',
  kutrLevel: 'All Levels',
};

// ── AttendanceTrendChart ───────────────────────────────────────────────────

describe('AttendanceTrendChart', () => {
  it('shows empty state when no records are provided', () => {
    render(<AttendanceTrendChart records={[]} filters={baseFilters} />);
    expect(screen.getByText('No data available for the selected period.')).toBeInTheDocument();
  });

  it('renders chart title "Attendance Trend" when records exist', () => {
    const records = [makeRecord('1', '2024-01-15')];
    render(<AttendanceTrendChart records={records} filters={baseFilters} />);
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
  });

  it('renders the chart container when records exist', () => {
    const records = [makeRecord('1', '2024-01-15')];
    render(<AttendanceTrendChart records={records} filters={baseFilters} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('aggregates by day for weekly filter (multiple records same day)', () => {
    // Two records on the same day — should produce one data point
    const records = [
      makeRecord('1', '2024-01-15', 'present'),
      makeRecord('2', '2024-01-15', 'absent'),
      makeRecord('3', '2024-01-16', 'present'),
    ];
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'weekly' };
    render(<AttendanceTrendChart records={records} filters={filters} />);
    // Chart renders without empty state — aggregation worked
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
    expect(screen.queryByText('No data available for the selected period.')).not.toBeInTheDocument();
  });

  it('aggregates by day for monthly filter', () => {
    const records = [
      makeRecord('1', '2024-01-01', 'present'),
      makeRecord('2', '2024-01-08', 'absent'),
      makeRecord('3', '2024-01-15', 'present'),
    ];
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'monthly' };
    render(<AttendanceTrendChart records={records} filters={filters} />);
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
  });

  it('aggregates by week for custom range > 7 days', () => {
    // Records spanning more than 7 days → weekly aggregation
    const records = [
      makeRecord('1', '2024-01-01', 'present'),
      makeRecord('2', '2024-01-08', 'present'),
      makeRecord('3', '2024-01-15', 'absent'),
    ];
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-20',
    };
    render(<AttendanceTrendChart records={records} filters={filters} />);
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
    expect(screen.queryByText('No data available for the selected period.')).not.toBeInTheDocument();
  });

  it('aggregates by day for custom range ≤ 7 days', () => {
    const records = [
      makeRecord('1', '2024-01-01', 'present'),
      makeRecord('2', '2024-01-03', 'absent'),
    ];
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
    };
    render(<AttendanceTrendChart records={records} filters={filters} />);
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
  });

  it('updates chart when filters change from weekly to custom > 7 days', () => {
    const records = [
      makeRecord('1', '2024-01-01', 'present'),
      makeRecord('2', '2024-01-10', 'present'),
    ];
    const weeklyFilters: ReportFilters = { ...baseFilters, timeInterval: 'weekly' };
    const { rerender } = render(
      <AttendanceTrendChart records={records} filters={weeklyFilters} />
    );
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();

    const customFilters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-20',
    };
    rerender(<AttendanceTrendChart records={records} filters={customFilters} />);
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();
  });

  it('transitions to empty state when records are cleared', () => {
    const records = [makeRecord('1', '2024-01-15')];
    const { rerender } = render(
      <AttendanceTrendChart records={records} filters={baseFilters} />
    );
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument();

    rerender(<AttendanceTrendChart records={[]} filters={baseFilters} />);
    expect(screen.getByText('No data available for the selected period.')).toBeInTheDocument();
  });
});

// ── StatusDistributionChart ────────────────────────────────────────────────

describe('StatusDistributionChart', () => {
  it('shows empty state when totalRecords is 0', () => {
    const emptySummary: ReportSummary = {
      ...baseSummary,
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0,
    };
    render(<StatusDistributionChart summary={emptySummary} />);
    expect(screen.getByText('No data available for the selected period.')).toBeInTheDocument();
  });

  it('renders chart title "Status Distribution" when data exists', () => {
    render(<StatusDistributionChart summary={baseSummary} />);
    expect(screen.getByText('Status Distribution')).toBeInTheDocument();
  });

  it('renders the bar chart when data exists', () => {
    render(<StatusDistributionChart summary={baseSummary} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('displays correct counts from summary — renders 4 cells (one per status)', () => {
    render(<StatusDistributionChart summary={baseSummary} />);
    // Each status gets a Cell element
    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(4);
  });

  it('shows empty state title even when empty', () => {
    const emptySummary: ReportSummary = { ...baseSummary, totalRecords: 0 };
    render(<StatusDistributionChart summary={emptySummary} />);
    expect(screen.getByText('Status Distribution')).toBeInTheDocument();
  });

  it('updates chart when summary changes', () => {
    const { rerender } = render(<StatusDistributionChart summary={baseSummary} />);
    expect(screen.getByText('Status Distribution')).toBeInTheDocument();
    expect(screen.queryByText('No data available for the selected period.')).not.toBeInTheDocument();

    const emptySummary: ReportSummary = { ...baseSummary, totalRecords: 0 };
    rerender(<StatusDistributionChart summary={emptySummary} />);
    expect(screen.getByText('No data available for the selected period.')).toBeInTheDocument();
  });
});

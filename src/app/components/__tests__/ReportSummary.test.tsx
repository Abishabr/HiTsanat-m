import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSummary } from '../ReportSummary';
import { ReportSummary as ReportSummaryType } from '../../lib/reportTypes';

/**
 * Unit tests for ReportSummary component
 * 
 * Tests summary statistics rendering, color coding logic, and empty state handling
 * 
 * **Validates: Requirements 1.4, 1.5, 8.2, 8.3, 8.4**
 */
describe('ReportSummary', () => {
  const mockSummary: ReportSummaryType = {
    totalRecords: 100,
    presentCount: 85,
    absentCount: 10,
    lateCount: 3,
    excusedCount: 2,
    attendanceRate: 85,
    dateRange: 'Jan 1, 2024 - Jan 7, 2024',
    kutrLevel: 'All Levels',
  };

  describe('Summary Statistics Rendering', () => {
    it('should display total records count', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Total Records')).toBeInTheDocument();
    });

    it('should display all status counts with badges', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getByText(/Present: 85/)).toBeInTheDocument();
      expect(screen.getByText(/Absent: 10/)).toBeInTheDocument();
      expect(screen.getByText(/Late: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Excused: 2/)).toBeInTheDocument();
    });

    it('should display attendance rate percentage', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    });

    it('should display date range', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getAllByText('Jan 1, 2024 - Jan 7, 2024')).toHaveLength(2);
    });

    it('should display Kutr level filter', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getAllByText('All Levels')).toHaveLength(2);
    });

    it('should display present count breakdown', () => {
      render(<ReportSummary summary={mockSummary} />);
      expect(screen.getByText('85 of 100 present')).toBeInTheDocument();
    });
  });

  describe('Color Coding Logic', () => {
    it('should apply green color for attendance rate > 85%', () => {
      const highRateSummary = { ...mockSummary, attendanceRate: 90 };
      const { container } = render(<ReportSummary summary={highRateSummary} />);
      const rateElement = screen.getByText('90%');
      expect(rateElement).toHaveClass('text-green-600');
    });

    it('should apply yellow color for attendance rate between 70-85%', () => {
      const mediumRateSummary = { ...mockSummary, attendanceRate: 75 };
      const { container } = render(<ReportSummary summary={mediumRateSummary} />);
      const rateElement = screen.getByText('75%');
      expect(rateElement).toHaveClass('text-yellow-600');
    });

    it('should apply red color for attendance rate < 70%', () => {
      const lowRateSummary = { ...mockSummary, attendanceRate: 65 };
      const { container } = render(<ReportSummary summary={lowRateSummary} />);
      const rateElement = screen.getByText('65%');
      expect(rateElement).toHaveClass('text-red-600');
    });

    it('should apply yellow color for attendance rate exactly 70%', () => {
      const exactRateSummary = { ...mockSummary, attendanceRate: 70 };
      const { container } = render(<ReportSummary summary={exactRateSummary} />);
      const rateElement = screen.getByText('70%');
      expect(rateElement).toHaveClass('text-yellow-600');
    });

    it('should apply yellow color for attendance rate exactly 85%', () => {
      const exactRateSummary = { ...mockSummary, attendanceRate: 85 };
      const { container } = render(<ReportSummary summary={exactRateSummary} />);
      const rateElement = screen.getByText('85%');
      expect(rateElement).toHaveClass('text-yellow-600');
    });

    it('should apply green color for attendance rate of 86%', () => {
      const justAboveThresholdSummary = { ...mockSummary, attendanceRate: 86 };
      const { container } = render(<ReportSummary summary={justAboveThresholdSummary} />);
      const rateElement = screen.getByText('86%');
      expect(rateElement).toHaveClass('text-green-600');
    });
  });

  describe('Empty State Handling', () => {
    it('should handle zero records gracefully', () => {
      const emptySummary: ReportSummaryType = {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'Jan 1, 2024 - Jan 7, 2024',
        kutrLevel: 'All Levels',
      };
      render(<ReportSummary summary={emptySummary} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/Present: 0/)).toBeInTheDocument();
    });

    it('should display 0 of 0 present for empty records', () => {
      const emptySummary: ReportSummaryType = {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'Jan 1, 2024 - Jan 7, 2024',
        kutrLevel: 'All Levels',
      };
      render(<ReportSummary summary={emptySummary} />);
      expect(screen.getByText('0 of 0 present')).toBeInTheDocument();
    });
  });

  describe('Different Filter Configurations', () => {
    it('should display specific Kutr level when filtered', () => {
      const kutr1Summary = { ...mockSummary, kutrLevel: 'Kutr 1' };
      render(<ReportSummary summary={kutr1Summary} />);
      expect(screen.getAllByText('Kutr 1')).toHaveLength(2);
    });

    it('should display daily date range format', () => {
      const dailySummary = { ...mockSummary, dateRange: 'Jan 15, 2024' };
      render(<ReportSummary summary={dailySummary} />);
      expect(screen.getAllByText('Jan 15, 2024')).toHaveLength(2);
    });

    it('should display monthly date range format', () => {
      const monthlySummary = { ...mockSummary, dateRange: 'January 2024' };
      render(<ReportSummary summary={monthlySummary} />);
      expect(screen.getAllByText('January 2024')).toHaveLength(2);
    });
  });

  describe('Status Badge Colors', () => {
    it('should render present badge with green styling', () => {
      render(<ReportSummary summary={mockSummary} />);
      const presentBadge = screen.getByText(/Present: 85/);
      expect(presentBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should render absent badge with red styling', () => {
      render(<ReportSummary summary={mockSummary} />);
      const absentBadge = screen.getByText(/Absent: 10/);
      expect(absentBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should render late badge with yellow styling', () => {
      render(<ReportSummary summary={mockSummary} />);
      const lateBadge = screen.getByText(/Late: 3/);
      expect(lateBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should render excused badge with blue styling', () => {
      render(<ReportSummary summary={mockSummary} />);
      const excusedBadge = screen.getByText(/Excused: 2/);
      expect(excusedBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });
});

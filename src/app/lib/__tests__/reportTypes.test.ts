/**
 * Unit tests for report type definitions
 * Validates that types are properly exported and can be used
 */

import { describe, it, expect } from 'vitest';
import type {
  TimeInterval,
  KutrLevelFilter,
  ExportFormat,
  ReportFilters,
  AttendanceRecord,
  ReportSummary,
  TrendDataPoint,
  StatusDistribution,
} from '../reportTypes';

describe('reportTypes', () => {
  describe('Type exports', () => {
    it('should export TimeInterval type', () => {
      const intervals: TimeInterval[] = ['daily', 'weekly', 'monthly', 'custom'];
      expect(intervals).toHaveLength(4);
    });

    it('should export KutrLevelFilter type', () => {
      const filters: KutrLevelFilter[] = ['all', 1, 2, 3];
      expect(filters).toHaveLength(4);
    });

    it('should export ExportFormat type', () => {
      const formats: ExportFormat[] = ['csv', 'excel', 'pdf'];
      expect(formats).toHaveLength(3);
    });
  });

  describe('ReportFilters interface', () => {
    it('should create valid ReportFilters object', () => {
      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      expect(filters.timeInterval).toBe('daily');
      expect(filters.kutrLevel).toBe('all');
      expect(filters.selectedDate).toBe('2024-01-15');
    });

    it('should support weekly interval with date range', () => {
      const filters: ReportFilters = {
        timeInterval: 'weekly',
        kutrLevel: 2,
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
        selectedMonth: null,
      };

      expect(filters.timeInterval).toBe('weekly');
      expect(filters.selectedWeek).toEqual({ start: '2024-01-15', end: '2024-01-21' });
    });

    it('should support monthly interval', () => {
      const filters: ReportFilters = {
        timeInterval: 'monthly',
        kutrLevel: 3,
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: { year: 2024, month: 0 },
      };

      expect(filters.timeInterval).toBe('monthly');
      expect(filters.selectedMonth).toEqual({ year: 2024, month: 0 });
    });

    it('should support custom date range', () => {
      const filters: ReportFilters = {
        timeInterval: 'custom',
        kutrLevel: 'all',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      expect(filters.timeInterval).toBe('custom');
      expect(filters.startDate).toBe('2024-01-01');
      expect(filters.endDate).toBe('2024-01-31');
    });
  });

  describe('AttendanceRecord interface', () => {
    it('should create valid AttendanceRecord object', () => {
      const record: AttendanceRecord = {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'c1',
        status: 'present',
        markedBy: 'm1',
        markedAt: '2024-01-15T10:00:00Z',
        childName: 'John Doe',
        childKutrLevel: 2,
        familyName: 'Doe Family',
      };

      expect(record.childName).toBe('John Doe');
      expect(record.childKutrLevel).toBe(2);
      expect(record.familyName).toBe('Doe Family');
      expect(record.status).toBe('present');
    });

    it('should support all attendance statuses', () => {
      const statuses: AttendanceRecord['status'][] = ['present', 'absent', 'excused', 'late'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('ReportSummary interface', () => {
    it('should create valid ReportSummary object', () => {
      const summary: ReportSummary = {
        totalRecords: 100,
        presentCount: 85,
        absentCount: 10,
        lateCount: 3,
        excusedCount: 2,
        attendanceRate: 85,
        dateRange: 'Jan 15 - Jan 21, 2024',
        kutrLevel: 'All Levels',
      };

      expect(summary.totalRecords).toBe(100);
      expect(summary.attendanceRate).toBe(85);
      expect(summary.presentCount + summary.absentCount + summary.lateCount + summary.excusedCount).toBe(100);
    });

    it('should handle zero records', () => {
      const summary: ReportSummary = {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        dateRange: 'No data',
        kutrLevel: 'All Levels',
      };

      expect(summary.totalRecords).toBe(0);
      expect(summary.attendanceRate).toBe(0);
    });
  });

  describe('TrendDataPoint interface', () => {
    it('should create valid TrendDataPoint object', () => {
      const dataPoint: TrendDataPoint = {
        date: '2024-01-15',
        label: 'Jan 15',
        attendanceRate: 85,
        presentCount: 17,
        totalCount: 20,
      };

      expect(dataPoint.date).toBe('2024-01-15');
      expect(dataPoint.attendanceRate).toBe(85);
      expect(dataPoint.presentCount).toBeLessThanOrEqual(dataPoint.totalCount);
    });

    it('should support multiple data points for trend analysis', () => {
      const trendData: TrendDataPoint[] = [
        { date: '2024-01-15', label: 'Jan 15', attendanceRate: 85, presentCount: 17, totalCount: 20 },
        { date: '2024-01-16', label: 'Jan 16', attendanceRate: 90, presentCount: 18, totalCount: 20 },
        { date: '2024-01-17', label: 'Jan 17', attendanceRate: 80, presentCount: 16, totalCount: 20 },
      ];

      expect(trendData).toHaveLength(3);
      expect(trendData[1].attendanceRate).toBeGreaterThan(trendData[0].attendanceRate);
    });
  });

  describe('StatusDistribution interface', () => {
    it('should create valid StatusDistribution object', () => {
      const distribution: StatusDistribution = {
        status: 'Present',
        count: 85,
        percentage: 85,
        color: '#22c55e',
      };

      expect(distribution.status).toBe('Present');
      expect(distribution.count).toBe(85);
      expect(distribution.percentage).toBe(85);
      expect(distribution.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should support all status types', () => {
      const distributions: StatusDistribution[] = [
        { status: 'Present', count: 85, percentage: 85, color: '#22c55e' },
        { status: 'Absent', count: 10, percentage: 10, color: '#ef4444' },
        { status: 'Late', count: 3, percentage: 3, color: '#eab308' },
        { status: 'Excused', count: 2, percentage: 2, color: '#3b82f6' },
      ];

      expect(distributions).toHaveLength(4);
      const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBe(100);
    });
  });
});

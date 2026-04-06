/**
 * Unit tests for useReportSummary hook
 * Task 3.6: Write unit tests for useReportSummary hook
 * 
 * Tests:
 * - Summary statistics calculation
 * - Attendance rate calculation
 * - Empty records handling
 * - Percentage rounding
 * - Date range formatting
 * - Kutr level label formatting
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReportSummary } from '../useReportSummary';
import type { AttendanceRecord, ReportFilters } from '../../lib/reportTypes';

describe('useReportSummary', () => {
  const createMockRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
    id: 'att-1',
    date: '2024-01-15',
    day: 'Saturday',
    childId: 'child-1',
    status: 'present',
    markedBy: 'teacher-1',
    markedAt: '2024-01-15T10:00:00Z',
    childName: 'John Doe',
    childKutrLevel: 1,
    familyName: 'Doe Family',
    ...overrides,
  });

  const createMockFilters = (overrides: Partial<ReportFilters> = {}): ReportFilters => ({
    timeInterval: 'daily',
    kutrLevel: 'all',
    startDate: null,
    endDate: null,
    selectedDate: '2024-01-15',
    selectedWeek: null,
    selectedMonth: null,
    ...overrides,
  });

  describe('Summary Statistics Calculation', () => {
    it('should calculate correct counts for all status types', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'present' }),
        createMockRecord({ id: 'att-3', status: 'absent' }),
        createMockRecord({ id: 'att-4', status: 'late' }),
        createMockRecord({ id: 'att-5', status: 'excused' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.totalRecords).toBe(5);
      expect(result.current.presentCount).toBe(2);
      expect(result.current.absentCount).toBe(1);
      expect(result.current.lateCount).toBe(1);
      expect(result.current.excusedCount).toBe(1);
    });

    it('should calculate correct attendance rate percentage', () => {
      // Arrange - 2 present out of 3 total = 67% (rounded)
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'present' }),
        createMockRecord({ id: 'att-3', status: 'absent' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.attendanceRate).toBe(67); // 2/3 * 100 = 66.67 rounded to 67
    });

    it('should round attendance rate to nearest integer', () => {
      // Arrange - 1 present out of 3 total = 33.33% -> 33%
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'absent' }),
        createMockRecord({ id: 'att-3', status: 'absent' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.attendanceRate).toBe(33); // 1/3 * 100 = 33.33 rounded to 33
    });

    it('should calculate 100% attendance rate when all present', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'present' }),
        createMockRecord({ id: 'att-3', status: 'present' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.attendanceRate).toBe(100);
    });

    it('should calculate 0% attendance rate when none present', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'absent' }),
        createMockRecord({ id: 'att-2', status: 'absent' }),
        createMockRecord({ id: 'att-3', status: 'late' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.attendanceRate).toBe(0);
    });
  });

  describe('Empty Records Handling', () => {
    it('should handle empty records array gracefully', () => {
      // Arrange
      const records: AttendanceRecord[] = [];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.totalRecords).toBe(0);
      expect(result.current.presentCount).toBe(0);
      expect(result.current.absentCount).toBe(0);
      expect(result.current.lateCount).toBe(0);
      expect(result.current.excusedCount).toBe(0);
      expect(result.current.attendanceRate).toBe(0);
    });

    it('should return 0% attendance rate for empty records', () => {
      // Arrange
      const records: AttendanceRecord[] = [];
      const filters = createMockFilters();

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.attendanceRate).toBe(0);
    });
  });

  describe('Date Range Formatting', () => {
    it('should format daily date range correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'daily',
        selectedDate: '2024-01-15',
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('Jan 15, 2024');
    });

    it('should format weekly date range correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'weekly',
        selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('Jan 15, 2024 - Jan 21, 2024');
    });

    it('should format monthly date range correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'monthly',
        selectedMonth: { year: 2024, month: 0 }, // January (0-indexed)
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('January 2024');
    });

    it('should format custom date range correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('Jan 1, 2024 - Jan 31, 2024');
    });

    it('should handle missing daily date selection', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'daily',
        selectedDate: null,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('No date selected');
    });

    it('should handle missing weekly date selection', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'weekly',
        selectedWeek: null,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('No week selected');
    });

    it('should handle missing monthly date selection', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'monthly',
        selectedMonth: null,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('No month selected');
    });

    it('should handle missing custom date range', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        timeInterval: 'custom',
        startDate: null,
        endDate: null,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.dateRange).toBe('No date range selected');
    });
  });

  describe('Kutr Level Label Formatting', () => {
    it('should format "all" Kutr level correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        kutrLevel: 'all',
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.kutrLevel).toBe('All Levels');
    });

    it('should format Kutr 1 correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        kutrLevel: 1,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.kutrLevel).toBe('Kutr 1');
    });

    it('should format Kutr 2 correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        kutrLevel: 2,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.kutrLevel).toBe('Kutr 2');
    });

    it('should format Kutr 3 correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const filters = createMockFilters({
        kutrLevel: 3,
      });

      // Act
      const { result } = renderHook(() => useReportSummary(records, filters));

      // Assert
      expect(result.current.kutrLevel).toBe('Kutr 3');
    });
  });

  describe('Memoization', () => {
    it('should return same object reference when inputs unchanged', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'absent' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result, rerender } = renderHook(() => useReportSummary(records, filters));
      const firstResult = result.current;
      
      rerender();
      const secondResult = result.current;

      // Assert
      expect(firstResult).toBe(secondResult); // Same object reference
    });

    it('should recalculate when records change', () => {
      // Arrange
      const initialRecords: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
      ];
      const filters = createMockFilters();

      // Act
      const { result, rerender } = renderHook(
        ({ records }) => useReportSummary(records, filters),
        { initialProps: { records: initialRecords } }
      );
      
      const firstResult = result.current;
      expect(firstResult.totalRecords).toBe(1);

      const newRecords: AttendanceRecord[] = [
        createMockRecord({ id: 'att-1', status: 'present' }),
        createMockRecord({ id: 'att-2', status: 'absent' }),
      ];
      
      rerender({ records: newRecords });
      const secondResult = result.current;

      // Assert
      expect(secondResult.totalRecords).toBe(2);
      expect(firstResult).not.toBe(secondResult); // Different object reference
    });

    it('should recalculate when filters change', () => {
      // Arrange
      const records: AttendanceRecord[] = [createMockRecord()];
      const initialFilters = createMockFilters({ kutrLevel: 'all' });

      // Act
      const { result, rerender } = renderHook(
        ({ filters }) => useReportSummary(records, filters),
        { initialProps: { filters: initialFilters } }
      );
      
      const firstResult = result.current;
      expect(firstResult.kutrLevel).toBe('All Levels');

      const newFilters = createMockFilters({ kutrLevel: 1 });
      
      rerender({ filters: newFilters });
      const secondResult = result.current;

      // Assert
      expect(secondResult.kutrLevel).toBe('Kutr 1');
      expect(firstResult).not.toBe(secondResult); // Different object reference
    });
  });
});

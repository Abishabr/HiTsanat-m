/**
 * Unit tests for useReportFilter hook
 * Task 3.4: Write unit tests for useReportFilter hook
 * 
 * Tests:
 * - Daily interval filtering
 * - Weekly interval filtering
 * - Monthly interval filtering
 * - Custom date range filtering
 * - Kutr level filtering
 * - Date range validation
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReportFilter } from '../useReportFilter';
import type { AttendanceRecord, ReportFilters } from '../../lib/reportTypes';

// Helper function to create mock attendance records
function createMockRecord(
  id: string,
  date: string,
  kutrLevel: 1 | 2 | 3,
  status: 'present' | 'absent' | 'late' | 'excused' = 'present'
): AttendanceRecord {
  return {
    id,
    date,
    day: 'Saturday',
    childId: `child-${id}`,
    status,
    markedBy: 'teacher-1',
    markedAt: `${date}T10:00:00Z`,
    childName: `Child ${id}`,
    childKutrLevel: kutrLevel,
    familyName: `Family ${id}`,
  };
}

describe('useReportFilter', () => {
  describe('Daily interval filtering', () => {
    it('should filter records by selected date', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
        createMockRecord('3', '2024-01-17', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-16',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0].date).toBe('2024-01-16');
    });

    it('should return all records when no date is selected', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });

    it('should return empty array when no records match selected date', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-20',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });
  });

  describe('Weekly interval filtering', () => {
    it('should filter records within selected week range', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-14', 1), // Before week
        createMockRecord('2', '2024-01-15', 1), // Start of week
        createMockRecord('3', '2024-01-16', 1), // Middle of week
        createMockRecord('4', '2024-01-21', 1), // End of week
        createMockRecord('5', '2024-01-22', 1), // After week
      ];

      const filters: ReportFilters = {
        timeInterval: 'weekly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(3);
      expect(result.current.map(r => r.id)).toEqual(['2', '3', '4']);
    });

    it('should return all records when no week is selected', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'weekly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });

    it('should include records on week boundaries', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1), // Exactly on start
        createMockRecord('2', '2024-01-21', 1), // Exactly on end
      ];

      const filters: ReportFilters = {
        timeInterval: 'weekly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });
  });

  describe('Monthly interval filtering', () => {
    it('should filter records by selected month', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2023-12-31', 1), // Previous month
        createMockRecord('2', '2024-01-01', 1), // Start of month
        createMockRecord('3', '2024-01-15', 1), // Middle of month
        createMockRecord('4', '2024-01-31', 1), // End of month
        createMockRecord('5', '2024-02-01', 1), // Next month
      ];

      const filters: ReportFilters = {
        timeInterval: 'monthly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: { year: 2024, month: 0 }, // January (0-indexed)
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(3);
      expect(result.current.map(r => r.id)).toEqual(['2', '3', '4']);
    });

    it('should return all records when no month is selected', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-02-15', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'monthly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });

    it('should handle December correctly', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2023-12-15', 1),
        createMockRecord('2', '2024-12-15', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'monthly',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: { year: 2024, month: 11 }, // December (0-indexed)
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('2');
    });
  });

  describe('Custom date range filtering', () => {
    it('should filter records within custom date range', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-10', 1), // Before range
        createMockRecord('2', '2024-01-15', 1), // Start of range
        createMockRecord('3', '2024-01-20', 1), // Middle of range
        createMockRecord('4', '2024-01-25', 1), // End of range
        createMockRecord('5', '2024-01-30', 1), // After range
      ];

      const filters: ReportFilters = {
        timeInterval: 'custom',
        kutrLevel: 'all',
        startDate: '2024-01-15',
        endDate: '2024-01-25',
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(3);
      expect(result.current.map(r => r.id)).toEqual(['2', '3', '4']);
    });

    it('should return all records when start date is missing', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'custom',
        kutrLevel: 'all',
        startDate: null,
        endDate: '2024-01-20',
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });

    it('should return all records when end date is missing', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'custom',
        kutrLevel: 'all',
        startDate: '2024-01-10',
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });

    it('should include records on range boundaries', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1), // Exactly on start
        createMockRecord('2', '2024-01-25', 1), // Exactly on end
      ];

      const filters: ReportFilters = {
        timeInterval: 'custom',
        kutrLevel: 'all',
        startDate: '2024-01-15',
        endDate: '2024-01-25',
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
    });
  });

  describe('Kutr level filtering', () => {
    it('should filter records by Kutr level 1', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-15', 2),
        createMockRecord('3', '2024-01-15', 3),
        createMockRecord('4', '2024-01-15', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 1,
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
      expect(result.current.every(r => r.childKutrLevel === 1)).toBe(true);
    });

    it('should filter records by Kutr level 2', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-15', 2),
        createMockRecord('3', '2024-01-15', 3),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 2,
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0].childKutrLevel).toBe(2);
    });

    it('should filter records by Kutr level 3', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-15', 2),
        createMockRecord('3', '2024-01-15', 3),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 3,
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0].childKutrLevel).toBe(3);
    });

    it('should not filter when kutrLevel is "all"', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-15', 2),
        createMockRecord('3', '2024-01-15', 3),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(3);
    });
  });

  describe('Combined filtering', () => {
    it('should apply both date range and Kutr level filters', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-15', 2),
        createMockRecord('3', '2024-01-16', 1),
        createMockRecord('4', '2024-01-16', 2),
      ];

      const filters: ReportFilters = {
        timeInterval: 'weekly',
        kutrLevel: 2,
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(2);
      expect(result.current.every(r => r.childKutrLevel === 2)).toBe(true);
      expect(result.current.map(r => r.id)).toEqual(['2', '4']);
    });

    it('should return empty array when no records match combined filters', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
        createMockRecord('2', '2024-01-16', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 3,
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty records array', () => {
      // Arrange
      const records: AttendanceRecord[] = [];

      const filters: ReportFilters = {
        timeInterval: 'daily',
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: '2024-01-15',
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });

    it('should handle default time interval', () => {
      // Arrange
      const records: AttendanceRecord[] = [
        createMockRecord('1', '2024-01-15', 1),
      ];

      const filters: ReportFilters = {
        timeInterval: 'daily' as any, // Test default case
        kutrLevel: 'all',
        startDate: null,
        endDate: null,
        selectedDate: null,
        selectedWeek: null,
        selectedMonth: null,
      };

      // Act
      const { result } = renderHook(() => useReportFilter(records, filters));

      // Assert
      expect(result.current).toHaveLength(1);
    });
  });
});

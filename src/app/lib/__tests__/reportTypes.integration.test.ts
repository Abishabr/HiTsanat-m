/**
 * Integration tests for report types with existing context types
 * Validates that report types work correctly with DayAttendance and Child types
 */

import { describe, it, expect } from 'vitest';
import type { DayAttendance } from '../../context/ScheduleStore';
import type { Child } from '../../data/mockData';
import type { AttendanceRecord } from '../reportTypes';

describe('reportTypes integration', () => {
  describe('AttendanceRecord extends DayAttendance', () => {
    it('should be compatible with DayAttendance type', () => {
      const dayAttendance: DayAttendance = {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'c1',
        status: 'present',
        markedBy: 'm1',
        markedAt: '2024-01-15T10:00:00Z',
      };

      const child: Child = {
        id: 'c1',
        name: 'John Doe',
        age: 8,
        kutrLevel: 2,
        familyId: 'f1',
        familyName: 'Doe Family',
        guardianContact: '+251911234567',
        registrationDate: '2024-01-01',
      };

      // Merge DayAttendance with Child metadata to create AttendanceRecord
      const attendanceRecord: AttendanceRecord = {
        ...dayAttendance,
        childName: child.name,
        childKutrLevel: child.kutrLevel,
        familyName: child.familyName,
      };

      // Verify all DayAttendance properties are preserved
      expect(attendanceRecord.id).toBe(dayAttendance.id);
      expect(attendanceRecord.date).toBe(dayAttendance.date);
      expect(attendanceRecord.day).toBe(dayAttendance.day);
      expect(attendanceRecord.childId).toBe(dayAttendance.childId);
      expect(attendanceRecord.status).toBe(dayAttendance.status);
      expect(attendanceRecord.markedBy).toBe(dayAttendance.markedBy);
      expect(attendanceRecord.markedAt).toBe(dayAttendance.markedAt);

      // Verify enriched properties
      expect(attendanceRecord.childName).toBe(child.name);
      expect(attendanceRecord.childKutrLevel).toBe(child.kutrLevel);
      expect(attendanceRecord.familyName).toBe(child.familyName);
    });

    it('should handle all attendance statuses from DayAttendance', () => {
      const statuses: DayAttendance['status'][] = ['present', 'absent', 'excused', 'late'];

      statuses.forEach(status => {
        const record: AttendanceRecord = {
          id: 'att-1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'c1',
          status,
          markedBy: 'm1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: 2,
          familyName: 'Doe Family',
        };

        expect(record.status).toBe(status);
      });
    });

    it('should handle all program days from DayAttendance', () => {
      const days: DayAttendance['day'][] = ['Saturday', 'Sunday'];

      days.forEach(day => {
        const record: AttendanceRecord = {
          id: 'att-1',
          date: '2024-01-15',
          day,
          childId: 'c1',
          status: 'present',
          markedBy: 'm1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: 2,
          familyName: 'Doe Family',
        };

        expect(record.day).toBe(day);
      });
    });

    it('should handle all Kutr levels from Child type', () => {
      const kutrLevels: Child['kutrLevel'][] = [1, 2, 3];

      kutrLevels.forEach(kutrLevel => {
        const record: AttendanceRecord = {
          id: 'att-1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'c1',
          status: 'present',
          markedBy: 'm1',
          markedAt: '2024-01-15T10:00:00Z',
          childName: 'John Doe',
          childKutrLevel: kutrLevel,
          familyName: 'Doe Family',
        };

        expect(record.childKutrLevel).toBe(kutrLevel);
      });
    });
  });

  describe('Type compatibility with data transformation', () => {
    it('should support mapping array of DayAttendance to AttendanceRecord', () => {
      const attendanceData: DayAttendance[] = [
        {
          id: 'att-1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'c1',
          status: 'present',
          markedBy: 'm1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'att-2',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'c2',
          status: 'absent',
          markedBy: 'm1',
          markedAt: '2024-01-15T10:00:00Z',
        },
      ];

      const children: Child[] = [
        {
          id: 'c1',
          name: 'John Doe',
          age: 8,
          kutrLevel: 2,
          familyId: 'f1',
          familyName: 'Doe Family',
          guardianContact: '+251911234567',
          registrationDate: '2024-01-01',
        },
        {
          id: 'c2',
          name: 'Jane Smith',
          age: 9,
          kutrLevel: 3,
          familyId: 'f2',
          familyName: 'Smith Family',
          guardianContact: '+251911234568',
          registrationDate: '2024-01-01',
        },
      ];

      // Simulate the enrichment process that will be used in useReportData hook
      const enrichedRecords: AttendanceRecord[] = attendanceData.map(record => {
        const child = children.find(c => c.id === record.childId);
        return {
          ...record,
          childName: child?.name ?? 'Unknown',
          childKutrLevel: child?.kutrLevel ?? 1,
          familyName: child?.familyName ?? 'Unknown',
        };
      });

      expect(enrichedRecords).toHaveLength(2);
      expect(enrichedRecords[0].childName).toBe('John Doe');
      expect(enrichedRecords[0].childKutrLevel).toBe(2);
      expect(enrichedRecords[1].childName).toBe('Jane Smith');
      expect(enrichedRecords[1].childKutrLevel).toBe(3);
    });

    it('should handle missing child data gracefully', () => {
      const attendanceData: DayAttendance = {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'c999', // Non-existent child
        status: 'present',
        markedBy: 'm1',
        markedAt: '2024-01-15T10:00:00Z',
      };

      const children: Child[] = [];

      // Simulate enrichment with fallback values
      const child = children.find(c => c.id === attendanceData.childId);
      const enrichedRecord: AttendanceRecord = {
        ...attendanceData,
        childName: child?.name ?? 'Unknown',
        childKutrLevel: child?.kutrLevel ?? 1,
        familyName: child?.familyName ?? 'Unknown',
      };

      expect(enrichedRecord.childName).toBe('Unknown');
      expect(enrichedRecord.childKutrLevel).toBe(1);
      expect(enrichedRecord.familyName).toBe('Unknown');
    });
  });
});

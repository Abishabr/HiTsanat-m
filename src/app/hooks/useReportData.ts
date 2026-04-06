import { useMemo } from 'react';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { AttendanceRecord } from '../lib/reportTypes';

/**
 * Hook to fetch and manage attendance report data
 * 
 * Fetches attendance data from ScheduleStore and children data from DataStore,
 * then merges them to create enriched attendance records with child metadata.
 * 
 * @returns Object containing enriched attendance records and loading state
 * 
 * **Validates: Requirements 1.1, 1.2, 7.1, 7.2, 7.3**
 */
export function useReportData() {
  const { attendance, isLoading: attendanceLoading } = useSchedule();
  const { children, isLoading: childrenLoading } = useDataStore();
  
  // Merge attendance records with child metadata
  const enrichedRecords: AttendanceRecord[] = useMemo(() => {
    return attendance.map(record => {
      const child = children.find(c => c.id === record.childId);
      return {
        ...record,
        childName: child?.name ?? 'Unknown',
        childKutrLevel: child?.kutrLevel ?? 1,
        familyName: child?.familyName ?? 'Unknown',
      };
    });
  }, [attendance, children]);
  
  return {
    records: enrichedRecords,
    isLoading: attendanceLoading || childrenLoading,
  };
}

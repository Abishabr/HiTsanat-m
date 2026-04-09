import { useMemo, useState, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { AttendanceRecord } from '../lib/reportTypes';

/**
 * Hook to fetch and manage attendance report data
 * 
 * Fetches attendance data from ScheduleStore and children data from DataStore,
 * then merges them to create enriched attendance records with child metadata.
 * 
 * @returns Object containing enriched attendance records, loading state, error state, and retry function
 * 
 * **Validates: Requirements 1.1, 1.2, 7.1, 7.2, 7.3, 7.4**
 */
export function useReportData() {
  const { attendance, isLoading: attendanceLoading, slots } = useSchedule();
  const { children, isLoading: childrenLoading } = useDataStore();
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const isLoading = attendanceLoading || childrenLoading;

  useEffect(() => {
    if (isLoading) { setError(null); return; }
  }, [isLoading, retryKey]);

  const enrichedRecords: AttendanceRecord[] = useMemo(() => {
    try {
      return attendance.map(record => {
        const child = children.find(c => c.id === record.childId);
        // Find the program slot to get sub-department info
        const slot = slots.find(s => s.id === record.enrollmentId || s.date === record.date);
        return {
          ...record,
          childName: child?.name ?? 'Unknown',
          childKutrLevel: child?.kutrLevel ?? 1,
          familyName: child?.familyName ?? 'Unknown',
          subDepartmentName: slot?.subDepartmentId ?? undefined,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process attendance data';
      console.error('[useReportData] Failed to merge attendance records:', err);
      setError(message);
      return [];
    }
  }, [attendance, children, slots]);

  const retry = () => {
    setError(null);
    setRetryKey(k => k + 1);
    window.location.reload();
  };

  return { records: enrichedRecords, isLoading, error, retry };
}

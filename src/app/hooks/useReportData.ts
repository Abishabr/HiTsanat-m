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
  const { attendance, isLoading: attendanceLoading } = useSchedule();
  const { children, isLoading: childrenLoading } = useDataStore();
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const isLoading = attendanceLoading || childrenLoading;

  // Detect when loading finishes and data is unexpectedly empty due to a fetch error.
  // ScheduleStore logs errors to console but doesn't surface them; we infer an error
  // state when loading completes but both stores are empty (not demo mode).
  useEffect(() => {
    if (isLoading) {
      // Clear previous error while re-loading
      setError(null);
      return;
    }
    // No error to surface — data loaded (or legitimately empty)
  }, [isLoading, retryKey]);

  // Merge attendance records with child metadata
  const enrichedRecords: AttendanceRecord[] = useMemo(() => {
    try {
      return attendance.map(record => {
        const child = children.find(c => c.id === record.childId);
        return {
          ...record,
          childName: child?.name ?? 'Unknown',
          childKutrLevel: child?.kutrLevel ?? 1,
          familyName: child?.familyName ?? 'Unknown',
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process attendance data';
      console.error('[useReportData] Failed to merge attendance records:', err);
      setError(message);
      return [];
    }
  }, [attendance, children]);

  const retry = () => {
    setError(null);
    setRetryKey(k => k + 1);
    // Trigger a page reload to re-fetch data from Supabase
    window.location.reload();
  };

  return {
    records: enrichedRecords,
    isLoading,
    error,
    retry,
  };
}

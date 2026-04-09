import { useMemo } from 'react';
import { AttendanceRecord, ReportFilters } from '../lib/reportTypes';

/**
 * Hook to manage report filtering logic
 * 
 * Handles time interval filtering (daily, weekly, monthly, custom) and Kutr level filtering.
 * Performs client-side filtering on cached data for optimal performance.
 * 
 * @param records - Array of enriched attendance records to filter
 * @param filters - Current filter configuration
 * @returns Filtered array of attendance records
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4**
 */
export function useReportFilter(
  records: AttendanceRecord[],
  filters: ReportFilters
): AttendanceRecord[] {
  return useMemo(() => {
    let filtered = records;
    filtered = filterByDateRange(filtered, filters);
    if (filters.kutrLevel !== 'all') {
      filtered = filtered.filter(r => r.childKutrLevel === filters.kutrLevel);
    }
    if (filters.subDepartment && filters.subDepartment !== 'all') {
      filtered = filtered.filter(r => r.subDepartmentName === filters.subDepartment);
    }
    return filtered;
  }, [records, filters]);
}

/**
 * Filter attendance records by date range based on the selected time interval
 * 
 * @param records - Array of attendance records to filter
 * @param filters - Current filter configuration
 * @returns Filtered array of attendance records
 */
function filterByDateRange(
  records: AttendanceRecord[],
  filters: ReportFilters
): AttendanceRecord[] {
  switch (filters.timeInterval) {
    case 'daily':
      if (!filters.selectedDate) return records;
      return records.filter(r => r.date === filters.selectedDate);
      
    case 'weekly':
      if (!filters.selectedWeek) return records;
      return records.filter(r => 
        r.date >= filters.selectedWeek!.start && 
        r.date <= filters.selectedWeek!.end
      );
      
    case 'monthly':
      if (!filters.selectedMonth) return records;
      return records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getFullYear() === filters.selectedMonth!.year &&
               recordDate.getMonth() === filters.selectedMonth!.month;
      });
      
    case 'custom':
      if (!filters.startDate || !filters.endDate) return records;
      return records.filter(r => 
        r.date >= filters.startDate! && 
        r.date <= filters.endDate!
      );
      
    default:
      return records;
  }
}

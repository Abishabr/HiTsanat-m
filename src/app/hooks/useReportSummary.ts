import { useMemo } from 'react';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../lib/reportTypes';

/**
 * Hook to compute summary statistics from filtered attendance records
 * 
 * Calculates total records, status counts, attendance rate percentage,
 * and formats display labels for date range and Kutr level.
 * Uses memoization for performance optimization.
 * 
 * @param records - Array of filtered attendance records
 * @param filters - Current filter configuration
 * @returns Summary statistics object
 * 
 * **Validates: Requirements 1.4, 1.5**
 */
export function useReportSummary(
  records: AttendanceRecord[],
  filters: ReportFilters
): ReportSummary {
  return useMemo(() => {
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    
    // Calculate attendance rate as percentage (present / total * 100)
    const attendanceRate = totalRecords > 0 
      ? Math.round((presentCount / totalRecords) * 100) 
      : 0;
    
    // Format date range label based on time interval
    const dateRange = formatDateRange(filters);
    
    // Format Kutr level label
    const kutrLevel = filters.kutrLevel === 'all' 
      ? 'All Levels' 
      : `Kutr ${filters.kutrLevel}`;
    
    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
      dateRange,
      kutrLevel,
    };
  }, [records, filters]);
}

/**
 * Format date range string based on filter configuration
 * 
 * @param filters - Current filter configuration
 * @returns Formatted date range string for display
 */
function formatDateRange(filters: ReportFilters): string {
  switch (filters.timeInterval) {
    case 'daily':
      if (!filters.selectedDate) return 'No date selected';
      return formatDate(filters.selectedDate);
      
    case 'weekly':
      if (!filters.selectedWeek) return 'No week selected';
      return `${formatDate(filters.selectedWeek.start)} - ${formatDate(filters.selectedWeek.end)}`;
      
    case 'monthly':
      if (!filters.selectedMonth) return 'No month selected';
      return formatMonth(filters.selectedMonth.year, filters.selectedMonth.month);
      
    case 'custom':
      if (!filters.startDate || !filters.endDate) return 'No date range selected';
      return `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;
      
    default:
      return 'All dates';
  }
}

/**
 * Format a date string (YYYY-MM-DD) to a readable format (MMM DD, YYYY)
 * 
 * @param dateStr - Date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format a month (year and month number) to a readable format (MMM YYYY)
 * 
 * @param year - Year number (e.g., 2024)
 * @param month - Month number (0-11, where 0 = January)
 * @returns Formatted month string (e.g., "January 2024")
 */
function formatMonth(year: number, month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[month]} ${year}`;
}

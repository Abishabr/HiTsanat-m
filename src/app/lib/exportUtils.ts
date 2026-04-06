/**
 * Utility functions for attendance report export functionality
 * Supports CSV, Excel, and PDF export formats
 */

import { format, parseISO } from 'date-fns';
import { ReportFilters } from './reportTypes';

/**
 * Generates a filename for the exported report.
 * Format: "attendance-report-{interval}-{date}.{ext}"
 * e.g. "attendance-report-weekly-2024-01-15.csv"
 */
export function generateFilename(
  format_: 'csv' | 'xlsx' | 'pdf',
  filters: ReportFilters
): string {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const interval = filters.timeInterval;
  return `attendance-report-${interval}-${dateStr}.${format_}`;
}

/**
 * Returns a human-readable date range string based on the active filter.
 * - daily:   "Jan 15, 2024"
 * - weekly:  "Jan 15 - Jan 21, 2024"
 * - monthly: "January 2024"
 * - custom:  "Jan 1 - Jan 31, 2024"
 */
export function formatDateRange(filters: ReportFilters): string {
  switch (filters.timeInterval) {
    case 'daily': {
      if (!filters.selectedDate) return '';
      return format(parseISO(filters.selectedDate), 'MMM d, yyyy');
    }

    case 'weekly': {
      if (!filters.selectedWeek) return '';
      const start = parseISO(filters.selectedWeek.start);
      const end = parseISO(filters.selectedWeek.end);
      // Same year: "Jan 15 - Jan 21, 2024"
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }

    case 'monthly': {
      if (!filters.selectedMonth) return '';
      const { year, month } = filters.selectedMonth;
      // month is 1-based
      const date = new Date(year, month - 1, 1);
      return format(date, 'MMMM yyyy');
    }

    case 'custom': {
      if (!filters.startDate || !filters.endDate) return '';
      const start = parseISO(filters.startDate);
      const end = parseISO(filters.endDate);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }

    default:
      return '';
  }
}

/**
 * Triggers a browser file download for the given content.
 * Creates a Blob, builds an object URL, clicks a temporary anchor, then revokes the URL.
 */
export function downloadFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

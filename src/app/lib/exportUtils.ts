/**
 * Utility functions for attendance report export functionality
 * Supports CSV, Excel, and PDF export formats
 */

import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { AttendanceRecord, ReportFilters, ReportSummary } from './reportTypes';

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

/**
 * Escapes a CSV field value by wrapping in quotes if it contains commas, quotes, or newlines.
 * Internal double-quotes are escaped by doubling them.
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a CSV string from attendance records, summary statistics, and report filters.
 *
 * Structure:
 *   1. Metadata rows (report title, date range, Kutr level filter)
 *   2. Blank row
 *   3. Column header row
 *   4. Data rows (one per attendance record)
 *   5. Blank row
 *   6. Summary statistics section
 */
export function generateCSV(
  records: AttendanceRecord[],
  summary: ReportSummary,
  filters: ReportFilters
): string {
  const rows: string[] = [];

  // 1. Metadata header rows
  rows.push(escapeCSVValue('Attendance Report'));
  rows.push(`Date Range,${escapeCSVValue(summary.dateRange)}`);
  rows.push(`Kutr Level,${escapeCSVValue(summary.kutrLevel)}`);

  // 2. Blank row
  rows.push('');

  // 3. Column headers
  rows.push('Child Name,Kutr Level,Date,Day,Status');

  // 4. Data rows
  for (const record of records) {
    const row = [
      escapeCSVValue(record.childName),
      escapeCSVValue(String(record.childKutrLevel)),
      escapeCSVValue(record.date),
      escapeCSVValue(record.day),
      escapeCSVValue(record.status),
    ].join(',');
    rows.push(row);
  }

  // 5. Blank row
  rows.push('');

  // 6. Summary statistics
  rows.push('Summary');
  rows.push(`Total Records,${summary.totalRecords}`);
  rows.push(`Present,${summary.presentCount}`);
  rows.push(`Absent,${summary.absentCount}`);
  rows.push(`Late,${summary.lateCount}`);
  rows.push(`Excused,${summary.excusedCount}`);
  rows.push(`Attendance Rate,${summary.attendanceRate}%`);

  return rows.join('\n');
}

/**
 * Generates an Excel workbook (ArrayBuffer) from attendance records, summary statistics,
 * and report filters.
 *
 * Workbook structure (single sheet "Attendance Report"):
 *   1. Metadata rows: title, date range, Kutr level
 *   2. Blank row
 *   3. Header row: Child Name, Kutr Level, Date, Day, Status
 *   4. Data rows (one per attendance record)
 *   5. Blank row
 *   6. Summary statistics section
 */
export function generateExcel(
  records: AttendanceRecord[],
  summary: ReportSummary,
  _filters: ReportFilters
): ArrayBuffer {
  const aoa: (string | number)[][] = [];

  // 1. Metadata rows
  aoa.push(['Attendance Report']);
  aoa.push(['Date Range', summary.dateRange]);
  aoa.push(['Kutr Level', summary.kutrLevel]);

  // 2. Blank row
  aoa.push([]);

  // 3. Header row
  aoa.push(['Child Name', 'Kutr Level', 'Date', 'Day', 'Status']);

  // 4. Data rows
  for (const record of records) {
    aoa.push([
      record.childName,
      record.childKutrLevel,
      record.date,
      record.day,
      record.status,
    ]);
  }

  // 5. Blank row
  aoa.push([]);

  // 6. Summary statistics
  aoa.push(['Summary']);
  aoa.push(['Total Records', summary.totalRecords]);
  aoa.push(['Present', summary.presentCount]);
  aoa.push(['Absent', summary.absentCount]);
  aoa.push(['Late', summary.lateCount]);
  aoa.push(['Excused', summary.excusedCount]);
  aoa.push(['Attendance Rate', `${summary.attendanceRate}%`]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Apply bold formatting to the title row (A1) and header row
  const titleCell = sheet['A1'];
  if (titleCell) {
    titleCell.s = { font: { bold: true } };
  }

  // Header row is at index 4 (0-based), which is row 5 in Excel (1-based)
  const headerRowIndex = 4; // 0-based index in aoa
  const headerCols = ['A', 'B', 'C', 'D', 'E'];
  for (const col of headerCols) {
    const cellRef = `${col}${headerRowIndex + 1}`;
    const cell = sheet[cellRef];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance Report');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

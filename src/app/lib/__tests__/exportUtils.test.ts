import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { generateFilename, formatDateRange, downloadFile, generateCSV, generateExcel } from '../exportUtils';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../reportTypes';

// Base filter with all fields null/default
const baseFilters: ReportFilters = {
  timeInterval: 'daily',
  kutrLevel: 'all',
  startDate: null,
  endDate: null,
  selectedDate: null,
  selectedWeek: null,
  selectedMonth: null,
};

// ── generateFilename ──────────────────────────────────────────────────────

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the current date in the filename', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'daily' };
    expect(generateFilename('csv', filters)).toBe('attendance-report-daily-2024-01-15.csv');
  });

  it('includes the timeInterval in the filename', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'weekly' };
    expect(generateFilename('xlsx', filters)).toBe('attendance-report-weekly-2024-01-15.xlsx');
  });

  it('uses the correct extension for pdf', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'monthly' };
    expect(generateFilename('pdf', filters)).toBe('attendance-report-monthly-2024-01-15.pdf');
  });

  it('uses custom interval in filename', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'custom' };
    expect(generateFilename('csv', filters)).toBe('attendance-report-custom-2024-01-15.csv');
  });
});

// ── formatDateRange ───────────────────────────────────────────────────────

describe('formatDateRange', () => {
  it('formats daily range', () => {
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'daily',
      selectedDate: '2024-01-15',
    };
    expect(formatDateRange(filters)).toBe('Jan 15, 2024');
  });

  it('returns empty string for daily with no selectedDate', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'daily' };
    expect(formatDateRange(filters)).toBe('');
  });

  it('formats weekly range', () => {
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'weekly',
      selectedWeek: { start: '2024-01-15', end: '2024-01-21' },
    };
    expect(formatDateRange(filters)).toBe('Jan 15 - Jan 21, 2024');
  });

  it('returns empty string for weekly with no selectedWeek', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'weekly' };
    expect(formatDateRange(filters)).toBe('');
  });

  it('formats monthly range', () => {
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'monthly',
      selectedMonth: { year: 2024, month: 1 },
    };
    expect(formatDateRange(filters)).toBe('January 2024');
  });

  it('returns empty string for monthly with no selectedMonth', () => {
    const filters: ReportFilters = { ...baseFilters, timeInterval: 'monthly' };
    expect(formatDateRange(filters)).toBe('');
  });

  it('formats custom date range', () => {
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };
    expect(formatDateRange(filters)).toBe('Jan 1 - Jan 31, 2024');
  });

  it('returns empty string for custom with missing dates', () => {
    const filters: ReportFilters = {
      ...baseFilters,
      timeInterval: 'custom',
      startDate: '2024-01-01',
      endDate: null,
    };
    expect(formatDateRange(filters)).toBe('');
  });
});

// ── downloadFile ──────────────────────────────────────────────────────────

describe('downloadFile', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLMock = vi.fn(() => 'blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    appendChildSpy = vi.spyOn(document.body, 'appendChild');
    removeChildSpy = vi.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob and object URL', () => {
    downloadFile('hello', 'test.csv', 'text/csv');
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    const blob = createObjectURLMock.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv');
  });

  it('sets the correct filename on the anchor', () => {
    downloadFile('data', 'report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('report.xlsx');
  });

  it('clicks the anchor to trigger download', () => {
    downloadFile('data', 'report.pdf', 'application/pdf');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('removes the anchor from the DOM after click', () => {
    downloadFile('data', 'report.csv', 'text/csv');
    expect(removeChildSpy).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after download', () => {
    downloadFile('data', 'report.csv', 'text/csv');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('works with ArrayBuffer content', () => {
    const buffer = new ArrayBuffer(8);
    downloadFile(buffer, 'report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});

// ── generateCSV ───────────────────────────────────────────────────────────

const makeRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: '1',
  date: '2024-01-15',
  day: 'Saturday',
  childId: 'c1',
  status: 'present',
  markedBy: 'user1',
  markedAt: '2024-01-15T10:00:00Z',
  childName: 'Abel Tesfaye',
  childKutrLevel: 2,
  familyName: 'Tesfaye',
  ...overrides,
});

const baseSummary: ReportSummary = {
  totalRecords: 3,
  presentCount: 2,
  absentCount: 1,
  lateCount: 0,
  excusedCount: 0,
  attendanceRate: 67,
  dateRange: 'Jan 15 - Jan 21, 2024',
  kutrLevel: 'Kutr 2',
};

describe('generateCSV', () => {
  it('includes the report title as the first row', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Attendance Report');
  });

  it('includes date range metadata row', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    // Date range contains a comma so it gets quoted
    expect(csv).toContain('Date Range,"Jan 15 - Jan 21, 2024"');
  });

  it('includes Kutr level metadata row', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    expect(csv).toContain('Kutr Level,Kutr 2');
  });

  it('includes column header row', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    expect(csv).toContain('Child Name,Kutr Level,Date,Day,Status');
  });

  it('includes a data row for each record', () => {
    const records = [
      makeRecord({ childName: 'Abel Tesfaye', childKutrLevel: 2, date: '2024-01-15', day: 'Saturday', status: 'present' }),
      makeRecord({ id: '2', childName: 'Sara Bekele', childKutrLevel: 1, date: '2024-01-15', day: 'Saturday', status: 'absent' }),
    ];
    const csv = generateCSV(records, baseSummary, baseFilters);
    expect(csv).toContain('Abel Tesfaye,2,2024-01-15,Saturday,present');
    expect(csv).toContain('Sara Bekele,1,2024-01-15,Saturday,absent');
  });

  it('includes summary statistics section', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    expect(csv).toContain('Summary');
    expect(csv).toContain('Total Records,3');
    expect(csv).toContain('Present,2');
    expect(csv).toContain('Absent,1');
    expect(csv).toContain('Late,0');
    expect(csv).toContain('Excused,0');
    expect(csv).toContain('Attendance Rate,67%');
  });

  it('escapes values containing commas by wrapping in quotes', () => {
    const records = [makeRecord({ childName: 'Last, First' })];
    const csv = generateCSV(records, baseSummary, baseFilters);
    expect(csv).toContain('"Last, First"');
  });

  it('escapes values containing double-quotes', () => {
    const records = [makeRecord({ childName: 'He said "hello"' })];
    const csv = generateCSV(records, baseSummary, baseFilters);
    expect(csv).toContain('"He said ""hello"""');
  });

  it('produces correct row order: metadata, blank, headers, data, blank, summary', () => {
    const records = [makeRecord()];
    const csv = generateCSV(records, baseSummary, baseFilters);
    const lines = csv.split('\n');

    // Row 0: title
    expect(lines[0]).toBe('Attendance Report');
    // Row 1: date range
    expect(lines[1]).toMatch(/^Date Range,/);
    // Row 2: kutr level
    expect(lines[2]).toMatch(/^Kutr Level,/);
    // Row 3: blank
    expect(lines[3]).toBe('');
    // Row 4: column headers
    expect(lines[4]).toBe('Child Name,Kutr Level,Date,Day,Status');
    // Row 5: first data row
    expect(lines[5]).toContain('Abel Tesfaye');
    // Row 6: blank
    expect(lines[6]).toBe('');
    // Row 7: Summary label
    expect(lines[7]).toBe('Summary');
  });

  it('handles empty records list gracefully', () => {
    const csv = generateCSV([], baseSummary, baseFilters);
    // Should still have headers and summary
    expect(csv).toContain('Child Name,Kutr Level,Date,Day,Status');
    expect(csv).toContain('Total Records,3');
  });
});

// ── generateExcel ─────────────────────────────────────────────────────────

describe('generateExcel', () => {
  const parseSheet = (buffer: ArrayBuffer) => {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets['Attendance Report'];
    return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as (string | number)[][];
  };

  it('returns an ArrayBuffer', () => {
    const result = generateExcel([], baseSummary, baseFilters);
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('creates a sheet named "Attendance Report"', () => {
    const buffer = generateExcel([], baseSummary, baseFilters);
    const wb = XLSX.read(buffer, { type: 'array' });
    expect(wb.SheetNames).toContain('Attendance Report');
  });

  it('includes metadata rows at the top', () => {
    const buffer = generateExcel([], baseSummary, baseFilters);
    const rows = parseSheet(buffer);
    expect(rows[0][0]).toBe('Attendance Report');
    expect(rows[1][0]).toBe('Date Range');
    expect(rows[1][1]).toBe('Jan 15 - Jan 21, 2024');
    expect(rows[2][0]).toBe('Kutr Level');
    expect(rows[2][1]).toBe('Kutr 2');
  });

  it('includes header row with correct column names', () => {
    const buffer = generateExcel([], baseSummary, baseFilters);
    const rows = parseSheet(buffer);
    // Row index 4 (0-based): blank row at index 3, header at index 4
    const headerRow = rows[4];
    expect(headerRow).toEqual(['Child Name', 'Kutr Level', 'Date', 'Day', 'Status']);
  });

  it('includes a data row for each record', () => {
    const records = [
      makeRecord({ childName: 'Abel Tesfaye', childKutrLevel: 2, date: '2024-01-15', day: 'Saturday', status: 'present' }),
      makeRecord({ id: '2', childName: 'Sara Bekele', childKutrLevel: 1, date: '2024-01-16', day: 'Sunday', status: 'absent' }),
    ];
    const buffer = generateExcel(records, baseSummary, baseFilters);
    const rows = parseSheet(buffer);
    // Data rows start at index 5
    expect(rows[5][0]).toBe('Abel Tesfaye');
    expect(rows[5][1]).toBe(2);
    expect(rows[5][4]).toBe('present');
    expect(rows[6][0]).toBe('Sara Bekele');
    expect(rows[6][4]).toBe('absent');
  });

  it('includes summary statistics section', () => {
    const buffer = generateExcel([], baseSummary, baseFilters);
    const rows = parseSheet(buffer);
    // With 0 records: metadata(3) + blank(1) + header(1) + data(0) + blank(1) = index 6 for Summary
    const summaryLabelRow = rows.findIndex(r => r[0] === 'Summary');
    expect(summaryLabelRow).toBeGreaterThan(-1);
    const summaryRows = rows.slice(summaryLabelRow);
    expect(summaryRows[1]).toEqual(['Total Records', 3]);
    expect(summaryRows[2]).toEqual(['Present', 2]);
    expect(summaryRows[3]).toEqual(['Absent', 1]);
    expect(summaryRows[4]).toEqual(['Late', 0]);
    expect(summaryRows[5]).toEqual(['Excused', 0]);
    expect(summaryRows[6]).toEqual(['Attendance Rate', '67%']);
  });

  it('handles empty records list gracefully', () => {
    const buffer = generateExcel([], baseSummary, baseFilters);
    const rows = parseSheet(buffer);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0][0]).toBe('Attendance Report');
  });

  it('produces correct row order: metadata, blank, headers, data, blank, summary', () => {
    const records = [makeRecord()];
    const buffer = generateExcel(records, baseSummary, baseFilters);
    const rows = parseSheet(buffer);

    expect(rows[0][0]).toBe('Attendance Report');   // title
    expect(rows[1][0]).toBe('Date Range');           // date range
    expect(rows[2][0]).toBe('Kutr Level');           // kutr level
    expect(rows[3]).toEqual([]);                     // blank row (may be empty array)
    expect(rows[4][0]).toBe('Child Name');           // header row
    expect(rows[5][0]).toBe('Abel Tesfaye');         // first data row
    // blank row at index 6
    expect(rows[7][0]).toBe('Summary');              // summary label
  });
});

// ── generatePDF ───────────────────────────────────────────────────────────

import { generatePDF } from '../exportUtils';

describe('generatePDF', () => {
  it('returns a Uint8Array', () => {
    const result = generatePDF([], baseSummary, baseFilters);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('produces a non-empty PDF buffer', () => {
    const result = generatePDF([], baseSummary, baseFilters);
    expect(result.length).toBeGreaterThan(0);
  });

  it('starts with the PDF magic bytes (%PDF)', () => {
    const result = generatePDF([], baseSummary, baseFilters);
    // PDF files start with "%PDF"
    const header = String.fromCharCode(...result.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('handles empty records list gracefully', () => {
    expect(() => generatePDF([], baseSummary, baseFilters)).not.toThrow();
  });

  it('handles multiple records without throwing', () => {
    const records = [
      makeRecord({ childName: 'Abel Tesfaye', childKutrLevel: 2, date: '2024-01-15', day: 'Saturday', status: 'present' }),
      makeRecord({ id: '2', childName: 'Sara Bekele', childKutrLevel: 1, date: '2024-01-16', day: 'Sunday', status: 'absent' }),
      makeRecord({ id: '3', childName: 'Yonas Girma', childKutrLevel: 3, date: '2024-01-15', day: 'Saturday', status: 'late' }),
    ];
    expect(() => generatePDF(records, baseSummary, baseFilters)).not.toThrow();
    const result = generatePDF(records, baseSummary, baseFilters);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});

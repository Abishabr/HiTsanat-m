import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename, formatDateRange, downloadFile, generateCSV } from '../exportUtils';
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename, formatDateRange, downloadFile } from '../exportUtils';
import { ReportFilters } from '../reportTypes';

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

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExport } from '../useExport';
import * as exportUtils from '../../lib/exportUtils';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../../lib/reportTypes';

vi.mock('../../lib/exportUtils', () => ({
  generateCSV: vi.fn(() => 'csv-content'),
  generateExcel: vi.fn(() => new ArrayBuffer(8)),
  generatePDF: vi.fn(() => new Uint8Array([1, 2, 3])),
  generateFilename: vi.fn((fmt: string) => `report.${fmt}`),
  downloadFile: vi.fn(),
}));

const mockRecords: AttendanceRecord[] = [
  {
    childName: 'Test Child',
    childKutrLevel: 1,
    familyName: 'Test Family',
    date: '2024-01-15',
    day: 'Monday',
    status: 'present',
    childId: 'child-1',
    scheduleId: 'schedule-1',
    id: 'record-1',
  },
];

const mockSummary: ReportSummary = {
  totalRecords: 1,
  presentCount: 1,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  attendanceRate: 100,
  dateRange: 'Jan 15, 2024',
  kutrLevel: 'All Levels',
};

const mockFilters: ReportFilters = {
  timeInterval: 'daily',
  kutrLevel: 'all',
  startDate: null,
  endDate: null,
  selectedDate: '2024-01-15',
  selectedWeek: null,
  selectedMonth: null,
};

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state with no error and not exporting', () => {
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exportCSV calls generateCSV and downloadFile', () => {
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportCSV(); });
    expect(exportUtils.generateCSV).toHaveBeenCalledWith(mockRecords, mockSummary, mockFilters);
    expect(exportUtils.downloadFile).toHaveBeenCalledWith('csv-content', 'report.csv', 'text/csv;charset=utf-8;');
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exportExcel calls generateExcel and downloadFile', () => {
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportExcel(); });
    expect(exportUtils.generateExcel).toHaveBeenCalledWith(mockRecords, mockSummary, mockFilters);
    expect(exportUtils.downloadFile).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'report.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exportPDF calls generatePDF and downloadFile', () => {
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportPDF(); });
    expect(exportUtils.generatePDF).toHaveBeenCalledWith(mockRecords, mockSummary, mockFilters);
    expect(exportUtils.downloadFile).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'report.pdf',
      'application/pdf'
    );
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when exportCSV throws', () => {
    vi.mocked(exportUtils.generateCSV).mockImplementationOnce(() => { throw new Error('CSV error'); });
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportCSV(); });
    expect(result.current.error).toBe('CSV error');
    expect(result.current.isExporting).toBe(false);
  });

  it('sets error state when exportExcel throws', () => {
    vi.mocked(exportUtils.generateExcel).mockImplementationOnce(() => { throw new Error('Excel error'); });
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportExcel(); });
    expect(result.current.error).toBe('Excel error');
    expect(result.current.isExporting).toBe(false);
  });

  it('sets error state when exportPDF throws', () => {
    vi.mocked(exportUtils.generatePDF).mockImplementationOnce(() => { throw new Error('PDF error'); });
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportPDF(); });
    expect(result.current.error).toBe('PDF error');
    expect(result.current.isExporting).toBe(false);
  });

  it('clears previous error on new successful export', () => {
    vi.mocked(exportUtils.generateCSV).mockImplementationOnce(() => { throw new Error('first error'); });
    const { result } = renderHook(() => useExport(mockRecords, mockSummary, mockFilters));
    act(() => { result.current.exportCSV(); });
    expect(result.current.error).toBe('first error');
    act(() => { result.current.exportCSV(); });
    expect(result.current.error).toBeNull();
  });
});

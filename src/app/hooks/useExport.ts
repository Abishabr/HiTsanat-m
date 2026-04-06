import { useState, useCallback } from 'react';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../lib/reportTypes';
import {
  generateCSV,
  generateExcel,
  generatePDF,
  generateFilename,
  downloadFile,
} from '../lib/exportUtils';

interface UseExportReturn {
  exportCSV: () => void;
  exportExcel: () => void;
  exportPDF: () => void;
  isExporting: boolean;
  error: string | null;
}

export function useExport(
  records: AttendanceRecord[],
  summary: ReportSummary,
  filters: ReportFilters
): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCSV = useCallback(() => {
    setIsExporting(true);
    setError(null);
    try {
      const content = generateCSV(records, summary, filters);
      const filename = generateFilename('csv', filters);
      downloadFile(content, filename, 'text/csv;charset=utf-8;');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters]);

  const exportExcel = useCallback(() => {
    setIsExporting(true);
    setError(null);
    try {
      const content = generateExcel(records, summary, filters);
      const filename = generateFilename('xlsx', filters);
      downloadFile(content, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export Excel');
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters]);

  const exportPDF = useCallback(() => {
    setIsExporting(true);
    setError(null);
    try {
      const content = generatePDF(records, summary, filters);
      const filename = generateFilename('pdf', filters);
      downloadFile(content, filename, 'application/pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters]);

  return { exportCSV, exportExcel, exportPDF, isExporting, error };
}

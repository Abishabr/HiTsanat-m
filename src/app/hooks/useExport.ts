import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../lib/reportTypes';
import {
  generateCSV,
  generateExcel,
  generatePDF,
  generateFilename,
  downloadFile,
} from '../lib/exportUtils';
import { useAuth } from '../context/AuthContext';
import { canExportReports } from '../lib/permissions';

const UNAUTHORIZED_ERROR = "You don't have permission to export reports";

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
  const { user } = useAuth();

  const exportCSV = useCallback(() => {
    if (!user || !canExportReports(user.role)) {
      setError(UNAUTHORIZED_ERROR);
      toast.error(UNAUTHORIZED_ERROR);
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const content = generateCSV(records, summary, filters);
      const filename = generateFilename('csv', filters);
      downloadFile(content, filename, 'text/csv;charset=utf-8;');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      console.error('[useExport] CSV export failed:', err);
      setError(message);
      toast.error(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters, user]);

  const exportExcel = useCallback(() => {
    if (!user || !canExportReports(user.role)) {
      setError(UNAUTHORIZED_ERROR);
      toast.error(UNAUTHORIZED_ERROR);
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const content = generateExcel(records, summary, filters);
      const filename = generateFilename('xlsx', filters);
      downloadFile(content, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export Excel';
      console.error('[useExport] Excel export failed:', err);
      setError(message);
      toast.error(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters, user]);

  const exportPDF = useCallback(() => {
    if (!user || !canExportReports(user.role)) {
      setError(UNAUTHORIZED_ERROR);
      toast.error(UNAUTHORIZED_ERROR);
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const content = generatePDF(records, summary, filters);
      const filename = generateFilename('pdf', filters);
      downloadFile(content, filename, 'application/pdf');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      console.error('[useExport] PDF export failed:', err);
      setError(message);
      toast.error(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  }, [records, summary, filters, user]);

  return { exportCSV, exportExcel, exportPDF, isExporting, error };
}

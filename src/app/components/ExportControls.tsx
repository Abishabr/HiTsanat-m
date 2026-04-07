import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useExport } from '../hooks/useExport';
import { AttendanceRecord, ReportFilters, ReportSummary } from '../lib/reportTypes';

interface ExportControlsProps {
  records: AttendanceRecord[];
  summary: ReportSummary;
  filters: ReportFilters;
}

export function ExportControls({ records, summary, filters }: ExportControlsProps) {
  const { exportCSV, exportExcel, exportPDF, isExporting, error } = useExport(
    records,
    summary,
    filters
  );

  const prevError = useRef<string | null>(null);
  const pendingSuccess = useRef(false);

  useEffect(() => {
    if (error && error !== prevError.current) {
      pendingSuccess.current = false;
      toast.error(error);
    } else if (!error && pendingSuccess.current) {
      pendingSuccess.current = false;
      toast.success('Report exported successfully');
    }
    prevError.current = error;
  }, [error]);

  const handleExport = (exportFn: () => void) => {
    pendingSuccess.current = true;
    exportFn();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isExporting && (
        <span className="text-sm text-muted-foreground animate-pulse">
          Exporting...
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => handleExport(exportCSV)}
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => handleExport(exportExcel)}
      >
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => handleExport(exportPDF)}
      >
        Export PDF
      </Button>
    </div>
  );
}

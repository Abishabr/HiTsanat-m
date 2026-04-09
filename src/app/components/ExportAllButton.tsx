/**
 * ExportAllButton — dropdown with CSV, Excel, PDF export options.
 * Works with any row data by accepting a generic serializer.
 */

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { downloadFile } from '../lib/exportUtils';

interface ExportAllButtonProps {
  filename: string; // base filename without extension
  disabled?: boolean;
  getRows: () => string[][];   // returns [header, ...rows] as string arrays
  getSummaryRows?: () => string[][]; // optional summary section
}

export function ExportAllButton({ filename, disabled, getRows, getSummaryRows }: ExportAllButtonProps) {
  const [exporting, setExporting] = useState(false);

  const buildCSV = () => {
    const rows = getRows();
    const summary = getSummaryRows?.() ?? [];
    const all = summary.length > 0 ? [...rows, [], ...summary] : rows;
    return all.map(r => r.map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
  };

  const handleCSV = () => {
    try {
      const csv = buildCSV();
      downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
      toast.success('CSV exported');
    } catch {
      toast.error('CSV export failed');
    }
  };

  const handleExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = getRows();
      const summary = getSummaryRows?.() ?? [];
      const aoa = summary.length > 0 ? [...rows, [], ...summary] : rows;
      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'Report');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      downloadFile(buf, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Excel exported');
    } catch {
      toast.error('Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePDF = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const rows = getRows();
      const header = rows[0];
      const body = rows.slice(1);
      const summary = getSummaryRows?.() ?? [];

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(filename.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 14, 18);

      autoTable(doc, {
        startY: 26,
        head: [header],
        body,
        styles: { fontSize: 8 },
        headStyles: { fontStyle: 'bold' },
      });

      if (summary.length > 0) {
        // @ts-expect-error jspdf-autotable adds lastAutoTable
        const finalY: number = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 26;
        let y = finalY + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        for (const row of summary) {
          y += 6;
          doc.text(row.join('   '), 14, y);
        }
      }

      downloadFile(new Uint8Array(doc.output('arraybuffer') as ArrayBuffer), `${filename}.pdf`, 'application/pdf');
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled || exporting}>
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV} className="gap-2">
          <FileText className="w-4 h-4 text-green-600" />Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel} className="gap-2">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} className="gap-2">
          <File className="w-4 h-4 text-red-600" />Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table';
import { AttendanceRecord } from '../lib/reportTypes';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800',
};

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}

export function AttendanceTable({
  records,
  searchQuery,
  onSearchChange,
}: AttendanceTableProps) {
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredRecords = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return records;
    return records.filter((r) => r.childName.toLowerCase().includes(query));
  }, [records, debouncedSearch]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search by child name..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Search attendance records by child name"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Child Name</TableHead>
            <TableHead>Kutr Level</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No attendance records found.
              </TableCell>
            </TableRow>
          ) : (
            filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.childName}</TableCell>
                <TableCell>Kutr {record.childKutrLevel}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.day}</TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default AttendanceTable;

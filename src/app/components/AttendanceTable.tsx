import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table';
import { Button } from './ui/button';
import { AttendanceRecord } from '../lib/reportTypes';

const PAGE_SIZE = 50;

type SortKey = 'childName' | 'date' | 'status' | 'childKutrLevel';
type SortDirection = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

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
  const classes = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}

function SortIndicator({ sortKey, sortState }: { sortKey: SortKey; sortState: SortState | null }) {
  if (!sortState || sortState.key !== sortKey) {
    return <span className="ml-1 text-muted-foreground opacity-40">↕</span>;
  }
  return (
    <span className="ml-1" aria-hidden="true">
      {sortState.direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function AttendanceTable({
  records,
  searchQuery,
  onSearchChange,
}: AttendanceTableProps) {
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortState]);

  function handleSort(key: SortKey) {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  const filteredAndSortedRecords = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = query
      ? records.filter((r) => r.childName.toLowerCase().includes(query))
      : records;

    if (!sortState) return filtered;

    const { key, direction } = sortState;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });
  }, [records, debouncedSearch, sortState]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRecords = filteredAndSortedRecords.slice(pageStart, pageStart + PAGE_SIZE);

  const sortableHeadClass =
    'cursor-pointer select-none hover:bg-muted/50 transition-colors';

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

      <div role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
        {filteredAndSortedRecords.length > 0
          ? `Showing ${Math.min(pageStart + PAGE_SIZE, filteredAndSortedRecords.length)} of ${filteredAndSortedRecords.length} records`
          : null}
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className={sortableHeadClass}
              onClick={() => handleSort('childName')}
              aria-sort={
                sortState?.key === 'childName'
                  ? sortState.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Child Name
              <SortIndicator sortKey="childName" sortState={sortState} />
            </TableHead>
            <TableHead
              className={sortableHeadClass}
              onClick={() => handleSort('childKutrLevel')}
              aria-sort={
                sortState?.key === 'childKutrLevel'
                  ? sortState.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Kutr Level
              <SortIndicator sortKey="childKutrLevel" sortState={sortState} />
            </TableHead>
            <TableHead
              className={sortableHeadClass}
              onClick={() => handleSort('date')}
              aria-sort={
                sortState?.key === 'date'
                  ? sortState.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Date
              <SortIndicator sortKey="date" sortState={sortState} />
            </TableHead>
            <TableHead>Day</TableHead>
            <TableHead
              className={sortableHeadClass}
              onClick={() => handleSort('status')}
              aria-sort={
                sortState?.key === 'status'
                  ? sortState.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Status
              <SortIndicator sortKey="status" sortState={sortState} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No attendance records found.
              </TableCell>
            </TableRow>
          ) : (
            pageRecords.map((record) => (
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

      {filteredAndSortedRecords.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default AttendanceTable;

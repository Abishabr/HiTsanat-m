import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, startOfWeek, getISOWeek } from 'date-fns';
import { AttendanceRecord, ReportFilters, TrendDataPoint } from '../lib/reportTypes';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AttendanceTrendChartProps {
  records: AttendanceRecord[];
  filters: ReportFilters;
}

/**
 * Transforms attendance records into trend data points aggregated by day.
 * One data point per unique date.
 */
function aggregateByDay(records: AttendanceRecord[]): TrendDataPoint[] {
  const map = new Map<string, { present: number; total: number }>();

  for (const r of records) {
    const entry = map.get(r.date) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (r.status === 'present' || r.status === 'late') entry.present += 1;
    map.set(r.date, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { present, total }]) => ({
      date,
      label: format(parseISO(date), 'MMM d'),
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      presentCount: present,
      totalCount: total,
    }));
}

/**
 * Transforms attendance records into trend data points aggregated by ISO week.
 * One data point per week.
 */
function aggregateByWeek(records: AttendanceRecord[]): TrendDataPoint[] {
  const map = new Map<string, { weekStart: string; present: number; total: number }>();

  for (const r of records) {
    const date = parseISO(r.date);
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekNum = getISOWeek(date);
    const key = weekStart;

    const entry = map.get(key) ?? { weekStart, present: 0, total: 0 };
    entry.total += 1;
    if (r.status === 'present' || r.status === 'late') entry.present += 1;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { weekStart, present, total }]) => {
      const weekNum = getISOWeek(parseISO(weekStart));
      return {
        date: weekStart,
        label: `Wk ${weekNum}`,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        presentCount: present,
        totalCount: total,
      };
    });
}

/**
 * Determines whether to aggregate by day or week based on the active filters,
 * then builds the trend data points from the provided records.
 */
function buildTrendData(
  records: AttendanceRecord[],
  filters: ReportFilters
): TrendDataPoint[] {
  if (records.length === 0) return [];

  const { timeInterval, startDate, endDate } = filters;

  if (timeInterval === 'custom' && startDate && endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 ? aggregateByWeek(records) : aggregateByDay(records);
  }

  // daily → single point; weekly/monthly → by day
  return aggregateByDay(records);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: TrendDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{point.label}</p>
      <p className="text-green-600 dark:text-green-400">
        Rate: {point.attendanceRate}%
      </p>
      <p className="text-muted-foreground">
        Present: {point.presentCount} / {point.totalCount}
      </p>
    </div>
  );
}

/**
 * AttendanceTrendChart displays attendance rate over time as a line chart.
 *
 * Aggregation strategy:
 * - daily / weekly / monthly → one point per day
 * - custom range ≤ 7 days   → one point per day
 * - custom range > 7 days   → one point per week
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
export const AttendanceTrendChart = React.memo(function AttendanceTrendChart({ records, filters }: AttendanceTrendChartProps) {
  const data = useMemo(() => buildTrendData(records, filters), [records, filters]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Attendance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Date', position: 'insideBottom', offset: -4, fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Attendance Rate', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="attendanceRate"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: '#22c55e' }}
              activeDot={{ r: 6 }}
              name="Attendance Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

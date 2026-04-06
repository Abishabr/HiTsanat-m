import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ReportSummary, StatusDistribution } from '../lib/reportTypes';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface StatusDistributionChartProps {
  summary: ReportSummary;
}

const STATUS_COLORS: Record<string, string> = {
  Present: '#22c55e',  // green
  Absent: '#ef4444',   // red
  Late: '#eab308',     // yellow
  Excused: '#3b82f6',  // blue
};

function buildDistributionData(summary: ReportSummary): StatusDistribution[] {
  const { totalRecords, presentCount, absentCount, lateCount, excusedCount } = summary;
  const total = totalRecords || 1; // avoid division by zero

  return [
    {
      status: 'Present',
      count: presentCount,
      percentage: Math.round((presentCount / total) * 100),
      color: STATUS_COLORS.Present,
    },
    {
      status: 'Absent',
      count: absentCount,
      percentage: Math.round((absentCount / total) * 100),
      color: STATUS_COLORS.Absent,
    },
    {
      status: 'Late',
      count: lateCount,
      percentage: Math.round((lateCount / total) * 100),
      color: STATUS_COLORS.Late,
    },
    {
      status: 'Excused',
      count: excusedCount,
      percentage: Math.round((excusedCount / total) * 100),
      color: STATUS_COLORS.Excused,
    },
  ];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: StatusDistribution }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1" style={{ color: point.color }}>
        {point.status}
      </p>
      <p className="text-foreground">Count: {point.count}</p>
      <p className="text-muted-foreground">Percentage: {point.percentage}%</p>
    </div>
  );
}

/**
 * StatusDistributionChart displays the distribution of attendance statuses
 * (present, absent, late, excused) as a color-coded bar chart.
 *
 * **Validates: Requirements 5.4**
 */
export function StatusDistributionChart({ summary }: StatusDistributionChartProps) {
  const data = buildDistributionData(summary);

  if (summary.totalRecords === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
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
        <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="status"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

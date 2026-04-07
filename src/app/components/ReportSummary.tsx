import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ReportSummary as ReportSummaryType } from '../lib/reportTypes';
import { cn } from './ui/utils';

interface ReportSummaryProps {
  summary: ReportSummaryType;
}

/**
 * ReportSummary component displays attendance summary statistics
 * 
 * Shows total records, status counts with color-coded badges,
 * attendance rate with color coding, and filter information.
 * 
 * Color coding:
 * - Present: green
 * - Absent: red
 * - Late: yellow
 * - Excused: blue
 * - Attendance rate: red < 70%, yellow 70-85%, green > 85%
 * 
 * **Validates: Requirements 1.4, 1.5, 8.1, 8.2, 8.3, 8.4**
 */
export const ReportSummary = React.memo(function ReportSummary({ summary }: ReportSummaryProps) {
  // Determine attendance rate color based on thresholds
  const getAttendanceRateColor = (rate: number): string => {
    if (rate < 70) return 'text-red-600 dark:text-red-400';
    if (rate <= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const attendanceRateColor = getAttendanceRateColor(summary.attendanceRate);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Records Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalRecords}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.dateRange}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.kutrLevel}
          </p>
        </CardContent>
      </Card>

      {/* Status Counts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge 
              className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
            >
              Present: {summary.presentCount}
            </Badge>
            <Badge 
              className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
            >
              Absent: {summary.absentCount}
            </Badge>
            <Badge 
              className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
            >
              Late: {summary.lateCount}
            </Badge>
            <Badge 
              className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
            >
              Excused: {summary.excusedCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Attendance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", attendanceRateColor)}>
            {summary.attendanceRate}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.presentCount} of {summary.totalRecords} present
          </p>
        </CardContent>
      </Card>

      {/* Filter Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Period:</span>{' '}
              <span className="text-muted-foreground">{summary.dateRange}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Level:</span>{' '}
              <span className="text-muted-foreground">{summary.kutrLevel}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

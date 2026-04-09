/**
 * Type definitions for the Attendance Reporting and Export feature
 * 
 * This file contains all type definitions used by the reporting feature,
 * including filters, enriched records, summary statistics, and chart data.
 */

import { DayAttendance } from '../context/ScheduleStore';

// ── Time and Filter Types ──────────────────────────────────────────────────

/**
 * Time interval options for filtering attendance reports
 */
export type TimeInterval = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Kutr level filter options
 * 'all' represents all Kutr levels combined
 */
export type KutrLevelFilter = 'all' | 1 | 2 | 3;

/**
 * Export format options for report downloads
 */
export type ExportFormat = 'csv' | 'excel' | 'pdf';

// ── Filter Configuration ───────────────────────────────────────────────────

/**
 * Complete filter configuration for attendance reports
 * Contains all filter state including time interval, Kutr level, and date selections
 */
export interface ReportFilters {
  timeInterval: TimeInterval;
  kutrLevel: KutrLevelFilter;
  subDepartment: string; // 'all' or sub-dept name
  startDate: string | null;
  endDate: string | null;
  selectedDate: string | null;
  selectedWeek: { start: string; end: string } | null;
  selectedMonth: { year: number; month: number } | null;
}

// ── Enriched Data Types ────────────────────────────────────────────────────

/**
 * Attendance record enriched with child metadata
 * Extends DayAttendance with child name, Kutr level, and family information
 */
export interface AttendanceRecord extends DayAttendance {
  childName: string;
  childKutrLevel: 1 | 2 | 3;
  familyName: string;
  subDepartmentName?: string; // from the program's sub-dept
}

// ── Summary Statistics ─────────────────────────────────────────────────────

/**
 * Summary statistics for filtered attendance records
 * Includes counts, percentages, and display labels
 */
export interface ReportSummary {
  /** Total number of attendance records */
  totalRecords: number;
  
  /** Number of present records */
  presentCount: number;
  
  /** Number of absent records */
  absentCount: number;
  
  /** Number of late records */
  lateCount: number;
  
  /** Number of excused records */
  excusedCount: number;
  
  /** Attendance rate as percentage (0-100) */
  attendanceRate: number;
  
  /** Formatted date range string for display */
  dateRange: string;
  
  /** Formatted Kutr level string for display */
  kutrLevel: string;
}

// ── Chart Data Types ───────────────────────────────────────────────────────

/**
 * Data point for attendance trend line chart
 * Represents attendance metrics for a specific date or time period
 */
export interface TrendDataPoint {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  
  /** Display label for the data point (e.g., "Jan 15" or "Week 1") */
  label: string;
  
  /** Attendance rate as percentage (0-100) */
  attendanceRate: number;
  
  /** Number of present records for this data point */
  presentCount: number;
  
  /** Total number of records for this data point */
  totalCount: number;
}

/**
 * Status distribution data for bar chart
 * Represents the count and percentage of a specific attendance status
 */
export interface StatusDistribution {
  /** Status label (e.g., "Present", "Absent", "Late", "Excused") */
  status: string;
  
  /** Number of records with this status */
  count: number;
  
  /** Percentage of total records (0-100) */
  percentage: number;
  
  /** Color code for visualization (hex format) */
  color: string;
}

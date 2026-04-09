/**
 * Reports Page Component
 * 
 * Main page component for attendance reporting and export feature.
 * Integrates filters, summary statistics, data visualization, table, and export.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.7, 5.5
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useReportData, useReportFilter, useReportSummary } from '../hooks';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummary } from '../components/ReportSummary';
import { AttendanceTable } from '../components/AttendanceTable';
import { AttendanceTrendChart } from '../components/AttendanceTrendChart';
import { StatusDistributionChart } from '../components/StatusDistributionChart';
import { ExportControls } from '../components/ExportControls';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { EmptyState } from '../components/EmptyState';
import { ReportFilters as ReportFiltersType } from '../lib/reportTypes';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ProgramHistoryReport from './ProgramHistoryReport';
import AttendanceReportByWeek from '../components/AttendanceReportByWeek';
import { toast } from 'sonner';

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Initialize filters with default values
  const [filters, setFilters] = useState<ReportFiltersType>({
    timeInterval: 'weekly',
    kutrLevel: 'all',
    subDepartment: 'all',
    startDate: null,
    endDate: null,
    selectedDate: null,
    selectedWeek: null,
    selectedMonth: null,
  });

  // Check authorization - leadership and all subdept roles can access reports
  useEffect(() => {
    const allowedRoles = ['chairperson', 'vice-chairperson', 'secretary', 'subdept-leader', 'subdept-vice-leader'];
    if (!user || !allowedRoles.includes(user.role)) {
      navigate('/dashboard');
      toast.error("You don't have permission to access reports");
    }
  }, [user, navigate]);

  // Fetch attendance data
  const { records, isLoading, error, retry } = useReportData();
  
  // Apply filters to records
  const filteredRecords = useReportFilter(records, filters);
  
  // Compute summary statistics
  const summary = useReportSummary(filteredRecords, filters);

  // Search state for the attendance table
  const [searchQuery, setSearchQuery] = useState('');

  // Handle filter changes
  const handleFiltersChange = (newFilters: ReportFiltersType) => {
    setFilters(newFilters);
  };

  // Loading state — skeleton layout mirrors the real page structure
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" aria-busy="true" aria-label="Loading attendance data">
        {/* Page header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Filter panel skeleton */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Main content skeleton */}
          <div className="space-y-6">
            {/* Summary cards skeleton */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts skeleton */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>

            {/* Table skeleton */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-9 w-full" />
                <div className="space-y-2">
                  {/* Table header */}
                  <div className="flex gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-5 flex-1" />
                    ))}
                  </div>
                  {/* Table rows */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Skeleton key={j} className="h-5 flex-1" />
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state - data fetch failed
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
        <ErrorDisplay
          message={error}
          onRetry={retry}
        />
      </div>
    );
  }

  // Empty state - no attendance records at all
  if (records.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
        <EmptyState
          icon="📊"
          title="No Attendance Records Found"
          description="Attendance records will appear here once they are submitted by the Kuttr sub-department."
        />
      </div>
    );
  }

  // Empty state - no records match current filters
  const showFilteredEmptyState = filteredRecords.length === 0 && records.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze attendance reports with flexible filtering options
        </p>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
          <TabsTrigger value="programs">Program History</TabsTrigger>
        </TabsList>

        {/* Attendance Report tab */}
        <TabsContent value="attendance" className="mt-6">
          <AttendanceReportByWeek />
        </TabsContent>

        {/* Program History tab */}
        <TabsContent value="programs" className="mt-6">
          <ProgramHistoryReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

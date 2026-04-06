/**
 * Reports Page Component
 * 
 * Main page component for attendance reporting and export feature.
 * Integrates filters, summary statistics, and data visualization.
 * 
 * This is a minimal version with filters and summary (table, charts, and export
 * will be added in subsequent tasks).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.7, 5.5
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useReportData, useReportFilter, useReportSummary } from '../hooks';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummary } from '../components/ReportSummary';
import { ReportFilters as ReportFiltersType } from '../lib/reportTypes';
import { toast } from 'sonner';

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Initialize filters with default values
  const [filters, setFilters] = useState<ReportFiltersType>({
    timeInterval: 'weekly',
    kutrLevel: 'all',
    startDate: null,
    endDate: null,
    selectedDate: null,
    selectedWeek: null,
    selectedMonth: null,
  });

  // Check authorization - only chairperson, vice-chairperson, and secretary can access
  useEffect(() => {
    const allowedRoles = ['chairperson', 'vice-chairperson', 'secretary'];
    if (!user || !allowedRoles.includes(user.role)) {
      navigate('/dashboard');
      toast.error("You don't have permission to access reports");
    }
  }, [user, navigate]);

  // Fetch attendance data
  const { records, isLoading } = useReportData();
  
  // Apply filters to records
  const filteredRecords = useReportFilter(records, filters);
  
  // Compute summary statistics
  const summary = useReportSummary(filteredRecords, filters);

  // Handle filter changes
  const handleFiltersChange = (newFilters: ReportFiltersType) => {
    setFilters(newFilters);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no attendance records at all
  if (records.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold">No Attendance Records Found</h2>
            <p className="text-muted-foreground">
              Attendance records will appear here once they are submitted by the Kuttr sub-department.
            </p>
          </div>
        </div>
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

      {/* Filters Section */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div>
          <ReportFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {showFilteredEmptyState ? (
            // Empty state for filtered results
            <div className="flex items-center justify-center min-h-[400px] border rounded-lg bg-card">
              <div className="text-center space-y-4 max-w-md p-6">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold">No Records Found</h2>
                <p className="text-muted-foreground">
                  No attendance records match your current filters. Try adjusting the date range or Kutr level filter.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Statistics */}
              <ReportSummary summary={summary} />

              {/* Placeholder for future components */}
              <div className="border rounded-lg bg-card p-6">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="font-medium">Additional Features Coming Soon</p>
                  <p className="text-sm">
                    Data table, charts, and export functionality will be added in subsequent tasks.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

# Implementation Plan: Attendance Reporting and Export

## Overview

This implementation plan breaks down the attendance reporting and export feature into discrete coding tasks. The feature replaces the ComingSoon component on the Reports page with a fully functional reporting interface that fetches data from Supabase, provides filtering capabilities, displays visualizations, and exports reports in multiple formats.

The implementation follows a phased approach: core viewing functionality first, then visualizations, then export capabilities, and finally polish and optimization.

## Tasks

- [x] 1. Install required dependencies
  - Install xlsx, jspdf, jspdf-autotable, and date-fns packages
  - Update package.json with new dependencies
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2. Create core data types and interfaces
  - [x] 2.1 Create types file for reporting feature
    - Define TimeInterval, KutrLevelFilter, ExportFormat types
    - Define ReportFilters, AttendanceRecord, ReportSummary interfaces
    - Define TrendDataPoint and StatusDistribution interfaces
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 3. Implement custom hooks for data management
  - [x] 3.1 Create useReportData hook
    - Fetch attendance data from ScheduleStore context
    - Fetch children data from DataStore context
    - Merge attendance records with child metadata (name, kutrLevel, familyName)
    - Implement loading state management
    - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3_
  
  - [x] 3.2 Write unit tests for useReportData hook
    - Test data merging logic
    - Test loading state handling
    - Test empty data scenarios
    - _Requirements: 1.1, 1.6_
  
  - [x] 3.3 Create useReportFilter hook
    - Implement filterByDateRange function for daily, weekly, monthly, custom intervals
    - Implement Kutr level filtering logic
    - Use useMemo for performance optimization
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4_
  
  - [x] 3.4 Write unit tests for useReportFilter hook
    - Test daily interval filtering
    - Test weekly interval filtering
    - Test monthly interval filtering
    - Test custom date range filtering
    - Test Kutr level filtering
    - Test date range validation
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 3.5 Create useReportSummary hook
    - Calculate total records, present/absent/late/excused counts
    - Calculate attendance rate percentage
    - Format date range and Kutr level labels
    - Use useMemo for performance optimization
    - _Requirements: 1.4, 1.5_
  
  - [x] 3.6 Write unit tests for useReportSummary hook
    - Test summary statistics calculation
    - Test attendance rate calculation
    - Test empty records handling
    - Test percentage rounding
    - _Requirements: 1.4, 1.5_

- [ ] 4. Create filter components
  - [x] 4.1 Create ReportFilters component
    - Implement time interval selector (Daily, Weekly, Monthly, Custom)
    - Implement Kutr level filter dropdown (All, Kutr 1, Kutr 2, Kutr 3)
    - Implement conditional date pickers based on selected interval
    - Add Apply and Reset buttons
    - Implement filter state management
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_
  
  - [x] 4.2 Create date picker components for each interval type
    - Create DatePicker for daily selection
    - Create WeekPicker for weekly selection
    - Create MonthPicker for monthly selection
    - Create DateRangePicker for custom range with validation
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 4.3 Write integration tests for ReportFilters component
    - Test time interval selection updates
    - Test Kutr level filter updates
    - Test date picker interactions
    - Test date range validation
    - Test filter reset functionality
    - _Requirements: 2.1, 2.6, 2.7_

- [ ] 5. Create summary and statistics display
  - [x] 5.1 Create ReportSummary component
    - Display total records count
    - Display present, absent, late, excused counts with color-coded badges
    - Display attendance rate with color coding (red < 70%, yellow 70-85%, green > 85%)
    - Display selected date range and Kutr level
    - Use Card components from UI library
    - _Requirements: 1.4, 1.5, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 5.2 Write unit tests for ReportSummary component
    - Test summary statistics rendering
    - Test color coding logic
    - Test empty state handling
    - _Requirements: 1.4, 1.5, 8.2, 8.3, 8.4_

- [x] 6. Checkpoint - Ensure core data flow works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create attendance data table
  - [x] 7.1 Create AttendanceTable component
    - Display attendance records in table format
    - Add columns: Child Name, Kutr Level, Date, Day, Status
    - Implement color-coded status badges (green=present, red=absent, yellow=late, blue=excused)
    - Use Table components from UI library
    - _Requirements: 1.3, 8.1, 8.5_
  
  - [x] 7.2 Add search functionality to table
    - Create search input component
    - Implement client-side filtering by child name
    - Debounce search input (300ms)
    - _Requirements: 8.7_
  
  - [x] 7.3 Add sorting functionality to table
    - Make columns sortable (child name, date, status, Kutr level)
    - Implement sort state management
    - Add sort indicators to column headers
    - _Requirements: 8.5_
  
  - [x] 7.4 Add pagination to table
    - Implement pagination with 50 records per page
    - Add page navigation controls
    - Display current page and total pages
    - _Requirements: 8.6_
  
  - [x] 7.5 Write integration tests for AttendanceTable component
    - Test table rendering with data
    - Test search functionality
    - Test sorting functionality
    - Test pagination
    - Test status badge colors
    - _Requirements: 1.3, 8.5, 8.6, 8.7_

- [x] 8. Create data visualization components
  - [x] 8.1 Create AttendanceTrendChart component
    - Use recharts LineChart component
    - Transform filtered records into trend data points
    - Display attendance rate over time
    - Aggregate by day for weekly/monthly views
    - Aggregate by week for custom ranges > 7 days
    - Add tooltips and axis labels
    - Make chart responsive
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 8.2 Create StatusDistributionChart component
    - Use recharts BarChart component
    - Display distribution of present, absent, late, excused statuses
    - Use color-coded bars matching status colors
    - Add tooltips showing counts and percentages
    - Make chart responsive
    - _Requirements: 5.4_
  
  - [x] 8.3 Write integration tests for chart components
    - Test AttendanceTrendChart data transformation
    - Test StatusDistributionChart rendering
    - Test chart updates when filters change
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement export functionality
  - [x] 9.1 Create utility functions for export
    - Create generateFilename function with date and interval
    - Create formatDateRange function
    - Create downloadFile function for browser download
    - _Requirements: 4.8, 4.9_
  
  - [x] 9.2 Implement CSV export
    - Create generateCSV function
    - Include header row with column names
    - Include all attendance records with child name, Kutr level, date, day, status
    - Include summary statistics at the end
    - Include report metadata (date range, Kutr level filter)
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8_
  
  - [~] 9.3 Implement Excel export
    - Create generateExcel function using xlsx library
    - Create formatted workbook with styled columns
    - Include header row with bold formatting
    - Include all attendance records
    - Include summary statistics in separate section
    - Include report metadata
    - _Requirements: 4.1, 4.3, 4.5, 4.6, 4.7, 4.8_
  
  - [~] 9.4 Implement PDF export
    - Create generatePDF function using jspdf and jspdf-autotable
    - Create formatted PDF with table layout
    - Include report title and metadata
    - Include attendance records table with auto-pagination
    - Include summary statistics section
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [~] 9.5 Create useExport hook
    - Implement exportCSV callback
    - Implement exportExcel callback
    - Implement exportPDF callback
    - Add error handling for export failures
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.9_
  
  - [~] 9.6 Create ExportControls component
    - Add export format selector (CSV, Excel, PDF)
    - Add export button with loading state
    - Display export progress indicator
    - Show success/error toast notifications
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.9_
  
  - [~] 9.7 Write unit tests for export functions
    - Test generateFilename with different intervals
    - Test CSV generation
    - Test Excel generation
    - Test PDF generation
    - Test error handling
    - _Requirements: 4.2, 4.3, 4.4, 4.8_

- [~] 10. Checkpoint - Ensure export functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement role-based access control
  - [~] 11.1 Add authorization check to Reports page
    - Verify user role is chairperson, vice-chairperson, or secretary
    - Redirect unauthorized users to dashboard
    - Display error toast for unauthorized access
    - _Requirements: 6.1, 6.2_
  
  - [~] 11.2 Add authorization check to export functions
    - Verify user authorization before generating exports
    - Display error message for unauthorized export attempts
    - _Requirements: 6.3, 6.4_
  
  - [~] 11.3 Write integration tests for access control
    - Test authorized user access
    - Test unauthorized user redirect
    - Test export authorization
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Implement error handling and loading states
  - [~] 12.1 Add loading states
    - Display loading spinner while fetching data
    - Display skeleton loaders for table and charts
    - _Requirements: 7.1, 7.3_
  
  - [~] 12.2 Add error handling
    - Create ErrorDisplay component with retry button
    - Handle data fetch failures
    - Handle export generation failures
    - Log errors to console
    - _Requirements: 7.4_
  
  - [~] 12.3 Add empty state handling
    - Create EmptyState component
    - Display message when no records found
    - Suggest adjusting filters
    - _Requirements: 1.6_
  
  - [~] 12.4 Write integration tests for error scenarios
    - Test loading state display
    - Test error state display and retry
    - Test empty state display
    - _Requirements: 1.6, 7.1, 7.3, 7.4_

- [ ] 13. Create main Reports page component
  - [x] 13.1 Create Reports.tsx page component
    - Integrate all sub-components (filters, summary, table, charts, export)
    - Implement filter state management
    - Wire up data flow between hooks and components
    - Add responsive layout
    - Replace ComingSoon component in routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.7, 5.5_
  
  - [~] 13.2 Write integration tests for Reports page
    - Test complete data flow from fetch to display
    - Test filter interactions update all components
    - Test export button interactions
    - Test responsive layout
    - _Requirements: 1.1, 2.7, 5.5_

- [ ] 14. Performance optimization
  - [~] 14.1 Add memoization to expensive computations
    - Verify useMemo usage in hooks
    - Add React.memo to pure components
    - Optimize re-render performance
    - _Requirements: 7.5, 7.6_
  
  - [~] 14.2 Implement code splitting for export libraries
    - Lazy load xlsx library
    - Lazy load jspdf libraries
    - Reduce initial bundle size
    - _Requirements: 7.5_
  
  - [~] 14.3 Performance testing
    - Test with large datasets (1000+ records)
    - Measure filter application time
    - Measure export generation time
    - Verify performance targets met
    - _Requirements: 7.5, 7.6_

- [ ] 15. Accessibility and responsive design
  - [~] 15.1 Add accessibility improvements
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Add screen reader announcements for dynamic content
    - Test with accessibility tools
    - _Requirements: 8.5, 8.6, 8.7_
  
  - [~] 15.2 Refine responsive design
    - Test on mobile, tablet, and desktop viewports
    - Adjust table layout for mobile
    - Adjust chart sizing for different screens
    - Ensure filters work on mobile
    - _Requirements: 8.5_

- [~] 16. Final checkpoint - Complete testing and validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript and React with existing UI components from shadcn/ui
- Export libraries (xlsx, jspdf) should be lazy loaded to optimize bundle size
- All data filtering and computation happens client-side for performance
- The feature leverages existing ScheduleStore and DataStore contexts for data access
- Role-based access control uses existing RLS policies in Supabase

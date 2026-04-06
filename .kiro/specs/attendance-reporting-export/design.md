# Design Document: Attendance Reporting and Export

## Overview

This document specifies the technical design for implementing an attendance reporting and export feature for the chairperson role in the Hitsanat KFL Management System. The feature enables authorized users (chairperson, vice-chairperson, secretary) to view, filter, and export attendance reports with flexible time intervals and multiple export formats.

The implementation will replace the current ComingSoon component on the Reports page with a fully functional reporting interface that:
- Fetches attendance data from the existing `day_attendance` Supabase table
- Provides filtering by time intervals (daily, weekly, monthly, custom) and Kutr levels
- Displays attendance data with summary statistics and visualizations
- Exports reports in CSV, Excel (XLSX), and PDF formats
- Implements role-based access control using existing RLS policies
- Optimizes performance through client-side caching and filtering

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Reports Page (UI)                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Filter Controls│  │ Data Table   │  │ Export Controls │ │
│  │ - Time Interval│  │ - Sortable   │  │ - CSV           │ │
│  │ - Kutr Level   │  │ - Searchable │  │ - Excel         │ │
│  │ - Date Pickers │  │ - Paginated  │  │ - PDF           │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Visualization Components                   │ │
│  │  - Attendance Trend Line Chart                         │ │
│  │  - Status Distribution Bar Chart                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ useReportData    │  │ useReportFilter│  │ useExport   │ │
│  │ - Fetch data     │  │ - Filter logic │  │ - CSV gen   │ │
│  │ - Cache data     │  │ - Date ranges  │  │ - Excel gen │ │
│  │ - Compute stats  │  │ - Kutr filter  │  │ - PDF gen   │ │
│  └──────────────────┘  └────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ScheduleStore Context                    │  │
│  │  - attendance: DayAttendance[]                        │  │
│  │  - Realtime subscriptions                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              DataStore Context                        │  │
│  │  - children: Child[]                                  │  │
│  │  - Provides child metadata (name, kutrLevel)          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  day_attendance table                                 │  │
│  │  - id, date, day, child_id, status                    │  │
│  │  - marked_by, marked_at                               │  │
│  │  - RLS policies for role-based access                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  children table                                       │  │
│  │  - id, name, kutr_level, family_name                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Reports.tsx (Page Component)
├── ReportFilters (Filter Controls)
│   ├── TimeIntervalSelector
│   ├── KutrLevelFilter
│   └── DateRangePicker
├── ReportSummary (Statistics Display)
│   ├── SummaryCard (Total Records)
│   ├── SummaryCard (Present Count)
│   ├── SummaryCard (Absent Count)
│   ├── SummaryCard (Attendance Rate)
│   └── StatusBadges
├── AttendanceTrendChart (Line Chart)
├── StatusDistributionChart (Bar Chart)
├── AttendanceTable (Data Table)
│   ├── TableHeader (Sortable Columns)
│   ├── TableBody (Paginated Rows)
│   └── TableSearch (Filter by Name)
└── ExportControls (Export Buttons)
    ├── ExportCSVButton
    ├── ExportExcelButton
    └── ExportPDFButton
```

## Components and Interfaces

### Data Types

```typescript
// Existing types from ScheduleStore.tsx
export interface DayAttendance {
  id: string;
  date: string;
  day: 'Saturday' | 'Sunday';
  childId: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  markedBy: string;
  markedAt: string;
}

// Existing types from DataStore.tsx
export interface Child {
  id: string;
  name: string;
  kutrLevel: 1 | 2 | 3;
  familyName: string;
  // ... other fields
}

// New types for reporting
export type TimeInterval = 'daily' | 'weekly' | 'monthly' | 'custom';
export type KutrLevelFilter = 'all' | 1 | 2 | 3;
export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportFilters {
  timeInterval: TimeInterval;
  kutrLevel: KutrLevelFilter;
  startDate: string | null;
  endDate: string | null;
  selectedDate: string | null; // For daily view
  selectedWeek: { start: string; end: string } | null; // For weekly view
  selectedMonth: { year: number; month: number } | null; // For monthly view
}

export interface AttendanceRecord extends DayAttendance {
  childName: string;
  childKutrLevel: 1 | 2 | 3;
  familyName: string;
}

export interface ReportSummary {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  dateRange: string;
  kutrLevel: string;
}

export interface TrendDataPoint {
  date: string;
  label: string;
  attendanceRate: number;
  presentCount: number;
  totalCount: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}
```

### Custom Hooks

#### useReportData

```typescript
/**
 * Hook to fetch and manage attendance report data
 * Fetches data from ScheduleStore and DataStore contexts
 * Implements client-side caching to avoid redundant queries
 */
function useReportData() {
  const { attendance, isLoading: attendanceLoading } = useSchedule();
  const { children, isLoading: childrenLoading } = useDataStore();
  
  // Merge attendance records with child metadata
  const enrichedRecords: AttendanceRecord[] = useMemo(() => {
    return attendance.map(record => {
      const child = children.find(c => c.id === record.childId);
      return {
        ...record,
        childName: child?.name ?? 'Unknown',
        childKutrLevel: child?.kutrLevel ?? 1,
        familyName: child?.familyName ?? 'Unknown',
      };
    });
  }, [attendance, children]);
  
  return {
    records: enrichedRecords,
    isLoading: attendanceLoading || childrenLoading,
  };
}
```

#### useReportFilter

```typescript
/**
 * Hook to manage report filtering logic
 * Handles time interval filtering and Kutr level filtering
 * Performs client-side filtering on cached data
 */
function useReportFilter(
  records: AttendanceRecord[],
  filters: ReportFilters
): AttendanceRecord[] {
  return useMemo(() => {
    let filtered = records;
    
    // Filter by date range based on time interval
    filtered = filterByDateRange(filtered, filters);
    
    // Filter by Kutr level
    if (filters.kutrLevel !== 'all') {
      filtered = filtered.filter(r => r.childKutrLevel === filters.kutrLevel);
    }
    
    return filtered;
  }, [records, filters]);
}

function filterByDateRange(
  records: AttendanceRecord[],
  filters: ReportFilters
): AttendanceRecord[] {
  switch (filters.timeInterval) {
    case 'daily':
      if (!filters.selectedDate) return records;
      return records.filter(r => r.date === filters.selectedDate);
      
    case 'weekly':
      if (!filters.selectedWeek) return records;
      return records.filter(r => 
        r.date >= filters.selectedWeek.start && 
        r.date <= filters.selectedWeek.end
      );
      
    case 'monthly':
      if (!filters.selectedMonth) return records;
      return records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getFullYear() === filters.selectedMonth.year &&
               recordDate.getMonth() === filters.selectedMonth.month;
      });
      
    case 'custom':
      if (!filters.startDate || !filters.endDate) return records;
      return records.filter(r => 
        r.date >= filters.startDate && 
        r.date <= filters.endDate
      );
      
    default:
      return records;
  }
}
```

#### useReportSummary

```typescript
/**
 * Hook to compute summary statistics from filtered records
 */
function useReportSummary(
  records: AttendanceRecord[],
  filters: ReportFilters
): ReportSummary {
  return useMemo(() => {
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    const attendanceRate = totalRecords > 0 
      ? Math.round((presentCount / totalRecords) * 100) 
      : 0;
    
    const dateRange = formatDateRange(filters);
    const kutrLevel = filters.kutrLevel === 'all' 
      ? 'All Levels' 
      : `Kutr ${filters.kutrLevel}`;
    
    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
      dateRange,
      kutrLevel,
    };
  }, [records, filters]);
}
```

#### useExport

```typescript
/**
 * Hook to handle report export in multiple formats
 * Generates CSV, Excel, and PDF files from filtered data
 */
function useExport() {
  const exportCSV = useCallback((
    records: AttendanceRecord[],
    summary: ReportSummary,
    filters: ReportFilters
  ) => {
    const csv = generateCSV(records, summary, filters);
    const filename = generateFilename('csv', filters);
    downloadFile(csv, filename, 'text/csv');
  }, []);
  
  const exportExcel = useCallback((
    records: AttendanceRecord[],
    summary: ReportSummary,
    filters: ReportFilters
  ) => {
    const workbook = generateExcel(records, summary, filters);
    const filename = generateFilename('xlsx', filters);
    workbook.xlsx.writeBuffer().then(buffer => {
      downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  }, []);
  
  const exportPDF = useCallback((
    records: AttendanceRecord[],
    summary: ReportSummary,
    filters: ReportFilters
  ) => {
    const pdf = generatePDF(records, summary, filters);
    const filename = generateFilename('pdf', filters);
    pdf.save(filename);
  }, []);
  
  return { exportCSV, exportExcel, exportPDF };
}
```

### UI Components

#### ReportFilters Component

```typescript
interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

function ReportFilters({ filters, onFiltersChange }: ReportFiltersProps) {
  // Renders:
  // - Time interval selector (Daily, Weekly, Monthly, Custom)
  // - Kutr level filter (All, Kutr 1, Kutr 2, Kutr 3)
  // - Date pickers (conditional based on time interval)
  // - Apply/Reset buttons
}
```

#### AttendanceTable Component

```typescript
interface AttendanceTableProps {
  records: AttendanceRecord[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function AttendanceTable({ records, searchQuery, onSearchChange }: AttendanceTableProps) {
  // Features:
  // - Sortable columns (child name, date, status, Kutr level)
  // - Search by child name
  // - Pagination (50 records per page)
  // - Color-coded status badges
  // - Responsive design
}
```

#### AttendanceTrendChart Component

```typescript
interface AttendanceTrendChartProps {
  records: AttendanceRecord[];
  filters: ReportFilters;
}

function AttendanceTrendChart({ records, filters }: AttendanceTrendChartProps) {
  // Uses recharts LineChart
  // Shows attendance rate over time
  // Aggregates by day for weekly/monthly views
  // Aggregates by week for custom ranges > 7 days
}
```

#### StatusDistributionChart Component

```typescript
interface StatusDistributionChartProps {
  summary: ReportSummary;
}

function StatusDistributionChart({ summary }: StatusDistributionChartProps) {
  // Uses recharts BarChart
  // Shows distribution of present, absent, late, excused
  // Color-coded bars matching status colors
}
```

## Data Models

### Database Schema (Existing)

The feature uses existing Supabase tables:

```sql
-- day_attendance table (already exists)
CREATE TABLE day_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  day         text NOT NULL,
  child_id    uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by   text NOT NULL,
  marked_at   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT day_attendance_child_date_unique UNIQUE (child_id, date)
);

-- children table (already exists)
CREATE TABLE children (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  kutr_level          int NOT NULL CHECK (kutr_level BETWEEN 1 AND 3),
  family_name         text NOT NULL,
  -- ... other fields
);
```

### Row-Level Security

The feature leverages existing RLS policies:

```sql
-- Chairperson, vice-chairperson, secretary: full SELECT access
CREATE POLICY "day_attendance_admin_select" ON day_attendance
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN
      ('chairperson', 'vice-chairperson', 'secretary')
  );
```

### Data Flow

1. **Initial Load**: ScheduleStore fetches all attendance records on mount
2. **Realtime Updates**: ScheduleStore subscribes to day_attendance changes
3. **Client-Side Filtering**: useReportFilter applies filters to cached data
4. **Summary Computation**: useReportSummary calculates statistics from filtered data
5. **Export Generation**: useExport transforms filtered data into export formats

## Error Handling

### Error Scenarios and Handling

1. **Data Fetch Failure**
   - Display error message with retry button
   - Log error to console for debugging
   - Maintain previous data if available

2. **Empty Data State**
   - Display empty state message: "No attendance records found for the selected filters"
   - Suggest adjusting filters or date range
   - Show illustration or icon

3. **Invalid Date Range**
   - Validate that end date is not before start date
   - Display inline validation error
   - Disable apply button until valid

4. **Export Generation Failure**
   - Display toast notification with error message
   - Log error details to console
   - Allow user to retry export

5. **Authorization Failure**
   - Redirect to role-appropriate dashboard
   - Display toast: "You don't have permission to access reports"
   - Log unauthorized access attempt

### Error Handling Implementation

```typescript
function Reports() {
  const [error, setError] = useState<string | null>(null);
  const { records, isLoading } = useReportData();
  
  // Handle loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Handle error state
  if (error) {
    return (
      <ErrorDisplay 
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  // Handle empty state
  if (records.length === 0) {
    return (
      <EmptyState 
        title="No attendance records found"
        description="Attendance records will appear here once they are submitted by the Kuttr sub-department."
      />
    );
  }
  
  // Render report interface
  return <ReportInterface records={records} />;
}
```

## Testing Strategy

### Unit Tests

Unit tests will focus on:
- Filter logic (date range calculations, Kutr level filtering)
- Summary statistics computation
- Export filename generation
- Date formatting utilities
- Validation functions (date range validation)

Example unit tests:
```typescript
describe('filterByDateRange', () => {
  it('should filter records by daily interval', () => {
    const records = [
      { date: '2024-01-15', ... },
      { date: '2024-01-16', ... },
    ];
    const filters = { timeInterval: 'daily', selectedDate: '2024-01-15' };
    const result = filterByDateRange(records, filters);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
  });
  
  it('should filter records by weekly interval', () => {
    // Test weekly filtering logic
  });
  
  it('should filter records by monthly interval', () => {
    // Test monthly filtering logic
  });
  
  it('should filter records by custom date range', () => {
    // Test custom range filtering logic
  });
});

describe('useReportSummary', () => {
  it('should calculate correct attendance rate', () => {
    const records = [
      { status: 'present', ... },
      { status: 'present', ... },
      { status: 'absent', ... },
    ];
    const summary = computeSummary(records);
    expect(summary.attendanceRate).toBe(67); // 2/3 * 100 rounded
  });
  
  it('should handle empty records gracefully', () => {
    const summary = computeSummary([]);
    expect(summary.attendanceRate).toBe(0);
    expect(summary.totalRecords).toBe(0);
  });
});

describe('generateFilename', () => {
  it('should generate filename with date and interval', () => {
    const filters = { 
      timeInterval: 'weekly', 
      selectedWeek: { start: '2024-01-15', end: '2024-01-21' } 
    };
    const filename = generateFilename('csv', filters);
    expect(filename).toMatch(/attendance-report-weekly-\d{4}-\d{2}-\d{2}\.csv/);
  });
});
```

### Integration Tests

Integration tests will verify:
- Data fetching from ScheduleStore and DataStore
- Filter state management and UI updates
- Export button interactions and file generation
- Role-based access control
- Realtime data updates

Example integration tests:
```typescript
describe('Reports Page', () => {
  it('should fetch and display attendance records', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText(/Total Records/i)).toBeInTheDocument();
    });
  });
  
  it('should filter records when time interval changes', async () => {
    render(<Reports />);
    const dailyButton = screen.getByRole('button', { name: /Daily/i });
    fireEvent.click(dailyButton);
    // Verify filtered results
  });
  
  it('should export CSV when export button clicked', async () => {
    render(<Reports />);
    const exportButton = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportButton);
    // Verify download triggered
  });
  
  it('should redirect unauthorized users', async () => {
    // Mock user with 'member' role
    render(<Reports />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
```

### End-to-End Tests

E2E tests will validate:
- Complete user workflows (filter → view → export)
- Cross-browser compatibility
- Performance with large datasets
- Accessibility compliance

Example E2E test scenarios:
1. Chairperson logs in → navigates to Reports → filters by weekly interval → exports Excel
2. Vice-chairperson logs in → navigates to Reports → filters by Kutr 2 → views trend chart
3. Secretary logs in → navigates to Reports → filters by custom date range → exports PDF

## Performance Considerations

### Optimization Strategies

1. **Client-Side Caching**
   - Fetch all attendance data once on mount
   - Store in ScheduleStore context
   - Filter and compute on client side
   - Avoid redundant database queries

2. **Memoization**
   - Use `useMemo` for filtered records
   - Use `useMemo` for summary statistics
   - Use `useMemo` for chart data transformations
   - Prevent unnecessary re-computations

3. **Pagination**
   - Display 50 records per page in table
   - Implement virtual scrolling for large datasets
   - Lazy load chart data if needed

4. **Debouncing**
   - Debounce search input (300ms delay)
   - Debounce filter changes if needed
   - Prevent excessive re-renders

5. **Code Splitting**
   - Lazy load export libraries (xlsx, jspdf)
   - Load chart library (recharts) only when needed
   - Reduce initial bundle size

### Performance Metrics

Target performance metrics:
- Initial page load: < 2 seconds
- Filter application: < 500ms
- Export generation: < 3 seconds for 1000 records
- Search response: < 300ms

## Security Considerations

### Access Control

1. **Role-Based Access**
   - Verify user role before rendering Reports page
   - Use existing RLS policies for data access
   - Redirect unauthorized users to dashboard

2. **Data Validation**
   - Validate date ranges on client side
   - Sanitize search input to prevent XSS
   - Validate export parameters

3. **Secure Export**
   - Generate exports client-side (no server upload)
   - Use browser download API
   - No sensitive data in filenames

### Implementation

```typescript
function Reports() {
  const { user } = useAuth();
  
  // Check authorization
  useEffect(() => {
    const allowedRoles = ['chairperson', 'vice-chairperson', 'secretary'];
    if (!user || !allowedRoles.includes(user.role)) {
      navigate('/dashboard');
      toast.error("You don't have permission to access reports");
    }
  }, [user, navigate]);
  
  // ... rest of component
}
```

## Dependencies

### Required Libraries

1. **recharts** (^2.10.0) - Already installed
   - Used for line charts and bar charts
   - Lightweight and responsive

2. **xlsx** (^0.18.5) - New dependency
   - Excel file generation
   - Supports XLSX format with styling

3. **jspdf** (^2.5.1) - New dependency
   - PDF generation
   - Supports tables and formatting

4. **jspdf-autotable** (^3.8.0) - New dependency
   - Table plugin for jsPDF
   - Automatic table layout and pagination

5. **date-fns** (^3.0.0) - New dependency
   - Date manipulation and formatting
   - Lightweight alternative to moment.js

### Installation

```bash
npm install xlsx jspdf jspdf-autotable date-fns
```

## Implementation Plan

### Phase 1: Core Report Viewing (Priority: High)

1. Create Reports page component structure
2. Implement useReportData hook
3. Implement useReportFilter hook
4. Implement useReportSummary hook
5. Create ReportFilters component
6. Create ReportSummary component
7. Create AttendanceTable component
8. Implement role-based access control
9. Add loading and error states
10. Add empty state handling

### Phase 2: Data Visualization (Priority: High)

1. Create AttendanceTrendChart component
2. Create StatusDistributionChart component
3. Implement chart data transformations
4. Add responsive chart sizing
5. Add chart tooltips and legends

### Phase 3: Export Functionality (Priority: Medium)

1. Implement CSV export
2. Implement Excel export with styling
3. Implement PDF export with tables
4. Create ExportControls component
5. Add export progress indicators
6. Add export error handling

### Phase 4: Polish and Optimization (Priority: Low)

1. Add search functionality to table
2. Add column sorting to table
3. Implement pagination
4. Add filter presets (Last 7 days, Last 30 days, etc.)
5. Optimize performance with memoization
6. Add accessibility improvements
7. Add responsive design refinements

## Deployment Considerations

### Environment Variables

No new environment variables required. The feature uses existing Supabase configuration.

### Database Migrations

No database migrations required. The feature uses existing tables and RLS policies.

### Feature Flags

Consider adding a feature flag for gradual rollout:

```typescript
const ENABLE_REPORTS = import.meta.env.VITE_ENABLE_REPORTS === 'true';

function Reports() {
  if (!ENABLE_REPORTS) {
    return <ComingSoon title="Reports & Analytics" />;
  }
  // ... rest of component
}
```

### Monitoring

Add analytics tracking for:
- Report page views
- Filter usage patterns
- Export format preferences
- Error rates
- Performance metrics

## Future Enhancements

1. **Advanced Filtering**
   - Filter by family
   - Filter by date range presets
   - Save custom filter presets

2. **Scheduled Reports**
   - Email reports on schedule
   - Automated weekly/monthly reports

3. **Comparative Analysis**
   - Compare attendance across Kutr levels
   - Compare attendance across time periods
   - Identify trends and anomalies

4. **Individual Child Reports**
   - Drill down to individual child attendance
   - View attendance history
   - Generate individual report cards

5. **Export Templates**
   - Customizable export templates
   - Branded PDF reports
   - Multi-language support

## Conclusion

This design provides a comprehensive solution for attendance reporting and export functionality. The implementation leverages existing infrastructure (Supabase, ScheduleStore, DataStore) while adding new UI components and export capabilities. The design prioritizes performance through client-side caching and filtering, security through role-based access control, and usability through intuitive filters and visualizations.

The phased implementation plan allows for incremental delivery of value, starting with core viewing functionality and progressing to advanced features like export and visualization. The design is extensible to support future enhancements while maintaining code quality and performance standards.

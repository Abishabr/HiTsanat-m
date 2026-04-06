# ReportFilters Component

## Overview

The `ReportFilters` component provides a comprehensive filtering interface for attendance reports. It allows users to filter reports by time intervals (Daily, Weekly, Monthly, Custom) and Kutr levels (All, Kutr 1, Kutr 2, Kutr 3).

## Features

- **Time Interval Selection**: Choose between Daily, Weekly, Monthly, or Custom date ranges
- **Kutr Level Filtering**: Filter by specific Kutr levels or view all levels
- **Conditional Date Pickers**: Date picker UI adapts based on selected time interval
- **Date Range Validation**: Prevents invalid date ranges (end date before start date)
- **Apply/Reset Actions**: Apply filters or reset to defaults
- **Draft State Management**: Changes are staged locally until "Apply" is clicked

## Requirements Satisfied

- **Requirement 2.1**: Time interval selector with Daily, Weekly, Monthly, and Custom options
- **Requirement 2.2**: Daily interval displays single date selection
- **Requirement 2.3**: Weekly interval displays week selection
- **Requirement 2.4**: Monthly interval displays month selection
- **Requirement 2.5**: Custom interval displays start and end date inputs
- **Requirement 2.6**: Date range validation (end date not before start date)
- **Requirement 3.1**: Kutr level filter with All Levels, Kutr 1, Kutr 2, Kutr 3 options
- **Requirement 3.2**: Filter by specific Kutr level
- **Requirement 3.3**: Filter by all Kutr levels

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { ReportFilters } from './components/ReportFilters';
import { ReportFilters as ReportFiltersType } from './lib/reportTypes';

function ReportsPage() {
  const [filters, setFilters] = useState<ReportFiltersType>({
    timeInterval: 'weekly',
    kutrLevel: 'all',
    startDate: null,
    endDate: null,
    selectedDate: null,
    selectedWeek: null,
    selectedMonth: null,
  });

  const handleFiltersChange = (newFilters: ReportFiltersType) => {
    setFilters(newFilters);
    // Fetch or filter data based on newFilters
  };

  return (
    <ReportFilters 
      filters={filters} 
      onFiltersChange={handleFiltersChange} 
    />
  );
}
```

### With Data Fetching

```tsx
import { useState, useEffect } from 'react';
import { ReportFilters } from './components/ReportFilters';
import { useReportData } from './hooks/useReportData';
import { useReportFilter } from './hooks/useReportFilter';

function ReportsPage() {
  const [filters, setFilters] = useState<ReportFiltersType>({
    timeInterval: 'weekly',
    kutrLevel: 'all',
    startDate: null,
    endDate: null,
    selectedDate: null,
    selectedWeek: null,
    selectedMonth: null,
  });

  const { records, isLoading } = useReportData();
  const filteredRecords = useReportFilter(records, filters);

  return (
    <div>
      <ReportFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
      />
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <AttendanceTable records={filteredRecords} />
      )}
    </div>
  );
}
```

## Props

### `filters: ReportFiltersType`

The current filter state. This object contains all filter values:

```typescript
interface ReportFilters {
  timeInterval: 'daily' | 'weekly' | 'monthly' | 'custom';
  kutrLevel: 'all' | 1 | 2 | 3;
  startDate: string | null;          // ISO format: YYYY-MM-DD
  endDate: string | null;            // ISO format: YYYY-MM-DD
  selectedDate: string | null;       // ISO format: YYYY-MM-DD
  selectedWeek: { start: string; end: string } | null;
  selectedMonth: { year: number; month: number } | null;
}
```

### `onFiltersChange: (filters: ReportFiltersType) => void`

Callback function called when the user clicks "Apply Filters". Receives the updated filter state.

## Behavior

### Time Interval Selection

- **Daily**: Shows a single date picker. User selects one date.
- **Weekly**: Shows a date picker. User picks any date, and the component calculates the week range (Saturday to Friday).
- **Monthly**: Shows a date picker. User picks any date, and the component extracts the month and year.
- **Custom**: Shows two date pickers (start and end). Validates that end date is not before start date.

### Kutr Level Selection

- **All Levels**: No filtering by Kutr level
- **Kutr 1, 2, or 3**: Filters to show only records for that specific Kutr level

### Draft State

The component maintains a local draft state for filters. Changes are not propagated to the parent until the user clicks "Apply Filters". This prevents unnecessary data fetching while the user is still adjusting filters.

### Reset Functionality

Clicking "Reset" restores filters to default values:
- Time Interval: Weekly
- Kutr Level: All Levels
- All date selections: null

## Validation

### Date Range Validation

When using the Custom time interval:
- If start date is after end date, an error message is displayed
- The "Apply Filters" button is disabled until the date range is valid
- Error message: "Start date cannot be after end date" or "End date cannot be before start date"

## Styling

The component uses Tailwind CSS classes and shadcn/ui components for consistent styling with the rest of the application. It includes:

- Card-style container with border and padding
- Responsive layout
- Accessible form controls with labels
- Color-coded validation errors

## Accessibility

- All form controls have associated labels
- Date pickers are keyboard navigable
- Error messages are announced to screen readers
- Buttons have clear, descriptive text

## Dependencies

- `date-fns`: Date formatting and manipulation
- `lucide-react`: Calendar icon
- `@radix-ui/react-select`: Dropdown selects
- `@radix-ui/react-popover`: Date picker popovers
- `react-day-picker`: Calendar component

## Testing

The component includes comprehensive unit tests covering:
- Rendering of all filter controls
- Time interval selection
- Kutr level selection
- Date picker visibility based on interval
- Apply and Reset button functionality
- Date range validation

Run tests with:
```bash
npx vitest run src/app/components/__tests__/ReportFilters.test.tsx
```

## Integration

The ReportFilters component is designed to work with:
- `useReportData` hook: Fetches attendance data
- `useReportFilter` hook: Filters data based on filter state
- `useReportSummary` hook: Computes summary statistics from filtered data

See `ReportFilters.integration.example.tsx` for complete integration examples.

## Future Enhancements

Potential improvements for future iterations:
- Filter presets (Last 7 days, Last 30 days, This month, etc.)
- Save custom filter configurations
- Quick date navigation (Previous/Next week, month, etc.)
- Keyboard shortcuts for common actions
- Export filter state to URL query parameters

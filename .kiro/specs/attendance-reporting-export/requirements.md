# Requirements Document

## Introduction

This document specifies the requirements for an attendance reporting and export feature for the chairperson role in the Hitsanat KFL Management System. The feature enables the chairperson to view attendance reports after attendance records are completed by the Kuttr sub-department and export these reports with flexible time intervals (daily, weekly, monthly, or custom date ranges).

## Glossary

- **Chairperson**: The leadership role with full access to view and export attendance reports across all children and Kutr levels
- **Attendance_Report**: A summary of attendance data for children, including present, absent, late, and excused statuses
- **Kuttr_Sub_Department**: The sub-department responsible for recording attendance within weekly programs
- **Report_Viewer**: The UI component that displays attendance reports to the chairperson
- **Report_Exporter**: The component that generates downloadable attendance reports in various formats
- **Time_Interval**: The date range for which attendance data is aggregated (daily, weekly, monthly, or custom)
- **Attendance_Record**: A single entry in the day_attendance table representing a child's attendance status for a specific date
- **Export_Format**: The file format for exported reports (CSV, Excel, or PDF)

## Requirements

### Requirement 1: View Attendance Reports

**User Story:** As a chairperson, I want to view attendance reports after records are completed, so that I can monitor attendance patterns and identify issues.

#### Acceptance Criteria

1. WHEN the chairperson navigates to the Reports page, THE Report_Viewer SHALL display attendance data from the day_attendance table
2. THE Report_Viewer SHALL display attendance records for all children across all Kutr levels
3. THE Report_Viewer SHALL show the following data for each attendance record: child name, date, day, status (present/absent/late/excused), and Kutr level
4. THE Report_Viewer SHALL calculate and display summary statistics including total children, present count, absent count, late count, and excused count
5. THE Report_Viewer SHALL calculate and display attendance rate as a percentage (present count / total records * 100)
6. WHEN no attendance records exist, THE Report_Viewer SHALL display an empty state message

### Requirement 2: Filter Reports by Time Interval

**User Story:** As a chairperson, I want to filter attendance reports by different time intervals, so that I can analyze attendance patterns over specific periods.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide a time interval selector with options: Daily, Weekly, Monthly, and Custom
2. WHEN the chairperson selects "Daily", THE Report_Viewer SHALL display attendance records for a single selected date
3. WHEN the chairperson selects "Weekly", THE Report_Viewer SHALL display attendance records for a selected week (7 consecutive days)
4. WHEN the chairperson selects "Monthly", THE Report_Viewer SHALL display attendance records for a selected month
5. WHEN the chairperson selects "Custom", THE Report_Viewer SHALL display date range inputs for start date and end date
6. WHEN a custom date range is selected, THE Report_Viewer SHALL validate that the end date is not before the start date
7. WHEN the time interval is changed, THE Report_Viewer SHALL refresh the displayed attendance data to match the selected interval
8. THE Report_Viewer SHALL display the selected time interval prominently in the report header

### Requirement 3: Filter Reports by Kutr Level

**User Story:** As a chairperson, I want to filter attendance reports by Kutr level, so that I can analyze attendance for specific age groups.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide a Kutr level filter with options: All Levels, Kutr 1, Kutr 2, and Kutr 3
2. WHEN "All Levels" is selected, THE Report_Viewer SHALL display attendance records for children in all Kutr levels
3. WHEN a specific Kutr level is selected, THE Report_Viewer SHALL display attendance records only for children in that Kutr level
4. THE Report_Viewer SHALL update summary statistics to reflect only the filtered Kutr level
5. THE Report_Viewer SHALL display the selected Kutr level filter in the report header

### Requirement 4: Export Reports in Multiple Formats

**User Story:** As a chairperson, I want to export attendance reports in different file formats, so that I can share and analyze data using external tools.

#### Acceptance Criteria

1. THE Report_Exporter SHALL provide export format options: CSV, Excel (XLSX), and PDF
2. WHEN the chairperson clicks the export button and selects CSV, THE Report_Exporter SHALL generate a CSV file containing the filtered attendance data
3. WHEN the chairperson clicks the export button and selects Excel, THE Report_Exporter SHALL generate an XLSX file containing the filtered attendance data with formatted columns
4. WHEN the chairperson clicks the export button and selects PDF, THE Report_Exporter SHALL generate a PDF file containing the filtered attendance data with a formatted table
5. THE Report_Exporter SHALL include the following columns in all export formats: Child Name, Kutr Level, Date, Day, Status
6. THE Report_Exporter SHALL include summary statistics at the end of the exported file: Total Records, Present Count, Absent Count, Late Count, Excused Count, Attendance Rate
7. THE Report_Exporter SHALL include the selected time interval and Kutr level filter in the exported file header
8. THE Report_Exporter SHALL generate a filename that includes the report type, time interval, and current date (e.g., "attendance-report-weekly-2024-01-15.csv")
9. WHEN the export is complete, THE Report_Exporter SHALL trigger a browser download of the generated file

### Requirement 5: Display Attendance Trends

**User Story:** As a chairperson, I want to see attendance trends over time, so that I can identify patterns and make informed decisions.

#### Acceptance Criteria

1. THE Report_Viewer SHALL display a line chart showing attendance rate over time for the selected time interval
2. WHEN the time interval is "Weekly" or "Monthly", THE Report_Viewer SHALL display attendance rate for each day within the interval
3. WHEN the time interval is "Custom" and spans more than 7 days, THE Report_Viewer SHALL display attendance rate aggregated by week
4. THE Report_Viewer SHALL display a bar chart showing the distribution of attendance statuses (present, absent, late, excused)
5. THE Report_Viewer SHALL update all charts when filters are changed

### Requirement 6: Access Control for Reports

**User Story:** As a system administrator, I want to ensure only authorized users can view and export attendance reports, so that sensitive data is protected.

#### Acceptance Criteria

1. THE Report_Viewer SHALL verify that the current user has the chairperson, vice-chairperson, or secretary role
2. WHEN a user without the required role attempts to access the Reports page, THE Report_Viewer SHALL redirect them to their role-appropriate dashboard
3. THE Report_Exporter SHALL verify user authorization before generating export files
4. WHEN an unauthorized user attempts to export a report, THE Report_Exporter SHALL display an error message and prevent the export

### Requirement 7: Performance and Data Loading

**User Story:** As a chairperson, I want reports to load quickly, so that I can efficiently review attendance data.

#### Acceptance Criteria

1. WHEN the Reports page loads, THE Report_Viewer SHALL display a loading indicator while fetching attendance data
2. THE Report_Viewer SHALL fetch attendance data from the Supabase day_attendance table using the appropriate RLS policies
3. WHEN attendance data is successfully loaded, THE Report_Viewer SHALL hide the loading indicator and display the report
4. IF the data fetch fails, THE Report_Viewer SHALL display an error message with a retry option
5. THE Report_Viewer SHALL cache fetched attendance data to avoid redundant database queries when filters are changed
6. WHEN the time interval or Kutr level filter changes, THE Report_Viewer SHALL filter the cached data client-side if possible

### Requirement 8: Report Visualization and Usability

**User Story:** As a chairperson, I want reports to be visually clear and easy to understand, so that I can quickly identify important information.

#### Acceptance Criteria

1. THE Report_Viewer SHALL use color coding for attendance statuses: green for present, red for absent, yellow for late, blue for excused
2. THE Report_Viewer SHALL highlight attendance rates below 70% in red to indicate concern
3. THE Report_Viewer SHALL highlight attendance rates between 70% and 85% in yellow to indicate caution
4. THE Report_Viewer SHALL highlight attendance rates above 85% in green to indicate good performance
5. THE Report_Viewer SHALL display attendance data in a sortable table with columns for child name, Kutr level, date, day, and status
6. THE Report_Viewer SHALL provide pagination when more than 50 attendance records are displayed
7. THE Report_Viewer SHALL display a search input to filter attendance records by child name

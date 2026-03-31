# Sub-Department Leaders Dashboard - Wireframe & Design Specification

## Document Overview
This document provides a detailed wireframe and design specification for the Hitsanat KFL System's Sub-Department Leaders Dashboard.

---

## 1. DASHBOARD HEADER

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Icon]  SUB-DEPARTMENT NAME DASHBOARD                   [Actions Section]   │
│  (TI)   Description text                                                     │
│                                                                              │
│         ┌──────────────────┐  ┌──────────────┐  ┌───┐                      │
│         │ Schedule Program │  │ Export Report│  │ ⋮ │                      │
│         └──────────────────┘  └──────────────┘  └───┘                      │
└───────────────────────────────────────────────��─────────────────────────────┘
```

### Components:
- **Sub-Department Icon Badge**: 64×64px rounded square with department color
- **Title**: H1 text "{Department Name} Dashboard"
- **Description**: Secondary text showing department description
- **Action Buttons** (visible for leaders only):
  - Primary: "Schedule Program" with calendar icon
  - Secondary: "Export Report" with download icon
  - Dropdown: More options menu (Settings, Send Announcement, Add Member)

### Responsive Behavior:
- **Desktop**: Horizontal layout, all buttons visible
- **Tablet**: Horizontal layout, buttons may wrap
- **Mobile**: Vertical stack, full-width buttons

---

## 2. QUICK STATS SECTION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐│
│ │ Total Members   │  │ Active Programs │  │ Avg. Attendance │  │Performance││
│ │                 │  │                 │  │                 │  │   Score   ││
│ │      25         │  │       8         │  │      88%        │  │    92%    ││
│ │  [👥 Icon]      │  │  [📅 Icon]      │  │  [📊 Icon]      │  │ [📈 Icon] ││
│ │  +3 this month  │  │  5 upcoming     │  │ +2% last month  │  │ Excellent ││
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Card Structure:
Each stat card contains:
- **Label**: Small gray text (e.g., "Total Members")
- **Value**: Large bold number (32px)
- **Icon**: 48px circular background with 24px icon
- **Trend Indicator**: Small text with arrow icon showing change

### Color Coding:
- Card 1: Department color accent (left border)
- Card 2: Green accent (#10b981)
- Card 3: Blue accent (#3b82f6)
- Card 4: Purple accent (#8b5cf6)

### Grid Layout:
- Desktop: 4 columns (equal width)
- Tablet: 2 columns
- Mobile: 1 column (stacked)

---

## 3. TABBED CONTENT SECTION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┬─────────┬─────────┬───────────┐                               │
│ │ Overview │ Tasks   │ Members │ Analytics │                               │
│ └──────────┴─────────┴─────────┴───────────┘                               │
│                                                                              │
│ [TAB CONTENT DISPLAYS HERE]                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tab Navigation:
- 4 tabs: Overview, Tasks, Members, Analytics
- Active tab: Highlighted with department color
- Responsive: Full width on mobile, auto-width on desktop

---

## 3.1 OVERVIEW TAB

### A. Leadership Team Section (2/3 width)

```
┌───────────��─────────────────────────────────────────────────────────────────┐
│ Leadership Team                                                              │
│ Current sub-department leaders                                              │
│                                                                              │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐      │
│ │ [Avatar]           │ │ [Avatar]           │ │ [Avatar]           │      │
│ │ Chairperson        │ │ Vice Chair         │ │ Secretary          │      │
│ │ Name Here          │ │ Name Here          │ │ Name Here          │      │
│ │ [Leader Badge]     │ │ [Leader Badge]     │ │ [Leader Badge]     │      │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### B. Quick Actions Section (1/3 width)

```
┌──────────────────────────┐
│ Quick Actions            │
│ Common tasks             │
│                          │
│ [📅] Create Program      │
│ [👤] Add Member          │
│ [📄] Generate Report     │
│ [📤] Send Announcement   │
│ [⚙️] Manage Settings     │
└──────────────────────────┘
```

### C. Performance Metrics Section (Full width)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Performance Metrics                                                          │
│ Key performance indicators for your sub-department                           │
│                                                                              │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐│
│ │Program Success  │  │Member Retention │  │Task Completion  │  │  Budget  ││
│ │Rate             │  │                 │  │                 │  │Utilization││
│ │    94% [↗]      │  │    96% [↗]      │  │    88% [↘]      │  │  75% [↗] ││
│ │ Target: 90%     │  │ Target: 95%     │  │ Target: 90%     │  │Target: 80│
│ │ [Progress Bar]  │  │ [Progress Bar]  │  │ [Progress Bar]  │  │[Progress]││
│ │ Above target    │  │ Above target    │  │ Below target    │  │Above tgt ││
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### D. Charts Section (2 columns)

```
┌─────────────────────────────────────────┐ ┌───────────────────────────────┐
│ Activity Overview                       │ │ Member Engagement             │
│ Weekly programs and attendance          │ ��� Distribution by activity level│
│                                         │ │                               │
│     [BAR CHART]                         │ │     [PIE CHART]               │
│     - Programs (department color)       │ │     - Highly Active (green)   │
│     - Attendance (green)                │ │     - Active (blue)           │
│     X-axis: Weeks 1-5                   │ │     - Moderate (yellow)       │
│     Y-axis: Count/Percentage            │ │     - Low (red)               │
│                                         │ │                               │
└─────────────────────────────────────────┘ └───────────────────────────────┘
```

### E. Recent Activity Section (Full width)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Recent Activity                                          [View All Button]   │
│ Latest updates and events                                                    │
│                                                                              │
│ [Scrollable Area - 300px height]                                            │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ [✓] Sunday Program completed successfully                2 hours ago  │   │
│ │ [👤] New member joined: Elias Tadesse                    5 hours ago  │   │
│ │ [📄] Task assigned to Michael Bekele                     1 day ago    │   │
│ │ [⚠️] Low attendance alert for Saturday program           2 days ago   │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3.2 TASKS TAB

### A. Task Stats (3 columns)

```
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────��───────┐
│ Pending Tasks         │ │ In Progress           │ │ Completed             │
│                       │ │                       │ │                       │
│       8               │ │       5               │ │      24               │
│   [⏰ Icon]           │ │   [📊 Icon]           │ │   [✓ Icon]            │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

### B. Task List Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Upcoming Tasks                              [Filter] [+ Add Task]            │
│ Tasks requiring attention                                                    │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Prepare Sunday Program   [HIGH]   [IN-PROGRESS]               [⋮]   │   │
│ │ 📅 2026-04-02  |  👤 Sara Wolde                                      │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Review Member Applications   [MEDIUM]   [PENDING]             [⋮]   │   │
│ │ 📅 2026-04-05  |  👤 Dawit Mengistu                                  │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ [Additional task items...]                                                   │
└────────────────────────────────────────────────────���────────────────────────┘
```

### Task Card Structure:
- **Title**: Bold task name
- **Priority Badge**: HIGH (red), MEDIUM (yellow), LOW (green)
- **Status Badge**: IN-PROGRESS (blue), PENDING (gray), COMPLETED (green)
- **Date**: Calendar icon + due date
- **Assignee**: User icon + name
- **Actions Menu**: Three dots for Edit, Reassign, Mark Complete, Delete

---

## 3.3 MEMBERS TAB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sub-Department Members                      [Filter] [+ Add Member]          │
│ All members in {Department Name}                                             │
│                                                                              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐            │
│ │ [Avatar]         │ │ [Avatar]         │ │ [Avatar]         │            │
│ │ Member Name      │ │ Member Name      │ │ Member Name      │            │
│ │ Year 2           │ │ Year 3           │ │ Year 1           │            │
│ │ [Active] [2 fam] │ │ [Active] [3 fam] │ │ [Active] [1 fam] │      [⋮]  │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘            │
│                                                                              │
│ [Grid continues with 3 columns on desktop, 2 on tablet, 1 on mobile]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Member Card Structure:
- **Avatar**: Circular with initials, department color background
- **Name**: Bold text
- **Year**: Secondary text showing year of study
- **Badges**: 
  - Active status badge (secondary style)
  - Family count badge (outlined)
- **Actions Menu**: Three dots (visible on hover)

---

## 3.4 ANALYTICS TAB

### A. Attendance Trends Chart (Full width)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Attendance Trends                                                            │
│ 5-week attendance overview                                                   │
│                                                                              │
│     [LINE CHART - 350px height]                                             │
│     - Attendance Line (department color)                                     │
│     - Engagement Line (green)                                               │
│     X-axis: Week 1, Week 2, Week 3, Week 4, Week 5                          │
│     Y-axis: Percentage (0-100)                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### B. Two-Column Analytics Section

#### Left Column: Top Performers

```
┌───────────────────────────────────────┐
│ Top Performers                        │
│ Members with highest engagement       │
│                                       │
│ [1] [Avatar] Member Name              │
│     Engagement: 95%          [🏆]     │
│                                       │
│ [2] [Avatar] Member Name              │
│     Engagement: 92%          [🏆]     │
│                                       │
│ [3] [Avatar] Member Name              │
│     Engagement: 89%          [🏆]     │
│                                       │
│ [4] [Avatar] Member Name              │
│     Engagement: 86%                   │
│                                       │
│ [5] [Avatar] Member Name              │
│     Engagement: 83%                   │
└───────────────────────────────────────┘
```

#### Right Column: Program Statistics

```
┌───────────────────────────────────────┐
│ Program Statistics                    │
│ Last 30 days overview                 │
│                                       │
│ Saturday Programs         12/13       │
│ [Progress Bar: 92%]                   │
│ 92% completion rate                   │
│                                       │
│ Sunday Programs           13/13       │
│ [Progress Bar: 100%]                  │
│ 100% completion rate                  │
│                                       │
│ Special Events            3/4         │
│ [Progress Bar: 75%]                   │
│ 75% completion rate                   │
│                                       │
│ Member Activities         8/10        │
│ [Progress Bar: 80%]                   │
│ 80% completion rate                   │
└───────────────────────────────────────┘
```

---

## 4. DESIGN SPECIFICATIONS

### Color Palette

#### Primary Colors (Department-Specific):
- **Timhert**: `#3b82f6` (Blue)
- **Mezmur**: `#8b5cf6` (Purple)
- **Kinetibeb**: `#ec4899` (Pink)
- **Kuttr**: `#f59e0b` (Orange)
- **Ekd**: `#10b981` (Green)

#### Semantic Colors:
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Orange/Yellow)
- **Error**: `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

#### Neutral Colors:
- **Gray 900**: `#111827` (Primary text)
- **Gray 600**: `#4b5563` (Secondary text)
- **Gray 200**: `#e5e7eb` (Borders)
- **Gray 50**: `#f9fafb` (Background hover)

### Typography

#### Font Family:
- System font stack (defined in theme.css)

#### Font Sizes:
- **H1 (Page Title)**: 30px / 1.875rem
- **H2 (Card Title)**: 20px / 1.25rem
- **H3 (Section Title)**: 18px / 1.125rem
- **Body**: 14px / 0.875rem
- **Small**: 12px / 0.75rem
- **Stats Number**: 30px / 1.875rem

#### Font Weights:
- **Bold**: 700 (Titles, stats)
- **Medium**: 500 (Labels, card titles)
- **Regular**: 400 (Body text)

### Spacing

#### Component Spacing:
- **Section Gap**: 24px (1.5rem)
- **Card Padding**: 24px (1.5rem)
- **Card Gap**: 16px (1rem)
- **Element Gap**: 8px (0.5rem)

#### Grid System:
- **Desktop**: 12-column grid
- **Tablet**: 8-column grid
- **Mobile**: 4-column grid
- **Gutter**: 16px

### Border Radius

- **Cards**: 8px (0.5rem)
- **Buttons**: 6px (0.375rem)
- **Avatars**: 50% (circular)
- **Badges**: 4px (0.25rem)
- **Department Icon**: 16px (1rem)

### Shadows

- **Card**: `0 1px 3px rgba(0, 0, 0, 0.1)`
- **Card Hover**: `0 4px 6px rgba(0, 0, 0, 0.1)`
- **Dropdown**: `0 10px 15px rgba(0, 0, 0, 0.1)`

---

## 5. RESPONSIVE BREAKPOINTS

### Desktop (≥1024px):
- 4-column stat cards
- 2-column charts
- 3-column member grid
- Full sidebar navigation

### Tablet (768px - 1023px):
- 2-column stat cards
- 2-column charts
- 2-column member grid
- Collapsible sidebar

### Mobile (<768px):
- 1-column layout (stacked)
- Full-width cards
- Stacked charts
- Single-column member list
- Hamburger menu navigation

---

## 6. INTERACTIVE ELEMENTS

### Buttons

#### Primary Button:
```
┌────────────────────────┐
│  [Icon] Button Text    │
└────────────────────────┘
```
- Background: Department color
- Text: White
- Height: 36px
- Padding: 8px 16px
- Hover: 90% opacity

#### Secondary Button (Outline):
```
┌────────────────────────┐
│  [Icon] Button Text    │
└────────────────────────┘
```
- Border: 1px solid gray
- Text: Gray
- Background: Transparent
- Hover: Light gray background

### Badges

#### Status Badge:
```
┌─────────┐
│ ACTIVE  │
└─────────┘
```
- Small text (12px)
- Colored background (20% opacity)
- Colored text (full opacity)
- Padding: 2px 8px

### Dropdown Menu:
```
┌──────────────────────┐
│ [⚙️] Settings        │
│ [📤] Send Announce   │
│ [👤] Add Member      │
└──────────────────────┘
```
- White background
- Shadow: Medium
- Item hover: Light gray
- Icon + text layout

---

## 7. DATA VISUALIZATION

### Bar Chart Specifications:
- **Height**: 300px
- **Bar Width**: Auto-calculated
- **Bar Radius**: Top corners rounded (8px)
- **Grid**: Dashed lines (#f0f0f0)
- **Axis Labels**: Gray text (12px)
- **Tooltip**: White card with shadow

### Line Chart Specifications:
- **Height**: 300-350px
- **Line Width**: 3px
- **Dot Size**: 6px radius
- **Grid**: Dashed lines (#f0f0f0)
- **Smooth Curve**: Monotone
- **Legend**: Bottom position

### Pie Chart Specifications:
- **Size**: 200px diameter
- **Label**: Outside with percentage
- **Colors**: Semantic (green, blue, yellow, red)
- **Hover**: Slight scale effect

### Progress Bar Specifications:
- **Height**: 8px
- **Background**: Gray (#e5e7eb)
- **Fill**: Department color or semantic color
- **Border Radius**: 4px
- **Animation**: Smooth fill on load

---

## 8. COMPONENT HIERARCHY

```
SubDepartmentDashboard
├── Header Section
│   ├── Department Badge
│   ├── Title & Description
│   └── Action Buttons (conditional)
│
├── Quick Stats Grid
│   ├── Total Members Card
│   ├── Active Programs Card
│   ├── Avg Attendance Card
│   └── Performance Score Card
│
├── Tabbed Content
│   ├── Tab Navigation
│   │   ├── Overview Tab
│   │   ├── Tasks Tab
│   │   ├── Members Tab
│   │   └── Analytics Tab
│   │
│   └── Tab Panels
│       │
│       ├── Overview Panel
│       │   ├── Leadership Team Card
│       │   ├── Quick Actions Card
│       │   ├── Performance Metrics Card
│       │   ├── Charts Grid
│       │   │   ├── Activity Overview (Bar Chart)
│       │   │   └─�� Member Engagement (Pie Chart)
│       │   └── Recent Activity Card (Scrollable)
│       │
│       ├── Tasks Panel
│       │   ├── Task Stats Grid
│       │   └── Task List Card
│       │       └── Task Items (with actions)
│       │
│       ├── Members Panel
│       │   └── Members Grid Card
│       │       └── Member Cards (with hover actions)
│       │
│       └── Analytics Panel
│           ├── Attendance Trends Card (Line Chart)
│           └── Analytics Grid
│               ├── Top Performers Card
│               └── Program Statistics Card
```

---

## 9. USER INTERACTIONS

### Hover States:
- **Cards**: Subtle shadow increase
- **Buttons**: Opacity/background change
- **Member Cards**: Show action menu
- **Chart Elements**: Display tooltip

### Click Actions:
- **Schedule Program**: Opens program creation modal
- **Export Report**: Downloads report file
- **More Menu**: Opens dropdown with options
- **Task Actions**: Edit, Reassign, Complete, Delete
- **Member Actions**: View profile, Edit, Remove
- **Tab Navigation**: Switches active tab content

### Loading States:
- **Charts**: Skeleton loader or spinner
- **Data Tables**: Shimmer effect
- **Actions**: Button disabled state with spinner

---

## 10. ACCESSIBILITY FEATURES

### ARIA Labels:
- All interactive elements have descriptive labels
- Icons include screen reader text
- Form inputs properly labeled

### Keyboard Navigation:
- Tab order follows visual hierarchy
- All actions accessible via keyboard
- Focus indicators visible
- Dropdown menus keyboard navigable

### Color Contrast:
- Text meets WCAG AA standards
- Icons have sufficient contrast
- Focus states clearly visible

### Screen Reader Support:
- Semantic HTML structure
- Descriptive alt text for charts
- Status updates announced
- Error messages readable

---

## 11. MOBILE OPTIMIZATIONS

### Touch Targets:
- Minimum size: 44×44px
- Adequate spacing between elements
- Larger tap areas for critical actions

### Mobile Navigation:
- Hamburger menu for main navigation
- Bottom navigation for quick access
- Swipe gestures for tabs
- Pull-to-refresh on lists

### Performance:
- Lazy loading for images
- Virtual scrolling for long lists
- Optimized chart rendering
- Compressed data payloads

---

## 12. IMPLEMENTATION NOTES

### Technology Stack:
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts library
- **Icons**: Lucide React
- **UI Components**: Custom shadcn/ui components
- **Routing**: React Router v7 (Data mode)

### Key Files:
- `/src/app/pages/SubDepartmentDashboard.tsx` - Main component
- `/src/app/data/mockData.ts` - Mock data source
- `/src/app/components/ui/*` - Reusable UI components
- `/src/styles/theme.css` - Design tokens

### State Management:
- React hooks (useState, useEffect)
- URL parameters for sub-department ID
- Local component state for tab navigation
- Mock data filters and computations

---

## 13. FUTURE ENHANCEMENTS

### Potential Features:
1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Filtering**: Multi-criteria filtering for members and tasks
3. **Export Options**: PDF, Excel, CSV export formats
4. **Notifications**: Real-time alerts and reminders
5. **Mobile App**: Native mobile application
6. **Offline Mode**: Progressive Web App with offline support
7. **Custom Dashboards**: User-configurable dashboard layouts
8. **Advanced Analytics**: Predictive analytics and insights
9. **Integration**: Calendar, email, and communication tools
10. **Automation**: Automated task assignments and reminders

---

## DOCUMENT VERSION

- **Version**: 1.0
- **Date**: March 31, 2026
- **Author**: Hitsanat KFL System Team
- **Last Updated**: March 31, 2026

---

## NOTES

This wireframe document serves as a comprehensive guide for:
- **Developers**: Implementation reference
- **Designers**: Visual design baseline
- **Stakeholders**: Feature understanding
- **QA Team**: Testing requirements
- **Documentation**: System architecture

For questions or clarifications, please refer to the live implementation or contact the development team.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import * as fc from 'fast-check';

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Line: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

import ChairpersonDashboard from '../ChairpersonDashboard';
import { ScheduleProvider } from '../../context/ScheduleStore';
import { DataStoreProvider } from '../../context/DataStore';

const EXPECTED_DISPLAY_NAMES = [
  'Timhert Academic',
  'Tmezmur',
  'Kinetibeb',
  'Kuttr',
  'EKD',
];

// Feature: dashboard-role-separation, Property 4: Chairperson dashboard shows aggregate stats and activity
describe('Property 4: Chairperson dashboard renders core sections', () => {
  it('renders the dashboard overview heading', () => {
    // Sub-department navigation cards have been removed per product decision.
    // This test verifies the dashboard still renders its core content.
    const { unmount } = render(
      <DataStoreProvider>
        <ScheduleProvider>
          <MemoryRouter>
            <ChairpersonDashboard />
          </MemoryRouter>
        </ScheduleProvider>
      </DataStoreProvider>
    );

    fc.assert(
      fc.property(
        fc.constant('Command Center'),
        (heading) => {
          const el = screen.queryAllByText(heading);
          expect(el.length, `Expected "${heading}" heading`).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );

    unmount();
  }, 15000);
});

// Feature: dashboard-role-separation, Property 5: Chairperson dashboard shows all aggregate stats
describe('Property 5: Chairperson dashboard shows all aggregate stats', () => {
  it('renders all four aggregate stat cards with non-empty values', () => {
    // Validates: Requirements 2.1, 2.2, 2.6
    // Render once — data is static; property holds across all valid inputs
    const { unmount } = render(
      <DataStoreProvider>
        <ScheduleProvider>
          <MemoryRouter>
            <ChairpersonDashboard />
          </MemoryRouter>
        </ScheduleProvider>
      </DataStoreProvider>
    );

    const statLabels = [
      'Total Children',
      'Active Members',
      'Attendance Rate',
      'Program Slots',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...statLabels),
        (label) => {
          // Use getAllByText to handle cases where the label appears multiple times
          const elements = screen.getAllByText(label);
          // The stat card label uses class "text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1"
          const statLabelEl = elements.find(el => el.classList.contains('text-muted-foreground'));
          expect(statLabelEl, `Expected stat card label "${label}" to be present`).toBeTruthy();

          // The numeric value is a sibling p.text-3xl inside the same card content
          const cardContent = statLabelEl?.closest('[data-slot="card-content"]');
          expect(cardContent, `Expected card content for "${label}"`).toBeTruthy();
          const valueEl = cardContent?.querySelector('p.text-3xl');
          expect(valueEl, `Expected numeric value element for "${label}"`).toBeTruthy();
          const value = valueEl?.textContent?.trim();
          expect(value, `Expected non-empty value for "${label}"`).toBeTruthy();
          // For "Attendance Rate", value will be like "85%", so we need to handle that
          const numericValue = label === 'Attendance Rate' ? parseInt(value || '0') : Number(value);
          expect(numericValue).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );

    unmount();
  });
});

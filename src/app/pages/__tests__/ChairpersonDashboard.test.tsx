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

const EXPECTED_DISPLAY_NAMES = [
  'Timhert Academic',
  'Tmezmur',
  'Kinetibeb',
  'Kuttr',
  'EKD',
];

// Feature: dashboard-role-separation, Property 4: Chairperson dashboard contains all sub-department links
describe('Property 4: Chairperson dashboard contains all sub-department links', () => {
  it('renders navigation links for all five sub-departments', () => {
    // Validates: Requirements 2.5
    // Render once — data is static; property holds across all valid inputs
    const { unmount } = render(
      <ScheduleProvider>
        <MemoryRouter>
          <ChairpersonDashboard />
        </MemoryRouter>
      </ScheduleProvider>
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_DISPLAY_NAMES),
        (displayName) => {
          const links = screen.getAllByRole('link');
          const matchingLink = links.find(link =>
            link.textContent?.includes(displayName)
          );
          expect(matchingLink, `Expected link for "${displayName}" to be present`).toBeTruthy();
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
      <ScheduleProvider>
        <MemoryRouter>
          <ChairpersonDashboard />
        </MemoryRouter>
      </ScheduleProvider>
    );

    const statLabels = [
      'Total Children',
      'Total Members',
      'Weekly Programs',
      'Upcoming Events',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...statLabels),
        (label) => {
          // Use getAllByText to handle cases where the label appears multiple times
          const elements = screen.getAllByText(label);
          // The stat card label uses class "text-sm text-gray-600 mb-1"
          const statLabelEl = elements.find(el => el.classList.contains('text-gray-600'));
          expect(statLabelEl, `Expected stat card label "${label}" to be present`).toBeTruthy();

          // The numeric value is a sibling p.text-3xl inside the same card content
          const cardContent = statLabelEl?.closest('[data-slot="card-content"]');
          expect(cardContent, `Expected card content for "${label}"`).toBeTruthy();
          const valueEl = cardContent?.querySelector('p.text-3xl');
          expect(valueEl, `Expected numeric value element for "${label}"`).toBeTruthy();
          const value = valueEl?.textContent?.trim();
          expect(value, `Expected non-empty value for "${label}"`).toBeTruthy();
          expect(Number(value)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );

    unmount();
  });
});

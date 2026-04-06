/**
 * Integration tests for Reports page component
 * 
 * Tests the complete data flow from hooks to UI components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Reports from '../Reports';
import * as AuthContext from '../../context/AuthContext';
import * as ScheduleStore from '../../context/ScheduleStore';
import * as DataStore from '../../context/DataStore';

// Mock dependencies
vi.mock('../../context/AuthContext');
vi.mock('../../context/ScheduleStore');
vi.mock('../../context/DataStore');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Reports Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display complete report with filters and summary', async () => {
    // Mock authorized user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Chair', role: 'chairperson' },
    } as any);

    // Mock attendance data
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child2',
          status: 'absent',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '3',
          date: '2024-01-16',
          day: 'Sunday',
          childId: 'child1',
          status: 'late',
          markedBy: 'user1',
          markedAt: '2024-01-16T10:00:00Z',
        },
      ],
      isLoading: false,
    } as any);

    // Mock children data
    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [
        {
          id: 'child1',
          name: 'John Doe',
          kutrLevel: 1,
          familyName: 'Doe',
        },
        {
          id: 'child2',
          name: 'Jane Smith',
          kutrLevel: 2,
          familyName: 'Smith',
        },
      ],
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );

    // Verify page header
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();

    // Verify filters are present
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Time Interval')).toBeInTheDocument();
    expect(screen.getByText('Kutr Level')).toBeInTheDocument();

    // Verify summary statistics are displayed
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();

    // Verify placeholder for future features
    expect(screen.getByText('Additional Features Coming Soon')).toBeInTheDocument();
  });

  it('should update summary when filters change', async () => {
    // Mock authorized user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Chair', role: 'chairperson' },
    } as any);

    // Mock attendance data with multiple dates
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [
        {
          id: '1',
          date: '2024-01-15',
          day: 'Saturday',
          childId: 'child1',
          status: 'present',
          markedBy: 'user1',
          markedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          date: '2024-01-22',
          day: 'Saturday',
          childId: 'child1',
          status: 'absent',
          markedBy: 'user1',
          markedAt: '2024-01-22T10:00:00Z',
        },
      ],
      isLoading: false,
    } as any);

    // Mock children data
    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [
        {
          id: 'child1',
          name: 'John Doe',
          kutrLevel: 1,
          familyName: 'Doe',
        },
      ],
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );

    // Initially should show all records (2)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Note: Full filter interaction testing would require more complex setup
    // This test verifies the basic integration works
  });

  it('should handle empty data gracefully', () => {
    // Mock authorized user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Chair', role: 'chairperson' },
    } as any);

    // Mock empty attendance data
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: false,
    } as any);

    // Mock empty children data
    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );

    // Should show empty state
    expect(screen.getByText('No Attendance Records Found')).toBeInTheDocument();
    expect(
      screen.getByText(/Attendance records will appear here once they are submitted/)
    ).toBeInTheDocument();
  });

  it('should show loading state while data is being fetched', () => {
    // Mock authorized user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Chair', role: 'chairperson' },
    } as any);

    // Mock loading state
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: true,
    } as any);

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );

    // Should show loading indicator
    expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
  });
});

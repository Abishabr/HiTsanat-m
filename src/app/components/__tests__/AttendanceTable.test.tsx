import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AttendanceTable } from '../AttendanceTable';
import { AttendanceRecord } from '../../lib/reportTypes';

/**
 * Unit tests for AttendanceTable search functionality
 *
 * Tests client-side filtering by child name with debounced search input.
 *
 * **Validates: Requirements 8.7**
 */

const makeRecord = (id: string, childName: string): AttendanceRecord => ({
  id,
  childId: id,
  childName,
  childKutrLevel: 1,
  familyName: 'Family',
  date: '2024-01-15',
  day: 'Monday',
  status: 'present',
  scheduleId: 'sched-1',
  programId: 'prog-1',
});

const records: AttendanceRecord[] = [
  makeRecord('1', 'Alice Smith'),
  makeRecord('2', 'Bob Jones'),
  makeRecord('3', 'Charlie Brown'),
];

describe('AttendanceTable – search functionality', () => {
  it('renders all records when search query is empty', () => {
    render(<AttendanceTable records={records} searchQuery="" onSearchChange={() => {}} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('filters records by child name after debounce delay', async () => {
    vi.useFakeTimers();
    render(<AttendanceTable records={records} searchQuery="alice" onSearchChange={() => {}} />);

    // Before debounce fires, all records still visible
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();

    // Advance timers past 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('is case-insensitive when filtering', async () => {
    vi.useFakeTimers();
    render(<AttendanceTable records={records} searchQuery="ALICE" onSearchChange={() => {}} />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows empty state when no records match the search', async () => {
    vi.useFakeTimers();
    render(<AttendanceTable records={records} searchQuery="xyz" onSearchChange={() => {}} />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('No attendance records found.')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('calls onSearchChange when the input value changes', () => {
    const onSearchChange = vi.fn();
    render(<AttendanceTable records={records} searchQuery="" onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText('Search by child name...');
    fireEvent.change(input, { target: { value: 'Bob' } });

    expect(onSearchChange).toHaveBeenCalledWith('Bob');
  });

  it('renders the search input with correct aria-label', () => {
    render(<AttendanceTable records={records} searchQuery="" onSearchChange={() => {}} />);
    expect(
      screen.getByRole('textbox', { name: /search attendance records by child name/i })
    ).toBeInTheDocument();
  });

  it('does not apply updated filter until 300ms after the prop changes', async () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AttendanceTable records={records} searchQuery="" onSearchChange={() => {}} />
    );

    // All records visible with empty query
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Update the prop to "alice" — debounce timer starts
    rerender(<AttendanceTable records={records} searchQuery="alice" onSearchChange={() => {}} />);

    // Advance only 200ms — debounce not yet fired, all records still visible
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Advance past 300ms — debounce fires, filter applied
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

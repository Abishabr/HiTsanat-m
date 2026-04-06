import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AttendanceTable } from '../AttendanceTable';
import { AttendanceRecord } from '../../lib/reportTypes';

/**
 * Unit tests for AttendanceTable search and sort functionality
 *
 * Tests client-side filtering by child name with debounced search input,
 * and column sorting by child name, date, status, and Kutr level.
 *
 * **Validates: Requirements 8.7, 8.5**
 */

const makeRecord = (
  id: string,
  childName: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
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
  ...overrides,
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

describe('AttendanceTable – sorting functionality', () => {
  const sortRecords: AttendanceRecord[] = [
    makeRecord('1', 'Charlie Brown', { date: '2024-01-20', status: 'absent', childKutrLevel: 3 }),
    makeRecord('2', 'Alice Smith', { date: '2024-01-10', status: 'present', childKutrLevel: 1 }),
    makeRecord('3', 'Bob Jones', { date: '2024-01-15', status: 'late', childKutrLevel: 2 }),
  ];

  it('sorts by child name ascending on first click', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /child name/i }));

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['Alice Smith', 'Bob Jones', 'Charlie Brown'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('Alice Smith');
    expect(cells[1].textContent).toBe('Bob Jones');
    expect(cells[2].textContent).toBe('Charlie Brown');
  });

  it('toggles to descending on second click of same column', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    const header = screen.getByRole('columnheader', { name: /child name/i });
    fireEvent.click(header);
    fireEvent.click(header);

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['Alice Smith', 'Bob Jones', 'Charlie Brown'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('Charlie Brown');
    expect(cells[1].textContent).toBe('Bob Jones');
    expect(cells[2].textContent).toBe('Alice Smith');
  });

  it('sorts by date ascending', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /^date/i }));

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['2024-01-10', '2024-01-15', '2024-01-20'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('2024-01-10');
    expect(cells[1].textContent).toBe('2024-01-15');
    expect(cells[2].textContent).toBe('2024-01-20');
  });

  it('sorts by status ascending (alphabetical)', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /^status/i }));

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['absent', 'late', 'present'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('absent');
    expect(cells[1].textContent).toBe('late');
    expect(cells[2].textContent).toBe('present');
  });

  it('sorts by Kutr level ascending', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /kutr level/i }));

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['Kutr 1', 'Kutr 2', 'Kutr 3'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('Kutr 1');
    expect(cells[1].textContent).toBe('Kutr 2');
    expect(cells[2].textContent).toBe('Kutr 3');
  });

  it('shows ↑ indicator on active ascending sort column', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /child name/i }));

    const header = screen.getByRole('columnheader', { name: /child name/i });
    expect(header.textContent).toContain('↑');
  });

  it('shows ↓ indicator on active descending sort column', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    const header = screen.getByRole('columnheader', { name: /child name/i });
    fireEvent.click(header);
    fireEvent.click(header);

    expect(header.textContent).toContain('↓');
  });

  it('sets aria-sort attribute correctly on sorted column', () => {
    render(<AttendanceTable records={sortRecords} searchQuery="" onSearchChange={() => {}} />);

    const header = screen.getByRole('columnheader', { name: /child name/i });
    expect(header).toHaveAttribute('aria-sort', 'none');

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('applies sorting after search filter', async () => {
    vi.useFakeTimers();
    const mixedRecords: AttendanceRecord[] = [
      makeRecord('1', 'Alice Smith', { date: '2024-01-20' }),
      makeRecord('2', 'Alice Brown', { date: '2024-01-10' }),
      makeRecord('3', 'Bob Jones', { date: '2024-01-15' }),
    ];

    render(
      <AttendanceTable records={mixedRecords} searchQuery="alice" onSearchChange={() => {}} />
    );

    await act(async () => { vi.advanceTimersByTime(300); });

    fireEvent.click(screen.getByRole('columnheader', { name: /^date/i }));

    const cells = screen.getAllByRole('cell').filter((c) =>
      ['2024-01-10', '2024-01-20'].includes(c.textContent ?? '')
    );
    expect(cells[0].textContent).toBe('2024-01-10');
    expect(cells[1].textContent).toBe('2024-01-20');
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

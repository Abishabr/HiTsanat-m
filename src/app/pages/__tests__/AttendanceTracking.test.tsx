import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceTracking from '../AttendanceTracking';

describe('AttendanceTracking', () => {
  it('renders ComingSoon component with correct title', () => {
    render(<AttendanceTracking />);
    const titleElement = screen.getByText('Attendance Tracking');
    expect(titleElement).toBeTruthy();
  });

  it('renders ComingSoon component with correct description', () => {
    render(<AttendanceTracking />);
    const descriptionElement = screen.getByText('Attendance is recorded within weekly programs by the Kuttr sub-department.');
    expect(descriptionElement).toBeTruthy();
  });

  it('displays under development badge', () => {
    render(<AttendanceTracking />);
    const badgeElement = screen.getByText('Under Development');
    expect(badgeElement).toBeTruthy();
  });
});

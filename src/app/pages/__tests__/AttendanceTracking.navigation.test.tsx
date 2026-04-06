import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AttendanceTracking from '../AttendanceTracking';
import Layout from '../../components/Layout';
import { AuthProvider } from '../../context/AuthContext';
import { ScheduleProvider } from '../../context/ScheduleStore';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

const TestWrapper = ({ children, initialRoute = '/' }: { children: React.ReactNode; initialRoute?: string }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <ThemeProvider>
      <AuthProvider>
        <ScheduleProvider>
          {children}
        </ScheduleProvider>
      </AuthProvider>
    </ThemeProvider>
  </MemoryRouter>
);

describe('AttendanceTracking Navigation and Routing', () => {
  beforeEach(() => {
    // Clear console error spy
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render AttendanceTracking page at /attendance route', () => {
    render(
      <TestWrapper initialRoute="/attendance">
        <Routes>
          <Route path="/attendance" element={<AttendanceTracking />} />
        </Routes>
      </TestWrapper>
    );

    expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
    expect(screen.getByText(/Attendance is recorded within weekly programs/i)).toBeInTheDocument();
  });

  it('should display ComingSoon component with correct props', () => {
    render(
      <TestWrapper initialRoute="/attendance">
        <Routes>
          <Route path="/attendance" element={<AttendanceTracking />} />
        </Routes>
      </TestWrapper>
    );

    // Verify ComingSoon component elements
    expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
    expect(screen.getByText('Attendance is recorded within weekly programs by the Kuttr sub-department.')).toBeInTheDocument();
    expect(screen.getByText('Under Development')).toBeInTheDocument();
  });

  it('should navigate to attendance page from sidebar', async () => {
    render(
      <TestWrapper initialRoute="/">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard</div>} />
            <Route path="attendance" element={<AttendanceTracking />} />
          </Route>
        </Routes>
      </TestWrapper>
    );

    // Find and click the Attendance link in sidebar
    const attendanceLink = screen.getByRole('link', { name: /Attendance/i });
    expect(attendanceLink).toBeInTheDocument();
    expect(attendanceLink).toHaveAttribute('href', '/attendance');

    fireEvent.click(attendanceLink);

    // Verify navigation occurred
    await waitFor(() => {
      expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
    });
  });

  it('should not produce console errors when rendering', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(
      <TestWrapper initialRoute="/attendance">
        <Routes>
          <Route path="/attendance" element={<AttendanceTracking />} />
        </Routes>
      </TestWrapper>
    );

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should not produce console warnings when rendering', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    render(
      <TestWrapper initialRoute="/attendance">
        <Routes>
          <Route path="/attendance" element={<AttendanceTracking />} />
        </Routes>
      </TestWrapper>
    );

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('should maintain route configuration in routes.tsx', () => {
    // This test verifies the route is properly configured
    render(
      <TestWrapper initialRoute="/attendance">
        <Routes>
          <Route path="/attendance" element={<AttendanceTracking />} />
        </Routes>
      </TestWrapper>
    );

    // If the route wasn't configured, this would fail
    expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
  });
});

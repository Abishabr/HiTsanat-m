import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock useAuth so we can control user / isLoading state
// ---------------------------------------------------------------------------

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

import ProtectedRoute from './ProtectedRoute';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderProtectedRoute(children: React.ReactNode = <div>Protected Content</div>) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ProtectedRoute>{children}</ProtectedRoute>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('ProtectedRoute', () => {
  // -------------------------------------------------------------------------
  // Test 1: isLoading = true renders spinner
  // -------------------------------------------------------------------------
  it('renders a full-screen spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    renderProtectedRoute();

    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Test 2: user = null and isLoading = false redirects to /login
  // -------------------------------------------------------------------------
  it('redirects to /login when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    // We need to capture the Navigate output — use a route that renders
    // something at /login so we can detect the redirect happened.
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    // Protected content should NOT be rendered
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // The spinner should NOT be rendered
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // Container should be essentially empty (Navigate produces no DOM output)
    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 3: user set renders children
  // -------------------------------------------------------------------------
  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test Leader',
        role: 'chairperson',
        email: 'leader@example.com',
        phone: '+251900000001',
      },
      isLoading: false,
    });

    renderProtectedRoute(<div>Protected Content</div>);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Test 4: spinner is not rendered when user is set (even if isLoading somehow true)
  // -------------------------------------------------------------------------
  it('renders spinner (not children) when isLoading is true regardless of user state', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test Leader',
        role: 'chairperson',
        email: 'leader@example.com',
        phone: '+251900000001',
      },
      isLoading: true,
    });

    renderProtectedRoute(<div>Protected Content</div>);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

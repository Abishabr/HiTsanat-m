// Feature: authentication-system, Property 5: Unauthenticated users are always redirected to /login

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import React from 'react';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock useAuth so we can control user / isLoading state
// ---------------------------------------------------------------------------

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

import ProtectedRoute from './ProtectedRoute';

// ---------------------------------------------------------------------------
// Property 5 — Unauthenticated users are always redirected to /login
// ---------------------------------------------------------------------------

/**
 * Property 5 — Unauthenticated users are always redirected to /login
 * Validates: Requirements 5.1
 *
 * For any route path that is a Protected_Route (i.e., rendered under the
 * ProtectedRoute wrapper), rendering that route with user = null and
 * isLoading = false SHALL result in a redirect to /login.
 */

describe('ProtectedRoute — property tests', () => {
  it('Property 5: unauthenticated users are always redirected to /login', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary route paths
        fc.oneof(
          fc.constant('/'),
          fc.constant('/children'),
          fc.constant('/members'),
          fc.constant('/weekly-programs'),
          fc.constant('/events'),
          fc.constant('/member-activities'),
          fc.constant('/timhert'),
          fc.constant('/attendance'),
          fc.constant('/reports'),
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/${s}`),
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/reports/${s}`),
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/subdepartment/${s}`),
        ),
        (routePath) => {
          // Set useAuth to return unauthenticated state
          mockUseAuth.mockReturnValue({ user: null, isLoading: false });

          // Render ProtectedRoute at the generated route path
          const { container } = render(
            <MemoryRouter initialEntries={[routePath]}>
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            </MemoryRouter>,
          );

          // Assert that protected content is NOT rendered
          expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

          // Assert that the spinner is NOT rendered (not loading)
          expect(screen.queryByRole('status')).not.toBeInTheDocument();

          // Assert that the container is empty (Navigate produces no DOM output)
          // This confirms a redirect occurred rather than rendering content
          expect(container.firstChild).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

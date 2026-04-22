import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute wraps any route that requires an authenticated user.
 *
 * Rendering logic (Requirements 5.1, 5.4):
 * 1. isLoading === true  → render full-screen spinner (session restore in progress)
 * 2. user === null       → redirect to /login
 * 3. Otherwise           → render children
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-background"
        role="status"
        aria-label="Loading"
      >
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Hoist mock variables so they are available inside vi.mock factory
// (vi.mock is hoisted to the top of the file by Vitest)
// ---------------------------------------------------------------------------

const {
  mockSignInWithPassword,
  mockSignOut,
  mockRpc,
  mockFrom,
  mockUnsubscribe,
  getCapturedCallback,
  setCapturedCallback,
} = vi.hoisted(() => {
  let _capturedCallback: ((event: string, session: unknown) => void) | null = null;

  return {
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockUnsubscribe: vi.fn(),
    getCapturedCallback: () => _capturedCallback,
    setCapturedCallback: (cb: ((event: string, session: unknown) => void) | null) => {
      _capturedCallback = cb;
    },
  };
});

// ---------------------------------------------------------------------------
// Mock supabase
// ---------------------------------------------------------------------------

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        setCapturedCallback(callback);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

// Import after mocks are set up
import { AuthProvider, useAuth } from '../AuthContext';
import type { User } from '../../data/mockData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid Supabase session object */
function makeSession(userId = 'user-123', email = 'leader@example.com') {
  return { user: { id: userId, email } };
}

/** A valid RPC response granting access */
function makeRpcSuccess(role = 'Chairperson', sub_department = 'Department') {
  return { data: { has_access: true, role, sub_department }, error: null };
}

/** Sets up supabase.from('members').select(...).eq(...).single() chain */
function setupMemberQuery(
  memberId = 'member-uuid-1',
  fullName = 'Test Leader',
  phone = '+251900000001',
) {
  const singleMock = vi.fn().mockResolvedValue({
    data: { member_id: memberId, full_name: fullName, phone },
    error: null,
  });
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  mockFrom.mockReturnValue({ select: selectMock });
}

/** Default wrapper — live mode */
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setCapturedCallback(null);

  // Default: signOut resolves successfully
  mockSignOut.mockResolvedValue({ error: null });

  // Default: member query returns a valid row
  setupMemberQuery();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext — unit tests', () => {
  // -------------------------------------------------------------------------
  // Test 1: login() calls signInWithPassword with correct arguments
  // -------------------------------------------------------------------------
  it('login() calls signInWithPassword with correct email and password', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'secret123' });
    });

    expect(mockSignInWithPassword).toHaveBeenCalledOnce();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: Auth error sets error field
  // -------------------------------------------------------------------------
  it('auth error from signInWithPassword sets the error field', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'bad@example.com', password: 'wrong' });
    });

    expect(result.current.error).toBe('Invalid login credentials');
    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 3: Successful auth triggers checkLeadershipAccess RPC call
  // -------------------------------------------------------------------------
  it('successful auth triggers supabase.rpc with check_leadership_access', async () => {
    mockRpc.mockResolvedValue(makeRpcSuccess());

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate Supabase firing SIGNED_IN after a successful signInWithPassword
    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession('user-abc', 'leader@example.com'));
    });

    expect(mockRpc).toHaveBeenCalledWith('check_leadership_access', {
      auth_user_id: 'user-abc',
    });
    expect(result.current.user).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 4: has_access: false calls signOut() and sets access-denied error
  // -------------------------------------------------------------------------
  it('has_access: false calls signOut() and sets access-denied error', async () => {
    mockRpc.mockResolvedValue({
      data: { has_access: false, role: null, sub_department: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession());
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(result.current.error).toBe(
      'Access denied. You do not have permission to access this system.',
    );
    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 5: RPC error calls signOut() and sets retry error
  // -------------------------------------------------------------------------
  it('RPC error calls signOut() and sets retry error message', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession());
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(result.current.error).toBe('Unable to verify access. Please try again.');
    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 6: RPC timeout (5s) denies access
  // -------------------------------------------------------------------------
  it('RPC timeout after 5s denies access and calls signOut()', async () => {
    vi.useFakeTimers();

    // RPC never resolves — simulates a hanging database query
    mockRpc.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Fire SIGNED_IN and advance timers past the 5-second timeout
    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession());
      await vi.advanceTimersByTimeAsync(5001);
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(result.current.error).toBe('Access check timed out. Please try again.');
    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 7: logout() calls signOut() and clears user
  // -------------------------------------------------------------------------
  it('logout() calls signOut() and clears user state', async () => {
    mockRpc.mockResolvedValue(makeRpcSuccess());

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Establish a logged-in user
    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession());
    });

    expect(result.current.user).not.toBeNull();

    // Log out
    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 8: signOut() error still clears user state
  // -------------------------------------------------------------------------
  it('signOut() error during logout still clears user state', async () => {
    mockRpc.mockResolvedValue(makeRpcSuccess());
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Establish a logged-in user
    await act(async () => {
      getCapturedCallback()?.('SIGNED_IN', makeSession());
    });

    expect(result.current.user).not.toBeNull();

    // Logout — signOut throws but user should still be cleared
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 9: INITIAL_SESSION with valid session restores user
  // -------------------------------------------------------------------------
  it('INITIAL_SESSION with valid session restores user via leadership check', async () => {
    mockRpc.mockResolvedValue(makeRpcSuccess('Chairperson', 'Department'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      getCapturedCallback()?.('INITIAL_SESSION', makeSession('user-restore', 'restore@example.com'));
    });

    expect(mockRpc).toHaveBeenCalledWith('check_leadership_access', {
      auth_user_id: 'user-restore',
    });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('restore@example.com');
    expect(result.current.isLoading).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 10: INITIAL_SESSION with no session sets user = null
  // -------------------------------------------------------------------------
  it('INITIAL_SESSION with no session sets user to null and isLoading to false', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      getCapturedCallback()?.('INITIAL_SESSION', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 11: Demo mode login(userObject) sets user without calling Supabase
  //
  // DEMO_MODE is a module-level constant evaluated at import time, so we
  // cannot toggle it mid-test via vi.stubEnv. Instead we use the AuthProvider's
  // `initialUser` prop — the testing hook that mirrors what demo mode does —
  // to verify that a User object can be injected directly without any Supabase
  // calls. This validates the same contract: user is set from a User object,
  // not from Supabase credentials.
  // -------------------------------------------------------------------------
  it('demo mode: injecting a User via initialUser sets user without calling Supabase', async () => {
    const demoUser: User = {
      id: 'demo-id',
      name: 'Demo Leader',
      role: 'chairperson',
      email: 'demo@example.com',
      phone: '+251900000000',
    };

    function demoWrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(AuthProvider, { initialUser: demoUser }, children);
    }

    const { result } = renderHook(() => useAuth(), { wrapper: demoWrapper });

    // User is set immediately from initialUser — no Supabase calls needed
    expect(result.current.user).toEqual(demoUser);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

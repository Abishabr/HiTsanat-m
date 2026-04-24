import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currentUser, User } from '../data/mockData';
import type { UserRole } from '../data/mockData';
import { supabase } from '../../lib/supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (userOrCredentials: User | { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

// ── Demo-mode localStorage helpers ─────────────────────────────────────────

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('hk_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

function saveUser(u: User | null) {
  try {
    if (u) localStorage.setItem('hk_user', JSON.stringify(u));
    else localStorage.removeItem('hk_user');
  } catch { /* ignore */ }
}

// ── Role mapping ────────────────────────────────────────────────────────────

/**
 * Maps a (role, subDepartment) pair from the RPC response to an App_Role.
 * Exported so it can be unit-tested independently.
 *
 * Mapping table (Requirements 3.1):
 *   Chairperson     + Department → chairperson
 *   Vice Chairperson + Department → vice-chairperson
 *   Secretary       + Department → secretary
 *   Chairperson     + other      → subdept-leader
 *   Vice Chairperson + other     → subdept-vice-leader
 *   Secretary       + other      → subdept-vice-leader
 */
export function mapToAppRole(role: string, subDepartment: string): UserRole {
  const isDept = subDepartment === 'Department';

  if (role === 'Chairperson') {
    return isDept ? 'chairperson' : 'subdept-leader';
  }
  if (role === 'Vice Chairperson') {
    return isDept ? 'vice-chairperson' : 'subdept-vice-leader';
  }
  if (role === 'Secretary') {
    return isDept ? 'secretary' : 'subdept-vice-leader';
  }

  // Fallback — should not be reached for valid RPC responses
  return 'viewer';
}

// ── AuthProvider ────────────────────────────────────────────────────────────

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    if (initialUser !== undefined) return initialUser;
    if (DEMO_MODE) {
      const stored = loadUser();
      if (stored) Object.assign(currentUser, stored);
      return stored;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  /**
   * Performs the two-phase leadership access check after Supabase Auth succeeds.
   * Calls the `check_leadership_access` RPC with a 5-second timeout.
   * On any failure, signs the user out and sets an error message.
   * Returns a populated User object on success, or null on failure.
   */
  async function checkLeadershipAccess(
    authUserId: string,
    email: string,
  ): Promise<User | null> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    );

    const rpcPromise = supabase.rpc('check_leadership_access', {
      auth_user_id: authUserId,
    });

    let rpcResult: Awaited<typeof rpcPromise>;
    try {
      rpcResult = await Promise.race([rpcPromise, timeoutPromise]);
    } catch (err) {
      // Timeout path
      await supabase.auth.signOut();
      setError('Access check timed out. Please try again.');
      setIsLoading(false);
      return null;
    }

    const { data, error: rpcError } = rpcResult;

    if (rpcError) {
      await supabase.auth.signOut();
      setError('Unable to verify access. Please try again.');
      setIsLoading(false);
      return null;
    }

    if (!data?.has_access) {
      await supabase.auth.signOut();
      setError('Access denied. You do not have permission to access this system.');
      return null;
    }

    // Access granted — map role and fetch member profile
    const appRole = mapToAppRole(data.role as string, data.sub_department as string);

    const { data: memberData } = await supabase
      .from('members')
      .select('id, full_name, phone, email')
      .eq('auth_user_id', authUserId)
      .single();

    const resolvedUser: User = {
      id: memberData?.id ?? authUserId,
      name: memberData?.full_name ?? email,
      role: appRole,
      subDepartment: data.sub_department !== 'Department' ? (data.sub_department as string) : undefined,
      email,
      phone: memberData?.phone ?? '',
    };

    return resolvedUser;
  }

  useEffect(() => {
    if (DEMO_MODE) return;

    let fetchingUser = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] event:', event, 'session:', session?.user?.email ?? 'none');

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user && !fetchingUser) {
          fetchingUser = true;
          const resolvedUser = await checkLeadershipAccess(
            session.user.id,
            session.user.email ?? '',
          );
          setUser(resolvedUser);
          fetchingUser = false;
        } else if (!session?.user) {
          setUser(null);
        }
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user && !fetchingUser) {
          fetchingUser = true;
          const resolvedUser = await checkLeadershipAccess(
            session.user.id,
            session.user.email ?? '',
          );
          setUser(resolvedUser);
          fetchingUser = false;
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] signed out — clearing user');
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (userOrCredentials: User | { email: string; password: string }) => {
    setError(null);

    if (DEMO_MODE) {
      const u = userOrCredentials as User;
      Object.assign(currentUser, u);
      saveUser(u);
      setUser({ ...u });
      return;
    }

    // Live mode: delegate to Supabase Auth; onAuthStateChange handles the rest
    const { email, password } = userOrCredentials as { email: string; password: string };
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
    }
    // On success, onAuthStateChange fires SIGNED_IN and calls checkLeadershipAccess
  };

  const logout = async () => {
    setError(null);
    if (DEMO_MODE) {
      saveUser(null);
      setUser(null);
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut failed — still clear local state (Requirement 6.3)
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

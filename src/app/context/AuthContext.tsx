import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currentUser, User, UserRole } from '../data/mockData';
import { supabase } from '../../lib/supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface AuthContextValue {
  user: User | null;
  login: (userOrCredentials: User | { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

function mapMetadataToUser(supabaseUser: { id: string; email?: string; user_metadata: Record<string, unknown> }): User {
  const meta = supabaseUser.user_metadata ?? {};
  return {
    id: supabaseUser.id,
    name: (meta.name as string) ?? '',
    role: (meta.role as UserRole) ?? 'member',
    subDepartment: (meta.subDepartment as string) ?? undefined,
    email: supabaseUser.email ?? '',
    phone: (meta.phone as string) ?? '',
  };
}

// Legacy localStorage helpers (used only in demo mode)
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) return;

    // 4.1 Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const mapped = mapMetadataToUser(session.user);
        Object.assign(currentUser, mapped);
        setUser(mapped);
      }
    });

    // 4.4 Keep user in sync across tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const mapped = mapMetadataToUser(session.user);
        Object.assign(currentUser, mapped);
        setUser(mapped);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 4.2 login: demo mode accepts User object; live mode uses signInWithPassword
  const login = async (userOrCredentials: User | { email: string; password: string }) => {
    setError(null);

    if (DEMO_MODE) {
      const u = userOrCredentials as User;
      Object.assign(currentUser, { id: u.id, name: u.name, role: u.role as UserRole, subDepartment: u.subDepartment, email: u.email, phone: u.phone });
      saveUser(u);
      setUser({ ...u });
      return;
    }

    const { email, password } = userOrCredentials as { email: string; password: string };
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
    }
    // user state is updated via onAuthStateChange listener
  };

  // 4.3 logout: call supabase.auth.signOut in live mode
  const logout = async () => {
    setError(null);
    if (DEMO_MODE) {
      saveUser(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    // user state cleared via onAuthStateChange listener
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

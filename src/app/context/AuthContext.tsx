import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currentUser, User, UserRole } from '../data/mockData';
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

// ── New schema: system_users links auth → member, roles are in member_roles ──

interface SystemUserRow {
  user_id: string;
  auth_user_id: string;
  member_id: string;
  members: { first_name: string; father_name: string } | null;
}

interface MemberRoleRow {
  role: string;
  sub_department_id: string | null;
  sub_departments: { name: string } | null;
  is_active: boolean;
}

// Role priority order (highest first)
const ROLE_PRIORITY: Record<string, number> = {
  DepartmentChairperson: 10,
  DepartmentSecretary: 9,
  SubDeptChairperson: 8,
  SubDeptSecretary: 7,
  Teacher: 6,
  AssistantTeacher: 5,
  Member: 1,
};

const ROLE_MAP: Record<string, UserRole> = {
  DepartmentChairperson: 'chairperson',
  DepartmentSecretary: 'secretary',
  SubDeptChairperson: 'subdept-leader',
  SubDeptSecretary: 'subdept-vice-leader',
  Teacher: 'teacher',
  AssistantTeacher: 'member',
  Member: 'member',
};

async function fetchSystemUser(authUserId: string, email: string): Promise<User | null> {
  // Wrap in a timeout so a slow/hanging Supabase query never blocks the app
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));

  const fetchPromise = (async () => {
    const { data: suData, error: suError } = await supabase
      .from('system_users')
      .select('user_id, auth_user_id, member_id, members(first_name, father_name)')
      .eq('auth_user_id', authUserId)
      .eq('is_active', true)
      .single();

    if (suError || !suData) {
      console.warn('[AuthContext] No system_users row — defaulting to chairperson');
      return {
        id: authUserId,
        name: email,
        role: 'chairperson' as UserRole,
        email,
        phone: '',
      };
    }

    const row = suData as SystemUserRow;
    const memberName = row.members
      ? `${row.members.first_name} ${row.members.father_name}`.trim()
      : email;

    const { data: rolesData } = await supabase
      .from('member_roles')
      .select('role, sub_department_id, sub_departments(name), is_active')
      .eq('member_id', row.member_id)
      .eq('is_active', true);

    if (!rolesData || rolesData.length === 0) {
      return { id: row.user_id, name: memberName, role: 'member' as UserRole, email, phone: '' };
    }

    const roles = rolesData as MemberRoleRow[];
    const topRole = roles.reduce((best, r) =>
      (ROLE_PRIORITY[r.role] ?? 0) > (ROLE_PRIORITY[best.role] ?? 0) ? r : best
    );

    return {
      id: row.user_id,
      name: memberName,
      role: (ROLE_MAP[topRole.role] ?? 'member') as UserRole,
      subDepartment: topRole.sub_departments?.name ?? undefined,
      email,
      phone: '',
    };
  })();

  const result = await Promise.race([fetchPromise, timeout]);

  // If timed out, return a basic user so the app still loads
  return result ?? {
    id: authUserId,
    name: email,
    role: 'chairperson' as UserRole,
    email,
    phone: '',
  };
}

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
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) return;

    let sessionHandled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = await fetchSystemUser(session.user.id, session.user.email ?? '');
        if (u) { Object.assign(currentUser, u); setUser(u); }
      }
      setIsLoading(false);
      sessionHandled = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = await fetchSystemUser(session.user.id, session.user.email ?? '');
        if (u) { Object.assign(currentUser, u); setUser(u); }
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Handled by getSession above — skip to avoid double fetch
        if (!sessionHandled) {
          if (session?.user) {
            const u = await fetchSystemUser(session.user.id, session.user.email ?? '');
            if (u) { Object.assign(currentUser, u); setUser(u); }
          }
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    const { email, password } = userOrCredentials as { email: string; password: string };
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
  };

  const logout = async () => {
    setError(null);
    if (DEMO_MODE) { saveUser(null); setUser(null); return; }
    await supabase.auth.signOut();
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

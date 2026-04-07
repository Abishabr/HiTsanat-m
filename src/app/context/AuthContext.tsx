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
  // 1. Get system_users row with member name
  const { data: suData, error: suError } = await supabase
    .from('system_users')
    .select('user_id, auth_user_id, member_id, members(first_name, father_name)')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .single();

  if (suError || !suData) {
    console.warn('[AuthContext] No system_users row — using email as name, defaulting to chairperson');
    // Still allow login — return a basic user so the app loads
    return {
      id: authUserId,
      name: email,
      role: 'chairperson',
      email,
      phone: '',
    };
  }

  const row = suData as SystemUserRow;
  const memberName = row.members
    ? `${row.members.first_name} ${row.members.father_name}`.trim()
    : email;

  // 2. Get all active roles for this member
  const { data: rolesData, error: rolesError } = await supabase
    .from('member_roles')
    .select('role, sub_department_id, sub_departments(name), is_active')
    .eq('member_id', row.member_id)
    .eq('is_active', true);

  if (rolesError || !rolesData || rolesData.length === 0) {
    // No roles yet — still allow login as basic member
    return {
      id: row.user_id,
      name: memberName,
      role: 'member',
      email,
      phone: '',
    };
  }

  const roles = rolesData as MemberRoleRow[];

  // Pick the highest-priority role
  const topRole = roles.reduce((best, r) =>
    (ROLE_PRIORITY[r.role] ?? 0) > (ROLE_PRIORITY[best.role] ?? 0) ? r : best
  );

  const appRole = (ROLE_MAP[topRole.role] ?? 'member') as UserRole;
  const subDeptName = topRole.sub_departments?.name ?? undefined;

  return {
    id: row.user_id,
    name: memberName,
    role: appRole,
    subDepartment: subDeptName,
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = await fetchSystemUser(session.user.id, session.user.email ?? '');
        if (u) { Object.assign(currentUser, u); setUser(u); }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = await fetchSystemUser(session.user.id, session.user.email ?? '');
        if (u) { Object.assign(currentUser, u); setUser(u); }
      } else {
        setUser(null);
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

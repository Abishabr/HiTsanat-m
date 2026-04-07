import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currentUser, User, UserRole } from '../data/mockData';
import { supabase } from '../../lib/supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface AuthContextValue {
  user: User | null;
  login: (userOrCredentials: User | { email: string; password: string }) => Promise<void>;
  signUp: (params: { email: string; password: string; role: string; subDepartmentId?: string; memberId?: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

// ── Map Supabase Auth user + system_users row → app User ──────────────────

interface SystemUserRow {
  user_id: string;
  auth_user_id: string;
  member_id: string | null;
  role: string;
  sub_department_id: string | null;
  sub_departments?: { name: string } | null;
  normalized_members?: { first_name: string; father_name: string } | null;
}

async function fetchSystemUser(
  authUserId: string,
  email: string
): Promise<User | null> {
  // Fetch system_users with sub_departments and members joins
  const { data, error } = await supabase
    .from('system_users')
    .select(`
      user_id,
      auth_user_id,
      member_id,
      role,
      sub_department_id,
      sub_departments ( name ),
      members ( first_name, father_name )
    `)
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    // Fallback: plain fetch without joins
    const { data: plain, error: plainError } = await supabase
      .from('system_users')
      .select('user_id, auth_user_id, member_id, role, sub_department_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (plainError || !plain) {
      console.error('[AuthContext] system_users lookup failed:', plainError?.message);
      return null;
    }

    let subDeptName: string | undefined;
    if (plain.sub_department_id) {
      const { data: sd } = await supabase
        .from('sub_departments')
        .select('name')
        .eq('sub_department_id', plain.sub_department_id)
        .single();
      subDeptName = sd?.name;
    }

    const roleMap: Record<string, UserRole> = {
      DepartmentChairperson: 'chairperson',
      DepartmentSecretary: 'secretary',
      SubDeptChairperson: 'subdept-leader',
      SubDeptSecretary: 'subdept-vice-leader',
    };

    return {
      id: plain.user_id,
      name: email,
      role: (roleMap[plain.role] ?? 'member') as UserRole,
      subDepartment: subDeptName,
      email,
      phone: '',
    };
  }

  const row = data as {
    user_id: string;
    member_id: string | null;
    role: string;
    sub_department_id: string | null;
    sub_departments: { name: string } | null;
    members: { first_name: string; father_name: string } | null;
  };

  const memberName = row.members
    ? `${row.members.first_name} ${row.members.father_name}`.trim()
    : email;

  const roleMap: Record<string, UserRole> = {
    DepartmentChairperson: 'chairperson',
    DepartmentSecretary: 'secretary',
    SubDeptChairperson: 'subdept-leader',
    SubDeptSecretary: 'subdept-vice-leader',
  };

  return {
    id: row.user_id,
    name: memberName,
    role: (roleMap[row.role] ?? 'member') as UserRole,
    subDepartment: row.sub_departments?.name ?? undefined,
    email,
    phone: '',
  };
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

    // Restore session on mount — prefer system_users row for normalized role
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const systemUser = await fetchSystemUser(session.user.id, session.user.email ?? '');
        const mapped = systemUser ?? mapMetadataToUser(session.user);
        Object.assign(currentUser, mapped);
        setUser(mapped);
      }
    });

    // Keep user in sync across tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const systemUser = await fetchSystemUser(session.user.id, session.user.email ?? '');
        const mapped = systemUser ?? mapMetadataToUser(session.user);
        Object.assign(currentUser, mapped);
        setUser(mapped);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // login: demo mode accepts User object; live mode uses signInWithPassword
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

  // logout
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

  // signUp: creates a Supabase Auth user with role metadata.
  // The on_auth_user_created trigger auto-creates the system_users row.
  const signUp = async ({
    email,
    password,
    role,
    subDepartmentId,
    memberId,
  }: {
    email: string;
    password: string;
    role: string;
    subDepartmentId?: string;
    memberId?: string;
  }): Promise<{ error: string | null }> => {
    if (DEMO_MODE) return { error: 'Sign-up is not available in demo mode.' };

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          sub_department_id: subDepartmentId ?? null,
          member_id: memberId ?? null,
        },
      },
    });

    if (authError) {
      console.error('[AuthContext] signUp failed:', authError.message);
      return { error: authError.message };
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signUp, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

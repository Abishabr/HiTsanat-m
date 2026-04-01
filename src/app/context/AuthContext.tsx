import { createContext, useContext, useState, ReactNode } from 'react';
import { currentUser, User, UserRole } from '../data/mockData';

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
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
    const stored = loadUser();
    if (stored) Object.assign(currentUser, stored);
    return stored;
  });

  const login = (u: User) => {
    Object.assign(currentUser, { id: u.id, name: u.name, role: u.role as UserRole, subDepartment: u.subDepartment, email: u.email, phone: u.phone });
    saveUser(u);
    setUser({ ...u });
  };

  const logout = () => {
    saveUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

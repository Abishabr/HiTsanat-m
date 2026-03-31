import { createContext, useContext, useState, ReactNode } from 'react';
import { currentUser, User, UserRole } from '../data/mockData';

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (u: User) => {
    // Mutate the shared currentUser so all components pick up the new role
    currentUser.id = u.id;
    currentUser.name = u.name;
    currentUser.role = u.role as UserRole;
    currentUser.subDepartment = u.subDepartment;
    currentUser.email = u.email;
    currentUser.phone = u.phone;
    setUser({ ...u });
  };

  const logout = () => {
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

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../data/mockData';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const PRESET_USERS: User[] = [
  {
    id: 'u1',
    name: 'Abebe Kebede',
    role: 'chairperson',
    email: 'abebe.kebede@hitsanat.org',
    phone: '+251 911 123456',
  },
  {
    id: 'u2',
    name: 'Almaz Tesfaye',
    role: 'subdept-leader',
    subDepartment: 'Timhert',
    email: 'almaz@email.com',
    phone: '+251 911 100001',
  },
  {
    id: 'u3',
    name: 'Tsion Haile',
    role: 'subdept-leader',
    subDepartment: 'Mezmur',
    email: 'tsion@email.com',
    phone: '+251 911 100003',
  },
  {
    id: 'u4',
    name: 'Daniel Assefa',
    role: 'subdept-leader',
    subDepartment: 'Kinetibeb',
    email: 'daniel@email.com',
    phone: '+251 911 100004',
  },
  {
    id: 'u5',
    name: 'Kidus Worku',
    role: 'subdept-leader',
    subDepartment: 'Kuttr',
    email: 'kidus@email.com',
    phone: '+251 911 100005',
  },
  {
    id: 'u6',
    name: 'Martha Negash',
    role: 'subdept-leader',
    subDepartment: 'Ekd',
    email: 'martha@email.com',
    phone: '+251 911 100006',
  },
];

const ROLE_LABELS: Record<string, string> = {
  chairperson: 'Chairperson',
  'vice-chairperson': 'Vice Chairperson',
  secretary: 'Secretary',
  'subdept-leader': 'Sub-Department Leader',
  member: 'Member',
};

const SUBDEPT_COLORS: Record<string, string> = {
  Timhert: '#3b82f6',
  Mezmur: '#8b5cf6',
  Kinetibeb: '#ec4899',
  Kuttr: '#10b981',
  Ekd: '#f59e0b',
};

const SUBDEPT_DISPLAY: Record<string, string> = {
  Timhert: 'Timhert Academic',
  Mezmur: 'Tmezmur',
  Kinetibeb: 'Kinetibeb',
  Kuttr: 'Kuttr',
  Ekd: 'EKD',
};

function LoginHeader() {
  return (
    <div className="text-center mb-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #5f0113, #f3c913)' }}
      >
        <span className="text-white font-bold text-2xl">HK</span>
      </div>
      <h1 className="text-3xl font-bold text-white">Hitsanat KFL</h1>
    </div>
  );
}

function DemoModeCards({ login }: { login: (user: User) => void }) {
  return (
    <>
      <p className="text-gray-400 text-center mb-6">Select your account to continue</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESET_USERS.map((user) => {
          const accentColor = user.subDepartment
            ? SUBDEPT_COLORS[user.subDepartment]
            : '#3b82f6';
          const initials = user.name.split(' ').map(n => n[0]).join('');
          const subtitle = user.subDepartment
            ? `${ROLE_LABELS[user.role]} · ${SUBDEPT_DISPLAY[user.subDepartment] ?? user.subDepartment}`
            : ROLE_LABELS[user.role];

          return (
            <button
              key={user.id}
              onClick={() => login(user)}
              className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group"
              style={{ backgroundColor: '#3d3d3d', borderColor: '#4d4d4d' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f3c913'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4d4d4d'; }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow"
                style={{ backgroundColor: accentColor }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{user.name}</p>
                <p className="text-sm text-gray-400 truncate">{subtitle}</p>
              </div>
              <span className="ml-auto text-lg" style={{ color: '#f3c913' }}>→</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-6">
        Demo mode — no password required
      </p>
    </>
  );
}

function EmailPasswordForm({
  login,
  error,
}: {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login({ email, password });
    setIsSubmitting(false);
  };

  return (
    <>
      <p className="text-gray-400 text-center mb-6">Sign in to your account</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-gray-300">Email</label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-[#3d3d3d] border-[#4d4d4d] text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-gray-300">Password</label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-[#3d3d3d] border-[#4d4d4d] text-white placeholder:text-gray-500"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2"
          style={{ background: 'linear-gradient(135deg, #5f0113, #f3c913)', color: 'white' }}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </>
  );
}

export default function Login() {
  const { login, error } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)' }}
    >
      <div className="w-full max-w-2xl">
        <LoginHeader />
        {DEMO_MODE ? (
          <DemoModeCards login={login as (user: User) => void} />
        ) : (
          <EmailPasswordForm
            login={login as (credentials: { email: string; password: string }) => Promise<void>}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

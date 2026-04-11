import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../data/mockData';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const PRESET_USERS: User[] = [
  { id: 'u1', name: 'Mahider Demelash', role: 'chairperson', email: 'mahider@hitsanat.org', phone: '+251 911 123456' },
  { id: 'u2', name: 'Lueulseged', role: 'subdept-leader', subDepartment: 'Timhert', email: 'lueulseged@email.com', phone: '+251 911 100001' },
  { id: 'u3', name: 'Abrham Habtamu', role: 'subdept-leader', subDepartment: 'Mezmur', email: 'abrham@email.com', phone: '+251 911 100002' },
  { id: 'u4', name: 'Bezawit Girma', role: 'subdept-leader', subDepartment: 'Kinetibeb', email: 'bezawit@email.com', phone: '+251 911 100003' },
  { id: 'u5', name: 'Kidist Ymechewale', role: 'subdept-leader', subDepartment: 'Kuttr', email: 'kidist@email.com', phone: '+251 911 100004' },
  { id: 'u6', name: 'Kenenissa', role: 'subdept-leader', subDepartment: 'Ekd', email: 'kenenissa@email.com', phone: '+251 911 100005' },
];

const ROLE_LABELS: Record<string, string> = {
  chairperson: 'Department Chairperson',
  'subdept-leader': 'Sub-Department Leader',
};

const SUBDEPT_COLORS: Record<string, string> = {
  Timhert: '#b45309', Mezmur: '#7c3aed', Kinetibeb: '#be185d',
  Kuttr: '#047857', Ekd: '#b45309',
};

export default function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login({ email, password });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1a0a00 0%, #2d1500 40%, #1a0a00 100%)' }}>

      {/* Decorative cross pattern background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4a017' fill-opacity='1'%3E%3Crect x='27' y='5' width='6' height='50'/%3E%3Crect x='5' y='27' width='50' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }} />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #d4a017, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0d7377, transparent)' }} />

      {/* Back to website */}
      <a href="https://hitsanat.vercel.app"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-amber-200/60 hover:text-amber-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to website
      </a>

      {/* Login card */}
      <div className="relative w-full max-w-md mx-4">
        {/* Gold top border */}
        <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #d4a017, #f5c842, #d4a017)' }} />

        <div className="rounded-b-2xl p-8 shadow-2xl"
          style={{ backgroundColor: 'rgba(20, 10, 0, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212, 160, 23, 0.2)', borderTop: 'none' }}>

          {/* Logo & title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)', border: '3px solid rgba(212, 160, 23, 0.4)' }}>
              <span className="text-2xl font-black text-amber-900">HK</span>
            </div>
            <h1 className="text-2xl font-black text-amber-100 tracking-wide">Hitsanat KFL</h1>
            <p className="text-amber-400/70 text-sm mt-1">Children's Ministry Management</p>
            <p className="text-amber-200/40 text-xs mt-1">Ethiopian Orthodox Tewahedo Church</p>
          </div>

          {DEMO_MODE ? (
            /* Demo mode */
            <div className="space-y-2">
              <p className="text-amber-200/60 text-xs text-center mb-4">Demo mode — select an account</p>
              {PRESET_USERS.map(user => {
                const color = user.subDepartment ? SUBDEPT_COLORS[user.subDepartment] : '#d4a017';
                const initials = user.name.split(' ').map(n => n[0]).join('');
                const subtitle = user.subDepartment
                  ? `${ROLE_LABELS[user.role]} · ${user.subDepartment}`
                  : ROLE_LABELS[user.role];
                return (
                  <button key={user.id} onClick={() => login(user as User)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group"
                    style={{ backgroundColor: 'rgba(212, 160, 23, 0.05)', border: '1px solid rgba(212, 160, 23, 0.15)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212, 160, 23, 0.4)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212, 160, 23, 0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212, 160, 23, 0.15)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212, 160, 23, 0.05)'; }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: color }}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-amber-100 text-sm truncate">{user.name}</p>
                      <p className="text-xs text-amber-400/60 truncate">{subtitle}</p>
                    </div>
                    <span className="text-amber-400/40 group-hover:text-amber-400 transition-colors">→</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Live mode */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-amber-200/80">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                  <input
                    type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-amber-100 placeholder:text-amber-400/30 text-sm outline-none transition-all"
                    style={{ backgroundColor: 'rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.2)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212, 160, 23, 0.6)'; e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(212, 160, 23, 0.2)'; e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.08)'; }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-amber-200/80">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                  <input
                    type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl text-amber-100 placeholder:text-amber-400/30 text-sm outline-none transition-all"
                    style={{ backgroundColor: 'rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.2)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212, 160, 23, 0.6)'; e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(212, 160, 23, 0.2)'; e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.08)'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/50 hover:text-amber-400 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-300"
                  style={{ backgroundColor: 'rgba(127, 29, 29, 0.3)', border: '1px solid rgba(127, 29, 29, 0.5)' }}>
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={isSubmitting || !email || !password}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)', color: '#1a0a00' }}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-amber-400/40 mt-6">
            Contact your administrator if you need access
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Navigate } from 'react-router';
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

// Sidebar exact colors
const CRIMSON = '#5f0113';
const CRIMSON_ACCENT = '#7a0118';
const CRIMSON_BORDER = '#8a0120';
const GOLD = '#f3c912';
const GOLD_DIM = 'rgba(243, 201, 18, 0.15)';
const GOLD_MID = 'rgba(243, 201, 18, 0.25)';

export default function Login() {
  const { login, error, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login({ email, password });
    setIsSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${CRIMSON} 0%, #3a0018 50%, ${CRIMSON} 100%)` }}
    >
      {/* Mobile background image (visible only below lg) */}
      <div className="lg:hidden absolute inset-0">
        <img
          src="/church-children.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay so the form stays readable */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, rgba(95,1,19,0.75) 0%, rgba(58,0,24,0.88) 100%)` }}
        />
      </div>

      {/* Left panel — hero image (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col">
        <img
          src="/church-children.jpg"
          alt="Children in traditional Ethiopian Orthodox church attire"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to right, transparent 60%, ${CRIMSON} 100%), linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)` }}
        />
        {/* Caption at bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-white text-lg font-bold leading-snug drop-shadow-lg">
            ሕፃናት ክፍለ ፍቅር ለዓለም
          </p>
          <p className="text-white/70 text-sm mt-1 drop-shadow">
            Ethiopian Orthodox Tewahedo Church — Children's Ministry
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Cross pattern — matches sidebar brand */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f3c912' fill-opacity='1'%3E%3Crect x='27' y='5' width='6' height='50'/%3E%3Crect x='5' y='27' width='50' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />

        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0d7377, transparent)' }} />

        {/* Back to website */}
        <a
          href="https://hitsanat.vercel.app"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'rgba(243, 201, 18, 0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(243, 201, 18, 0.5)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </a>

      {/* Login card */}
      <div className="relative w-full max-w-md mx-4">
        {/* Gold top border — same as sidebar primary */}
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${GOLD}, #f5e060, ${GOLD})` }} />

        <div
          className="rounded-b-2xl p-8 shadow-2xl"
          style={{
            backgroundColor: CRIMSON_ACCENT,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${CRIMSON_BORDER}`,
            borderTop: 'none',
          }}
        >
          {/* Logo & title — mirrors sidebar logo */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #f5e060)`,
                border: `3px solid ${GOLD_MID}`,
              }}
            >
              <span className="text-2xl font-black" style={{ color: CRIMSON }}>HK</span>
            </div>
            <h1 className="text-2xl font-black tracking-wide" style={{ color: '#ffffff' }}>Hitsanat KFL</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Children's Ministry Management</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Ethiopian Orthodox Tewahedo Church</p>
          </div>

          {DEMO_MODE ? (
            /* Demo mode */
            <div className="space-y-2">
              <p className="text-xs text-center mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Demo mode — select an account
              </p>
              {PRESET_USERS.map(user => {
                const color = user.subDepartment ? SUBDEPT_COLORS[user.subDepartment] : GOLD;
                const initials = user.name.split(' ').map(n => n[0]).join('');
                const subtitle = user.subDepartment
                  ? `${ROLE_LABELS[user.role]} · ${user.subDepartment}`
                  : ROLE_LABELS[user.role];
                return (
                  <button
                    key={user.id}
                    onClick={() => login(user as User)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group"
                    style={{ backgroundColor: GOLD_DIM, border: `1px solid ${CRIMSON_BORDER}` }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = GOLD_MID;
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(243, 201, 18, 0.12)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = CRIMSON_BORDER;
                      (e.currentTarget as HTMLElement).style.backgroundColor = GOLD_DIM;
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate" style={{ color: '#ffffff' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{subtitle}</p>
                    </div>
                    <span className="transition-colors" style={{ color: 'rgba(243,201,18,0.4)' }}>→</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Live mode */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(243,201,18,0.5)' }} />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      backgroundColor: GOLD_DIM,
                      border: `1px solid ${CRIMSON_BORDER}`,
                      color: '#ffffff',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = GOLD_MID;
                      e.currentTarget.style.backgroundColor = 'rgba(243, 201, 18, 0.1)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = CRIMSON_BORDER;
                      e.currentTarget.style.backgroundColor = GOLD_DIM;
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(243,201,18,0.5)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      backgroundColor: GOLD_DIM,
                      border: `1px solid ${CRIMSON_BORDER}`,
                      color: '#ffffff',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = GOLD_MID;
                      e.currentTarget.style.backgroundColor = 'rgba(243, 201, 18, 0.1)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = CRIMSON_BORDER;
                      e.currentTarget.style.backgroundColor = GOLD_DIM;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(243,201,18,0.5)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(243,201,18,0.5)')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'rgba(127, 29, 29, 0.4)',
                    border: '1px solid rgba(127, 29, 29, 0.6)',
                    color: '#fca5a5',
                  }}
                >
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, #f5e060)`,
                  color: CRIMSON,
                }}
              >
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

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Contact your administrator if you need access
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

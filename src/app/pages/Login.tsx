import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../data/mockData';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const PRESET_USERS: User[] = [
  { id: 'u1', name: 'Abebe Kebede', role: 'chairperson', email: 'abebe.kebede@hitsanat.org', phone: '+251 911 123456' },
  { id: 'u2', name: 'Almaz Tesfaye', role: 'subdept-leader', subDepartment: 'Timhert', email: 'almaz@email.com', phone: '+251 911 100001' },
  { id: 'u3', name: 'Tsion Haile', role: 'subdept-leader', subDepartment: 'Mezmur', email: 'tsion@email.com', phone: '+251 911 100003' },
  { id: 'u4', name: 'Daniel Assefa', role: 'subdept-leader', subDepartment: 'Kinetibeb', email: 'daniel@email.com', phone: '+251 911 100004' },
  { id: 'u5', name: 'Kidus Worku', role: 'subdept-leader', subDepartment: 'Kuttr', email: 'kidus@email.com', phone: '+251 911 100005' },
  { id: 'u6', name: 'Martha Negash', role: 'subdept-leader', subDepartment: 'Ekd', email: 'martha@email.com', phone: '+251 911 100006' },
];

const SUBDEPT_COLORS: Record<string, string> = {
  Timhert: '#3b82f6', Mezmur: '#8b5cf6', Kinetibeb: '#ec4899', Kuttr: '#10b981', Ekd: '#f59e0b',
};

const ROLE_LABELS: Record<string, string> = {
  chairperson: 'Chairperson',
  'vice-chairperson': 'Vice Chairperson',
  secretary: 'Secretary',
  'subdept-leader': 'Sub-Department Leader',
  member: 'Member',
};

const SUBDEPT_DISPLAY: Record<string, string> = {
  Timhert: 'Timhert Academic', Mezmur: 'Tmezmur', Kinetibeb: 'Kinetibeb', Kuttr: 'Kuttr', Ekd: 'EKD',
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
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a0d 50%, #0f0f0f 100%)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, #5f0113, transparent)' }} />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, #f3c913, transparent)' }} />
        </div>

        <div className="relative z-10 text-center">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #5f0113, #f3c913)' }}
          >
            <span className="text-white font-black text-4xl">HK</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Hitsanat KFL</h1>
          <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
            Management system for the Hitsanat KFL community — members, children, programs, and more.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {['Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'].map(dept => (
              <div
                key={dept}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white text-center"
                style={{ backgroundColor: `${SUBDEPT_COLORS[dept]}30`, border: `1px solid ${SUBDEPT_COLORS[dept]}50`, color: SUBDEPT_COLORS[dept] }}
              >
                {SUBDEPT_DISPLAY[dept]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #5f0113, #f3c913)' }}
            >
              <span className="text-white font-black text-2xl">HK</span>
            </div>
            <h1 className="text-2xl font-black text-white">Hitsanat KFL</h1>
          </div>

          {DEMO_MODE ? (
            /* Demo mode — preset user cards */
            <div
              className="rounded-2xl p-8 shadow-2xl"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #2d2d2d' }}
            >
              <h2 className="text-xl font-bold text-white mb-1">Select Account</h2>
              <p className="text-gray-400 text-sm mb-6">Demo mode — no password required</p>
              <div className="space-y-2">
                {PRESET_USERS.map(user => {
                  const color = user.subDepartment ? SUBDEPT_COLORS[user.subDepartment] : '#3b82f6';
                  const initials = user.name.split(' ').map(n => n[0]).join('');
                  const subtitle = user.subDepartment
                    ? `${ROLE_LABELS[user.role]} · ${SUBDEPT_DISPLAY[user.subDepartment]}`
                    : ROLE_LABELS[user.role];
                  return (
                    <button
                      key={user.id}
                      onClick={() => login(user as User)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f3c913'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'; }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: color }}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
                      </div>
                      <span className="text-gray-500 text-sm">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Live mode — email/password form */
            <div
              className="rounded-2xl p-8 shadow-2xl"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #2d2d2d' }}
            >
              <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-gray-400 text-sm mb-8">Sign in to your account to continue</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder:text-gray-600 text-sm transition-all outline-none"
                      style={{
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #3a3a3a',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#f3c913'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#3a3a3a'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-xl text-white placeholder:text-gray-600 text-sm transition-all outline-none"
                      style={{
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #3a3a3a',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#f3c913'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#3a3a3a'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400" style={{ backgroundColor: '#3f1515', border: '1px solid #7f2020' }}>
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  style={{ background: 'linear-gradient(135deg, #5f0113, #8b0000)', color: 'white' }}
                  onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #7a0118, #a00000)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5f0113, #8b0000)'; }}
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

              <p className="text-center text-xs text-gray-600 mt-6">
                Contact your administrator if you need access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

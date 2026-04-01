import { useAuth } from '../context/AuthContext';
import { User } from '../data/mockData';

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

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)" }} className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl" style={{ background: "linear-gradient(135deg, #5f0113, #f3c913)" }}
            className=" flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">HK</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Hitsanat KFL</h1>
          <p className="text-gray-400 mt-1">Select your account to continue</p>
        </div>

        {/* User cards */}
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
                className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group" style={{ backgroundColor: "#3d3d3d", borderColor: "#4d4d4d" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f3c913"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#4d4d4d"; }}
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
                <span className="ml-auto text-gray-500 transition-colors text-lg" style={{ color: "#f3c913" }}>→</span>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Demo mode — no password required
        </p>
      </div>
    </div>
  );
}

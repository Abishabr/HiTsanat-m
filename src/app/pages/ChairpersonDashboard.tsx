import {
  Users, UserCog, Calendar, PartyPopper, TrendingUp, TrendingDown,
  Activity, CheckCircle2, Plus, FileText, Download, RefreshCw,
  ArrowUpRight, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const COLORS = ['#0d7377', '#f59e0b', '#8b5cf6', '#f43f5e', '#10b981'];
const KUTR_COLORS = ['#0d7377', '#f59e0b', '#8b5cf6'];

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color, accentColor, trend, trendLabel, to,
}: {
  title: string; value: string | number; sub?: string;
  icon: any; color: string; accentColor?: string;
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string; to?: string;
}) {
  const inner = (
    <Card className="hover:shadow-xl transition-all duration-200 cursor-pointer group overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: accentColor ?? '#0d7377' }} />
      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{title}</p>
            <p className="text-4xl font-black text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{sub}</p>}
            {trendLabel && (
              <div className="flex items-center gap-1.5 mt-3 px-2 py-1 rounded-full w-fit"
                style={{ backgroundColor: trend === 'up' ? '#dcfce7' : trend === 'down' ? '#fee2e2' : 'hsl(var(--muted))' }}>
                {trend === 'up'      && <TrendingUp   className="w-3 h-3 text-green-600" />}
                {trend === 'down'    && <TrendingDown  className="w-3 h-3 text-red-600" />}
                {trend === 'neutral' && <Activity      className="w-3 h-3 text-muted-foreground" />}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-700' : trend === 'down' ? 'text-red-700' : 'text-muted-foreground'}`}>
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className={`${color} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
        {to && (
          <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <span>View details</span>
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function ChairpersonDashboard() {
  const { user } = useAuth();
  const [lastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalChildren: 0, kutr1: 0, kutr2: 0, kutr3: 0,
    totalMembers: 0, totalPrograms: 0, upcomingCount: 0,
    attendanceRate: 0, presentCount: 0, totalAttendance: 0,
  });
  const [subDepts, setSubDepts] = useState<Array<{ id: string; name: string; programCount: number }>>([]);
  const [kutrData, setKutrData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [memberDistData, setMemberDistData] = useState<Array<{ name: string; members: number; fill: string }>>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [childrenRes, membersRes, subDeptsRes, programsRes, attRes, upcomingRes] = await Promise.all([
          supabase.from('children').select('id, kutr_level_id, kutr_levels(name)').eq('status', 'active'),
          supabase.from('members').select('id').eq('status', 'active'),
          supabase.from('sub_departments').select('id, name').order('name'),
          supabase.from('weekly_programs').select('id, sub_department_id').eq('status', 'active'),
          supabase.from('child_attendance').select('status').limit(500),
          supabase.from('upcoming_sessions').select('*').limit(5),
        ]);

        const children = childrenRes.data ?? [];
        const programs = programsRes.data ?? [];
        const att      = attRes.data ?? [];
        const sds      = (subDeptsRes.data ?? []).filter((s: any) => s.name !== 'Department');

        const kutr1 = children.filter((c: any) => c.kutr_levels?.name === 'Kutr 1').length;
        const kutr2 = children.filter((c: any) => c.kutr_levels?.name === 'Kutr 2').length;
        const kutr3 = children.filter((c: any) => c.kutr_levels?.name === 'Kutr 3').length;
        const presentCount = att.filter((a: any) => a.status === 'present').length;
        const attRate = att.length > 0 ? Math.round((presentCount / att.length) * 100) : 0;

        setStats({
          totalChildren: children.length, kutr1, kutr2, kutr3,
          totalMembers: membersRes.data?.length ?? 0,
          totalPrograms: programs.length,
          upcomingCount: upcomingRes.data?.length ?? 0,
          attendanceRate: attRate, presentCount, totalAttendance: att.length,
        });

        const sdSummary = sds.map((sd: any, i: number) => ({
          id: sd.id, name: sd.name,
          programCount: programs.filter((p: any) => p.sub_department_id === sd.id).length,
        }));
        setSubDepts(sdSummary);
        setKutrData([
          { name: 'Kutr 1', value: kutr1, color: KUTR_COLORS[0] },
          { name: 'Kutr 2', value: kutr2, color: KUTR_COLORS[1] },
          { name: 'Kutr 3', value: kutr3, color: KUTR_COLORS[2] },
        ]);
        setMemberDistData(sdSummary.map((sd: any, i: number) => ({
          name: sd.name, members: sd.programCount, fill: COLORS[i % COLORS.length],
        })));
        setUpcomingSessions(upcomingRes.data ?? []);
      } catch (err) {
        console.error('[ChairpersonDashboard]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">

      {/* Hero banner */}
      <div className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden shadow-lg">
        <img src="/church-children.jpg" alt="Hitsanat KFL" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 flex flex-col justify-end p-5"
          style={{ background: 'linear-gradient(to top, rgba(95,1,19,0.85) 0%, rgba(95,1,19,0.3) 60%, transparent 100%)' }}>
          <p className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow">Hitsanat KFL</p>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">ሕፃናት ክፍለ ፍቅር ለዓለም — Children's Ministry Management</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department Chairperson</p>
          <h1 className="text-2xl font-black text-foreground">{user?.name ?? 'Dashboard'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hitsanat KFL — Full department overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />{lastRefresh.toLocaleTimeString()}
          </span>
          <Link to="/reports">
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" />Export</Button>
          </Link>
          <Link to="/register/child">
            <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#0d7377' }}>
              <Plus className="w-3.5 h-3.5" />Quick Add
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Children" value={loading ? '…' : stats.totalChildren}
          sub={`Kutr 1: ${stats.kutr1} · Kutr 2: ${stats.kutr2} · Kutr 3: ${stats.kutr3}`}
          icon={Users} color="bg-[#0d7377]" accentColor="#0d7377" trend="up" trendLabel="Registered" to="/children" />
        <KpiCard title="Active Members" value={loading ? '…' : stats.totalMembers}
          sub="University students"
          icon={UserCog} color="bg-[#b45309]" accentColor="#f59e0b" trend="up" trendLabel="Enrolled" to="/members" />
        <KpiCard title="Attendance Rate" value={loading ? '…' : `${stats.attendanceRate}%`}
          sub={`${stats.presentCount} present of ${stats.totalAttendance}`}
          icon={Activity}
          color={stats.attendanceRate >= 80 ? 'bg-emerald-600' : stats.attendanceRate >= 65 ? 'bg-amber-500' : 'bg-rose-600'}
          accentColor={stats.attendanceRate >= 80 ? '#059669' : stats.attendanceRate >= 65 ? '#d97706' : '#e11d48'}
          trend={stats.attendanceRate >= 80 ? 'up' : 'down'} trendLabel="This period" to="/attendance" />
        <KpiCard title="Active Programs" value={loading ? '…' : stats.totalPrograms}
          sub={`${stats.upcomingCount} upcoming sessions`}
          icon={Calendar} color="bg-[#7c3aed]" accentColor="#8b5cf6" trend="neutral" trendLabel="Scheduled" to="/weekly-programs" />
      </div>

      {/* Sub-department overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sub-Department Overview</CardTitle>
          <CardDescription>Active programs per sub-department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {subDepts.map((sd, i) => (
              <Link key={sd.id} to={`/subdepartment/${sd.id}`}>
                <div className="rounded-xl p-4 border-2 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderColor: `${COLORS[i % COLORS.length]}40`, backgroundColor: `${COLORS[i % COLORS.length]}08` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-semibold text-sm truncate">{sd.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Programs</span>
                    <span className="font-medium text-foreground">{sd.programCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Programs per Sub-Department</CardTitle>
            <CardDescription>Active weekly programs breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={memberDistData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="members" name="Programs" radius={[0, 6, 6, 0]}>
                  {memberDistData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Children by Kutr</CardTitle>
            <CardDescription>Distribution across levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={kutrData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {kutrData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Upcoming Sessions</CardTitle>
              <CardDescription>Next scheduled program sessions</CardDescription>
            </div>
            <Link to="/weekly-programs">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming sessions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((s: any) => (
                <div key={s.session_id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-10 rounded-full flex-shrink-0 bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.program_title}</p>
                    <p className="text-xs text-muted-foreground">{s.session_date} · {s.start_time ?? ''} · {s.sub_department_name ?? ''}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Child',         icon: Users,       to: '/register/child',    color: '#0d7377' },
              { label: 'Add Member',        icon: UserCog,     to: '/register/member',   color: '#f59e0b' },
              { label: 'Programs',          icon: Calendar,    to: '/weekly-programs',   color: '#8b5cf6' },
              { label: 'Create Event',      icon: PartyPopper, to: '/events',            color: '#10b981' },
              { label: 'Attendance',        icon: Activity,    to: '/attendance',        color: '#f43f5e' },
              { label: 'Member Activities', icon: BarChart3,   to: '/member-activities', color: '#14b8a6' },
              { label: 'Timhert Academic',  icon: FileText,    to: '/timhert',           color: '#d97706' },
              { label: 'Reports',           icon: Download,    to: '/reports',           color: '#475569' },
            ].map(({ label, icon: Icon, to, color }) => (
              <Link key={label} to={to}>
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs hover:shadow-md transition-all">
                  <Icon className="w-5 h-5" style={{ color }} />
                  <span>{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

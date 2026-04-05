import {
  Users, UserCog, Calendar, PartyPopper, TrendingUp, TrendingDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Plus, FileText,
  Download, RefreshCw, ArrowUpRight, Bell, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router';
import { useState } from 'react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

// ── Helpers ────────────────────────────────────────────────────────────────

function attendanceRate(records: { status: string }[]): number {
  if (!records.length) return 0;
  return Math.round((records.filter(r => r.status === 'present').length / records.length) * 100);
}

function statusColor(rate: number): string {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 65) return 'text-yellow-600';
  return 'text-red-600';
}

function statusBadge(rate: number): string {
  if (rate >= 80) return 'bg-green-100 text-green-700';
  if (rate >= 65) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color, trend, trendLabel, to,
}: {
  title: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string; to?: string;
}) {
  const inner = (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
            <p className="text-3xl font-black text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trendLabel && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                {trend === 'neutral' && <Activity className="w-3 h-3 text-gray-500" />}
                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {to && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <span>View details</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function ChairpersonDashboard() {
  const { members, children } = useDataStore();
  const { attendance, slots, notifications } = useSchedule();
  const [lastRefresh] = useState(new Date());

  // ── KPI calculations ───────────────────────────────────────────────────

  const kutr1 = children.filter(c => c.kutrLevel === 1).length;
  const kutr2 = children.filter(c => c.kutrLevel === 2).length;
  const kutr3 = children.filter(c => c.kutrLevel === 3).length;

  const overallAttendanceRate = attendanceRate(attendance);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // ── Attendance trend (last 4 weeks) ───────────────────────────────────

  const attendanceTrends = (() => {
    if (!attendance.length) return [
      { week: 'Week 1', rate: 0 },
      { week: 'Week 2', rate: 0 },
      { week: 'Week 3', rate: 0 },
      { week: 'Week 4', rate: 0 },
    ];
    const byWeek: Record<string, { present: number; total: number }> = {};
    for (const rec of attendance) {
      const d = new Date(rec.date);
      const wk = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
      if (!byWeek[key]) byWeek[key] = { present: 0, total: 0 };
      byWeek[key].total += 1;
      if (rec.status === 'present') byWeek[key].present += 1;
    }
    return Object.keys(byWeek).sort().slice(-4).map((k, i) => ({
      week: `Week ${i + 1}`,
      rate: byWeek[k].total > 0 ? Math.round((byWeek[k].present / byWeek[k].total) * 100) : 0,
    }));
  })();

  // ── Sub-dept summary ───────────────────────────────────────────────────

  const subDeptSummary = subDepartments.map(sd => {
    const sdMembers = members.filter(m => m.subDepartments.includes(sd.name));
    const sdSlots = slots.filter(s => s.subDepartmentId === sd.id);
    const sdChildren = children.filter(c => c.kutrLevel >= 1); // all children participate
    const sdAttendance = attendance; // scoped attendance not available yet
    const rate = attendanceRate(sdAttendance);
    return {
      ...sd,
      memberCount: sdMembers.length,
      programCount: sdSlots.length,
      childrenCount: sdChildren.length,
      attendanceRate: rate,
      displayName: getSubDeptDisplayName(sd.name),
    };
  });

  // ── Children by Kutr ───────────────────────────────────────────────────

  const kutrData = [
    { name: 'Kutr 1', value: kutr1, color: '#3b82f6' },
    { name: 'Kutr 2', value: kutr2, color: '#8b5cf6' },
    { name: 'Kutr 3', value: kutr3, color: '#10b981' },
  ];

  // ── Member distribution by sub-dept ───────────────────────────────────

  const memberDistData = subDepartments.map((sd, i) => ({
    name: getSubDeptDisplayName(sd.name),
    members: members.filter(m => m.subDepartments.includes(sd.name)).length,
    fill: COLORS[i],
  }));

  // ── Low performer alerts ───────────────────────────────────────────────

  const lowAttendanceChildren = children.filter(c => {
    const recs = attendance.filter(a => a.childId === c.id);
    if (recs.length < 3) return false;
    return attendanceRate(recs) < 70;
  });

  // ── Upcoming slots ─────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];
  const upcomingSlots = slots
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hitsanat KFL — Full department overview
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            {lastRefresh.toLocaleTimeString()}
          </span>
          <Link to="/reports">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />Export
            </Button>
          </Link>
          <Link to="/register/child">
            <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#5f0113' }}>
              <Plus className="w-3.5 h-3.5" />Quick Add
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Children"
          value={children.length}
          sub={`Kutr 1: ${kutr1} · Kutr 2: ${kutr2} · Kutr 3: ${kutr3}`}
          icon={Users}
          color="bg-[#5f0113]"
          trend="up"
          trendLabel="Registered"
          to="/children"
        />
        <KpiCard
          title="Active Members"
          value={members.length}
          sub="University students"
          icon={UserCog}
          color="bg-[#f3c913]"
          trend="up"
          trendLabel="Enrolled"
          to="/members"
        />
        <KpiCard
          title="Attendance Rate"
          value={`${overallAttendanceRate}%`}
          sub={`${attendance.filter(a => a.status === 'present').length} present of ${attendance.length}`}
          icon={Activity}
          color={overallAttendanceRate >= 80 ? 'bg-green-600' : overallAttendanceRate >= 65 ? 'bg-yellow-500' : 'bg-red-600'}
          trend={overallAttendanceRate >= 80 ? 'up' : 'down'}
          trendLabel="This period"
          to="/attendance"
        />
        <KpiCard
          title="Program Slots"
          value={slots.length}
          sub={`${slots.filter(s => s.assignedMemberId).length} assigned`}
          icon={Calendar}
          color="bg-[#2c2c2c]"
          trend="neutral"
          trendLabel="Scheduled"
          to="/weekly-programs"
        />
      </div>

      {/* ── Alerts row ──────────────────────────────────────────────────── */}
      {(lowAttendanceChildren.length > 0 || unreadNotifications > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lowAttendanceChildren.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-700">Low Attendance Alert</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lowAttendanceChildren.length} children below 70% attendance
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lowAttendanceChildren.slice(0, 4).map(c => (
                      <Badge key={c.id} variant="outline" className="text-xs text-red-600 border-red-300">{c.name}</Badge>
                    ))}
                    {lowAttendanceChildren.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{lowAttendanceChildren.length - 4} more</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {unreadNotifications > 0 && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-700">Attendance Reports</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {unreadNotifications} unread submission{unreadNotifications !== 1 ? 's' : ''} from Kuttr
                  </p>
                  <Link to="/attendance">
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1">Review now →</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Sub-department summary grid ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sub-Department Overview</CardTitle>
          <CardDescription>Health status across all 5 sub-departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {subDeptSummary.map(sd => (
              <Link key={sd.id} to={`/subdepartment/${sd.id}`}>
                <div
                  className="rounded-xl p-4 border-2 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderColor: `${sd.color}40`, backgroundColor: `${sd.color}08` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sd.color }} />
                    <span className="font-semibold text-sm truncate">{sd.displayName}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Members</span>
                      <span className="font-medium text-foreground">{sd.memberCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Programs</span>
                      <span className="font-medium text-foreground">{sd.programCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance</span>
                      <span className={`font-bold ${statusColor(sd.attendanceRate)}`}>{sd.attendanceRate}%</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${sd.attendanceRate}%`, backgroundColor: sd.color }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance Trend</CardTitle>
            <CardDescription>Weekly attendance rate (last 4 weeks)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Attendance']} />
                <Line type="monotone" dataKey="rate" stroke="#5f0113" strokeWidth={3} dot={{ r: 5, fill: '#5f0113' }} name="Rate" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Children by Kutr */}
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
                  {kutrData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Member distribution + upcoming programs ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Member distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Member Distribution</CardTitle>
            <CardDescription>Members per sub-department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={memberDistData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="members" radius={[0, 6, 6, 0]}>
                  {memberDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming programs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Programs</CardTitle>
                <CardDescription>Next scheduled slots</CardDescription>
              </div>
              <Link to="/weekly-programs">
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming programs</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSlots.map(slot => {
                  const sd = subDepartments.find(s => s.id === slot.subDepartmentId);
                  return (
                    <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: sd?.color ?? '#ccc' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sd ? getSubDeptDisplayName(sd.name) : 'Program'} — {slot.day}</p>
                        <p className="text-xs text-muted-foreground">{new Date(slot.date + 'T12:00:00').toLocaleDateString()} · {slot.startTime}–{slot.endTime}</p>
                      </div>
                      {slot.assignedMemberId
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Child', icon: Users, to: '/register/child', color: '#5f0113' },
              { label: 'Add Member', icon: UserCog, to: '/register/member', color: '#f3c913' },
              { label: 'Schedule Program', icon: Calendar, to: '/weekly-programs', color: '#3b82f6' },
              { label: 'Create Event', icon: PartyPopper, to: '/events', color: '#10b981' },
              { label: 'View Attendance', icon: Activity, to: '/attendance', color: '#8b5cf6' },
              { label: 'Member Activities', icon: BarChart3, to: '/member-activities', color: '#ec4899' },
              { label: 'Timhert Academic', icon: FileText, to: '/timhert', color: '#f59e0b' },
              { label: 'Reports', icon: Download, to: '/reports', color: '#2c2c2c' },
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

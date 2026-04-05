import { useState, useMemo } from 'react';
import {
  Users, Check, X, Clock, AlertTriangle, Download,
  Search, TrendingUp, TrendingDown, Activity, Bell,
  CheckCircle2, Baby, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useDataStore } from '../context/DataStore';
import { useSchedule, DayAttendance } from '../context/ScheduleStore';
import { useAuth } from '../context/AuthContext';
import { canMarkAttendance, UserRole } from '../lib/permissions';
import { Link } from 'react-router';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';

const KUTTR_COLOR = '#10b981';
const KUTR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; activeBg: string; icon: any }> = {
  present:  { label: 'Present',  bg: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',  activeBg: 'bg-green-500 text-white border-transparent', icon: Check },
  absent:   { label: 'Absent',   bg: 'bg-red-50 text-red-500 hover:bg-red-100 border-red-200',          activeBg: 'bg-red-500 text-white border-transparent',   icon: X },
  late:     { label: 'Late',     bg: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200', activeBg: 'bg-yellow-400 text-white border-transparent', icon: Clock },
  excused:  { label: 'Excused',  bg: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',      activeBg: 'bg-blue-500 text-white border-transparent',   icon: CheckCircle2 },
};

// ── Status button ─────────────────────────────────────────────────────────

function StatusBtn({ childId, childName, status, current, canMark, onMark }: {
  childId: string; childName: string; status: AttendanceStatus;
  current: AttendanceStatus | null; canMark: boolean;
  onMark: (id: string, name: string, s: AttendanceStatus) => void;
}) {
  const active = current === status;
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button
      disabled={!canMark}
      onClick={() => onMark(childId, childName, status)}
      title={cfg.label}
      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs font-bold
        ${active ? cfg.activeBg : cfg.bg}
        ${!canMark ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function KuttrDashboard() {
  const { user } = useAuth();
  const { children, members } = useDataStore();
  const { attendance, markAttendance, notifications } = useSchedule();

  const role = (user?.role ?? 'member') as UserRole;
  const canMark = canMarkAttendance(role, user?.subDepartment);

  const today = new Date().toISOString().split('T')[0];
  const dayName = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfWeek = new Date(today + 'T12:00:00').getDay();
  const programDay: 'Saturday' | 'Sunday' = dayOfWeek === 6 ? 'Saturday' : 'Sunday';

  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [kutrTab, setKutrTab] = useState<'1' | '2' | '3'>('1');

  // ── Helpers ─────────────────────────────────────────────────────────

  const getStatus = (childId: string): AttendanceStatus | null => {
    const rec = attendance.find(a => a.childId === childId && a.date === date);
    return (rec?.status as AttendanceStatus) ?? null;
  };

  const mark = (childId: string, childName: string, status: AttendanceStatus) => {
    if (getStatus(childId) === status) return;
    const record: Omit<DayAttendance, 'id'> = {
      date,
      day: new Date(date + 'T12:00:00').getDay() === 6 ? 'Saturday' : 'Sunday',
      childId,
      status,
      markedBy: user?.id ?? 'kuttr',
      markedAt: new Date().toISOString(),
    };
    markAttendance([record]);
    toast.success(`${childName} → ${status}`);
  };

  const markAllKutr = (kutrLevel: number, status: AttendanceStatus) => {
    const group = children.filter(c => c.kutrLevel === kutrLevel);
    const records: Omit<DayAttendance, 'id'>[] = group.map(c => ({
      date,
      day: new Date(date + 'T12:00:00').getDay() === 6 ? 'Saturday' : 'Sunday',
      childId: c.id,
      status,
      markedBy: user?.id ?? 'kuttr',
      markedAt: new Date().toISOString(),
    }));
    markAttendance(records);
    toast.success(`Kutr ${kutrLevel}: all marked as ${status}`);
  };

  const exportCSV = () => {
    const rows = children.map(c => `${c.id},${c.name},Kutr ${c.kutrLevel},${getStatus(c.id) ?? 'not marked'}`);
    const csv = ['ID,Name,Kutr,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stats ────────────────────────────────────────────────────────────

  const todayRecords = attendance.filter(a => a.date === date);
  const presentToday = todayRecords.filter(a => a.status === 'present').length;
  const absentToday = todayRecords.filter(a => a.status === 'absent').length;
  const lateToday = todayRecords.filter(a => a.status === 'late').length;
  const notMarked = children.length - todayRecords.length;
  const attendanceRate = children.length > 0 ? Math.round((presentToday / children.length) * 100) : 0;

  // Chronic absentees — missed 3+ consecutive (simplified: <50% overall)
  const chronicAbsentees = children.filter(c => {
    const recs = attendance.filter(a => a.childId === c.id);
    if (recs.length < 3) return false;
    return Math.round((recs.filter(r => r.status === 'present').length / recs.length) * 100) < 50;
  });

  // ── Per-Kutr stats ───────────────────────────────────────────────────

  const kutrStats = [1, 2, 3].map(level => {
    const group = children.filter(c => c.kutrLevel === level);
    const present = group.filter(c => getStatus(c.id) === 'present').length;
    return { level, total: group.length, present, rate: group.length > 0 ? Math.round((present / group.length) * 100) : 0 };
  });

  // ── Attendance trend (last 4 weeks) ──────────────────────────────────

  const attendanceTrend = useMemo(() => {
    const byWeek: Record<string, { present: number; total: number }> = {};
    for (const rec of attendance) {
      const d = new Date(rec.date);
      const wk = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
      if (!byWeek[key]) byWeek[key] = { present: 0, total: 0 };
      byWeek[key].total += 1;
      if (rec.status === 'present') byWeek[key].present += 1;
    }
    return Object.keys(byWeek).sort().slice(-6).map((k, i) => ({
      week: `W${i + 1}`,
      rate: byWeek[k].total > 0 ? Math.round((byWeek[k].present / byWeek[k].total) * 100) : 0,
    }));
  }, [attendance]);

  // ── Kuttr members ────────────────────────────────────────────────────

  const kuttrMembers = members.filter(m => m.subDepartments.includes('Kuttr'));

  // ── Filtered children for current tab ────────────────────────────────

  const kutrChildren = useMemo(() =>
    children.filter(c =>
      c.kutrLevel === parseInt(kutrTab) &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [children, kutrTab, search]
  );

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${KUTTR_COLOR}20` }}>
              <Users className="w-5 h-5" style={{ color: KUTTR_COLOR }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Kuttr Dashboard</h1>
              <p className="text-xs text-muted-foreground">የቁጥር ክፍል ዳሽቦርድ — Attendance Tracking</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {chronicAbsentees.length > 0 && (
            <Badge className="bg-red-100 text-red-700 gap-1">
              <Bell className="w-3 h-3" />{chronicAbsentees.length} chronic absentees
            </Badge>
          )}
          {notifications.filter(n => !n.read).length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 gap-1">
              <Bell className="w-3 h-3" />{notifications.filter(n => !n.read).length} unread reports
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          {canMark && (
            <Link to="/attendance">
              <Button size="sm" className="gap-1.5 font-bold" style={{ backgroundColor: KUTTR_COLOR }}>
                <CheckCircle2 className="w-3.5 h-3.5" />Mark Attendance
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Date selector + program info ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:border-green-500"
          />
        </div>
        <Badge className="bg-green-100 text-green-700">{dayName}</Badge>
        <Badge variant="outline">{programDay} Program</Badge>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search child..."
              className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-green-500 w-40"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Expected', value: children.length, color: 'text-foreground', bg: 'bg-gray-50' },
          { label: 'Present', value: presentToday, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Absent', value: absentToday, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Late', value: lateToday, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Not Marked', value: notMarked, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Attendance rate bar ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: KUTTR_COLOR }} />
              <span className="font-semibold text-sm">Today's Attendance Rate</span>
            </div>
            <div className="flex items-center gap-1">
              {attendanceRate >= 80
                ? <TrendingUp className="w-4 h-4 text-green-600" />
                : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span className={`text-xl font-black ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 65 ? 'text-yellow-600' : 'text-red-500'}`}>
                {attendanceRate}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${attendanceRate}%`,
                backgroundColor: attendanceRate >= 80 ? KUTTR_COLOR : attendanceRate >= 65 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{presentToday} present</span>
            <span>{children.length} total</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Per-Kutr summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kutrStats.map(k => (
          <Card key={k.level} className="border-t-4" style={{ borderTopColor: KUTR_COLORS[k.level - 1] }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4" style={{ color: KUTR_COLORS[k.level - 1] }} />
                  <span className="font-bold text-sm">Kutr {k.level}</span>
                </div>
                <span className={`text-lg font-black ${k.rate >= 80 ? 'text-green-600' : k.rate >= 65 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {k.rate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{k.present} / {k.total} present</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full" style={{ width: `${k.rate}%`, backgroundColor: KUTR_COLORS[k.level - 1] }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Live attendance marking ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: KUTTR_COLOR }} />
                Live Attendance Marking
              </CardTitle>
              <CardDescription>Mark children present, absent, late, or excused</CardDescription>
            </div>
            {canMark && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7 text-green-600 border-green-300"
                  onClick={() => markAllKutr(parseInt(kutrTab), 'present')}>
                  All Present
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 text-red-500 border-red-300"
                  onClick={() => markAllKutr(parseInt(kutrTab), 'absent')}>
                  All Absent
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={kutrTab} onValueChange={v => setKutrTab(v as '1' | '2' | '3')}>
            <TabsList className="mb-4">
              {[1, 2, 3].map(k => {
                const stat = kutrStats.find(s => s.level === k)!;
                return (
                  <TabsTrigger key={k} value={String(k)} className="gap-1.5">
                    Kutr {k}
                    <Badge variant="outline" className="text-xs ml-1">{stat.present}/{stat.total}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {['1', '2', '3'].map(tab => (
              <TabsContent key={tab} value={tab}>
                {kutrChildren.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Baby className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{search ? 'No children match your search' : 'No children in this group'}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {kutrChildren.map((child, idx) => {
                      const current = getStatus(child.id);
                      return (
                        <div
                          key={child.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                            current === 'present' ? 'border-green-200 bg-green-50/50' :
                            current === 'absent' ? 'border-red-200 bg-red-50/50' :
                            current === 'late' ? 'border-yellow-200 bg-yellow-50/50' :
                            'border-border hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{child.name}</p>
                            <p className="text-xs text-muted-foreground">{child.familyName}</p>
                          </div>
                          {current && (
                            <Badge className={
                              current === 'present' ? 'bg-green-100 text-green-700' :
                              current === 'absent' ? 'bg-red-100 text-red-700' :
                              current === 'late' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            } style={{ fontSize: '10px' }}>
                              {current}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(s => (
                              <StatusBtn
                                key={s}
                                childId={child.id}
                                childName={child.name}
                                status={s}
                                current={current}
                                canMark={canMark}
                                onMark={mark}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Attendance trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance Trend</CardTitle>
            <CardDescription>Weekly rate over recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Rate']} />
                  <Line type="monotone" dataKey="rate" stroke={KUTTR_COLOR} strokeWidth={3} dot={{ r: 4, fill: KUTTR_COLOR }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No attendance data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kutr comparison */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kutr Comparison</CardTitle>
            <CardDescription>Today's attendance by group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kutrStats.map(k => ({ name: `Kutr ${k.level}`, present: k.present, absent: k.total - k.present }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Present" fill={KUTTR_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Chronic absentees ────────────────────────────────────────────── */}
      {chronicAbsentees.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Chronic Absentees ({chronicAbsentees.length})
            </CardTitle>
            <CardDescription>Children with less than 50% attendance — needs follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {chronicAbsentees.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50">
                  <span className="text-sm font-medium text-red-700">{c.name}</span>
                  <Badge variant="outline" className="text-xs border-red-300 text-red-600">Kutr {c.kutrLevel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kuttr members ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Kuttr Supervisors</CardTitle>
              <CardDescription>Members assigned to attendance tracking</CardDescription>
            </div>
            <Link to="/members">
              <Button variant="ghost" size="sm" className="text-xs">Manage</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {kuttrMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No members assigned to Kuttr yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {kuttrMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: KUTTR_COLOR }}>
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Year {m.yearOfStudy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

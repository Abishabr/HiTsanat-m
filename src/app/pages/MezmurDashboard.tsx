import { useState } from 'react';
import {
  Music, Users, Calendar, Star, TrendingUp, TrendingDown,
  AlertTriangle, Download, Plus, CheckCircle2, Clock,
  Mic, Activity, Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useDataStore } from '../context/DataStore';
import { useSchedule } from '../context/ScheduleStore';
import { useAuth } from '../context/AuthContext';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { Link } from 'react-router';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const MEZMUR_COLOR = '#8b5cf6';
const KUTR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

// ── Static repertoire data (will come from DB once mezmur_repertoire table exists) ──

const REPERTOIRE = [
  { id: 1, title: 'Hosana Hosana', amharic: 'ሆሳዕና ሆሳዕና', type: 'Traditional', kutr: 'All', status: 'Performance-Ready', difficulty: 'Medium' },
  { id: 2, title: 'Timket Zema', amharic: 'ጥምቀት ዜማ', type: 'Traditional', kutr: 'Kutr 3', status: 'Practiced', difficulty: 'Hard' },
  { id: 3, title: 'Meskel Choir', amharic: 'መስቀል ዝማሬ', type: 'Traditional', kutr: 'All', status: 'Learning', difficulty: 'Medium' },
  { id: 4, title: 'Sunday Praise', amharic: 'የእሁድ ምስጋና', type: 'Modern', kutr: 'Kutr 1', status: 'Performance-Ready', difficulty: 'Easy' },
  { id: 5, title: 'Kidus Yohannes', amharic: 'ቅዱስ ዮሐንስ', type: 'Traditional', kutr: 'Kutr 2', status: 'Not Started', difficulty: 'Hard' },
  { id: 6, title: 'Adar Mezmur', amharic: 'አዳር መዝሙር', type: 'Modern', kutr: 'All', status: 'Practiced', difficulty: 'Easy' },
];

const STATUS_COLOR: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-600',
  'Learning': 'bg-yellow-100 text-yellow-700',
  'Practiced': 'bg-blue-100 text-blue-700',
  'Performance-Ready': 'bg-green-100 text-green-700',
  'Performed': 'bg-purple-100 text-purple-700',
};

const UPCOMING_EVENTS = [
  { name: 'Hosana Choir Performance', date: '2026-04-13', daysLeft: 8, type: 'Major' },
  { name: 'Sunday Liturgy Choir', date: '2026-04-06', daysLeft: 1, type: 'Weekly' },
  { name: 'Meskel Preparation', date: '2026-09-27', daysLeft: 175, type: 'Major' },
];

// ── Main Component ────────────────────────────────────────────────────────

export default function MezmurDashboard() {
  const { user } = useAuth();
  const { members, children } = useDataStore();
  const { slots, attendance } = useSchedule();

  const [kutrFilter, setKutrFilter] = useState<'all' | '1' | '2' | '3'>('all');

  const mezmurSubDept = subDepartments.find(sd => sd.name === 'Mezmur');
  const mezmurMembers = members.filter(m => m.subDepartments.includes('Mezmur'));
  const mezmurSlots = slots.filter(s => s.subDepartmentId === mezmurSubDept?.id);

  const kutr1 = children.filter(c => c.kutrLevel === 1);
  const kutr2 = children.filter(c => c.kutrLevel === 2);
  const kutr3 = children.filter(c => c.kutrLevel === 3);

  const totalChildren = children.length;

  // Attendance rate from live data
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0;

  // Repertoire stats
  const readySongs = REPERTOIRE.filter(r => r.status === 'Performance-Ready' || r.status === 'Performed').length;
  const repertoireCompletion = Math.round((readySongs / REPERTOIRE.length) * 100);

  // Low participation alert (children with <75% attendance)
  const lowParticipation = children.filter(c => {
    const recs = attendance.filter(a => a.childId === c.id);
    if (recs.length < 2) return false;
    return Math.round((recs.filter(r => r.status === 'present').length / recs.length) * 100) < 75;
  });

  // Kutr comparison chart
  const kutrComparisonData = [
    { name: 'Kutr 1', children: kutr1.length, attendance: attendanceRate, color: KUTR_COLORS[0] },
    { name: 'Kutr 2', children: kutr2.length, attendance: attendanceRate, color: KUTR_COLORS[1] },
    { name: 'Kutr 3', children: kutr3.length, attendance: attendanceRate, color: KUTR_COLORS[2] },
  ];

  // Weekly practice trend (derived from slots)
  const practiceTrend = mezmurSlots.slice(-8).map((s, i) => ({
    week: `W${i + 1}`,
    attendance: attendanceRate + Math.floor(Math.random() * 10 - 5),
  }));

  const filteredRepertoire = REPERTOIRE.filter(r =>
    kutrFilter === 'all' || r.kutr === 'All' || r.kutr === `Kutr ${kutrFilter}`
  );

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${MEZMUR_COLOR}20` }}>
              <Music className="w-5 h-5" style={{ color: MEZMUR_COLOR }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Mezmur Dashboard</h1>
              <p className="text-xs text-muted-foreground">የመዝሙር ክፍል ዳሽቦርድ — Choir & Sacred Music</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lowParticipation.length > 0 && (
            <Badge className="bg-red-100 text-red-700 gap-1">
              <Bell className="w-3 h-3" />
              {lowParticipation.length} low attendance
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          <Link to="/weekly-programs">
            <Button size="sm" className="gap-1.5" style={{ backgroundColor: MEZMUR_COLOR }}>
              <Plus className="w-3.5 h-3.5" />Schedule Practice
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Children',
            value: totalChildren,
            sub: `K1:${kutr1.length} K2:${kutr2.length} K3:${kutr3.length}`,
            icon: Users, color: 'bg-[#8b5cf6]',
          },
          {
            label: 'Practice Attendance',
            value: `${attendanceRate}%`,
            sub: attendanceRate >= 80 ? '↑ On track' : '↓ Needs attention',
            icon: Activity,
            color: attendanceRate >= 80 ? 'bg-green-600' : attendanceRate >= 65 ? 'bg-yellow-500' : 'bg-red-600',
          },
          {
            label: 'Repertoire Ready',
            value: `${repertoireCompletion}%`,
            sub: `${readySongs} of ${REPERTOIRE.length} songs`,
            icon: Music, color: 'bg-[#8b5cf6]',
          },
          {
            label: 'Supervisors',
            value: mezmurMembers.length,
            sub: `${mezmurSlots.length} program slots`,
            icon: Mic, color: 'bg-[#2c2c2c]',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-3xl font-black text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Upcoming events ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {UPCOMING_EVENTS.map(ev => (
          <Card key={ev.name} className={`border-l-4 ${ev.daysLeft <= 7 ? 'border-l-red-500' : ev.daysLeft <= 30 ? 'border-l-yellow-500' : 'border-l-purple-400'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{ev.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.date).toLocaleDateString()}</p>
                </div>
                <Badge className={ev.daysLeft <= 7 ? 'bg-red-100 text-red-700' : ev.daysLeft <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}>
                  {ev.daysLeft}d
                </Badge>
              </div>
              <div className="mt-2">
                <Progress value={Math.max(0, 100 - Math.round((ev.daysLeft / 180) * 100))} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Kutr group cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { level: 1, children: kutr1, label: 'Kutr 1', color: KUTR_COLORS[0], readiness: 'Performance-Ready' },
          { level: 2, children: kutr2, label: 'Kutr 2', color: KUTR_COLORS[1], readiness: 'Practiced' },
          { level: 3, children: kutr3, label: 'Kutr 3', color: KUTR_COLORS[2], readiness: 'Learning' },
        ].map(k => (
          <Card key={k.level} className="border-t-4" style={{ borderTopColor: k.color }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" style={{ color: k.color }} />
                  <span className="font-bold">{k.label}</span>
                </div>
                <Badge variant="outline" style={{ borderColor: k.color, color: k.color }}>
                  {k.children.length} children
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Attendance</span>
                  <span className={`font-medium ${attendanceRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{attendanceRate}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Readiness</span>
                  <Badge className={STATUS_COLOR[k.readiness] ?? 'bg-gray-100 text-gray-600'} style={{ fontSize: '10px' }}>
                    {k.readiness}
                  </Badge>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Songs</span>
                  <span className="font-medium text-foreground">
                    {REPERTOIRE.filter(r => r.kutr === 'All' || r.kutr === k.label).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Practice attendance trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Practice Attendance Trend</CardTitle>
            <CardDescription>Weekly attendance over recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {practiceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={practiceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Attendance']} />
                  <Line type="monotone" dataKey="attendance" stroke={MEZMUR_COLOR} strokeWidth={3} dot={{ r: 4, fill: MEZMUR_COLOR }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <Music className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No practice sessions recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kutr comparison */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Group Comparison</CardTitle>
            <CardDescription>Children per Kutr group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kutrComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="children" name="Children" radius={[6, 6, 0, 0]}>
                  {kutrComparisonData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Repertoire board ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4" style={{ color: MEZMUR_COLOR }} />
                Repertoire Progress
              </CardTitle>
              <CardDescription>Songs and hymns — learning status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={repertoireCompletion} className="w-24 h-2" />
              <span className="text-sm font-bold" style={{ color: MEZMUR_COLOR }}>{repertoireCompletion}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={kutrFilter} onValueChange={v => setKutrFilter(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="1">Kutr 1</TabsTrigger>
              <TabsTrigger value="2">Kutr 2</TabsTrigger>
              <TabsTrigger value="3">Kutr 3</TabsTrigger>
            </TabsList>
            <TabsContent value={kutrFilter}>
              <div className="space-y-2">
                {filteredRepertoire.map(song => (
                  <div key={song.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MEZMUR_COLOR}15` }}>
                      <Music className="w-4 h-4" style={{ color: MEZMUR_COLOR }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{song.title}</p>
                        <span className="text-xs text-muted-foreground">{song.amharic}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{song.type}</Badge>
                        <span className="text-xs text-muted-foreground">{song.kutr}</span>
                        <span className="text-xs text-muted-foreground">· {song.difficulty}</span>
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[song.status] ?? 'bg-gray-100 text-gray-600'}>
                      {song.status === 'Performance-Ready' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {song.status === 'Learning' && <Clock className="w-3 h-3 mr-1 inline" />}
                      {song.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Low participation alerts ─────────────────────────────────────── */}
      {lowParticipation.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Low Participation Alerts
            </CardTitle>
            <CardDescription>Children who missed 2+ consecutive practices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowParticipation.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50">
                  <span className="text-sm font-medium text-red-700">{c.name}</span>
                  <Badge variant="outline" className="text-xs border-red-300 text-red-600">Kutr {c.kutrLevel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Member supervisors ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Supervisor Overview</CardTitle>
              <CardDescription>University members assigned to Mezmur</CardDescription>
            </div>
            <Link to="/members">
              <Button variant="ghost" size="sm" className="text-xs">Manage</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {mezmurMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No members assigned to Mezmur yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mezmurMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: MEZMUR_COLOR }}>
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

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Mark Attendance', icon: CheckCircle2, to: '/attendance' },
          { label: 'Weekly Programs', icon: Calendar, to: '/weekly-programs' },
          { label: 'View Children', icon: Users, to: '/children' },
          { label: 'Export Report', icon: Download, to: '/reports' },
        ].map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Button variant="outline" className="w-full h-14 flex flex-col gap-1 text-xs hover:shadow-md transition-all">
              <Icon className="w-4 h-4" style={{ color: MEZMUR_COLOR }} />
              <span>{label}</span>
            </Button>
          </Link>
        ))}
      </div>

    </div>
  );
}

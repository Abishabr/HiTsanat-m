import { useState } from 'react';
import {
  Palette, Film, Music2, Star, Users, Calendar, Plus,
  Download, Bell, TrendingUp, CheckCircle2, Clock,
  AlertTriangle, Image, Mic2, Feather, Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useDataStore } from '../context/DataStore';
import { useSchedule } from '../context/ScheduleStore';
import { subDepartments } from '../data/mockData';
import { Link } from 'react-router';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const KINETIBEB_COLOR = '#ec4899';
const KUTR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

// ── Static project data (will come from kinetibeb_projects table) ──────────

const ART_TYPES = ['Drawing', 'Drama', 'Film', 'Traditional Dance', 'Crafts', 'Poetry'];

const ART_TYPE_CONFIG: Record<string, { color: string; icon: any }> = {
  Drawing:          { color: '#f59e0b', icon: Palette },
  Drama:            { color: '#ec4899', icon: Mic2 },
  Film:             { color: '#8b5cf6', icon: Film },
  'Traditional Dance': { color: '#10b981', icon: Music2 },
  Crafts:           { color: '#3b82f6', icon: Layers },
  Poetry:           { color: '#ef4444', icon: Feather },
};

const PROJECTS = [
  { id: 1, title: 'Meskel Bonfire Drama', theme: 'Ethiopian Orthodox Tradition', type: 'Drama', kutr: 'All', status: 'In Progress', progress: 65, children: 42, daysLeft: 18 },
  { id: 2, title: "Noah's Ark Animation", theme: 'Biblical Stories', type: 'Film', kutr: 'Kutr 3', status: 'Planning', progress: 20, children: 15, daysLeft: 45 },
  { id: 3, title: 'Timket Artwork Exhibition', theme: 'Baptism of Christ', type: 'Drawing', kutr: 'All', status: 'Completed', progress: 100, children: 68, daysLeft: 0 },
  { id: 4, title: 'Traditional Dance Showcase', theme: 'Ethiopian Heritage', type: 'Traditional Dance', kutr: 'Kutr 2', status: 'In Progress', progress: 50, children: 28, daysLeft: 12 },
  { id: 5, title: 'Easter Crafts Workshop', theme: 'Resurrection', type: 'Crafts', kutr: 'Kutr 1', status: 'Planning', progress: 10, children: 35, daysLeft: 30 },
  { id: 6, title: 'Saints Lives Poetry', theme: 'Ethiopian Saints', type: 'Poetry', kutr: 'Kutr 3', status: 'In Progress', progress: 75, children: 18, daysLeft: 7 },
];

const UPCOMING_EVENTS = [
  { name: 'Kinetibeb Exhibition – Meskel', date: '2026-09-27', daysLeft: 18, type: 'Exhibition' },
  { name: 'Drama Show – Hosana', date: '2026-04-13', daysLeft: 8, type: 'Performance' },
  { name: 'Film Screening – Adar Program', date: '2026-05-15', daysLeft: 40, type: 'Screening' },
];

const ARTWORKS = [
  { id: 1, title: 'Meskel Cross Drawing', child: 'Abigail T.', kutr: 1, type: 'Drawing', emoji: '✝️' },
  { id: 2, title: 'Timket Scene', child: 'Caleb M.', kutr: 3, type: 'Drawing', emoji: '💧' },
  { id: 3, title: 'Drama Script – Noah', child: 'Feven A.', kutr: 3, type: 'Drama', emoji: '🎭' },
  { id: 4, title: 'Traditional Basket', child: 'Gelila S.', kutr: 2, type: 'Crafts', emoji: '🧺' },
  { id: 5, title: 'Praise Poem', child: 'Elias G.', kutr: 2, type: 'Poetry', emoji: '📜' },
  { id: 6, title: 'Eskista Dance', child: 'Dagmawit Y.', kutr: 1, type: 'Traditional Dance', emoji: '💃' },
];

const STATUS_COLOR: Record<string, string> = {
  'Planning':    'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed':   'bg-green-100 text-green-700',
  'Exhibited':   'bg-purple-100 text-purple-700',
};

// ── Main Component ────────────────────────────────────────────────────────

export default function KinetibebDashboard() {
  const { children, members } = useDataStore();
  const { attendance, slots } = useSchedule();

  const [artFilter, setArtFilter] = useState<string>('all');
  const [kutrFilter, setKutrFilter] = useState<'all' | '1' | '2' | '3'>('all');

  const kinetibebSubDept = subDepartments.find(sd => sd.name === 'Kinetibeb');
  const kinetibebMembers = members.filter(m => m.subDepartments.includes('Kinetibeb'));
  const kinetibebSlots = slots.filter(s => s.subDepartmentId === kinetibebSubDept?.id);

  const kutr1 = children.filter(c => c.kutrLevel === 1);
  const kutr2 = children.filter(c => c.kutrLevel === 2);
  const kutr3 = children.filter(c => c.kutrLevel === 3);

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0;

  const activeProjects = PROJECTS.filter(p => p.status === 'In Progress').length;
  const completedProjects = PROJECTS.filter(p => p.status === 'Completed').length;

  // Low participation
  const lowParticipation = children.filter(c => {
    const recs = attendance.filter(a => a.childId === c.id);
    if (recs.length < 2) return false;
    return Math.round((recs.filter(r => r.status === 'present').length / recs.length) * 100) < 70;
  });

  // Participation by art type (simulated)
  const artTypeData = ART_TYPES.map(type => ({
    type,
    children: PROJECTS.filter(p => p.type === type).reduce((sum, p) => sum + p.children, 0),
    fill: ART_TYPE_CONFIG[type]?.color ?? '#ccc',
  }));

  // Monthly trend (simulated from slots)
  const monthlyTrend = kinetibebSlots.slice(-6).map((_, i) => ({
    month: `M${i + 1}`,
    participation: attendanceRate + Math.floor(Math.random() * 15 - 7),
  }));

  const filteredProjects = PROJECTS.filter(p => {
    const matchArt = artFilter === 'all' || p.type === artFilter;
    const matchKutr = kutrFilter === 'all' || p.kutr === 'All' || p.kutr === `Kutr ${kutrFilter}`;
    return matchArt && matchKutr;
  });

  const filteredArtworks = ARTWORKS.filter(a => {
    const matchArt = artFilter === 'all' || a.type === artFilter;
    const matchKutr = kutrFilter === 'all' || a.kutr === parseInt(kutrFilter);
    return matchArt && matchKutr;
  });

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${KINETIBEB_COLOR}20` }}>
              <Palette className="w-5 h-5" style={{ color: KINETIBEB_COLOR }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Kinetibeb Dashboard</h1>
              <p className="text-xs text-muted-foreground">የክነትብብ ክፍል ዳሽቦርድ — Arts, Film & Cultural Activities</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lowParticipation.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 gap-1">
              <Bell className="w-3 h-3" />{lowParticipation.length} low participation
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          <Button size="sm" className="gap-1.5" style={{ backgroundColor: KINETIBEB_COLOR }}>
            <Plus className="w-3.5 h-3.5" />New Project
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: children.length, sub: `K1:${kutr1.length} K2:${kutr2.length} K3:${kutr3.length}`, icon: Users, color: 'bg-[#ec4899]' },
          { label: 'Active Projects', value: activeProjects, sub: `${completedProjects} completed`, icon: Layers, color: 'bg-[#8b5cf6]' },
          { label: 'Participation', value: `${attendanceRate}%`, sub: 'This period', icon: TrendingUp, color: attendanceRate >= 80 ? 'bg-green-600' : 'bg-yellow-500' },
          { label: 'Supervisors', value: kinetibebMembers.length, sub: `${kinetibebSlots.length} sessions`, icon: Star, color: 'bg-[#f59e0b]' },
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
          <Card key={ev.name} className={`border-l-4 ${ev.daysLeft <= 10 ? 'border-l-red-500' : ev.daysLeft <= 30 ? 'border-l-yellow-500' : 'border-l-pink-400'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{ev.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.date).toLocaleDateString()}</p>
                  <Badge variant="outline" className="text-xs mt-1">{ev.type}</Badge>
                </div>
                <Badge className={ev.daysLeft <= 10 ? 'bg-red-100 text-red-700' : ev.daysLeft <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-pink-100 text-pink-700'}>
                  {ev.daysLeft}d
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Filter:</span>
        {['all', ...ART_TYPES].map(type => (
          <button
            key={type}
            onClick={() => setArtFilter(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              artFilter === type
                ? 'text-white border-transparent'
                : 'border-border text-muted-foreground hover:border-pink-300'
            }`}
            style={artFilter === type ? { backgroundColor: ART_TYPE_CONFIG[type]?.color ?? KINETIBEB_COLOR } : {}}
          >
            {type === 'all' ? 'All Types' : type}
          </button>
        ))}
        <div className="ml-2 flex gap-1">
          {(['all', '1', '2', '3'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKutrFilter(k)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                kutrFilter === k ? 'text-white border-transparent' : 'border-border text-muted-foreground'
              }`}
              style={kutrFilter === k ? { backgroundColor: k === 'all' ? KINETIBEB_COLOR : KUTR_COLORS[parseInt(k) - 1] } : {}}
            >
              {k === 'all' ? 'All Kutrs' : `K${k}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects grid ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => {
            const cfg = ART_TYPE_CONFIG[project.type];
            const Icon = cfg?.icon ?? Palette;
            return (
              <Card key={project.id} className="hover:shadow-lg transition-all group overflow-hidden">
                <div className="h-2" style={{ backgroundColor: cfg?.color ?? KINETIBEB_COLOR }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg?.color ?? KINETIBEB_COLOR}20` }}>
                        <Icon className="w-4 h-4" style={{ color: cfg?.color ?? KINETIBEB_COLOR }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{project.theme}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[project.status] ?? 'bg-gray-100 text-gray-600'} style={{ fontSize: '10px', flexShrink: 0 }}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.children} children</span>
                    <span>{project.kutr}</span>
                    {project.daysLeft > 0 && (
                      <span className={`flex items-center gap-1 ${project.daysLeft <= 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <Clock className="w-3 h-3" />{project.daysLeft}d left
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="col-span-3 text-center py-10 text-muted-foreground">
              <Palette className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No projects match the current filters</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Artwork gallery ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4" style={{ color: KINETIBEB_COLOR }} />
                Recent Artworks & Creations
              </CardTitle>
              <CardDescription>Children's latest works across all art forms</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Plus className="w-3 h-3" />Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {filteredArtworks.map(art => {
              const cfg = ART_TYPE_CONFIG[art.type];
              return (
                <div
                  key={art.id}
                  className="rounded-xl border border-border p-3 text-center hover:shadow-md transition-all cursor-pointer group"
                  style={{ backgroundColor: `${cfg?.color ?? KINETIBEB_COLOR}08` }}
                >
                  <div className="text-3xl mb-2">{art.emoji}</div>
                  <p className="text-xs font-medium truncate">{art.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{art.child}</p>
                  <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: cfg?.color, color: cfg?.color, fontSize: '9px' }}>
                    {art.type}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Participation by art type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Participation by Art Type</CardTitle>
            <CardDescription>Children involved per creative discipline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={artTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="children" name="Children" radius={[0, 6, 6, 0]}>
                  {artTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly participation trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Participation Trend</CardTitle>
            <CardDescription>Monthly engagement over recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Participation']} />
                  <Line type="monotone" dataKey="participation" stroke={KINETIBEB_COLOR} strokeWidth={3} dot={{ r: 4, fill: KINETIBEB_COLOR }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <Palette className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No session data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Low participation alerts ─────────────────────────────────────── */}
      {lowParticipation.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              Low Participation ({lowParticipation.length} children)
            </CardTitle>
            <CardDescription>Children not actively joining projects — consider follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowParticipation.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50">
                  <span className="text-sm font-medium text-orange-700">{c.name}</span>
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">Kutr {c.kutrLevel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Supervisors + quick actions ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Art Supervisors</CardTitle>
                <CardDescription>Members guiding Kinetibeb projects</CardDescription>
              </div>
              <Link to="/members">
                <Button variant="ghost" size="sm" className="text-xs">Manage</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {kinetibebMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No members assigned to Kinetibeb yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {kinetibebMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: KINETIBEB_COLOR }}>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Project', icon: Plus, to: '/member-activities' },
                { label: 'View Children', icon: Users, to: '/children' },
                { label: 'Weekly Programs', icon: Calendar, to: '/weekly-programs' },
                { label: 'Export Report', icon: Download, to: '/reports' },
              ].map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to}>
                  <Button variant="outline" className="w-full h-14 flex flex-col gap-1 text-xs hover:shadow-md transition-all">
                    <Icon className="w-4 h-4" style={{ color: KINETIBEB_COLOR }} />
                    <span>{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

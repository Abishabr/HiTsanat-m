import { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, FileText, Award, TrendingUp, TrendingDown,
  AlertCircle, AlertTriangle, Search, Download, BookOpen, Users,
  CheckCircle2, Clock, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { type TimhertActivity } from '../data/mockData';
import { useDataStore } from '../context/DataStore';
import { useAuth } from '../context/AuthContext';
import { canManageAcademics, UserRole } from '../lib/permissions';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ── DB row type & mapper ───────────────────────────────────────────────────

interface TimhertActivityRow {
  id: string; name: string; type: 'Midterm' | 'Final' | 'Assignment';
  kutr_level: 1 | 2 | 3; max_score: number; date: string;
  status: 'scheduled' | 'completed'; created_at?: string;
}

function rowToActivity(row: TimhertActivityRow): TimhertActivity {
  return { id: row.id, name: row.name, type: row.type, kutrLevel: row.kutr_level, maxScore: row.max_score, date: row.date, status: row.status };
}

// ── Hook ──────────────────────────────────────────────────────────────────

function useTimhertActivities() {
  const [data, setData] = useState<TimhertActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) { setData([]); setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: rows, error: e } = await supabase.from('timhert_activities').select('*').order('date', { ascending: true });
        if (cancelled) return;
        if (e) { setError(e.message); } else { setData((rows as TimhertActivityRow[]).map(rowToActivity)); }
      } catch (err) { if (!cancelled) setError(String(err)); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function create(activity: Omit<TimhertActivity, 'id'>) {
    if (DEMO_MODE) { setData(prev => [...prev, { ...activity, id: `ta${Date.now()}` }]); return; }
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: rows, error: e } = await supabase.from('timhert_activities')
        .insert([{ name: activity.name, type: activity.type, kutr_level: activity.kutrLevel, max_score: activity.maxScore, date: activity.date, status: activity.status }])
        .select();
      if (e) { setError(e.message); return; }
      if (rows?.length) setData(prev => [...prev, rowToActivity(rows[0] as TimhertActivityRow)]);
    } catch (err) { setError(String(err)); }
  }

  async function updateStatus(id: string, status: TimhertActivity['status']) {
    if (DEMO_MODE) { setData(prev => prev.map(a => a.id === id ? { ...a, status } : a)); return; }
    try {
      const { supabase } = await import('../../lib/supabase');
      const { error: e } = await supabase.from('timhert_activities').update({ status }).eq('id', id);
      if (e) { setError(e.message); return; }
      setData(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) { setError(String(err)); }
  }

  return { data, isLoading, error, create, updateStatus };
}

// ── Helpers ───────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  Midterm: 'bg-blue-100 text-blue-700',
  Final: 'bg-purple-100 text-purple-700',
  Assignment: 'bg-green-100 text-green-700',
};

const KUTR_COLOR = ['#3b82f6', '#8b5cf6', '#10b981'];

// ── Main Component ────────────────────────────────────────────────────────

export default function TimhertAcademic() {
  const { user } = useAuth();
  const { children } = useDataStore();
  const { data: activities, isLoading, error, create, updateStatus } = useTimhertActivities();

  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageAcademics(role, user?.subDepartment);

  const [kutrFilter, setKutrFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [activityName, setActivityName] = useState('');
  const [activityType, setActivityType] = useState<TimhertActivity['type'] | ''>('');
  const [kutrLevel, setKutrLevel] = useState<'1' | '2' | '3' | ''>('');
  const [maxScore, setMaxScore] = useState('');
  const [activityDate, setActivityDate] = useState('');

  // ── Derived data ─────────────────────────────────────────────────────

  const kutr1Children = children.filter(c => c.kutrLevel === 1);
  const kutr2Children = children.filter(c => c.kutrLevel === 2);
  const kutr3Children = children.filter(c => c.kutrLevel === 3);

  const completedActivities = activities.filter(a => a.status === 'completed');
  const scheduledActivities = activities.filter(a => a.status === 'scheduled');

  const filteredActivities = activities.filter(a => {
    const matchKutr = kutrFilter === 'all' || a.kutrLevel.toString() === kutrFilter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchKutr && matchSearch;
  });

  // Kutr class summary cards
  const kutrSummary = [
    { level: 1, children: kutr1Children, color: '#3b82f6', label: 'Kutr 1' },
    { level: 2, children: kutr2Children, color: '#8b5cf6', label: 'Kutr 2' },
    { level: 3, children: kutr3Children, color: '#10b981', label: 'Kutr 3' },
  ].map(k => ({
    ...k,
    activities: activities.filter(a => a.kutrLevel === k.level),
    completed: activities.filter(a => a.kutrLevel === k.level && a.status === 'completed').length,
  }));

  // Performance trend (derived from activity dates)
  const performanceTrend = (() => {
    const byMonth: Record<string, { k1: number; k2: number; k3: number; count: number }> = {};
    for (const a of completedActivities) {
      const m = a.date.slice(0, 7); // YYYY-MM
      if (!byMonth[m]) byMonth[m] = { k1: 0, k2: 0, k3: 0, count: 0 };
      byMonth[m].count += 1;
    }
    return Object.keys(byMonth).sort().slice(-6).map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
      'Kutr 1': kutr1Children.length,
      'Kutr 2': kutr2Children.length,
      'Kutr 3': kutr3Children.length,
    }));
  })();

  // Score distribution (simulated from max scores)
  const scoreDistribution = [
    { range: '0–50', count: Math.max(0, Math.floor(children.length * 0.08)) },
    { range: '51–70', count: Math.max(0, Math.floor(children.length * 0.22)) },
    { range: '71–85', count: Math.max(0, Math.floor(children.length * 0.45)) },
    { range: '86–100', count: Math.max(0, Math.floor(children.length * 0.25)) },
  ];

  // Upcoming activities
  const today = new Date().toISOString().split('T')[0];
  const upcoming = activities.filter(a => a.date >= today && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  async function handleCreate() {
    if (!activityName || !activityType || !kutrLevel || !maxScore || !activityDate) return;
    await create({ name: activityName, type: activityType as TimhertActivity['type'], kutrLevel: parseInt(kutrLevel) as 1 | 2 | 3, maxScore: parseInt(maxScore), date: activityDate, status: 'scheduled' });
    setActivityName(''); setActivityType(''); setKutrLevel(''); setMaxScore(''); setActivityDate('');
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">Timhert Dashboard</h1>
            <Badge className="bg-blue-100 text-blue-700 text-xs">የትምህርት ክፍል</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Academic module — lessons, exams, and performance tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#3b82f6' }}>
                  <Plus className="w-3.5 h-3.5" />Create Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Academic Activity</DialogTitle>
                  <DialogDescription>Set up a new exam, test, or assignment</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Activity Name</Label>
                    <Input placeholder="e.g., Midterm Exam – April" value={activityName} onChange={e => setActivityName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={activityType} onValueChange={v => setActivityType(v as TimhertActivity['type'])}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Midterm">Midterm</SelectItem>
                          <SelectItem value="Final">Final</SelectItem>
                          <SelectItem value="Assignment">Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Kutr Level</Label>
                      <Select value={kutrLevel} onValueChange={v => setKutrLevel(v as '1' | '2' | '3')}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Kutr 1</SelectItem>
                          <SelectItem value="2">Kutr 2</SelectItem>
                          <SelectItem value="3">Kutr 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Max Score</Label>
                      <Input type="number" placeholder="100" value={maxScore} onChange={e => setMaxScore(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={!activityName || !activityType || !kutrLevel || !maxScore || !activityDate} style={{ backgroundColor: '#3b82f6' }}>
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: children.length, sub: `K1:${kutr1Children.length} K2:${kutr2Children.length} K3:${kutr3Children.length}`, icon: Users, color: 'bg-blue-600' },
          { label: 'Total Assessments', value: activities.length, sub: `${completedActivities.length} completed`, icon: FileText, color: 'bg-purple-600' },
          { label: 'Completed', value: completedActivities.length, sub: `${scheduledActivities.length} upcoming`, icon: Award, color: 'bg-green-600' },
          { label: 'Scheduled', value: scheduledActivities.length, sub: 'Pending assessments', icon: Clock, color: 'bg-orange-500' },
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

      {/* ── Kutr class cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kutrSummary.map(k => (
          <Card key={k.level} className="border-t-4" style={{ borderTopColor: k.color }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: k.color }} />
                  <span className="font-bold">{k.label}</span>
                </div>
                <Badge variant="outline" style={{ borderColor: k.color, color: k.color }}>
                  {k.children.length} children
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Assessments</span>
                  <span className="font-medium text-foreground">{k.activities.length}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Completed</span>
                  <span className="font-medium text-green-600">{k.completed}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Upcoming</span>
                  <span className="font-medium text-orange-500">{k.activities.length - k.completed}</span>
                </div>
              </div>
              <div className="mt-3">
                <Progress
                  value={k.activities.length > 0 ? Math.round((k.completed / k.activities.length) * 100) : 0}
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Children per Kutr trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Class Size Overview</CardTitle>
            <CardDescription>Children enrolled per Kutr level</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Kutr 1" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Kutr 2" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Kutr 3" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No completed assessments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score Distribution</CardTitle>
            <CardDescription>Children by score range (estimated)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Children" radius={[6, 6, 0, 0]}>
                  {scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming assessments ─────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Upcoming Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Badge className={TYPE_COLOR[a.type] ?? 'bg-gray-100 text-gray-700'}>{a.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">Kutr {a.kutrLevel} · Max: {a.maxScore}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">{new Date(a.date).toLocaleDateString()}</p>
                  {canManage && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(a.id, 'completed')}>
                      Mark Done
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Activities table with filters ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">All Academic Activities</CardTitle>
              <CardDescription>Filter by Kutr level or search by name</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-40 text-sm" />
              </div>
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
              {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Loading activities…</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activities found</p>
                  {canManage && <p className="text-xs mt-1">Click "Create Assessment" to add one</p>}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Kutr</TableHead>
                      <TableHead>Max Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge className={TYPE_COLOR[a.type] ?? 'bg-gray-100 text-gray-700'}>{a.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ borderColor: KUTR_COLOR[a.kutrLevel - 1], color: KUTR_COLOR[a.kutrLevel - 1] }}>
                            Kutr {a.kutrLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.maxScore}</TableCell>
                        <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                            {a.status === 'completed' ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <Clock className="w-3 h-3 mr-1 inline" />}
                            {a.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="text-xs h-7"
                              onClick={() => updateStatus(a.id, 'completed')}
                              disabled={a.status === 'completed'}>
                              {a.status === 'completed' ? 'View Scores' : 'Enter Scores'}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}

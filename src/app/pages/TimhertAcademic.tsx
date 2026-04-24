import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useTimhert, TimhertActivity, ActivityScore, KutrLevelReportRow,
  KutrLevel, ActivityType, ACTIVITY_WEIGHTS, ACTIVITY_COLORS,
  gradeColor, currentAcademicYear,
} from '../hooks/useTimhert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, Plus, ArrowLeft, BarChart3, Users, CheckCircle2, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';


// ── Create Activity Dialog ────────────────────────────────────────────────

function CreateActivityDialog({
  open, onOpenChange, kutrLevels, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kutrLevels: KutrLevel[];
  onCreated: () => void;
}) {
  const { createActivity, isLoading } = useTimhert();
  const [form, setForm] = useState({
    title:          '',
    activity_type:  'Midterm' as ActivityType,
    kutr_level_id:  '',
    max_score:      '100',
    passing_score:  '50',
    activity_date:  '',
    academic_year:  currentAcademicYear(),
    description:    '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim())     { toast.error('Title is required');       return; }
    if (!form.kutr_level_id)    { toast.error('Kutr level is required');  return; }
    if (!form.max_score)        { toast.error('Max score is required');   return; }

    const id = await createActivity({
      title:          form.title.trim(),
      activity_type:  form.activity_type,
      kutr_level_id:  form.kutr_level_id,
      max_score:      Number(form.max_score),
      passing_score:  form.passing_score ? Number(form.passing_score) : undefined,
      activity_date:  form.activity_date || undefined,
      academic_year:  form.academic_year || currentAcademicYear(),
      description:    form.description || undefined,
    });

    if (id) {
      toast.success('Activity created');
      onOpenChange(false);
      onCreated();
    } else {
      toast.error('Failed to create activity');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Activity</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Midterm Exam — Kutr 2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              <Select value={form.activity_type} onValueChange={v => set('activity_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Midterm', 'Final', 'Assignment'] as ActivityType[]).map(t => (
                    <SelectItem key={t} value={t}>
                      {t} ({ACTIVITY_WEIGHTS[t]}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kutr Level *</Label>
              <Select value={form.kutr_level_id} onValueChange={v => set('kutr_level_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {kutrLevels.map(kl => (
                    <SelectItem key={kl.id} value={kl.id}>{kl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Score *</Label>
              <Input type="number" value={form.max_score} onChange={e => set('max_score', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Passing Score</Label>
              <Input type="number" value={form.passing_score} onChange={e => set('passing_score', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.activity_date} onChange={e => set('activity_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Input value={form.academic_year} onChange={e => set('academic_year', e.target.value)}
                placeholder="e.g. 2024/2025" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Activity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Score Entry Sheet ─────────────────────────────────────────────────────

function ScoreEntrySheet({
  activity, onBack,
}: {
  activity: TimhertActivity;
  onBack: () => void;
}) {
  const { getActivityScores, scores, saveBulkScores, isLoading } = useTimhert();
  const [pending, setPending] = useState<Record<string, string>>({});
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getActivityScores(activity.activity_id);
  }, [activity.activity_id, getActivityScores]);

  const setScore = (childId: string, val: string) =>
    setPending(prev => ({ ...prev, [childId]: val }));

  const handleSave = async () => {
    const entries = Object.entries(pending)
      .filter(([, v]) => v !== '' && !isNaN(Number(v)))
      .map(([childId, v]) => ({ childId, score: Number(v) }));

    if (entries.length === 0) { toast.error('No scores to save'); return; }

    // Validate scores don't exceed max
    const invalid = entries.filter(e => e.score > activity.max_score || e.score < 0);
    if (invalid.length > 0) {
      toast.error(`Scores must be between 0 and ${activity.max_score}`);
      return;
    }

    setSaving(true);
    const { success, failed } = await saveBulkScores(activity.activity_id, entries);
    setSaving(false);

    if (failed === 0) {
      toast.success(`Saved ${success} scores`);
      getActivityScores(activity.activity_id);
      setPending({});
    } else {
      toast.error(`${failed} scores failed to save`);
    }
  };

  const filtered = scores.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const enteredCount = scores.filter(s => s.score !== null).length;
  const passCount    = scores.filter(s =>
    s.score !== null && s.score >= (activity.passing_score ?? activity.max_score * 0.5)
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{activity.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={ACTIVITY_COLORS[activity.activity_type ?? 'Midterm']}>
              {activity.activity_type} · {ACTIVITY_WEIGHTS[activity.activity_type ?? 'Midterm']}%
            </Badge>
            <span className="text-sm text-muted-foreground">
              Max: {activity.max_score} · Pass: {activity.passing_score ?? Math.round(activity.max_score * 0.5)}
            </span>
            {activity.kutr_level_name && (
              <Badge variant="outline">{activity.kutr_level_name}</Badge>
            )}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(pending).length === 0}>
          {saving ? 'Saving...' : `Save ${Object.keys(pending).length} Scores`}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Children</p>
          <p className="text-2xl font-bold">{scores.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Scored</p>
          <p className="text-2xl font-bold text-blue-600">{enteredCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Passing</p>
          <p className="text-2xl font-bold text-green-600">{passCount}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search children..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading children...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Kutr</TableHead>
                  <TableHead className="w-36">Score (/{activity.max_score})</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const inputVal = pending[s.child_id] ?? (s.score !== null ? String(s.score) : '');
                  const numVal   = inputVal !== '' ? Number(inputVal) : null;
                  const pct      = numVal !== null && activity.max_score > 0
                    ? Math.round((numVal / activity.max_score) * 100)
                    : s.percentage;
                  const grade    = pct !== null
                    ? pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
                    : s.grade_letter;
                  const passed   = numVal !== null
                    ? numVal >= (activity.passing_score ?? activity.max_score * 0.5)
                    : s.score !== null
                      ? s.score >= (activity.passing_score ?? activity.max_score * 0.5)
                      : null;

                  return (
                    <TableRow key={s.child_id}>
                      <TableCell>
                        <p className="font-medium">{s.full_name}</p>
                        {s.baptismal_name && <p className="text-xs text-muted-foreground">{s.baptismal_name}</p>}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{s.kutr_level_name ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={activity.max_score}
                          value={inputVal}
                          onChange={e => setScore(s.child_id, e.target.value)}
                          className="h-8 w-28"
                          placeholder="Enter score"
                        />
                      </TableCell>
                      <TableCell>
                        {pct !== null ? (
                          <span className="text-sm font-medium">{pct}%</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {grade ? (
                          <Badge className={gradeColor(grade)}>{grade}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {passed === null ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : passed ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="w-3 h-3" />Pass
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <XCircle className="w-3 h-3" />Fail
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No children found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ── Kutr Level Report ─────────────────────────────────────────────────────

function KutrLevelReport({
  kutrLevel, academicYear, onBack,
}: {
  kutrLevel: KutrLevel;
  academicYear: string;
  onBack: () => void;
}) {
  const { getKutrLevelReport, report, isLoading } = useTimhert();
  const [search, setSearch] = useState('');

  useEffect(() => {
    getKutrLevelReport(kutrLevel.id, academicYear);
  }, [kutrLevel.id, academicYear, getKutrLevelReport]);

  const filtered = report.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const pagination = usePagination(filtered, 15);

  const avgWeighted = report.length > 0
    ? Math.round(report.reduce((s, r) => s + (r.weighted_total ?? 0), 0) / report.length)
    : 0;
  const passCount = report.filter(r => (r.weighted_total ?? 0) >= 60).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-xl font-bold">{kutrLevel.name} — Academic Report</h2>
          <p className="text-sm text-muted-foreground">{academicYear}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Children</p>
          <p className="text-2xl font-bold">{report.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Avg Weighted Grade</p>
          <p className="text-2xl font-bold text-blue-600">{avgWeighted}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Passing (≥60%)</p>
          <p className="text-2xl font-bold text-green-600">{passCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Failing</p>
          <p className="text-2xl font-bold text-red-600">{report.length - passCount}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search children..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading report...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Midterm (30%)</TableHead>
                  <TableHead>Final (50%)</TableHead>
                  <TableHead>Assignment (20%)</TableHead>
                  <TableHead>Weighted Total</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((r, idx) => (
                  <TableRow key={r.child_id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {pagination.from + idx}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.full_name}</p>
                      {r.baptismal_name && <p className="text-xs text-muted-foreground">{r.baptismal_name}</p>}
                    </TableCell>
                    <TableCell>
                      {r.midterm_pct !== null ? (
                        <span className="text-sm">{r.midterm_score} <span className="text-muted-foreground">({r.midterm_pct}%)</span></span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.final_pct !== null ? (
                        <span className="text-sm">{r.final_score} <span className="text-muted-foreground">({r.final_pct}%)</span></span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.assignment_pct !== null ? (
                        <span className="text-sm">{Number(r.assignment_score).toFixed(1)} <span className="text-muted-foreground">({Number(r.assignment_pct).toFixed(1)}%)</span></span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{r.weighted_total ?? '—'}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={gradeColor(r.overall_grade)}>{r.overall_grade ?? '—'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {pagination.pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-4">
              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                from={pagination.from}
                to={pagination.to}
                totalItems={pagination.totalItems}
                onPageChange={pagination.setPage}
                label="children"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function TimhertAcademic() {
  const { user } = useAuth();
  const {
    activities, isLoading,
    getActivities, getKutrLevels, updateActivity,
  } = useTimhert();

  const [kutrLevels, setKutrLevels]         = useState<KutrLevel[]>([]);
  const [filterKutr, setFilterKutr]         = useState('all');
  const [filterType, setFilterType]         = useState('all');
  const [filterYear, setFilterYear]         = useState(currentAcademicYear());
  const [createOpen, setCreateOpen]         = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<TimhertActivity | null>(null);
  const [reportKutr, setReportKutr]         = useState<KutrLevel | null>(null);

  const canManage = user?.role === 'chairperson' || user?.role === 'vice-chairperson'
    || user?.role === 'secretary' || user?.role === 'subdept-leader' || user?.role === 'subdept-vice-leader';

  useEffect(() => {
    getKutrLevels().then(setKutrLevels);
  }, [getKutrLevels]);

  useEffect(() => {
    getActivities({
      kutrLevelId:  filterKutr !== 'all' ? filterKutr : undefined,
      activityType: filterType !== 'all' ? filterType as ActivityType : undefined,
      academicYear: filterYear || undefined,
    });
  }, [filterKutr, filterType, filterYear, getActivities]);

  const refresh = () => getActivities({
    kutrLevelId:  filterKutr !== 'all' ? filterKutr : undefined,
    activityType: filterType !== 'all' ? filterType as ActivityType : undefined,
    academicYear: filterYear || undefined,
  });

  const pagination = usePagination(activities, 10);

  // Show score entry sheet
  if (selectedActivity) {
    return (
      <div className="space-y-6">
        <ScoreEntrySheet
          activity={selectedActivity}
          onBack={() => { setSelectedActivity(null); refresh(); }}
        />
      </div>
    );
  }

  // Show kutr level report
  if (reportKutr) {
    return (
      <div className="space-y-6">
        <KutrLevelReport
          kutrLevel={reportKutr}
          academicYear={filterYear || currentAcademicYear()}
          onBack={() => setReportKutr(null)}
        />
      </div>
    );
  }

  const totalActivities = activities.length;
  const avgPassRate = activities.length > 0
    ? Math.round(activities.reduce((s, a) => {
        const total = a.pass_count + a.fail_count;
        return s + (total > 0 ? (a.pass_count / total) * 100 : 0);
      }, 0) / activities.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Timhert Academic</h1>
          <p className="text-muted-foreground mt-1">
            Manage exams, assignments, and academic reports for all Kutr levels
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />New Activity
            </Button>
          )}
        </div>
      </div>

      {/* Weight info */}
      <div className="grid grid-cols-3 gap-3">
        {(['Midterm', 'Final', 'Assignment'] as ActivityType[]).map(t => (
          <Card key={t}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t}</p>
                <p className="text-2xl font-bold">{ACTIVITY_WEIGHTS[t]}%</p>
              </div>
              <Badge className={ACTIVITY_COLORS[t]}>{t}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kutr level report buttons */}
      <div className="flex flex-wrap gap-2">
        {kutrLevels.map(kl => (
          <Button
            key={kl.id}
            variant="outline"
            className="gap-2"
            onClick={() => setReportKutr(kl)}
          >
            <BarChart3 className="w-4 h-4" />
            {kl.name} Report
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filterKutr} onValueChange={setFilterKutr}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kutr Levels</SelectItem>
                {kutrLevels.map(kl => <SelectItem key={kl.id} value={kl.id}>{kl.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Midterm">Midterm</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
                <SelectItem value="Assignment">Assignment</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              placeholder="Academic year (e.g. 2024/2025)"
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activities table */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading activities...</div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No activities found</p>
            {canManage && <p className="text-sm mt-1">Click "New Activity" to create one.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Kutr Level</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Scored</TableHead>
                  <TableHead>Avg %</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map(a => {
                  const total    = a.pass_count + a.fail_count;
                  const passRate = total > 0 ? Math.round((a.pass_count / total) * 100) : null;
                  return (
                    <TableRow key={a.activity_id} className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedActivity(a)}>
                      <TableCell>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.academic_year}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTIVITY_COLORS[a.activity_type ?? 'Midterm']}>
                          {a.activity_type} · {ACTIVITY_WEIGHTS[a.activity_type ?? 'Midterm']}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.kutr_level_name
                          ? <Badge variant="outline">{a.kutr_level_name}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{a.activity_date ?? '—'}</TableCell>
                      <TableCell className="text-sm">{a.max_score}</TableCell>
                      <TableCell className="text-sm">{a.scored_count}</TableCell>
                      <TableCell>
                        {a.avg_percentage !== null
                          ? <span className="text-sm font-medium">{a.avg_percentage}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {passRate !== null ? (
                          <span className={`text-sm font-medium ${passRate >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                            {passRate}%
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedActivity(a)}
                        >
                          Enter Scores
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-4">
              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                from={pagination.from}
                to={pagination.to}
                totalItems={pagination.totalItems}
                onPageChange={pagination.setPage}
                label="activities"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <CreateActivityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        kutrLevels={kutrLevels}
        onCreated={refresh}
      />
    </div>
  );
}

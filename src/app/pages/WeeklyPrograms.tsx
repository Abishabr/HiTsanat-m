import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePrograms, WeeklyProgram, ProgramSession, SessionAttendanceRecord, ProgramType, SubDepartment } from '../hooks/usePrograms';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Clock, Plus, Users, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft, Search, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';


// ── Attendance status config ───────────────────────────────────────────────

const ATTENDANCE_STATUSES = [
  { value: 'present',    label: 'Present',    color: 'bg-green-100 text-green-700'  },
  { value: 'absent',     label: 'Absent',     color: 'bg-red-100 text-red-700'      },
  { value: 'late',       label: 'Late',       color: 'bg-yellow-100 text-yellow-700'},
  { value: 'excused',    label: 'Excused',    color: 'bg-blue-100 text-blue-700'    },
  { value: 'left_early', label: 'Left Early', color: 'bg-orange-100 text-orange-700'},
];

function statusBadgeClass(status: string | null): string {
  return ATTENDANCE_STATUSES.find(s => s.value === status)?.color ?? 'bg-muted text-muted-foreground';
}

function statusLabel(status: string | null): string {
  return ATTENDANCE_STATUSES.find(s => s.value === status)?.label ?? 'Not marked';
}

// ── Create Program Dialog ─────────────────────────────────────────────────

function CreateProgramDialog({
  open, onOpenChange, programTypes, subDepartments, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  programTypes: ProgramType[];
  subDepartments: SubDepartment[];
  onCreated: () => void;
}) {
  const { createProgram, isLoading } = usePrograms();
  const [form, setForm] = useState({
    title: '', description: '', day_of_week: 'Saturday' as 'Saturday' | 'Sunday',
    start_time: '09:00', end_time: '10:00', location: '',
    sub_department_id: '', program_type_id: '',
    recurrence_start_date: '', recurrence_end_date: '',
    max_capacity: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const id = await createProgram({
      title:                 form.title.trim(),
      description:           form.description || undefined,
      day_of_week:           form.day_of_week,
      start_time:            form.start_time || undefined,
      end_time:              form.end_time || undefined,
      location:              form.location || undefined,
      sub_department_id:     form.sub_department_id || undefined,
      program_type_id:       form.program_type_id || undefined,
      recurrence_start_date: form.recurrence_start_date || undefined,
      recurrence_end_date:   form.recurrence_end_date || undefined,
      max_capacity:          form.max_capacity ? Number(form.max_capacity) : undefined,
      is_recurring:          true,
    });
    if (id) {
      toast.success('Program created');
      onOpenChange(false);
      onCreated();
    } else {
      toast.error('Failed to create program');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Program</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Saturday Timhert Lesson" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={form.day_of_week} onValueChange={v => set('day_of_week', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Room / hall" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Sub-Department</Label>
            <Select value={form.sub_department_id} onValueChange={v => set('sub_department_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select sub-department" /></SelectTrigger>
              <SelectContent>
                {subDepartments.map(sd => <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Program Type</Label>
            <Select value={form.program_type_id} onValueChange={v => set('program_type_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {programTypes.map(pt => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.icon} {pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Recurrence Start</Label>
              <Input type="date" value={form.recurrence_start_date} onChange={e => set('recurrence_start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Recurrence End</Label>
              <Input type="date" value={form.recurrence_end_date} onChange={e => set('recurrence_end_date', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Max Capacity</Label>
            <Input type="number" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} placeholder="Leave blank for unlimited" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading || !form.title.trim()}>
              {isLoading ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ── Generate Sessions Dialog ──────────────────────────────────────────────

function GenerateSessionsDialog({
  program, open, onOpenChange, onGenerated,
}: {
  program: WeeklyProgram;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerated: () => void;
}) {
  const { generateSessions, isLoading } = usePrograms();
  const today = new Date().toISOString().split('T')[0];
  const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(program.recurrence_start_date ?? today);
  const [endDate, setEndDate]     = useState(program.recurrence_end_date ?? threeMonths);

  const handleGenerate = async () => {
    if (!startDate || !endDate) { toast.error('Both dates are required'); return; }
    const count = await generateSessions(program.program_id, startDate, endDate);
    if (count >= 0) {
      toast.success(`Generated ${count} session${count !== 1 ? 's' : ''}`);
      onOpenChange(false);
      onGenerated();
    } else {
      toast.error('Failed to generate sessions');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Generate Sessions</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Auto-generate {program.day_of_week} sessions for <strong>{program.title}</strong>
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Attendance Sheet ──────────────────────────────────────────────────────

function AttendanceSheet({
  session, onBack,
}: {
  session: ProgramSession;
  onBack: () => void;
}) {
  const { getSessionAttendance, markBulkAttendance, isLoading } = usePrograms();
  const [records, setRecords]   = useState<SessionAttendanceRecord[]>([]);
  const [pending, setPending]   = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    getSessionAttendance(session.session_id).then(setRecords);
  }, [session.session_id, getSessionAttendance]);

  const setPendingStatus = (childId: string, status: string) =>
    setPending(prev => ({ ...prev, [childId]: status }));

  const markAll = (status: string) => {
    const update: Record<string, string> = {};
    records.forEach(r => { update[r.child_id] = status; });
    setPending(update);
  };

  const handleSave = async () => {
    const toSave = records.map(r => ({
      childId: r.child_id,
      status:  pending[r.child_id] ?? r.attendance_status ?? 'absent',
    }));
    setSaving(true);
    const { success, failed } = await markBulkAttendance(session.session_id, toSave);
    setSaving(false);
    if (failed === 0) {
      toast.success(`Saved attendance for ${success} children`);
      // Refresh
      getSessionAttendance(session.session_id).then(setRecords);
      setPending({});
    } else {
      toast.error(`${failed} records failed to save`);
    }
  };

  const filtered = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = records.filter(r =>
    (pending[r.child_id] ?? r.attendance_status) === 'present'
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-xl font-bold">Attendance — {session.session_date}</h2>
          <p className="text-sm text-muted-foreground">
            {session.topic || 'No topic'} · {session.start_time} – {session.end_time}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['present', 'absent'].map(s => (
            <Button key={s} variant="outline" size="sm" onClick={() => markAll(s)}>
              Mark All {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {presentCount}/{records.length} present
          </span>
          <Button onClick={handleSave} disabled={saving || Object.keys(pending).length === 0}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const currentStatus = pending[r.child_id] ?? r.attendance_status ?? null;
                  return (
                    <TableRow key={r.child_id}>
                      <TableCell>
                        <p className="font-medium">{r.full_name}</p>
                        {r.baptismal_name && <p className="text-xs text-muted-foreground">{r.baptismal_name}</p>}
                      </TableCell>
                      <TableCell>
                        {r.kutr_level_name ? (
                          <Badge style={{ backgroundColor: `${r.kutr_level_color}20`, color: r.kutr_level_color ?? undefined }}>
                            {r.kutr_level_name}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ATTENDANCE_STATUSES.map(s => (
                            <button
                              key={s.value}
                              onClick={() => setPendingStatus(r.child_id, s.value)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                currentStatus === s.value
                                  ? s.color + ' border-current'
                                  : 'border-border text-muted-foreground hover:border-primary'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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


// ── Sessions View ─────────────────────────────────────────────────────────

function SessionsView({
  program, onBack,
}: {
  program: WeeklyProgram;
  onBack: () => void;
}) {
  const { getProgramSessions, sessions, isLoading, generateSessions } = usePrograms();
  const [selectedSession, setSelectedSession] = useState<ProgramSession | null>(null);
  const [generateOpen, setGenerateOpen]       = useState(false);

  useEffect(() => {
    getProgramSessions(program.program_id);
  }, [program.program_id, getProgramSessions]);

  const pagination = usePagination(sessions, 10);

  if (selectedSession) {
    return (
      <AttendanceSheet
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{program.title}</h2>
          <p className="text-sm text-muted-foreground">
            {program.day_of_week} · {program.start_time} – {program.end_time}
            {program.sub_department_name && ` · ${program.sub_department_name}`}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setGenerateOpen(true)}>
          <RefreshCw className="w-4 h-4" />Generate Sessions
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm mt-1">Click "Generate Sessions" to create sessions for this program.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map(s => (
                  <TableRow key={s.session_id}>
                    <TableCell>
                      <p className="font-medium">{s.session_date}</p>
                      <p className="text-xs text-muted-foreground">{s.start_time} – {s.end_time}</p>
                    </TableCell>
                    <TableCell>{s.topic || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge className={
                        s.status === 'completed'   ? 'bg-green-100 text-green-700' :
                        s.status === 'in_progress' ? 'bg-blue-100 text-blue-700'  :
                        s.status === 'cancelled'   ? 'bg-red-100 text-red-700'    :
                        'bg-muted text-muted-foreground'
                      }>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.attendance_marked ? (
                        <span className="text-sm text-green-700 font-medium">
                          {s.present_count}/{s.total_children} present
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not marked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setSelectedSession(s)}
                      >
                        <Users className="w-3 h-3" />Attendance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                label="sessions"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <GenerateSessionsDialog
        program={program}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={() => getProgramSessions(program.program_id)}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function WeeklyPrograms() {
  const { user } = useAuth();
  const {
    programs, isLoading,
    searchPrograms, updateProgram,
    getProgramTypes, getSubDepartments,
  } = usePrograms();

  const [programTypes, setProgramTypes]       = useState<ProgramType[]>([]);
  const [subDepartments, setSubDepartments]   = useState<SubDepartment[]>([]);
  const [search, setSearch]                   = useState('');
  const [filterDay, setFilterDay]             = useState('all');
  const [filterSubDept, setFilterSubDept]     = useState('all');
  const [filterStatus, setFilterStatus]       = useState('active');
  const [createOpen, setCreateOpen]           = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<WeeklyProgram | null>(null);

  const canManage = user?.role === 'chairperson' || user?.role === 'vice-chairperson' || user?.role === 'secretary';

  useEffect(() => {
    getProgramTypes().then(setProgramTypes);
    getSubDepartments().then(setSubDepartments);
  }, [getProgramTypes, getSubDepartments]);

  useEffect(() => {
    searchPrograms({
      searchTerm:      search || undefined,
      day:             filterDay !== 'all' ? filterDay : undefined,
      subDepartmentId: filterSubDept !== 'all' ? filterSubDept : undefined,
      status:          filterStatus !== 'all' ? filterStatus : undefined,
    });
  }, [search, filterDay, filterSubDept, filterStatus, searchPrograms]);

  const handleStatusToggle = async (program: WeeklyProgram) => {
    const newStatus = program.status === 'active' ? 'paused' : 'active';
    const ok = await updateProgram(program.program_id, { status: newStatus });
    if (ok) {
      toast.success(`Program ${newStatus}`);
      searchPrograms({ status: filterStatus !== 'all' ? filterStatus : undefined });
    } else {
      toast.error('Failed to update status');
    }
  };

  const pagination = usePagination(programs, 10);

  // Show sessions view when a program is selected
  if (selectedProgram) {
    return (
      <div className="space-y-6">
        <SessionsView
          program={selectedProgram}
          onBack={() => setSelectedProgram(null)}
        />
      </div>
    );
  }

  const satCount = programs.filter(p => p.day_of_week === 'Saturday').length;
  const sunCount = programs.filter(p => p.day_of_week === 'Sunday').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weekly Programs</h1>
          <p className="text-muted-foreground mt-1">
            Manage Saturday and Sunday programs for all sub-departments
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />New Program
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Programs', value: programs.length,                                    color: 'text-blue-600',   icon: Calendar    },
          { label: 'Saturday',       value: satCount,                                            color: 'text-purple-600', icon: Clock       },
          { label: 'Sunday',         value: sunCount,                                            color: 'text-green-600',  icon: Clock       },
          { label: 'Active',         value: programs.filter(p => p.status === 'active').length,  color: 'text-emerald-600',icon: CheckCircle2},
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`w-8 h-8 ${color} opacity-40`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSubDept} onValueChange={setFilterSubDept}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-Depts</SelectItem>
                {subDepartments.map(sd => <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Programs list */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading programs...</div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No programs found</p>
            {canManage && <p className="text-sm mt-1">Click "New Program" to create one.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Day & Time</TableHead>
                  <TableHead>Sub-Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map(program => (
                  <TableRow key={program.program_id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedProgram(program)}>
                    <TableCell>
                      <p className="font-medium">{program.title}</p>
                      {program.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-48">{program.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{program.day_of_week ?? '—'}</Badge>
                      {program.start_time && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {program.start_time} – {program.end_time}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {program.sub_department_name
                        ? <Badge variant="secondary">{program.sub_department_name}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {program.program_type_name ? (
                        <span className="flex items-center gap-1 text-sm">
                          <span>{program.program_type_icon}</span>
                          <span style={{ color: program.program_type_color ?? undefined }}>
                            {program.program_type_name}
                          </span>
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{program.session_count}</span>
                      {program.next_session_date && (
                        <p className="text-xs text-muted-foreground">Next: {program.next_session_date}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        program.status === 'active'    ? 'bg-green-100 text-green-700'  :
                        program.status === 'paused'    ? 'bg-yellow-100 text-yellow-700':
                        program.status === 'completed' ? 'bg-blue-100 text-blue-700'    :
                        'bg-red-100 text-red-700'
                      }>
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusToggle(program)}
                          >
                            {program.status === 'active' ? 'Pause' : 'Activate'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedProgram(program)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                label="programs"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <CreateProgramDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        programTypes={programTypes}
        subDepartments={subDepartments}
        onCreated={() => searchPrograms({ status: filterStatus !== 'all' ? filterStatus : undefined })}
      />
    </div>
  );
}

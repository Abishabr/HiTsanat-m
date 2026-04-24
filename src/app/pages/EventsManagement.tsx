import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useEvents, ChildEvent, EventAttendanceRecord, EventStatistics,
  EventType, AttendanceStatus, EVENT_COLORS,
} from '../hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Plus, ArrowLeft, Users, CheckCircle2, XCircle, Search, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';


const STATUS_COLORS: Record<string, string> = {
  planned:   'bg-blue-100 text-blue-700',
  ongoing:   'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const ATTENDANCE_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  attended:   'bg-green-100 text-green-700',
  absent:     'bg-red-100 text-red-700',
  excused:    'bg-yellow-100 text-yellow-700',
};

// ── Create Event Dialog ───────────────────────────────────────────────────

function CreateEventDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { createEvent, isLoading } = useEvents();
  const [form, setForm] = useState({
    name:                       '',
    event_type:                 'Timker' as EventType,
    event_date:                 '',
    start_time:                 '',
    end_time:                   '',
    location:                   '',
    description:                '',
    requires_performance_score: false,
    max_performance_score:      '',
  });

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())   { toast.error('Name is required');       return; }
    if (!form.event_date)    { toast.error('Event date is required'); return; }

    const id = await createEvent({
      name:                       form.name.trim(),
      event_type:                 form.event_type,
      event_date:                 form.event_date,
      start_time:                 form.start_time  || undefined,
      end_time:                   form.end_time    || undefined,
      location:                   form.location    || undefined,
      description:                form.description || undefined,
      requires_performance_score: form.requires_performance_score,
      max_performance_score:      form.max_performance_score ? Number(form.max_performance_score) : undefined,
    });

    if (id) {
      toast.success('Event created');
      onOpenChange(false);
      onCreated();
    } else {
      toast.error('Failed to create event');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Event Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Timker 2025" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Event Type *</Label>
              <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['timket', 'hosana', 'meskel', 'other'] as EventType[]).map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event Date *</Label>
              <Input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
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
            <Label>Location</Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Church / venue" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="perf-score"
              checked={form.requires_performance_score}
              onChange={e => set('requires_performance_score', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="perf-score" className="text-sm font-medium">Track performance scores</label>
          </div>
          {form.requires_performance_score && (
            <div className="space-y-1.5">
              <Label>Max Performance Score</Label>
              <Input type="number" value={form.max_performance_score}
                onChange={e => set('max_performance_score', e.target.value)} placeholder="e.g. 100" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Attendance Sheet ────────────────────────────────────────────────

function EventAttendanceSheet({
  event, onBack,
}: {
  event: ChildEvent;
  onBack: () => void;
}) {
  const { getEventAttendance, attendance, markBulkAttendance, getEventStatistics, isLoading } = useEvents();
  const [stats, setStats]     = useState<EventStatistics | null>(null);
  const [pending, setPending] = useState<Record<string, AttendanceStatus>>({});
  const [scores, setScores]   = useState<Record<string, string>>({});
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getEventAttendance(event.id);
    getEventStatistics(event.id).then(setStats);
  }, [event.id, getEventAttendance, getEventStatistics]);

  const setStatus = (childId: string, status: AttendanceStatus) =>
    setPending(prev => ({ ...prev, [childId]: status }));

  const markAll = (status: AttendanceStatus) => {
    const update: Record<string, AttendanceStatus> = {};
    attendance.forEach(r => { update[r.child_id] = status; });
    setPending(update);
  };

  const handleSave = async () => {
    const records = attendance.map(r => ({
      childId:          r.child_id,
      status:           pending[r.child_id] ?? r.attendance_status ?? 'registered',
      performanceScore: scores[r.child_id] ? Number(scores[r.child_id]) : undefined,
    }));

    setSaving(true);
    const { success, failed } = await markBulkAttendance(event.id, records);
    setSaving(false);

    if (failed === 0) {
      toast.success(`Saved attendance for ${success} children`);
      getEventAttendance(event.id);
      getEventStatistics(event.id).then(setStats);
      setPending({});
    } else {
      toast.error(`${failed} records failed`);
    }
  };

  const filtered = attendance.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const attendedCount = attendance.filter(r =>
    (pending[r.child_id] ?? r.attendance_status) === 'attended'
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{event.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={EVENT_COLORS[event.event_type ?? 'Other']}>{event.event_type}</Badge>
            <span className="text-sm text-muted-foreground">{event.event_date}</span>
            {event.location && <span className="text-sm text-muted-foreground">· {event.location}</span>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(pending).length === 0}>
          {saving ? 'Saving...' : `Save ${Object.keys(pending).length} Records`}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="text-2xl font-bold">{stats.registered_count}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attended</p>
            <p className="text-2xl font-bold text-green-600">{stats.attended_count}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent_count}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold text-blue-600">{stats.attendance_rate}%</p>
          </CardContent></Card>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['attended', 'absent', 'excused'] as AttendanceStatus[]).map(s => (
            <Button key={s} variant="outline" size="sm" onClick={() => markAll(s)}>
              Mark All {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-56" />
        </div>
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
                  {event.requires_performance_score && <TableHead>Score (/{event.max_performance_score})</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const currentStatus = pending[r.child_id] ?? r.attendance_status ?? 'registered';
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
                          {(['attended', 'absent', 'excused', 'registered'] as AttendanceStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setStatus(r.child_id, s)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                currentStatus === s
                                  ? ATTENDANCE_COLORS[s] + ' border-current'
                                  : 'border-border text-muted-foreground hover:border-primary'
                              }`}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      {event.requires_performance_score && (
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={event.max_performance_score ?? undefined}
                            value={scores[r.child_id] ?? (r.performance_score !== null ? String(r.performance_score) : '')}
                            onChange={e => setScores(prev => ({ ...prev, [r.child_id]: e.target.value }))}
                            className="h-8 w-24"
                            placeholder="Score"
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={event.requires_performance_score ? 4 : 3}
                      className="text-center py-8 text-muted-foreground">
                      No children registered for this event yet
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

// ── Main Page ─────────────────────────────────────────────────────────────

export default function EventsManagement() {
  const { user } = useAuth();
  const { events, isLoading, getEvents, updateEvent } = useEvents();

  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createOpen, setCreateOpen]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChildEvent | null>(null);

  const canManage = user?.role === 'chairperson' || user?.role === 'vice-chairperson'
    || user?.role === 'secretary' || user?.role === 'subdept-leader' || user?.role === 'subdept-vice-leader';

  const refresh = () => getEvents({
    eventType: filterType !== 'all' ? filterType as EventType : undefined,
    status:    filterStatus !== 'all' ? filterStatus : undefined,
  });

  useEffect(() => { refresh(); }, [filterType, filterStatus]);

  const handleStatusChange = async (event: ChildEvent, newStatus: string) => {
    const ok = await updateEvent(event.id, { status: newStatus });
    if (ok) toast.success(`Event ${newStatus}`);
    else    toast.error('Failed to update status');
  };

  const pagination = usePagination(events, 10);

  const upcomingCount  = events.filter(e => e.status === 'planned' || e.status === 'ongoing').length;
  const completedCount = events.filter(e => e.status === 'completed').length;

  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <EventAttendanceSheet
          event={selectedEvent}
          onBack={() => { setSelectedEvent(null); refresh(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Events Management</h1>
          <p className="text-muted-foreground mt-1">
            Track Timker, Hosana, Meskel and other special church events
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />New Event
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{events.length}</p></div>
          <Calendar className="w-8 h-8 text-blue-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p></div>
          <Calendar className="w-8 h-8 text-blue-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p></div>
          <CheckCircle2 className="w-8 h-8 text-green-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Event Types</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(events.map(e => e.event_type).filter(Boolean)).size}
            </p></div>
          <BarChart3 className="w-8 h-8 text-purple-500 opacity-40" />
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="timket">Timket</SelectItem>
                <SelectItem value="hosana">Hosana</SelectItem>
                <SelectItem value="meskel">Meskel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events list */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading events...</div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No events found</p>
            {canManage && <p className="text-sm mt-1">Click "New Event" to create one.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map(event => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedEvent(event)}>
                    <TableCell>
                      <p className="font-medium">{event.name}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-48">{event.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={EVENT_COLORS[event.event_type ?? 'Other']}>
                        {event.event_type ?? 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{event.event_date}</p>
                      {event.start_time && (
                        <p className="text-xs text-muted-foreground">{event.start_time} – {event.end_time}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{event.location ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[event.status] ?? 'bg-muted text-muted-foreground'}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {canManage && event.status === 'planned' && (
                          <Button variant="outline" size="sm"
                            onClick={() => handleStatusChange(event, 'ongoing')}>
                            Start
                          </Button>
                        )}
                        {canManage && event.status === 'ongoing' && (
                          <Button variant="outline" size="sm"
                            onClick={() => handleStatusChange(event, 'completed')}>
                            Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1"
                          onClick={() => setSelectedEvent(event)}>
                          <Users className="w-3 h-3" />Attendance
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
                label="events"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}

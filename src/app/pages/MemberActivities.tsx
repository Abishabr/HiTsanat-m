import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useMemberActivities, MemberActivity, ActivityParticipant,
  ActivityType, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS,
} from '../hooks/useMemberActivities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, Plus, ArrowLeft, Search, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';
import { supabase } from '../../lib/supabase';


const STATUS_COLORS: Record<string, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  ongoing:    'bg-green-100 text-green-700',
  completed:  'bg-gray-100 text-gray-700',
  cancelled:  'bg-red-100 text-red-700',
};

// ── Create Activity Dialog ────────────────────────────────────────────────

function CreateActivityDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { createActivity, isLoading } = useMemberActivities();
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title:             '',
    activity_type:     'meeting' as ActivityType,
    activity_date:     '',
    start_time:        '',
    end_time:          '',
    location:          '',
    description:       '',
    sub_department_id: '',
    max_participants:  '',
  });

  useEffect(() => {
    if (!open) return;
    supabase.from('sub_departments').select('id, name').order('name')
      .then(({ data }) => setSubDepts(data ?? []));
  }, [open]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const id = await createActivity({
      title:             form.title.trim(),
      activity_type:     form.activity_type,
      activity_date:     form.activity_date     || undefined,
      start_time:        form.start_time        || undefined,
      end_time:          form.end_time          || undefined,
      location:          form.location          || undefined,
      description:       form.description       || undefined,
      sub_department_id: form.sub_department_id || undefined,
      max_participants:  form.max_participants ? Number(form.max_participants) : undefined,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Activity</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Adar Program — April 2025" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              <Select value={form.activity_type} onValueChange={v => set('activity_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map(t => (
                    <SelectItem key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.activity_date} onChange={e => set('activity_date', e.target.value)} />
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
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue / room" />
          </div>
          <div className="space-y-1.5">
            <Label>Sub-Department</Label>
            <Select value={form.sub_department_id} onValueChange={v => set('sub_department_id', v)}>
              <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All departments</SelectItem>
                {subDepts.map(sd => <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Max Participants</Label>
            <Input type="number" value={form.max_participants}
              onChange={e => set('max_participants', e.target.value)} placeholder="Leave blank for unlimited" />
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

// ── Participants Sheet ────────────────────────────────────────────────────

function ParticipantsSheet({
  activity, onBack,
}: {
  activity: MemberActivity;
  onBack: () => void;
}) {
  const { getParticipants, participants, markBulkAttendance, assignMember, isLoading } = useMemberActivities();
  const [pending, setPending]   = useState<Record<string, boolean>>({});
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [addMemberId, setAddMemberId] = useState('');

  useEffect(() => {
    getParticipants(activity.activity_id);
    supabase.from('members').select('id, full_name').eq('status', 'active').order('full_name')
      .then(({ data }) => setAllMembers(data ?? []));
  }, [activity.activity_id, getParticipants]);

  const toggleAttendance = (memberId: string, current: boolean) =>
    setPending(prev => ({ ...prev, [memberId]: !current }));

  const markAll = (attended: boolean) => {
    const update: Record<string, boolean> = {};
    participants.forEach(p => { update[p.member_id] = attended; });
    setPending(update);
  };

  const handleSave = async () => {
    const records = participants.map(p => ({
      memberId: p.member_id,
      attended: pending[p.member_id] ?? p.attended,
    }));
    setSaving(true);
    const { success, failed } = await markBulkAttendance(activity.activity_id, records);
    setSaving(false);
    if (failed === 0) {
      toast.success(`Saved attendance for ${success} members`);
      getParticipants(activity.activity_id);
      setPending({});
    } else {
      toast.error(`${failed} records failed`);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberId) return;
    const ok = await assignMember(activity.activity_id, addMemberId);
    if (ok) {
      toast.success('Member added');
      setAddMemberId('');
      getParticipants(activity.activity_id);
    } else {
      toast.error('Failed to add member');
    }
  };

  const filtered = participants.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const attendedCount = participants.filter(p =>
    pending[p.member_id] !== undefined ? pending[p.member_id] : p.attended
  ).length;

  const unassignedMembers = allMembers.filter(m =>
    !participants.some(p => p.member_id === m.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{activity.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={ACTIVITY_TYPE_COLORS[activity.activity_type ?? 'other']}>
              {ACTIVITY_TYPE_LABELS[activity.activity_type ?? 'other']}
            </Badge>
            {activity.activity_date && <span className="text-sm text-muted-foreground">{activity.activity_date}</span>}
            {activity.location && <span className="text-sm text-muted-foreground">· {activity.location}</span>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(pending).length === 0}>
          {saving ? 'Saving...' : `Save ${Object.keys(pending).length} Changes`}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Assigned</p>
          <p className="text-2xl font-bold">{participants.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Attended</p>
          <p className="text-2xl font-bold text-green-600">{attendedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="text-2xl font-bold text-red-600">{participants.length - attendedCount}</p>
        </CardContent></Card>
      </div>

      {/* Add member */}
      <div className="flex gap-2">
        <Select value={addMemberId} onValueChange={setAddMemberId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Add a member..." /></SelectTrigger>
          <SelectContent>
            {unassignedMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleAddMember} disabled={!addMemberId}>
          <Plus className="w-4 h-4 mr-1" />Add
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)}>Mark All Present</Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)}>Mark All Absent</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-56" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading participants...</div>
      ) : participants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No members assigned yet. Use the dropdown above to add members.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const isAttended = pending[p.member_id] !== undefined ? pending[p.member_id] : p.attended;
                  return (
                    <TableRow key={p.member_id}>
                      <TableCell>
                        <p className="font-medium">{p.full_name}</p>
                        {p.campus && <p className="text-xs text-muted-foreground">{p.campus}</p>}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{p.role}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          p.status === 'completed' ? 'bg-green-100 text-green-700' :
                          p.status === 'absent'    ? 'bg-red-100 text-red-700'    :
                          'bg-blue-100 text-blue-700'
                        }>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleAttendance(p.member_id, isAttended)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border transition-all ${
                            isAttended
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}
                        >
                          {isAttended
                            ? <><CheckCircle2 className="w-3.5 h-3.5" />Present</>
                            : <><XCircle className="w-3.5 h-3.5" />Absent</>}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function MemberActivities() {
  const { user } = useAuth();
  const { activities, isLoading, getActivities, updateActivity } = useMemberActivities();

  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [createOpen, setCreateOpen]     = useState(false);
  const [selected, setSelected]         = useState<MemberActivity | null>(null);

  const canManage = user?.role === 'chairperson' || user?.role === 'vice-chairperson'
    || user?.role === 'secretary' || user?.role === 'subdept-leader' || user?.role === 'subdept-vice-leader';

  const refresh = () => getActivities({
    activityType: filterType   !== 'all' ? filterType as ActivityType : undefined,
    status:       filterStatus !== 'all' ? filterStatus : undefined,
    searchTerm:   search || undefined,
  });

  useEffect(() => { refresh(); }, [filterType, filterStatus, search]);

  const handleStatusChange = async (activity: MemberActivity, newStatus: string) => {
    const ok = await updateActivity(activity.activity_id, { status: newStatus });
    if (ok) toast.success(`Activity ${newStatus}`);
    else    toast.error('Failed to update status');
  };

  const pagination = usePagination(activities, 10);

  const totalAssigned  = activities.reduce((s, a) => s + a.assigned_count, 0);
  const totalAttended  = activities.reduce((s, a) => s + a.attended_count, 0);

  if (selected) {
    return (
      <div className="space-y-6">
        <ParticipantsSheet
          activity={selected}
          onBack={() => { setSelected(null); refresh(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Member Activities</h1>
          <p className="text-muted-foreground mt-1">
            Track Adar programs, projects, training, and meetings for members
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />New Activity
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Activities</p>
            <p className="text-2xl font-bold">{activities.length}</p></div>
          <Users className="w-8 h-8 text-blue-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Assigned</p>
            <p className="text-2xl font-bold text-blue-600">{totalAssigned}</p></div>
          <Users className="w-8 h-8 text-blue-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Attended</p>
            <p className="text-2xl font-bold text-green-600">{totalAttended}</p></div>
          <CheckCircle2 className="w-8 h-8 text-green-500 opacity-40" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {totalAssigned > 0 ? Math.round((totalAttended / totalAssigned) * 100) : 0}%
            </p></div>
          <CheckCircle2 className="w-8 h-8 text-purple-500 opacity-40" />
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search activities..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map(t => (
                  <SelectItem key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activities table */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading activities...</div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
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
                  <TableHead>Date</TableHead>
                  <TableHead>Sub-Dept</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map(a => (
                  <TableRow key={a.activity_id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelected(a)}>
                    <TableCell>
                      <p className="font-medium">{a.title}</p>
                      {a.location && <p className="text-xs text-muted-foreground">{a.location}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge className={ACTIVITY_TYPE_COLORS[a.activity_type ?? 'other']}>
                        {ACTIVITY_TYPE_LABELS[a.activity_type ?? 'other']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{a.activity_date ?? '—'}</p>
                      {a.start_time && (
                        <p className="text-xs text-muted-foreground">{a.start_time} – {a.end_time}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.sub_department_name
                        ? <Badge variant="secondary">{a.sub_department_name}</Badge>
                        : <span className="text-muted-foreground text-sm">All</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {a.attended_count}/{a.assigned_count}
                        {a.assigned_count > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((a.attended_count / a.assigned_count) * 100)}%)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[a.status] ?? 'bg-muted text-muted-foreground'}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {canManage && a.status === 'scheduled' && (
                          <Button variant="outline" size="sm"
                            onClick={() => handleStatusChange(a, 'ongoing')}>Start</Button>
                        )}
                        {canManage && a.status === 'ongoing' && (
                          <Button variant="outline" size="sm"
                            onClick={() => handleStatusChange(a, 'completed')}>Complete</Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1"
                          onClick={() => setSelected(a)}>
                          <Users className="w-3 h-3" />Members
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
                label="activities"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <CreateActivityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useSchedule, ProgramSlot, KutrLevel, ProgramDay,
  getSubDeptColor, useMemberName, getSubDeptName,
} from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { getSubDeptDisplayName } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Clock, Plus, Trash2, Users, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { gregorianStringToEthiopian, ET_MONTHS_AMHARIC, ET_MONTHS_ENGLISH, ET_DAYS_AMHARIC, toGeezNumeral } from '../lib/ethiopianCalendar';

const KUTR_OPTIONS: KutrLevel[] = [1, 2, 3];
const DAY_OPTIONS: ProgramDay[] = ['Saturday', 'Sunday'];

// ── Export helpers ─────────────────────────────────────────────────────────

function exportCSV(slots: ProgramSlot[], subDepts: { id: string; name: string }[], getMemberName: (id: string | null) => string) {
  const header = 'Day,Start Time,End Time,Sub-Department,Kutr Levels,Assigned Member';
  const rows = slots.map(s => {
    const dept = subDepts.find(sd => sd.id === s.subDepartmentId);
    const deptName = getSubDeptDisplayName(dept?.name ?? s.subDepartmentId);
    const kutr = s.kutrLevels.join('+');
    const member = getMemberName(s.assignedMemberId);
    return `${s.day},${s.startTime},${s.endTime},${deptName},${kutr},${member}`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weekly-programs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Add Slot Form ──────────────────────────────────────────────────────────

function AddSlotDialog() {
  const { addSlot, subDepts } = useSchedule();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [day, setDay] = useState<ProgramDay>('Saturday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:40');
  const [subDeptId, setSubDeptId] = useState('');
  const [kutrLevels, setKutrLevels] = useState<KutrLevel[]>([1, 2]);

  const effectiveSubDeptId = subDeptId || subDepts[0]?.id || '';

  const toggleKutr = (k: KutrLevel) =>
    setKutrLevels(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleAdd = () => {
    if (!date || kutrLevels.length === 0 || !effectiveSubDeptId) return;
    addSlot({ date, day, startTime, endTime, subDepartmentId: effectiveSubDeptId, kutrLevels }, user?.id ?? '');
    setOpen(false);
    setDate(''); setStartTime('09:00'); setEndTime('09:40');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Slot</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Program Slot</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={day} onValueChange={v => setDay(v as ProgramDay)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Responsible Sub-Department</Label>
            <Select value={effectiveSubDeptId} onValueChange={setSubDeptId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {subDepts.map(sd => (
                  <SelectItem key={sd.id} value={sd.id}>{getSubDeptDisplayName(sd.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Kutr Levels</Label>
            <div className="flex gap-2">
              {KUTR_OPTIONS.map(k => (
                <button key={k} type="button" onClick={() => toggleKutr(k)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    kutrLevels.includes(k) ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:border-blue-400'
                  }`}>
                  Kutr {k}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!date || kutrLevels.length === 0 || !effectiveSubDeptId}>Add Slot</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Slot row ───────────────────────────────────────────────────────────────

function SlotRow({ slot, isChairperson, mySubDeptId, role }: {
  slot: ProgramSlot; isChairperson: boolean; mySubDeptId?: string; role?: string;
}) {
  const { assignMember, removeSlot, subDepts } = useSchedule();
  const { user } = useAuth();
  const { members } = useDataStore();
  const getMemberName = useMemberName();

  const liveDept = subDepts.find(sd => sd.id === slot.subDepartmentId);
  const deptName = liveDept?.name ?? getSubDeptName(slot.subDepartmentId);
  const color = getSubDeptColor(slot.subDepartmentId);
  const deptDisplayName = getSubDeptDisplayName(deptName);
  const eligibleMembers = members.filter(m => m.subDepartments.includes(deptName));
  const canAssign = (role === 'subdept-leader' || role === 'subdept-vice-leader') && slot.subDepartmentId === mySubDeptId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
      <div className="w-24 text-center flex-shrink-0">
        <p className="text-xs text-muted-foreground">Time</p>
        <p className="font-semibold text-sm">{slot.startTime}</p>
        <p className="text-xs text-muted-foreground">– {slot.endTime}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-xs">{deptDisplayName}</Badge>
          {slot.kutrLevels.sort().map(k => <Badge key={k} variant="outline" className="text-xs">Kutr {k}</Badge>)}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          {slot.assignedMemberId
            ? <span className="text-green-700 font-medium">{getMemberName(slot.assignedMemberId)}</span>
            : <span className="text-orange-500 italic">No member assigned yet</span>}
        </div>
      </div>
      {canAssign && (
        <div className="w-44 flex-shrink-0">
          <Select value={slot.assignedMemberId ?? ''} onValueChange={val => assignMember(slot.id, val, user?.id ?? '')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assign member" /></SelectTrigger>
            <SelectContent>
              {eligibleMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {isChairperson && (
        <button onClick={() => removeSlot(slot.id)}
          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Day group ──────────────────────────────────────────────────────────────

function DayGroup({ day, date, slots, isChairperson, mySubDeptId, role }: {
  day: ProgramDay; date: string; slots: ProgramSlot[];
  isChairperson: boolean; mySubDeptId?: string; role?: string;
}) {
  const assigned = slots.filter(s => s.assignedMemberId).length;

  // Gregorian label
  const gregDate = new Date(date + 'T12:00:00');
  const gregLabel = gregDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Ethiopian label
  const etDate = gregorianStringToEthiopian(date);
  const etMonthAm = ET_MONTHS_AMHARIC[etDate.month - 1] ?? '';
  const etMonthEn = ET_MONTHS_ENGLISH[etDate.month - 1] ?? '';
  const etDayAm   = toGeezNumeral(etDate.day);
  const etYearAm  = toGeezNumeral(etDate.year);
  const etDowAm   = ET_DAYS_AMHARIC[etDate.dayOfWeek] ?? '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />{day} — {gregLabel}
          </CardTitle>
          <Badge variant={assigned === slots.length ? 'default' : 'outline'} className="text-xs">
            {assigned}/{slots.length} assigned
          </Badge>
        </div>
        {/* Ethiopian date */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {etDowAm} · {etMonthAm} {etDayAm} {etYearAm} ዓ.ም
          </span>
          <span className="text-xs text-muted-foreground">
            {etMonthEn} {etDate.day}, {etDate.year} E.C.
          </span>
        </div>
        <CardDescription>{slots.length} slot{slots.length !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
          <SlotRow key={slot.id} slot={slot} isChairperson={isChairperson} mySubDeptId={mySubDeptId} role={role} />
        ))}
      </CardContent>
    </Card>
  );
}

// ── All Programs Table ─────────────────────────────────────────────────────

function AllProgramsTable({ slots, subDepts, getMemberName, isChairperson }: {
  slots: ProgramSlot[];
  subDepts: { id: string; name: string }[];
  getMemberName: (id: string | null) => string;
  isChairperson: boolean;
}) {
  const { removeSlot } = useSchedule();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Programs</CardTitle>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportCSV(slots, subDepts, getMemberName)}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Sub-Department</TableHead>
                <TableHead>Kutr Levels</TableHead>
                <TableHead>Assigned Member</TableHead>
                {isChairperson && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...slots].sort((a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime)).map(slot => {
                const liveDept = subDepts.find(sd => sd.id === slot.subDepartmentId);
                const deptName = liveDept?.name ?? slot.subDepartmentId;
                const color = getSubDeptColor(deptName);
                return (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge variant="outline">{slot.day}</Badge>
                        {slot.date && (() => {
                          const et = gregorianStringToEthiopian(slot.date);
                          const mEn = ET_MONTHS_ENGLISH[et.month - 1] ?? '';
                          return (
                            <p className="text-[11px] text-muted-foreground">{mEn} {et.day}, {et.year} E.C.</p>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{slot.startTime} – {slot.endTime}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-xs">
                        {getSubDeptDisplayName(deptName)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {slot.kutrLevels.sort().map(k => <Badge key={k} variant="outline" className="text-xs">K{k}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slot.assignedMemberId
                        ? <span className="text-sm text-green-700 font-medium">{getMemberName(slot.assignedMemberId)}</span>
                        : <span className="text-sm text-orange-500 italic">Unassigned</span>}
                    </TableCell>
                    {isChairperson && (
                      <TableCell className="text-right">
                        <button onClick={() => removeSlot(slot.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WeeklyPrograms() {
  const { user } = useAuth();
  const { slots, subDepts } = useSchedule();
  const getMemberName = useMemberName();

  const role = user?.role;
  const isSubdeptLeader = role === 'subdept-leader' || role === 'subdept-vice-leader';
  const isChairperson = !isSubdeptLeader;
  const mySubDept = user?.subDepartment;
  const mySubDeptId = mySubDept ? subDepts.find(sd => sd.name === mySubDept)?.id : undefined;

  const byDate = slots.reduce<Record<string, ProgramSlot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();
  const totalAssigned = slots.filter(s => s.assignedMemberId).length;
  const totalUnassigned = slots.filter(s => !s.assignedMemberId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weekly Programs</h1>
          <p className="text-muted-foreground mt-1">
            {isChairperson ? 'Build the weekly schedule and assign sub-departments' : `Assign your members to ${mySubDept ? getSubDeptDisplayName(mySubDept) : ''} slots`}
          </p>
        </div>
        <div className="flex gap-2">
          {slots.length > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => exportCSV(slots, subDepts, getMemberName)}>
              <Download className="w-4 h-4" />Export CSV
            </Button>
          )}
          {isChairperson && <AddSlotDialog />}
        </div>
      </div>

      {/* Stats */}
      {slots.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Slots', value: slots.length, color: 'text-blue-600', icon: Clock },
            { label: 'Assigned', value: totalAssigned, color: 'text-green-600', icon: CheckCircle2 },
            { label: 'Unassigned', value: totalUnassigned, color: 'text-orange-500', icon: AlertCircle },
            { label: 'Sub-Depts', value: [...new Set(slots.map(s => s.subDepartmentId))].length, color: 'text-purple-600', icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-50`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {slots.length === 0 ? (
        <Card>
          <CardContent className="text-center py-14 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            {isChairperson ? (
              <><p className="font-medium">No slots yet</p><p className="text-sm mt-1">Click "Add Slot" to start building the schedule.</p></>
            ) : (
              <p>No slots have been assigned to your sub-department yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Schedule View</TabsTrigger>
            <TabsTrigger value="all">All Programs</TabsTrigger>
          </TabsList>

          {/* Schedule view — grouped by date */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            {sortedDates.map(date => (
              <DayGroup key={date} day={byDate[date][0].day} date={date} slots={byDate[date]}
                isChairperson={isChairperson} mySubDeptId={mySubDeptId} role={role} />
            ))}
          </TabsContent>

          {/* All programs — flat table */}
          <TabsContent value="all" className="mt-4">
            <AllProgramsTable slots={slots} subDepts={subDepts} getMemberName={getMemberName} isChairperson={isChairperson} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

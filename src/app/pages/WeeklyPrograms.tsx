import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useSchedule, ProgramSlot, KutrLevel, ProgramDay,
  getSubDeptColor, useMemberName, getSubDeptName,
} from '../context/ScheduleStore';
import { mockMembers, subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Calendar, Clock, Plus, Trash2, Users, CheckCircle2, AlertCircle } from 'lucide-react';

// Sub-depts that appear in the weekly schedule (EKD excluded)
const SCHEDULE_DEPTS = subDepartments.filter(sd => sd.name !== 'Ekd');

const KUTR_OPTIONS: KutrLevel[] = [1, 2, 3];
const DAY_OPTIONS: ProgramDay[] = ['Saturday', 'Sunday'];

// ── Add Slot Form (chairperson only) ──────────────────────────────────────

function AddSlotDialog() {
  const { addSlot } = useSchedule();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [day, setDay] = useState<ProgramDay>('Saturday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:40');
  const [subDeptId, setSubDeptId] = useState('sd1');
  const [kutrLevels, setKutrLevels] = useState<KutrLevel[]>([1, 2]);

  const toggleKutr = (k: KutrLevel) => {
    setKutrLevels(prev =>
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
  };

  const handleAdd = () => {
    if (!date || kutrLevels.length === 0) return;
    addSlot({ date, day, startTime, endTime, subDepartmentId: subDeptId, kutrLevels });
    setOpen(false);
    // reset
    setStartTime('09:00');
    setEndTime('09:40');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Slot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Program Slot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date & Day */}
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

          {/* Time */}
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

          {/* Sub-department */}
          <div className="space-y-1">
            <Label>Responsible Sub-Department</Label>
            <Select value={subDeptId} onValueChange={setSubDeptId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEDULE_DEPTS.map(sd => (
                  <SelectItem key={sd.id} value={sd.id}>
                    {getSubDeptDisplayName(sd.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kutr levels */}
          <div className="space-y-1">
            <Label>Kutr Levels</Label>
            <div className="flex gap-2">
              {KUTR_OPTIONS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKutr(k)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    kutrLevels.includes(k)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  Kutr {k}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!date || kutrLevels.length === 0}>
              Add Slot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Single slot row ────────────────────────────────────────────────────────

function SlotRow({ slot, isChairperson, mySubDeptId }: {
  slot: ProgramSlot;
  isChairperson: boolean;
  mySubDeptId?: string;
}) {
  const { assignMember, removeSlot } = useSchedule();
  const getMemberName = useMemberName();
  const color = getSubDeptColor(slot.subDepartmentId);
  const deptDisplayName = getSubDeptDisplayName(getSubDeptName(slot.subDepartmentId));

  // Only members of the responsible sub-dept can be assigned
  const eligibleMembers = mockMembers.filter(m =>
    m.subDepartments.includes(getSubDeptName(slot.subDepartmentId))
  );

  const canAssign = !isChairperson && slot.subDepartmentId === mySubDeptId;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {/* Time */}
      <div className="w-24 text-center flex-shrink-0">
        <p className="text-xs text-gray-500">Time</p>
        <p className="font-semibold text-sm">{slot.startTime}</p>
        <p className="text-xs text-gray-400">– {slot.endTime}</p>
      </div>

      {/* Dept + Kutr */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-xs">
            {deptDisplayName}
          </Badge>
          {slot.kutrLevels.sort().map(k => (
            <Badge key={k} variant="outline" className="text-xs">Kutr {k}</Badge>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          {slot.assignedMemberId
            ? <span className="text-green-700 font-medium">{getMemberName(slot.assignedMemberId)}</span>
            : <span className="text-orange-500 italic">No member assigned yet</span>
          }
        </div>
      </div>

      {/* Assignment dropdown — only for the responsible sub-dept leader */}
      {canAssign && (
        <div className="w-44 flex-shrink-0">
          <Select
            value={slot.assignedMemberId ?? ''}
            onValueChange={val => assignMember(slot.id, val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Assign member" />
            </SelectTrigger>
            <SelectContent>
              {eligibleMembers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Delete — chairperson only */}
      {isChairperson && (
        <button
          onClick={() => removeSlot(slot.id)}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="Remove slot"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Day group ──────────────────────────────────────────────────────────────

function DayGroup({ day, date, slots, isChairperson, mySubDeptId }: {
  day: ProgramDay; date: string; slots: ProgramSlot[];
  isChairperson: boolean; mySubDeptId?: string;
}) {
  const assigned = slots.filter(s => s.assignedMemberId).length;
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            {day} — {dateLabel}
          </CardTitle>
          <Badge variant={assigned === slots.length ? 'default' : 'outline'} className="text-xs">
            {assigned}/{slots.length} assigned
          </Badge>
        </div>
        <CardDescription>{slots.length} slot{slots.length !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {slots
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map(slot => (
            <SlotRow
              key={slot.id}
              slot={slot}
              isChairperson={isChairperson}
              mySubDeptId={mySubDeptId}
            />
          ))}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WeeklyPrograms() {
  const { user } = useAuth();
  const { slots } = useSchedule();

  const isChairperson = user?.role !== 'subdept-leader';
  const mySubDept = user?.subDepartment;
  const mySubDeptId = mySubDept
    ? subDepartments.find(sd => sd.name === mySubDept)?.id
    : undefined;

  // Filter slots visible to this user
  const visibleSlots = isChairperson
    ? slots
    : slots.filter(s => s.subDepartmentId === mySubDeptId);

  // Group by date
  const byDate = visibleSlots.reduce<Record<string, ProgramSlot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort();

  const totalAssigned = slots.filter(s => s.assignedMemberId).length;
  const totalUnassigned = slots.filter(s => !s.assignedMemberId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Programs</h1>
          <p className="text-gray-600 mt-1">
            {isChairperson
              ? 'Build the weekly schedule by adding slots and assigning sub-departments'
              : `Assign your members to ${mySubDept ? getSubDeptDisplayName(mySubDept) : ''} slots`}
          </p>
        </div>
        {isChairperson && <AddSlotDialog />}
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
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-50`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {visibleSlots.length === 0 && (
        <Card>
          <CardContent className="text-center py-14 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            {isChairperson ? (
              <>
                <p className="font-medium">No slots yet</p>
                <p className="text-sm mt-1">Click "Add Slot" to start building the schedule.</p>
              </>
            ) : (
              <p>No slots have been assigned to your sub-department yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slots grouped by date */}
      {sortedDates.map(date => (
        <DayGroup
          key={date}
          day={byDate[date][0].day}
          date={date}
          slots={byDate[date]}
          isChairperson={isChairperson}
          mySubDeptId={mySubDeptId}
        />
      ))}
    </div>
  );
}

import { useAuth } from '../context/AuthContext';
import {
  useSchedule, ProgramSlot,
  getSubDeptName, getSubDeptColor, getMemberName,
} from '../context/ScheduleStore';
import { mockMembers, subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Calendar, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';

const DEPT_LABEL: Record<string, string> = {
  sd1: 'Timhert Academic', sd2: 'Tmezmur', sd3: 'Kinetibeb', sd4: 'Kuttr', sd5: 'EKD',
};

function SlotCard({ slot, canAssign, mySubDeptId }: {
  slot: ProgramSlot;
  canAssign: boolean;
  mySubDeptId?: string;
}) {
  const { assignMember } = useSchedule();
  const color = getSubDeptColor(slot.subDepartmentId);
  const deptName = DEPT_LABEL[slot.subDepartmentId] ?? slot.subDepartmentId;

  // Only show members from the responsible sub-department
  const eligibleMembers = mockMembers.filter(m =>
    m.subDepartments.includes(getSubDeptName(slot.subDepartmentId))
  );

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
      <div className="min-w-[90px] text-center">
        <p className="text-xs text-gray-500">Time</p>
        <p className="font-semibold text-sm">{slot.startTime}</p>
        <p className="text-xs text-gray-400">– {slot.endTime}</p>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge style={{ backgroundColor: color, color: '#fff' }}>{deptName}</Badge>
          {slot.kutrLevels.map(k => (
            <Badge key={k} variant="outline" className="text-xs">Kutr {k}</Badge>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-3 h-3" />
          {slot.assignedMemberId
            ? <span className="text-green-700 font-medium">{getMemberName(slot.assignedMemberId)}</span>
            : <span className="text-orange-500 italic">No member assigned</span>
          }
        </div>
      </div>

      {canAssign && (
        <div className="min-w-[160px]">
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
    </div>
  );
}

function DaySection({ day, date, slots, canAssign, mySubDeptId }: {
  day: string; date: string; slots: ProgramSlot[];
  canAssign: boolean; mySubDeptId?: string;
}) {
  if (slots.length === 0) return null;
  const assigned = slots.filter(s => s.assignedMemberId).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            {day} — {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </CardTitle>
          <Badge variant={assigned === slots.length ? 'default' : 'outline'}>
            {assigned}/{slots.length} assigned
          </Badge>
        </div>
        <CardDescription>{slots.length} program slots</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {slots.map(slot => (
          <SlotCard key={slot.id} slot={slot} canAssign={canAssign} mySubDeptId={mySubDeptId} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function WeeklyPrograms() {
  const { user } = useAuth();
  const { slots, generateWeeklySchedule, hasScheduleForWeek } = useSchedule();

  const isChairperson = user?.role !== 'subdept-leader';
  const mySubDept = user?.subDepartment;

  // Find the sub-department id for the current user's sub-department name
  const mySubDeptId = mySubDept
    ? subDepartments.find(sd => sd.name === mySubDept)?.id
    : undefined;

  // Determine next Saturday to get weekId
  const nextSat = (() => {
    const d = new Date();
    const diff = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  })();
  const weekId = (() => {
    const d = new Date(Date.UTC(nextSat.getFullYear(), nextSat.getMonth(), nextSat.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  })();

  const weekSlots = slots.filter(s => s.weekId === weekId);
  const scheduled = hasScheduleForWeek(weekId);

  // Filter slots for sub-dept leaders
  const visibleSlots = isChairperson
    ? weekSlots
    : weekSlots.filter(s => s.subDepartmentId === mySubDeptId);

  const satSlots = visibleSlots.filter(s => s.day === 'Saturday');
  const sunSlots = visibleSlots.filter(s => s.day === 'Sunday');
  const satDate = weekSlots.find(s => s.day === 'Saturday')?.date ?? '';
  const sunDate = weekSlots.find(s => s.day === 'Sunday')?.date ?? '';

  // Sub-dept leaders can only assign for their own dept
  const canAssign = (slotSubDeptId: string) =>
    isChairperson || slotSubDeptId === mySubDeptId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Programs</h1>
          <p className="text-gray-600 mt-1">
            {isChairperson
              ? 'Create and monitor the weekly schedule for all sub-departments'
              : `Assign your members to ${mySubDept ? getSubDeptDisplayName(mySubDept) : ''} slots`}
          </p>
        </div>

        {isChairperson && (
          <Button
            onClick={generateWeeklySchedule}
            disabled={scheduled}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            {scheduled ? 'Schedule Created' : 'Create Weekly Schedule'}
          </Button>
        )}
      </div>

      {/* Status banner */}
      {!scheduled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700">
              {isChairperson
                ? 'No schedule has been created for the upcoming week yet. Click "Create Weekly Schedule" to generate it.'
                : 'The chairperson has not yet created the schedule for the upcoming week.'}
            </p>
          </CardContent>
        </Card>
      )}

      {scheduled && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Slots', value: weekSlots.length, icon: Clock, color: 'text-blue-600' },
              { label: 'Assigned', value: weekSlots.filter(s => s.assignedMemberId).length, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Unassigned', value: weekSlots.filter(s => !s.assignedMemberId).length, icon: AlertCircle, color: 'text-orange-500' },
              { label: 'Sub-Depts', value: [...new Set(weekSlots.map(s => s.subDepartmentId))].length, icon: Users, color: 'text-purple-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${color} opacity-60`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <DaySection
            day="Saturday"
            date={satDate}
            slots={satSlots}
            canAssign={true}
            mySubDeptId={mySubDeptId}
          />
          <DaySection
            day="Sunday"
            date={sunDate}
            slots={sunSlots}
            canAssign={true}
            mySubDeptId={mySubDeptId}
          />

          {visibleSlots.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No slots assigned to your sub-department this week.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

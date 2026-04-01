import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule, DayAttendance } from '../context/ScheduleStore';
import { mockChildren, mockMembers } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, XCircle, Clock, Users, Calendar, Save } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'excused';

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 border-green-300',
  absent: 'bg-red-100 text-red-700 border-red-300',
  excused: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

export default function AttendanceTracking() {
  const { user } = useAuth();
  const { slots, attendance, markAttendance } = useSchedule();

  const isKuttr = user?.role === 'subdept-leader' && user?.subDepartment === 'Kuttr';
  const isChairperson = user?.role !== 'subdept-leader' && user?.role !== 'member';
  const canMark = isKuttr;

    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] text-center gap-4'>
        <div className='w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl'>X</div>
        <h2 className='text-xl font-semibold text-gray-800'>Access Restricted</h2>
        <p className='text-gray-500 max-w-sm'>Attendance tracking is managed exclusively by the Kuttr sub-department.</p>
      </div>
    );
  }

  // Get unique dates from scheduled slots
  const scheduledDates = [...new Set(slots.map(s => s.date))].sort();

  const [selectedDate, setSelectedDate] = useState<string>(scheduledDates[0] ?? '');
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});

  // Children attending on the selected date (based on kutr levels in slots for that day)
  const slotsForDate = slots.filter(s => s.date === selectedDate);
  const kutrLevelsForDate = [...new Set(slotsForDate.flatMap(s => s.kutrLevels))];
  const childrenForDate = mockChildren.filter(c => kutrLevelsForDate.includes(c.kutrLevel));

  // Existing attendance for this date
  const existingForDate = attendance.filter(a => a.date === selectedDate);
  const getStatus = (childId: string): AttendanceStatus | null => {
    if (draft[childId]) return draft[childId];
    return existingForDate.find(a => a.childId === childId)?.status ?? null;
  };

  const toggle = (childId: string, status: AttendanceStatus) => {
    if (!canMark) return;
    setDraft(prev => ({ ...prev, [childId]: status }));
  };

  const saveAttendance = () => {
    const kuttrMember = mockMembers.find(m => m.subDepartments.includes('Kuttr'));
    const markedBy = kuttrMember?.id ?? user?.id ?? 'unknown';
    const day = slotsForDate[0]?.day ?? 'Saturday';

    const records: Omit<DayAttendance, 'id'>[] = childrenForDate.map(child => ({
      weekId: slotsForDate[0]?.weekId ?? '',
      date: selectedDate,
      day: day as 'Saturday' | 'Sunday',
      childId: child.id,
      status: draft[child.id] ?? getStatus(child.id) ?? 'absent',
      markedBy,
      markedAt: new Date().toISOString(),
    }));

    markAttendance(records);
    setDraft({});
  };

  // Summary stats for chairperson view
  const totalPresent = attendance.filter(a => a.status === 'present').length;
  const totalAbsent = attendance.filter(a => a.status === 'absent').length;
  const totalExcused = attendance.filter(a => a.status === 'excused').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
        <p className="text-gray-600 mt-1">
          {canMark
            ? 'Mark children attendance for each program day'
            : 'View attendance records submitted by Kuttr'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: attendance.length, color: 'text-blue-600', icon: Users },
          { label: 'Present', value: totalPresent, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Absent', value: totalAbsent, color: 'text-red-500', icon: XCircle },
          { label: 'Excused', value: totalExcused, color: 'text-yellow-600', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
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

      {scheduledDates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No weekly schedule has been created yet.</p>
            {isChairperson && <p className="text-sm mt-1">Go to Weekly Programs to create the schedule.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Date selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Program Days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scheduledDates.map(date => {
                const daySlots = slots.filter(s => s.date === date);
                const day = daySlots[0]?.day ?? '';
                const marked = attendance.filter(a => a.date === date).length;
                const total = [...new Set(daySlots.flatMap(s => s.kutrLevels))]
                  .flatMap(k => mockChildren.filter(c => c.kutrLevel === k)).length;

                return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); setDraft({}); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDate === date
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-sm">{day}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <div className="mt-1">
                      {marked > 0
                        ? <Badge className="text-xs bg-green-100 text-green-700">{marked}/{total} marked</Badge>
                        : <Badge variant="outline" className="text-xs text-orange-500">Not marked</Badge>
                      }
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Attendance sheet */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedDate
                      ? `${slots.find(s => s.date === selectedDate)?.day} — ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                      : 'Select a day'}
                  </CardTitle>
                  <CardDescription>
                    {childrenForDate.length} children · Kutr levels: {kutrLevelsForDate.join(', ')}
                  </CardDescription>
                </div>
                {canMark && Object.keys(draft).length > 0 && (
                  <Button onClick={saveAttendance} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {childrenForDate.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No children for this day.</p>
              ) : (
                <div className="space-y-2">
                  {childrenForDate.map(child => {
                    const status = getStatus(child.id);
                    return (
                      <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-sm">{child.name}</p>
                          <p className="text-xs text-gray-500">Kutr {child.kutrLevel} · Age {child.age}</p>
                        </div>
                        <div className="flex gap-2">
                          {(['present', 'absent', 'excused'] as AttendanceStatus[]).map(s => (
                            <button
                              key={s}
                              disabled={!canMark}
                              onClick={() => toggle(child.id, s)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                status === s
                                  ? STATUS_STYLES[s]
                                  : 'border-gray-200 text-gray-400 hover:border-gray-400'
                              } ${!canMark ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chairperson: full attendance log */}
      {isChairperson && attendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Log (from Kuttr)</CardTitle>
            <CardDescription>All recorded attendance submitted by Kuttr sub-department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Child</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Day</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.map(a => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-medium">
                        {mockChildren.find(c => c.id === a.childId)?.name ?? a.childId}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {new Date(a.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{a.day}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

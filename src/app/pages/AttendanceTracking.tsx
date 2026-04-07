/**
 * AttendanceTracking page
 *
 * Attendance is tracked per day (not per slot).
 * Each date from the weekly program gets one attendance sheet covering
 * all children across all Kutr levels for that day.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule, DayAttendance, ProgramDay } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { canMarkAttendance } from '../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, CheckCircle2, Clock, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Present', className: 'bg-green-100 text-green-800 border-green-200' },
  absent:  { label: 'Absent',  className: 'bg-red-100 text-red-800 border-red-200' },
  late:    { label: 'Late',    className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  excused: { label: 'Excused', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

// ── Per-child row ──────────────────────────────────────────────────────────

function ChildRow({
  childId,
  childName,
  kutrLevel,
  status,
  onChange,
}: {
  childId: string;
  childName: string;
  kutrLevel: number;
  status: AttendanceStatus | null;
  onChange: (id: string, s: AttendanceStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{childName}</p>
        <p className="text-xs text-muted-foreground">Kutr {kutrLevel}</p>
      </div>
      <div className="flex gap-1 flex-wrap justify-end">
        {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
          <button
            key={s}
            onClick={() => onChange(childId, s)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
              status === s
                ? STATUS_CONFIG[s].className + ' ring-2 ring-offset-1 ring-current'
                : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Day attendance sheet ───────────────────────────────────────────────────

function DaySheet({
  date,
  day,
  existingAttendance,
  onSubmit,
}: {
  date: string;
  day: ProgramDay;
  existingAttendance: DayAttendance[];
  onSubmit: (date: string, day: ProgramDay, records: { childId: string; status: AttendanceStatus }[]) => Promise<void>;
}) {
  const { children } = useDataStore();

  // All children, sorted by kutrLevel then name
  const allChildren = useMemo(
    () => [...children].sort((a, b) => a.kutrLevel - b.kutrLevel || a.name.localeCompare(b.name)),
    [children]
  );

  // Seed status map from existing attendance
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const rec of existingAttendance) {
      map[rec.childId] = rec.status;
    }
    return map;
  });

  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const markedCount = Object.keys(statusMap).length;
  const alreadySubmitted = existingAttendance.length > 0;
  const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
  const absentCount = Object.values(statusMap).filter(s => s === 'absent').length;

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleChange = (childId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [childId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {};
    for (const c of allChildren) map[c.id] = status;
    setStatusMap(map);
  };

  const handleSubmit = async () => {
    const records = allChildren.map(c => ({
      childId: c.id,
      status: statusMap[c.id] ?? 'absent',
    }));
    setSubmitting(true);
    try {
      await onSubmit(date, day, records);
      toast.success(`Attendance saved for ${day} ${date}`);
    } catch {
      toast.error('Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      {/* Header — always visible, click to expand */}
      <button
        className="w-full text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <CardHeader className="pb-3 hover:bg-muted/30 transition-colors rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              {day} — {dateLabel}
            </CardTitle>
            <div className="flex items-center gap-2">
              {alreadySubmitted && (
                <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
          <CardDescription>
            {allChildren.length} children
            {alreadySubmitted && ` · ${presentCount} present, ${absentCount} absent`}
            {!alreadySubmitted && markedCount > 0 && ` · ${markedCount}/${allChildren.length} marked`}
          </CardDescription>
        </CardHeader>
      </button>

      {/* Expandable attendance sheet */}
      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-3">
            {/* Quick-mark all buttons */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Mark all:</span>
              {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleMarkAll(s)}
                  className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_CONFIG[s].className}`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Per-Kutr-level sections */}
            {([1, 2, 3] as const).map(level => {
              const levelChildren = allChildren.filter(c => c.kutrLevel === level);
              if (levelChildren.length === 0) return null;
              return (
                <div key={level} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Kutr {level}
                  </p>
                  {levelChildren.map(child => (
                    <ChildRow
                      key={child.id}
                      childId={child.id}
                      childName={child.name}
                      kutrLevel={child.kutrLevel}
                      status={statusMap[child.id] ?? null}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              );
            })}

            {allChildren.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No children registered yet.
              </p>
            )}

            {/* Submit bar */}
            <div className="flex items-center justify-between pt-3 border-t mt-2">
              <p className="text-xs text-muted-foreground">
                {markedCount}/{allChildren.length} marked
              </p>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || allChildren.length === 0}
              >
                {submitting ? 'Saving…' : alreadySubmitted ? 'Update Attendance' : 'Submit Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AttendanceTracking() {
  const { user } = useAuth();
  const { slots, attendance, markAttendance } = useSchedule();

  const role = user?.role ?? 'member';
  const subDept = user?.subDepartment;

  if (!canMarkAttendance(role as Parameters<typeof canMarkAttendance>[0], subDept)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">
            You don't have permission to mark attendance.
          </p>
        </div>
      </div>
    );
  }

  // Unique dates from program slots, most recent first
  const programDates = useMemo(() => {
    const map = new Map<string, ProgramDay>();
    for (const s of slots) map.set(s.date, s.day);
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [slots]);

  const handleSubmit = async (
    date: string,
    day: ProgramDay,
    records: { childId: string; status: AttendanceStatus }[]
  ) => {
    if (!user) return;
    const now = new Date().toISOString();
    await markAttendance(
      records.map(r => ({
        date,
        day,
        childId: r.childId,
        enrollmentId: '',
        status: r.status,
        markedBy: user.id,
        markedAt: now,
      }))
    );
  };

  const datesWithAttendance = new Set(attendance.map(a => a.date)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Mark daily attendance for all children in the weekly program
        </p>
      </div>

      {/* Stats */}
      {programDates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Program Days', value: programDates.length, icon: Clock, color: 'text-blue-600' },
            { label: 'Days Recorded', value: datesWithAttendance, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Total Records', value: attendance.length, icon: Users, color: 'text-purple-600' },
          ].map(({ label, value, icon: Icon, color }) => (
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
      )}

      {/* Empty state */}
      {programDates.length === 0 && (
        <Card>
          <CardContent className="text-center py-14 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No program days yet</p>
            <p className="text-sm mt-1">
              The chairperson needs to add weekly program slots before attendance can be recorded.
            </p>
          </CardContent>
        </Card>
      )}

      {/* One sheet per program day */}
      {programDates.map(([date, day]) => (
        <DaySheet
          key={date}
          date={date}
          day={day}
          existingAttendance={attendance.filter(a => a.date === date)}
          onSubmit={handleSubmit}
        />
      ))}
    </div>
  );
}

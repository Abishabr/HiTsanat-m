import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { SUBDEPT_COLORS } from '../data/mockData';
import { supabase } from '../../lib/supabase';
import { useDataStore } from './DataStore';

// ── Types ──────────────────────────────────────────────────────────────────

export type KutrLevel = 1 | 2 | 3;
export type ProgramDay = 'Saturday' | 'Sunday';

export interface ProgramSlot {
  id: string;
  date: string;
  day: ProgramDay;
  kutrLevels: KutrLevel[];
  startTime: string;
  endTime: string;
  subDepartmentId: string;
  assignedMemberId: string | null;
}

export interface DayAttendance {
  id: string;
  date: string;
  day: ProgramDay;
  childId: string;
  enrollmentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  markedAt: string;
}

export type NewSlot = Omit<ProgramSlot, 'id' | 'assignedMemberId'>;

export interface AttendanceNotification {
  id: string;
  date: string;
  day: ProgramDay;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  submittedAt: string;
  read: boolean;
}

interface ScheduleContextValue {
  slots: ProgramSlot[];
  attendance: DayAttendance[];
  subDepts: { id: string; name: string }[];
  addSlot: (slot: NewSlot, createdBy: string) => Promise<void>;
  removeSlot: (slotId: string) => Promise<void>;
  assignMember: (slotId: string, memberId: string, assignedBy: string) => Promise<void>;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => Promise<void>;
  notifications: AttendanceNotification[];
  markNotificationsRead: () => Promise<void>;
  isLoading: boolean;
}

// ── DB row types ───────────────────────────────────────────────────────────

interface SubDeptRow {
  sub_department_id: string;
  name: string;
}

interface ProgramRow {
  program_id: string;
  name: string;
  sub_department_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status?: string;
  created_by?: string | null;
  created_at?: string;
}

interface ProgramAssignmentRow {
  assignment_id: string;
  program_id: string;
  member_id: string;
  role_in_program?: string;
  is_active?: boolean;
}

interface ChildEnrollmentRow {
  enrollment_id: string;
  child_id: string;
  program_id: string;
  is_active?: boolean;
}

interface AttendanceRow {
  attendance_id: string;
  enrollment_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  recorded_by?: string | null;
  created_at?: string;
  // joined
  child_enrollments?: { child_id: string; program_id: string } | null;
}

// ── Mapping helpers ────────────────────────────────────────────────────────

function getRecentDateForDay(dayOfWeek: ProgramDay): string {
  const today = new Date();
  const targetDay = dayOfWeek === 'Saturday' ? 6 : 0;
  const todayDay = today.getDay();
  let diff = targetDay - todayDay;
  // If today is past the target day, get next week's occurrence
  if (diff < 0) diff += 7;
  // If diff is 0 (today is the target day), keep today
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result.toISOString().split('T')[0];
}

function programRowToSlot(row: ProgramRow, assignedMemberId: string | null = null): ProgramSlot {
  const day = (row.day_of_week === 'Saturday' || row.day_of_week === 'Sunday')
    ? row.day_of_week as ProgramDay
    : 'Saturday';
  return {
    id: row.program_id,
    date: getRecentDateForDay(day),
    day,
    kutrLevels: [1, 2, 3],
    startTime: row.start_time,
    endTime: row.end_time,
    subDepartmentId: row.sub_department_id,
    assignedMemberId,
  };
}

function statusToApp(s: string): DayAttendance['status'] {
  switch (s) {
    case 'Present': return 'present';
    case 'Absent': return 'absent';
    case 'Late': return 'late';
    case 'Excused': return 'excused';
    default: return 'absent';
  }
}

function statusToDb(s: DayAttendance['status']): string {
  switch (s) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'late': return 'Late';
    case 'excused': return 'Excused';
  }
}

function attendanceRowToDayAttendance(
  row: AttendanceRow,
  childId: string,
  day: ProgramDay = 'Saturday'
): DayAttendance {
  return {
    id: row.attendance_id,
    date: row.date,
    day,
    childId,
    enrollmentId: row.enrollment_id,
    status: statusToApp(row.status),
    markedBy: row.recorded_by ?? '',
    markedAt: row.created_at ?? new Date().toISOString(),
  };
}

// ── localStorage helpers (demo-mode) ──────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

let slotCounter = load<number>('hk_slot_counter', 100);
function newSlotId() {
  slotCounter += 1;
  save('hk_slot_counter', slotCounter);
  return `slot-${slotCounter}`;
}

// ── Context ────────────────────────────────────────────────────────────────

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const [slots, setSlots] = useState<ProgramSlot[]>(() =>
    isDemoMode ? load<ProgramSlot[]>('hk_slots', []) : []
  );
  const [attendance, setAttendance] = useState<DayAttendance[]>(() =>
    isDemoMode ? load<DayAttendance[]>('hk_attendance', []) : []
  );
  const [notifications, setNotifications] = useState<AttendanceNotification[]>(() =>
    isDemoMode ? load<AttendanceNotification[]>('hk_notifications', []) : []
  );
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>(() =>
    isDemoMode
      ? Object.keys(SUBDEPT_COLORS).map((name, i) => ({ id: `sd${i + 1}`, name }))
      : []
  );
  const [isLoading, setIsLoading] = useState(!isDemoMode);

  useEffect(() => { if (isDemoMode) save('hk_slots', slots); }, [slots, isDemoMode]);
  useEffect(() => { if (isDemoMode) save('hk_attendance', attendance); }, [attendance, isDemoMode]);
  useEffect(() => { if (isDemoMode) save('hk_notifications', notifications); }, [notifications, isDemoMode]);

  // ── Fetch on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);

      const [subDeptsResult, programsResult, assignmentsResult, enrollmentsResult, attendanceResult] =
        await Promise.all([
          supabase.from('sub_departments').select('sub_department_id, name'),
          supabase.from('programs').select('*').eq('status', 'Active'),
          supabase.from('program_assignments').select('*').eq('is_active', true),
          supabase.from('child_enrollments').select('*').eq('is_active', true),
          supabase.from('attendance').select('*, child_enrollments(child_id, program_id)'),
        ]);

      if (cancelled) return;

      if (!subDeptsResult.error) {
        setSubDepts(
          (subDeptsResult.data as SubDeptRow[]).map(sd => ({
            id: sd.sub_department_id,
            name: sd.name,
          }))
        );
      }

      // Build assignment map: program_id → member_id
      const assignmentMap = new Map<string, string>();
      if (!assignmentsResult.error) {
        for (const a of assignmentsResult.data as ProgramAssignmentRow[]) {
          assignmentMap.set(a.program_id, a.member_id);
        }
      }

      if (!programsResult.error) {
        setSlots(
          (programsResult.data as ProgramRow[]).map(row =>
            programRowToSlot(row, assignmentMap.get(row.program_id) ?? null)
          )
        );
      } else {
        console.error(`[supabase:fetch:programs] ${programsResult.error.message}`);
      }

      // Build enrollment map: enrollment_id → { child_id, program_id }
      const enrollmentMap = new Map<string, { childId: string; programId: string }>();
      if (!enrollmentsResult.error) {
        for (const e of enrollmentsResult.data as ChildEnrollmentRow[]) {
          enrollmentMap.set(e.enrollment_id, { childId: e.child_id, programId: e.program_id });
        }
      }

      // Build program→day map
      const programDayMap = new Map<string, ProgramDay>();
      if (!programsResult.error) {
        for (const p of programsResult.data as ProgramRow[]) {
          const day = (p.day_of_week === 'Saturday' || p.day_of_week === 'Sunday')
            ? p.day_of_week as ProgramDay : 'Saturday';
          programDayMap.set(p.program_id, day);
        }
      }

      if (!attendanceResult.error) {
        const records: DayAttendance[] = [];
        for (const row of attendanceResult.data as AttendanceRow[]) {
          const enroll = row.child_enrollments ?? enrollmentMap.get(row.enrollment_id);
          if (!enroll) continue;
          const childId = 'child_id' in enroll ? enroll.child_id : enroll.childId;
          const programId = 'program_id' in enroll ? enroll.program_id : enroll.programId;
          const day = programDayMap.get(programId) ?? 'Saturday';
          records.push(attendanceRowToDayAttendance(row, childId, day));
        }
        setAttendance(records);
      } else {
        console.error(`[supabase:fetch:attendance] ${attendanceResult.error.message}`);
      }

      setIsLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // ── Realtime subscriptions ─────────────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isDemoMode) return;

    const channel = supabase
      .channel('schedule-realtime')
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'programs' },
        (payload: { eventType: string; new: ProgramRow; old: { program_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setSlots(prev => prev.some(s => s.id === payload.new.program_id)
              ? prev : [...prev, programRowToSlot(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'Active') {
              setSlots(prev => prev.filter(s => s.id !== payload.new.program_id));
            } else {
              setSlots(prev => prev.map(s =>
                s.id === payload.new.program_id
                  ? programRowToSlot(payload.new, s.assignedMemberId) : s));
            }
          } else if (payload.eventType === 'DELETE') {
            setSlots(prev => prev.filter(s => s.id !== payload.old.program_id));
          }
        }
      )
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'program_assignments' },
        (payload: { eventType: string; new: ProgramAssignmentRow }) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSlots(prev => prev.map(s =>
              s.id === payload.new.program_id
                ? { ...s, assignedMemberId: payload.new.is_active ? payload.new.member_id : null }
                : s
            ));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode]);

  // ── addSlot ────────────────────────────────────────────────────────────

  const addSlot = async (slot: NewSlot, createdBy: string) => {
    if (isDemoMode) {
      setSlots(prev => [...prev, { ...slot, id: newSlotId(), assignedMemberId: null }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setSlots(prev => [...prev, { ...slot, id: tempId, assignedMemberId: null }]);

    const { data, error } = await supabase
      .from('programs')
      .insert({
        name: `${slot.day} Program`,
        sub_department_id: slot.subDepartmentId,
        day_of_week: slot.day,
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: 'Active',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:programs] ${error.message}`);
      setSlots(prev => prev.filter(s => s.id !== tempId));
    } else {
      setSlots(prev => prev.map(s => s.id === tempId ? programRowToSlot(data as ProgramRow) : s));
    }
  };

  // ── removeSlot ─────────────────────────────────────────────────────────

  const removeSlot = async (slotId: string) => {
    if (isDemoMode) {
      setSlots(prev => prev.filter(s => s.id !== slotId));
      return;
    }

    const previous = slots.find(s => s.id === slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));

    // Soft delete — set status to Inactive
    const { error } = await supabase
      .from('programs')
      .update({ status: 'Inactive' })
      .eq('program_id', slotId);

    if (error) {
      console.error(`[supabase:update:programs] ${error.message}`);
      if (previous) setSlots(prev => [...prev, previous]);
    }
  };

  // ── assignMember ───────────────────────────────────────────────────────

  const assignMember = async (slotId: string, memberId: string, assignedBy: string) => {
    if (isDemoMode) {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));
      return;
    }

    const previous = slots.find(s => s.id === slotId);
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));

    const { error } = await supabase
      .from('program_assignments')
      .upsert(
        { program_id: slotId, member_id: memberId, role_in_program: 'Assigned', assigned_by: assignedBy, is_active: true },
        { onConflict: 'program_id,member_id' }
      );

    if (error) {
      console.error(`[supabase:upsert:program_assignments] ${error.message}`);
      if (previous) setSlots(prev => prev.map(s => s.id === slotId ? previous : s));
    }
  };

  // ── markAttendance ─────────────────────────────────────────────────────
  // New schema: attendance links via enrollment_id from child_enrollments

  const markAttendance = async (records: Omit<DayAttendance, 'id'>[]) => {
    if (isDemoMode) {
      let counter = Date.now();
      const newRecords = records.map(r => ({ ...r, id: `att-${counter++}` }));
      setAttendance(prev => {
        const filtered = prev.filter(
          a => !newRecords.some(n => n.childId === a.childId && n.date === a.date)
        );
        return [...filtered, ...newRecords];
      });
      if (records.length > 0) {
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          date: records[0].date,
          day: records[0].day,
          presentCount: present,
          absentCount: absent,
          totalCount: records.length,
          submittedAt: new Date().toISOString(),
          read: false,
        }, ...prev.slice(0, 19)]);
      }
      return;
    }

    if (records.length === 0) return;

    // Optimistic update
    let counter = Date.now();
    const optimistic = records.map(r => ({ ...r, id: `temp-${counter++}` }));
    const tempIds = optimistic.map(r => r.id);

    setAttendance(prev => {
      const filtered = prev.filter(
        a => !optimistic.some(n => n.childId === a.childId && n.date === a.date)
      );
      return [...filtered, ...optimistic];
    });

    // For each record, ensure enrollment exists then upsert attendance
    const results: DayAttendance[] = [];

    for (const r of records) {
      // Find or create enrollment
      let enrollmentId = r.enrollmentId;

      if (!enrollmentId) {
        // Find matching program for this date
        const matchingSlot = slots.find(s => s.date === r.date);
        if (!matchingSlot) continue;

        // Check if enrollment exists
        const { data: existing } = await supabase
          .from('child_enrollments')
          .select('enrollment_id')
          .eq('child_id', r.childId)
          .eq('program_id', matchingSlot.id)
          .single();

        if (existing) {
          enrollmentId = existing.enrollment_id;
        } else {
          // Create enrollment
          const { data: newEnroll, error: enrollError } = await supabase
            .from('child_enrollments')
            .insert({
              child_id: r.childId,
              program_id: matchingSlot.id,
              enrolled_by: r.markedBy,
              is_active: true,
            })
            .select('enrollment_id')
            .single();

          if (enrollError) {
            console.error(`[supabase:insert:child_enrollments] ${enrollError.message}`);
            continue;
          }
          enrollmentId = newEnroll.enrollment_id;
        }
      }

      // Upsert attendance
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .upsert(
          {
            enrollment_id: enrollmentId,
            date: r.date,
            status: statusToDb(r.status),
            recorded_by: r.markedBy || null,
          },
          { onConflict: 'enrollment_id,date' }
        )
        .select()
        .single();

      if (attError) {
        console.error(`[supabase:upsert:attendance] ${attError.message}`);
        continue;
      }

      results.push(attendanceRowToDayAttendance(attData as AttendanceRow, r.childId, r.day));
    }

    setAttendance(prev => {
      const withoutTemps = prev.filter(a => !tempIds.includes(a.id));
      const deduped = withoutTemps.filter(
        a => !results.some(r => r.childId === a.childId && r.date === a.date)
      );
      return [...deduped, ...results];
    });

    // In-memory notification
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      date: records[0].date,
      day: records[0].day,
      presentCount: present,
      absentCount: absent,
      totalCount: records.length,
      submittedAt: new Date().toISOString(),
      read: false,
    }, ...prev.slice(0, 19)]);
  };

  const markNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <ScheduleContext.Provider value={{
      slots, attendance, subDepts, addSlot, removeSlot, assignMember,
      markAttendance, notifications, markNotificationsRead, isLoading,
    }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider');
  return ctx;
}

// ── Derived helpers ────────────────────────────────────────────────────────

export function getSubDeptName(id: string) { return id; }

export function getSubDeptColor(nameOrId: string): string {
  return SUBDEPT_COLORS[nameOrId] ?? '#6b7280';
}

export function useMemberName() {
  const { members } = useDataStore();
  return (id: string | null) => {
    if (!id) return '-';
    return members.find(m => m.id === id)?.name ?? id;
  };
}

export function useChildName() {
  const { children } = useDataStore();
  return (id: string) => children.find(c => c.id === id)?.name ?? id;
}

export function getMemberName(id: string | null, members: { id: string; name: string }[]): string {
  if (!id) return '-';
  return members.find(m => m.id === id)?.name ?? id;
}

export function getChildName(id: string, children: { id: string; name: string }[]): string {
  return children.find(c => c.id === id)?.name ?? id;
}

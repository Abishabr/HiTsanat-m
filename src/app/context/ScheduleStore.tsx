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
  status: 'present' | 'absent' | 'excused' | 'late';
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
  addSlot: (slot: NewSlot) => Promise<void>;
  removeSlot: (slotId: string) => Promise<void>;
  assignMember: (slotId: string, memberId: string) => Promise<void>;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => Promise<void>;
  notifications: AttendanceNotification[];
  markNotificationsRead: () => Promise<void>;
  isLoading: boolean;
}

// ── DB row types (matches user's actual Supabase schema) ──────────────────

interface SubDeptRow {
  sub_department_id: string;
  name: string;
  department_id?: string;
}

interface ProgramRow {
  program_id: string;
  name: string;
  sub_department_id: string;
  day_of_week: ProgramDay;
  start_time: string;
  end_time: string;
  created_by?: string | null;
  created_at?: string;
}

interface AttendanceRow {
  attendance_id: string;
  child_id: string;
  program_id: string;
  date: string;
  status: 'Present' | 'Absent';
  recorded_by?: string | null;
  created_at?: string;
}

interface ProgramAssignmentRow {
  assignment_id: string;
  program_id: string;
  member_id: string;
  role_in_program?: string;
  assigned_by?: string | null;
  created_at?: string;
}

// ── Mapping helpers ────────────────────────────────────────────────────────

/**
 * Get the most recent past (or today) occurrence of a given day of week.
 */
function getRecentDateForDay(dayOfWeek: ProgramDay): string {
  const today = new Date();
  const targetDay = dayOfWeek === 'Saturday' ? 6 : 0;
  const diff = (today.getDay() - targetDay + 7) % 7;
  const result = new Date(today);
  result.setDate(today.getDate() - diff);
  return result.toISOString().split('T')[0];
}

function programRowToSlot(row: ProgramRow, assignedMemberId: string | null = null): ProgramSlot {
  return {
    id: row.program_id,
    date: getRecentDateForDay(row.day_of_week),
    day: row.day_of_week,
    kutrLevels: [1, 2, 3],
    startTime: row.start_time,
    endTime: row.end_time,
    subDepartmentId: row.sub_department_id,
    assignedMemberId,
  };
}

function attendanceRowToDayAttendance(row: AttendanceRow, day: ProgramDay = 'Saturday'): DayAttendance {
  return {
    id: row.attendance_id,
    date: row.date,
    day,
    childId: row.child_id,
    status: row.status === 'Present' ? 'present' : 'absent',
    markedBy: row.recorded_by ?? '',
    markedAt: row.created_at ?? new Date().toISOString(),
  };
}

// ── localStorage helpers (demo-mode fallback) ──────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
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
  // In demo mode, seed subDepts from static color map; in live mode, fetched from Supabase
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>(() =>
    isDemoMode
      ? Object.keys(SUBDEPT_COLORS)
          .filter(n => n !== 'Ekd')
          .map((name, i) => ({ id: `sd${i + 1}`, name }))
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

      const [subDeptsResult, programsResult, assignmentsResult, attendanceResult] = await Promise.all([
        supabase.from('sub_departments').select('sub_department_id, name'),
        supabase.from('programs').select('*'),
        supabase.from('program_assignments').select('*'),
        supabase.from('attendance').select('*'),
      ]);

      if (cancelled) return;

      if (!subDeptsResult.error) {
        setSubDepts(
          (subDeptsResult.data as SubDeptRow[])
            .filter(sd => sd.name !== 'Ekd')
            .map(sd => ({ id: sd.sub_department_id, name: sd.name }))
        );
      }

      // Build assignment map: program_id → member_id
      const assignmentMap = new Map<string, string>();
      if (!assignmentsResult.error) {
        for (const a of assignmentsResult.data as ProgramAssignmentRow[]) {
          assignmentMap.set(a.program_id, a.member_id);
        }
      }

      if (programsResult.error) {
        console.error(`[supabase:fetch:programs] ${programsResult.error.message}`);
      } else {
        const programSlots = (programsResult.data as ProgramRow[]).map(row =>
          programRowToSlot(row, assignmentMap.get(row.program_id) ?? null)
        );
        setSlots(programSlots);
      }

      if (attendanceResult.error) {
        console.error(`[supabase:fetch:attendance] ${attendanceResult.error.message}`);
      } else {
        // Resolve day from matching slot
        const slotDayMap = new Map<string, ProgramDay>();
        if (!programsResult.error) {
          for (const p of programsResult.data as ProgramRow[]) {
            slotDayMap.set(p.program_id, p.day_of_week);
          }
        }
        setAttendance(
          (attendanceResult.data as AttendanceRow[]).map(row =>
            attendanceRowToDayAttendance(row, slotDayMap.get(row.program_id) ?? 'Saturday')
          )
        );
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
            setSlots(prev => {
              if (prev.some(s => s.id === payload.new.program_id)) return prev;
              return [...prev, programRowToSlot(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setSlots(prev =>
              prev.map(s =>
                s.id === payload.new.program_id
                  ? programRowToSlot(payload.new, s.assignedMemberId)
                  : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setSlots(prev => prev.filter(s => s.id !== payload.old.program_id));
          }
        }
      )
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'program_assignments' },
        (payload: { eventType: string; new: ProgramAssignmentRow; old: { assignment_id: string } }) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSlots(prev =>
              prev.map(s =>
                s.id === payload.new.program_id
                  ? { ...s, assignedMemberId: payload.new.member_id }
                  : s
              )
            );
          }
        }
      )
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'attendance' },
        (payload: { eventType: string; new: AttendanceRow; old: { attendance_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setAttendance(prev => {
              if (prev.some(a => a.id === payload.new.attendance_id)) return prev;
              return [...prev, attendanceRowToDayAttendance(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAttendance(prev =>
              prev.map(a =>
                a.id === payload.new.attendance_id
                  ? attendanceRowToDayAttendance(payload.new)
                  : a
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAttendance(prev => prev.filter(a => a.id !== payload.old.attendance_id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode]);

  // ── addSlot ────────────────────────────────────────────────────────────

  const addSlot = async (slot: NewSlot) => {
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
      })
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:programs] ${error.message}`);
      setSlots(prev => prev.filter(s => s.id !== tempId));
    } else {
      const realSlot = programRowToSlot(data as ProgramRow);
      setSlots(prev => prev.map(s => s.id === tempId ? realSlot : s));
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

    const { error } = await supabase.from('programs').delete().eq('program_id', slotId);
    if (error) {
      console.error(`[supabase:delete:programs] ${error.message}`);
      if (previous) setSlots(prev => [...prev, previous]);
    }
  };

  // ── assignMember ───────────────────────────────────────────────────────

  const assignMember = async (slotId: string, memberId: string) => {
    if (isDemoMode) {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));
      return;
    }

    const previous = slots.find(s => s.id === slotId);
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));

    // Upsert into program_assignments
    const { error } = await supabase
      .from('program_assignments')
      .upsert(
        { program_id: slotId, member_id: memberId, role_in_program: 'assigned' },
        { onConflict: 'program_id,member_id' }
      );

    if (error) {
      console.error(`[supabase:upsert:program_assignments] ${error.message}`);
      if (previous) setSlots(prev => prev.map(s => s.id === slotId ? previous : s));
    }
  };

  // ── markAttendance ─────────────────────────────────────────────────────

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
        const notif: AttendanceNotification = {
          id: `notif-${Date.now()}`,
          date: records[0].date,
          day: records[0].day,
          presentCount: present,
          absentCount: absent,
          totalCount: records.length,
          submittedAt: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [notif, ...prev.slice(0, 19)]);
      }
      return;
    }

    if (records.length === 0) return;

    // Optimistic update
    let counter = Date.now();
    const optimisticRecords = records.map(r => ({ ...r, id: `temp-${counter++}` }));
    const tempIds = optimisticRecords.map(r => r.id);

    setAttendance(prev => {
      const filtered = prev.filter(
        a => !optimisticRecords.some(n => n.childId === a.childId && n.date === a.date)
      );
      return [...filtered, ...optimisticRecords];
    });

    // Find matching program for this date
    const matchingSlot = slots.find(s => s.date === records[0].date);
    const programId = matchingSlot?.id ?? null;

    const rows = records.map(r => ({
      child_id: r.childId,
      program_id: programId,
      date: r.date,
      status: (r.status === 'present' || r.status === 'late') ? 'Present' : 'Absent',
      recorded_by: null,
    }));

    const { data: upsertedRows, error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'child_id,program_id,date' })
      .select();

    if (error) {
      console.error(`[supabase:upsert:attendance] ${error.message}`);
      setAttendance(prev => prev.filter(a => !tempIds.includes(a.id)));
      return;
    }

    const realRecords = (upsertedRows as AttendanceRow[]).map(row =>
      attendanceRowToDayAttendance(row, records[0].day)
    );
    setAttendance(prev => {
      const withoutTemps = prev.filter(a => !tempIds.includes(a.id));
      const deduped = withoutTemps.filter(
        a => !realRecords.some(r => r.childId === a.childId && r.date === a.date)
      );
      return [...deduped, ...realRecords];
    });

    // Create in-memory notification (no attendance_notifications table in schema)
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const notif: AttendanceNotification = {
      id: `notif-${Date.now()}`,
      date: records[0].date,
      day: records[0].day,
      presentCount: present,
      absentCount: absent,
      totalCount: records.length,
      submittedAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev.slice(0, 19)]);
  };

  // ── markNotificationsRead ──────────────────────────────────────────────

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

export function getSubDeptName(id: string) {
  // id is now a UUID — name resolution happens via subDepts in context
  return id;
}

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

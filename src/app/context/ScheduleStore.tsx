import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { subDepartments } from '../data/mockData';
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
  addSlot: (slot: NewSlot) => Promise<void>;
  removeSlot: (slotId: string) => Promise<void>;
  assignMember: (slotId: string, memberId: string) => Promise<void>;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => Promise<void>;
  notifications: AttendanceNotification[];
  markNotificationsRead: () => Promise<void>;
  isLoading: boolean;
}

// ── DB row types ───────────────────────────────────────────────────────────

interface ProgramSlotRow {
  id: string;
  date: string;
  day: ProgramDay;
  kutr_levels: KutrLevel[];
  start_time: string;
  end_time: string;
  sub_department_id: string;
  assigned_member_id: string | null;
  created_at?: string;
}

interface DayAttendanceRow {
  id: string;
  date: string;
  day: ProgramDay;
  child_id: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  marked_by: string;
  marked_at: string;
  created_at?: string;
}

interface AttendanceNotificationRow {
  id: string;
  date: string;
  day: ProgramDay;
  present_count: number;
  absent_count: number;
  total_count: number;
  submitted_at: string;
  read: boolean;
  created_at?: string;
}

// ── Mapping helpers ────────────────────────────────────────────────────────

function rowToSlot(row: ProgramSlotRow): ProgramSlot {
  return {
    id: row.id,
    date: row.date,
    day: row.day,
    kutrLevels: row.kutr_levels ?? [],
    startTime: row.start_time,
    endTime: row.end_time,
    subDepartmentId: row.sub_department_id,
    assignedMemberId: row.assigned_member_id,
  };
}

function slotToRow(slot: NewSlot): Omit<ProgramSlotRow, 'id' | 'created_at'> {
  return {
    date: slot.date,
    day: slot.day,
    kutr_levels: slot.kutrLevels,
    start_time: slot.startTime,
    end_time: slot.endTime,
    sub_department_id: slot.subDepartmentId,
    assigned_member_id: null,
  };
}

function rowToAttendance(row: DayAttendanceRow): DayAttendance {
  return {
    id: row.id,
    date: row.date,
    day: row.day,
    childId: row.child_id,
    status: row.status,
    markedBy: row.marked_by,
    markedAt: row.marked_at,
  };
}

function attendanceToRow(r: Omit<DayAttendance, 'id'>): Omit<DayAttendanceRow, 'id' | 'created_at'> {
  return {
    date: r.date,
    day: r.day,
    child_id: r.childId,
    status: r.status,
    marked_by: r.markedBy,
    marked_at: r.markedAt,
  };
}

function rowToNotification(row: AttendanceNotificationRow): AttendanceNotification {
  return {
    id: row.id,
    date: row.date,
    day: row.day,
    presentCount: row.present_count,
    absentCount: row.absent_count,
    totalCount: row.total_count,
    submittedAt: row.submitted_at,
    read: row.read,
  };
}

// ── Normalized table row types (migration 003) ─────────────────────────────

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

interface NormalizedAttendanceRow {
  attendance_id: string;
  child_id: string;
  program_id: string;
  date: string;
  status: 'Present' | 'Absent';
  recorded_by?: string | null;
  created_at?: string;
}

/** Map a programs row to a ProgramSlot (synthetic — no kutrLevels in normalized schema) */
function programRowToSlot(row: ProgramRow): ProgramSlot {
  return {
    id: row.program_id,
    date: row.created_at?.split('T')[0] ?? '',
    day: row.day_of_week,
    kutrLevels: [1, 2, 3], // programs cover all kutr levels by default
    startTime: row.start_time,
    endTime: row.end_time,
    subDepartmentId: row.sub_department_id,
    assignedMemberId: null,
  };
}

/** Map normalized_attendance row → DayAttendance (status enum → lowercase) */
function normalizedRowToAttendance(row: NormalizedAttendanceRow): DayAttendance {
  return {
    id: row.attendance_id,
    date: row.date,
    day: 'Saturday', // day not stored in normalized_attendance; default
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
  } catch {
    // storage full or unavailable — silently ignore
  }
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
  const [isLoading, setIsLoading] = useState(!isDemoMode);

  // Persist to localStorage in demo mode
  useEffect(() => { if (isDemoMode) save('hk_slots', slots); }, [slots, isDemoMode]);
  useEffect(() => { if (isDemoMode) save('hk_attendance', attendance); }, [attendance, isDemoMode]);
  useEffect(() => { if (isDemoMode) save('hk_notifications', notifications); }, [notifications, isDemoMode]);

  // ── task 7.1: fetch on mount ───────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;

    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);

      // Fetch legacy program_slots and new programs + attendance tables in parallel
      const [slotsResult, attendanceResult, notificationsResult, programsResult, normAttResult] =
        await Promise.all([
          supabase.from('program_slots').select('*'),
          supabase.from('day_attendance').select('*'),
          supabase.from('attendance_notifications').select('*'),
          supabase.from('programs').select('*'),
          supabase.from('attendance').select('*'),
        ]);

      if (cancelled) return;

      // program_slots (legacy)
      if (slotsResult.error) {
        console.error(`[supabase:fetch:program_slots] ${slotsResult.error.message}`);
      } else {
        setSlots((slotsResult.data as ProgramSlotRow[]).map(rowToSlot));
      }

      // day_attendance (legacy) — merge with normalized_attendance
      const legacyAttendance = attendanceResult.error
        ? []
        : (attendanceResult.data as DayAttendanceRow[]).map(rowToAttendance);

      const normAttendance = normAttResult.error
        ? []
        : (normAttResult.data as NormalizedAttendanceRow[]).map(normalizedRowToAttendance);

      // Deduplicate: normalized records override legacy by (childId, date)
      const mergedAttendance = [
        ...legacyAttendance.filter(
          la => !normAttendance.some(na => na.childId === la.childId && na.date === la.date)
        ),
        ...normAttendance,
      ];
      setAttendance(mergedAttendance);

      // attendance_notifications
      if (notificationsResult.error) {
        console.error(`[supabase:fetch:attendance_notifications] ${notificationsResult.error.message}`);
      } else {
        const sorted = (notificationsResult.data as AttendanceNotificationRow[])
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
        setNotifications(sorted.map(rowToNotification));
      }

      // programs (normalized) — merge into slots as synthetic ProgramSlot entries
      if (!programsResult.error && programsResult.data.length > 0) {
        const programSlots = (programsResult.data as ProgramRow[]).map(programRowToSlot);
        setSlots(prev => {
          // Avoid duplicating slots already loaded from program_slots
          const existingIds = new Set(prev.map(s => s.id));
          const newSlots = programSlots.filter(s => !existingIds.has(s.id));
          return [...prev, ...newSlots];
        });
      }

      setIsLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // ── task 7.5: Realtime subscriptions ──────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isDemoMode) return;

    const channel = supabase
      .channel('schedule-realtime')
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'program_slots' },
        (payload: { eventType: string; new: ProgramSlotRow; old: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setSlots(prev => {
              if (prev.some(s => s.id === payload.new.id)) return prev;
              return [...prev, rowToSlot(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setSlots(prev =>
              prev.map(s => s.id === payload.new.id ? rowToSlot(payload.new) : s)
            );
          } else if (payload.eventType === 'DELETE') {
            setSlots(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      // Normalized programs table
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
              prev.map(s => s.id === payload.new.program_id ? programRowToSlot(payload.new) : s)
            );
          } else if (payload.eventType === 'DELETE') {
            setSlots(prev => prev.filter(s => s.id !== payload.old.program_id));
          }
        }
      )
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'day_attendance' },
        (payload: { eventType: string; new: DayAttendanceRow; old: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setAttendance(prev => {
              if (prev.some(a => a.id === payload.new.id)) return prev;
              return [...prev, rowToAttendance(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAttendance(prev =>
              prev.map(a => a.id === payload.new.id ? rowToAttendance(payload.new) : a)
            );
          } else if (payload.eventType === 'DELETE') {
            setAttendance(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      // Normalized attendance table
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'attendance' },
        (payload: { eventType: string; new: NormalizedAttendanceRow; old: { attendance_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setAttendance(prev => {
              if (prev.some(a => a.id === payload.new.attendance_id)) return prev;
              return [...prev, normalizedRowToAttendance(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAttendance(prev =>
              prev.map(a => a.id === payload.new.attendance_id ? normalizedRowToAttendance(payload.new) : a)
            );
          } else if (payload.eventType === 'DELETE') {
            setAttendance(prev => prev.filter(a => a.id !== payload.old.attendance_id));
          }
        }
      )
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'attendance_notifications' },
        (payload: { eventType: string; new: AttendanceNotificationRow; old: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => {
              if (prev.some(n => n.id === payload.new.id)) return prev;
              return [rowToNotification(payload.new), ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? rowToNotification(payload.new) : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode]);

  // ── task 7.2: addSlot / removeSlot / assignMember ─────────────────────

  const addSlot = async (slot: NewSlot) => {
    if (isDemoMode) {
      setSlots(prev => [...prev, { ...slot, id: newSlotId(), assignedMemberId: null }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ProgramSlot = { ...slot, id: tempId, assignedMemberId: null };
    setSlots(prev => [...prev, optimistic]);

    // Write to program_slots (legacy) — always works
    const { data, error } = await supabase
      .from('program_slots')
      .insert(slotToRow(slot))
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:program_slots] ${error.message}`);
      setSlots(prev => prev.filter(s => s.id !== tempId));
    } else {
      const realSlot = rowToSlot(data as ProgramSlotRow);
      setSlots(prev =>
        prev.map(s => s.id === tempId ? realSlot : s)
      );

      // Also write to normalized programs table if sub_department_id is a UUID
      // (legacy sub_department_id is a short string like 'sd1')
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slot.subDepartmentId);
      if (isUuid) {
        const programRow = {
          name: `${slot.day} Program`,
          sub_department_id: slot.subDepartmentId,
          day_of_week: slot.day,
          start_time: slot.startTime,
          end_time: slot.endTime,
        };
        const { error: progError } = await supabase.from('programs').insert(programRow);
        if (progError) console.warn(`[supabase:insert:programs] ${progError.message}`);
      }
    }
  };

  const removeSlot = async (slotId: string) => {
    if (isDemoMode) {
      setSlots(prev => prev.filter(s => s.id !== slotId));
      return;
    }

    const previous = slots.find(s => s.id === slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));

    const { error } = await supabase.from('program_slots').delete().eq('id', slotId);

    if (error) {
      console.error(`[supabase:delete:program_slots] ${error.message}`);
      if (previous) setSlots(prev => [...prev, previous]);
    }
  };

  const assignMember = async (slotId: string, memberId: string) => {
    if (isDemoMode) {
      setSlots(prev =>
        prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s)
      );
      return;
    }

    const previous = slots.find(s => s.id === slotId);
    setSlots(prev =>
      prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s)
    );

    const { error } = await supabase
      .from('program_slots')
      .update({ assigned_member_id: memberId })
      .eq('id', slotId);

    if (error) {
      console.error(`[supabase:update:program_slots] ${error.message}`);
      if (previous) setSlots(prev => prev.map(s => s.id === slotId ? previous : s));
    }
  };

  // ── task 7.3: markAttendance ───────────────────────────────────────────

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

    // Upsert into your `attendance` table (child_id, program_id, date unique)
    const matchingSlot = slots.find(s => s.date === records[0].date);
    const programId = matchingSlot?.id ?? null;

    const normRows = records.map(r => ({
      child_id: r.childId,
      program_id: programId,
      date: r.date,
      status: r.status === 'present' || r.status === 'late' ? 'Present' : 'Absent',
      recorded_by: null,
    }));

    const { data: upsertedRows, error: attendanceError } = await supabase
      .from('attendance')
      .upsert(normRows, { onConflict: 'child_id,program_id,date' })
      .select();

    if (attendanceError) {
      console.error(`[supabase:upsert:attendance] ${attendanceError.message}`);
      setAttendance(prev => prev.filter(a => !tempIds.includes(a.id)));
      return;
    }

    const realRecords = (upsertedRows as NormalizedAttendanceRow[]).map(normalizedRowToAttendance);
    setAttendance(prev => {
      const withoutTemps = prev.filter(a => !tempIds.includes(a.id));
      const deduped = withoutTemps.filter(
        a => !realRecords.some(r => r.childId === a.childId && r.date === a.date)
      );
      return [...deduped, ...realRecords];
    });

    // Insert notification row
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const notifRow = {
      date: records[0].date,
      day: records[0].day,
      present_count: present,
      absent_count: absent,
      total_count: records.length,
      submitted_at: new Date().toISOString(),
      read: false,
    };

    const { data: notifData, error: notifError } = await supabase
      .from('attendance_notifications')
      .insert(notifRow)
      .select()
      .single();

    if (notifError) {
      console.error(`[supabase:insert:attendance_notifications] ${notifError.message}`);
    } else {
      const newNotif = rowToNotification(notifData as AttendanceNotificationRow);
      setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
    }
  };

  // ── task 7.4: markNotificationsRead ───────────────────────────────────

  const markNotificationsRead = async () => {
    if (isDemoMode) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      return;
    }

    // Optimistic update
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const { error } = await supabase
      .from('attendance_notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      console.error(`[supabase:update:attendance_notifications] ${error.message}`);
      setNotifications(previous);
    }
  };

  return (
    <ScheduleContext.Provider value={{
      slots, attendance, addSlot, removeSlot, assignMember,
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
  return subDepartments.find(s => s.id === id)?.name ?? id;
}

export function getSubDeptColor(id: string) {
  return subDepartments.find(s => s.id === id)?.color ?? '#6b7280';
}

// ── task 7.6: getMemberName / getChildName read from live DataStore state ──

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

/**
 * Standalone helpers that accept arrays directly — useful outside React components
 * and for backward compatibility with call sites that pass members/children explicitly.
 */
export function getMemberName(id: string | null, members: { id: string; name: string }[]): string {
  if (!id) return '-';
  return members.find(m => m.id === id)?.name ?? id;
}

export function getChildName(id: string, children: { id: string; name: string }[]): string {
  return children.find(c => c.id === id)?.name ?? id;
}

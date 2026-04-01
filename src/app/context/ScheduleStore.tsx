import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockChildren, mockMembers, subDepartments } from '../data/mockData';

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
  status: 'present' | 'absent' | 'excused';
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
  addSlot: (slot: NewSlot) => void;
  removeSlot: (slotId: string) => void;
  assignMember: (slotId: string, memberId: string) => void;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => void;
  notifications: AttendanceNotification[];
  markNotificationsRead: () => void;
}

// ── localStorage helpers ───────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

let slotCounter = load<number>('hk_slot_counter', 100);
function newSlotId() {
  slotCounter += 1;
  save('hk_slot_counter', slotCounter);
  return `slot-${slotCounter}`;
}

// ── Context ────────────────────────────────────────────────────────────────

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<ProgramSlot[]>(() =>
    load<ProgramSlot[]>('hk_slots', [])
  );
  const [attendance, setAttendance] = useState<DayAttendance[]>(() =>
    load<DayAttendance[]>('hk_attendance', [])
  );
  const [notifications, setNotifications] = useState<AttendanceNotification[]>(() =>
    load<AttendanceNotification[]>('hk_notifications', [])
  );

  // Persist whenever state changes
  useEffect(() => { save('hk_slots', slots); }, [slots]);
  useEffect(() => { save('hk_attendance', attendance); }, [attendance]);
  useEffect(() => { save('hk_notifications', notifications); }, [notifications]);

  const addSlot = (slot: NewSlot) => {
    setSlots(prev => [...prev, { ...slot, id: newSlotId(), assignedMemberId: null }]);
  };

  const removeSlot = (slotId: string) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const assignMember = (slotId: string, memberId: string) => {
    setSlots(prev =>
      prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s)
    );
  };

  const markAttendance = (records: Omit<DayAttendance, 'id'>[]) => {
    let counter = Date.now();
    const newRecords = records.map(r => ({ ...r, id: `att-${counter++}` }));
    setAttendance(prev => {
      const filtered = prev.filter(
        a => !newRecords.some(n => n.childId === a.childId && n.date === a.date)
      );
      return [...filtered, ...newRecords];
    });

    // Create a notification for the chairperson
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
      setNotifications(prev => [notif, ...prev.slice(0, 19)]); // keep last 20
    }
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <ScheduleContext.Provider value={{ slots, attendance, addSlot, removeSlot, assignMember, markAttendance, notifications, markNotificationsRead }}>
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

export function getMemberName(id: string | null) {
  if (!id) return '-';
  return mockMembers.find(m => m.id === id)?.name ?? id;
}

export function getChildName(id: string) {
  return mockChildren.find(c => c.id === id)?.name ?? id;
}

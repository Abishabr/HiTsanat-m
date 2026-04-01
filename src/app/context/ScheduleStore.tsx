import { createContext, useContext, useState, ReactNode } from 'react';
import { mockChildren, mockMembers, subDepartments } from '../data/mockData';

// ── Types ──────────────────────────────────────────────────────────────────

export type KutrLevel = 1 | 2 | 3;
export type ProgramDay = 'Saturday' | 'Sunday';

export interface ProgramSlot {
  id: string;
  date: string;            // ISO date
  day: ProgramDay;
  kutrLevels: KutrLevel[];
  startTime: string;       // "09:00"
  endTime: string;         // "09:40"
  subDepartmentId: string; // responsible dept — set by chairperson
  assignedMemberId: string | null; // set by that dept's leader
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

interface ScheduleContextValue {
  slots: ProgramSlot[];
  attendance: DayAttendance[];
  addSlot: (slot: NewSlot) => void;
  removeSlot: (slotId: string) => void;
  assignMember: (slotId: string, memberId: string) => void;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let slotCounter = 100;
function newSlotId() { return `slot-${++slotCounter}`; }

// ── Context ────────────────────────────────────────────────────────────────

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<ProgramSlot[]>([]);
  const [attendance, setAttendance] = useState<DayAttendance[]>([]);

  const addSlot = (slot: NewSlot) => {
    setSlots(prev => [...prev, { ...slot, id: newSlotId(), assignedMemberId: null }]);
  };

  const removeSlot = (slotId: string) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const assignMember = (slotId: string, memberId: string) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));
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
  };

  return (
    <ScheduleContext.Provider value={{ slots, attendance, addSlot, removeSlot, assignMember, markAttendance }}>
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

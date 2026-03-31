import { createContext, useContext, useState, ReactNode } from 'react';
import { mockChildren, mockMembers, subDepartments } from '../data/mockData';

// ── Types ──────────────────────────────────────────────────────────────────

export type KutrLevel = 1 | 2 | 3;
export type ProgramDay = 'Saturday' | 'Sunday';

export interface ProgramSlot {
  id: string;
  weekId: string;          // e.g. "2026-W15"
  date: string;            // ISO date of the Saturday or Sunday
  day: ProgramDay;
  kutrLevels: KutrLevel[]; // which kutr groups attend this slot
  startTime: string;       // "09:00"
  endTime: string;         // "09:40"
  subDepartmentId: string; // which dept is responsible
  assignedMemberId: string | null; // assigned by that dept
}

export interface DayAttendance {
  id: string;
  weekId: string;
  date: string;
  day: ProgramDay;
  childId: string;
  status: 'present' | 'absent' | 'excused';
  markedBy: string; // member id of Kuttr member who marked
  markedAt: string; // ISO timestamp
}

interface ScheduleContextValue {
  slots: ProgramSlot[];
  attendance: DayAttendance[];
  generateWeeklySchedule: () => void;
  assignMember: (slotId: string, memberId: string) => void;
  markAttendance: (records: Omit<DayAttendance, 'id'>[]) => void;
  hasScheduleForWeek: (weekId: string) => boolean;
}

// ── Fixed schedule template ────────────────────────────────────────────────

// Saturday: Kutr 1 & 2
const SAT_SLOTS: Omit<ProgramSlot, 'id' | 'weekId' | 'date' | 'assignedMemberId'>[] = [
  { day: 'Saturday', kutrLevels: [1, 2], startTime: '09:00', endTime: '09:40', subDepartmentId: 'sd1' },
  { day: 'Saturday', kutrLevels: [1, 2], startTime: '09:40', endTime: '10:20', subDepartmentId: 'sd2' },
  { day: 'Saturday', kutrLevels: [1, 2], startTime: '10:20', endTime: '11:00', subDepartmentId: 'sd1' },
  { day: 'Saturday', kutrLevels: [1, 2], startTime: '11:00', endTime: '11:30', subDepartmentId: 'sd3' },
];

// Sunday: Kutr 1 only
const SUN_KUTR1_SLOTS: Omit<ProgramSlot, 'id' | 'weekId' | 'date' | 'assignedMemberId'>[] = [
  { day: 'Sunday', kutrLevels: [1], startTime: '08:00', endTime: '08:30', subDepartmentId: 'sd1' },
  { day: 'Sunday', kutrLevels: [1], startTime: '08:30', endTime: '09:00', subDepartmentId: 'sd2' },
];

// Sunday: Kutr 2 & 3
const SUN_KUTR23_SLOTS: Omit<ProgramSlot, 'id' | 'weekId' | 'date' | 'assignedMemberId'>[] = [
  { day: 'Sunday', kutrLevels: [2, 3], startTime: '08:00', endTime: '08:40', subDepartmentId: 'sd1' },
  { day: 'Sunday', kutrLevels: [2, 3], startTime: '08:40', endTime: '09:20', subDepartmentId: 'sd2' },
  { day: 'Sunday', kutrLevels: [2, 3], startTime: '09:20', endTime: '10:00', subDepartmentId: 'sd1' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function nextWeekday(dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 6=Sat
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7 || 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

let slotCounter = 100;
function newSlotId() { return `slot-${++slotCounter}`; }

// ── Context ────────────────────────────────────────────────────────────────

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<ProgramSlot[]>([]);
  const [attendance, setAttendance] = useState<DayAttendance[]>([]);

  const hasScheduleForWeek = (weekId: string) =>
    slots.some(s => s.weekId === weekId);

  const generateWeeklySchedule = () => {
    const satDate = nextWeekday(6);
    const sunDate = nextWeekday(0);
    const weekId = getISOWeek(satDate);

    if (hasScheduleForWeek(weekId)) return; // already generated

    const satISO = toISO(satDate);
    const sunISO = toISO(sunDate);

    const newSlots: ProgramSlot[] = [
      ...SAT_SLOTS.map(t => ({ ...t, id: newSlotId(), weekId, date: satISO, assignedMemberId: null })),
      ...SUN_KUTR1_SLOTS.map(t => ({ ...t, id: newSlotId(), weekId, date: sunISO, assignedMemberId: null })),
      ...SUN_KUTR23_SLOTS.map(t => ({ ...t, id: newSlotId(), weekId, date: sunISO, assignedMemberId: null })),
    ];

    setSlots(prev => [...prev, ...newSlots]);
  };

  const assignMember = (slotId: string, memberId: string) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedMemberId: memberId } : s));
  };

  const markAttendance = (records: Omit<DayAttendance, 'id'>[]) => {
    let counter = Date.now();
    const newRecords = records.map(r => ({ ...r, id: `att-${counter++}` }));
    setAttendance(prev => {
      // Replace existing records for same child+date
      const filtered = prev.filter(
        a => !newRecords.some(n => n.childId === a.childId && n.date === a.date)
      );
      return [...filtered, ...newRecords];
    });
  };

  return (
    <ScheduleContext.Provider value={{ slots, attendance, generateWeeklySchedule, assignMember, markAttendance, hasScheduleForWeek }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider');
  return ctx;
}

// ── Derived helpers used by multiple pages ─────────────────────────────────

export function getSubDeptName(id: string) {
  return subDepartments.find(s => s.id === id)?.name ?? id;
}

export function getSubDeptColor(id: string) {
  return subDepartments.find(s => s.id === id)?.color ?? '#6b7280';
}

export function getMemberName(id: string | null) {
  if (!id) return '—';
  return mockMembers.find(m => m.id === id)?.name ?? id;
}

export function getChildName(id: string) {
  return mockChildren.find(c => c.id === id)?.name ?? id;
}

// Types and UI constants for the Hitsanat KFL System
// All runtime data is fetched from Supabase — no mock arrays here.

export type UserRole = 'chairperson' | 'vice-chairperson' | 'secretary' | 'subdept-leader' | 'subdept-vice-leader' | 'member' | 'teacher' | 'kuttr-member' | 'viewer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  subDepartment?: string;
  email: string;
  phone: string;
}

export interface ChildParent {
  id?: string;
  role: 'father' | 'mother';
  fullName: string;
  phone?: string;
}

export interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
}

export interface Family {
  id: string;
  name: string;
}

export interface Child {
  id: string;
  name: string;
  givenName?: string;
  fatherName?: string;
  grandfatherName?: string;
  spiritualName?: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  address?: string;
  parents?: ChildParent[];
  emergencyContacts?: EmergencyContact[];
  age: number;
  kutrLevel: 1 | 2 | 3;
  familyId: string;
  familyName: string;
  guardianContact: string;
  registrationDate: string;
  photo?: string;
}

export interface Member {
  id: string;
  studentId: string;
  name: string;
  givenName?: string;
  fatherName?: string;
  grandfatherName?: string;
  spiritualName?: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  campus?: string;
  academicDepartment?: string;
  telegram?: string;
  kehnetRoles?: string[];
  emergencyContacts?: EmergencyContact[];
  yearOfStudy: number;
  phone: string;
  email: string;
  subDepartments: string[];
  families: string[];
  photo?: string;
  joinDate: string;
}

export interface SubDepartment {
  id: string;
  name: string;
  chairperson?: string;
  viceChairperson?: string;
  secretary?: string;
  memberCount?: number;
  description?: string;
  color: string;
}

export interface WeeklyProgram {
  id: string;
  date: string;
  day: 'Saturday' | 'Sunday';
  subDepartmentId: string;
  type: string;
  description: string;
  assignedMembers: string[];
  childrenGroup: string[];
  status: 'scheduled' | 'ongoing' | 'completed';
}

export interface ChildEvent {
  id: string;
  name: string;
  type: 'Timker' | 'Hosana' | 'Meskel' | 'Other';
  date: string;
  description: string;
  participants: number;
  supervisors: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface MemberActivity {
  id: string;
  name: string;
  subDepartmentId: string;
  date: string;
  description: string;
  assignedMembers: { memberId: string; role: string }[];
  status: 'planned' | 'ongoing' | 'completed';
}

export interface TimhertActivity {
  id: string;
  name: string;
  type: 'Midterm' | 'Final' | 'Assignment';
  kutrLevel: 1 | 2 | 3;
  maxScore: number;
  date: string;
  status: 'scheduled' | 'completed';
}

export interface AttendanceRecord {
  id: string;
  entityType: 'child' | 'member';
  entityId: string;
  entityName: string;
  programId?: string;
  eventId?: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  markedBy: string;
}

// ── UI constants (not data) ────────────────────────────────────────────────

/** Static color palette keyed by sub-department name */
export const SUBDEPT_COLORS: Record<string, string> = {
  Timhert:   '#3b82f6',
  Mezmur:    '#8b5cf6',
  Kinetibeb: '#ec4899',
  Kuttr:     '#10b981',
  Ekd:       '#f59e0b',
};

export const SUBDEPT_DISPLAY_NAMES: Record<string, string> = {
  Timhert:   'Timhert Academic',
  Mezmur:    'Mezmur',
  Kinetibeb: 'Kinetibeb',
  Kuttr:     'Kuttr',
  Ekd:       'EKD',
};

export function getSubDeptDisplayName(name: string): string {
  return Object.prototype.hasOwnProperty.call(SUBDEPT_DISPLAY_NAMES, name)
    ? SUBDEPT_DISPLAY_NAMES[name]
    : name;
}

/** Fallback color for a sub-department name */
export function getSubDeptColor(name: string): string {
  return SUBDEPT_COLORS[name] ?? '#6b7280';
}

// Kept for AuthContext demo-mode compatibility only
export const currentUser: User = {
  id: '',
  name: '',
  role: 'chairperson',
  email: '',
  phone: '',
};

// Mock data and utilities for the Hitsanat KFL System

export type UserRole = 'chairperson' | 'vice-chairperson' | 'secretary' | 'subdept-leader' | 'member';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  subDepartment?: string;
  email: string;
  phone: string;
}

export interface Child {
  id: string;
  name: string;
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
  name: 'Timhert' | 'Mezmur' | 'Kinetibeb' | 'Kuttr' | 'Ekd';
  chairperson: string;
  viceChairperson: string;
  secretary: string;
  memberCount: number;
  description: string;
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

// Mock current user - can be changed to simulate different roles
export const currentUser: User = {
  id: 'u1',
  name: 'Abebe Kebede',
  role: 'chairperson',
  email: 'abebe.kebede@hitsanat.org',
  phone: '+251 911 123456',
};

export const subDepartments: SubDepartment[] = [
  {
    id: 'sd1',
    name: 'Timhert',
    chairperson: 'Almaz Tesfaye',
    viceChairperson: 'Dawit Mengistu',
    secretary: 'Sara Wolde',
    memberCount: 25,
    description: 'Lessons & exams for children - academic education',
    color: '#3b82f6',
  },
  {
    id: 'sd2',
    name: 'Mezmur',
    chairperson: 'Tsion Haile',
    viceChairperson: 'Michael Bekele',
    secretary: 'Ruth Alemayehu',
    memberCount: 18,
    description: 'Choir practice and performance',
    color: '#8b5cf6',
  },
  {
    id: 'sd3',
    name: 'Kinetibeb',
    chairperson: 'Daniel Assefa',
    viceChairperson: 'Hanna Solomon',
    secretary: 'Yonas Tadesse',
    memberCount: 20,
    description: 'Arts, film, and cultural activities',
    color: '#ec4899',
  },
  {
    id: 'sd4',
    name: 'Kuttr',
    chairperson: 'Kidus Worku',
    viceChairperson: 'Bethel Girma',
    secretary: 'Samuel Tefera',
    memberCount: 15,
    description: 'Attendance tracking for children',
    color: '#10b981',
  },
  {
    id: 'sd5',
    name: 'Ekd',
    chairperson: 'Martha Negash',
    viceChairperson: 'Yohannes Desta',
    secretary: 'Eden Mulugeta',
    memberCount: 12,
    description: 'Administrative & auxiliary support',
    color: '#f59e0b',
  },
];

export const mockChildren: Child[] = [
  { id: 'c1', name: 'Abigail Tekle', age: 8, kutrLevel: 1, familyId: 'f1', familyName: 'Tekle Family', guardianContact: '+251 911 111111', registrationDate: '2024-01-15' },
  { id: 'c2', name: 'Bemnet Hailu', age: 10, kutrLevel: 2, familyId: 'f2', familyName: 'Hailu Family', guardianContact: '+251 911 222222', registrationDate: '2024-01-20' },
  { id: 'c3', name: 'Caleb Mekonnen', age: 12, kutrLevel: 3, familyId: 'f3', familyName: 'Mekonnen Family', guardianContact: '+251 911 333333', registrationDate: '2024-02-01' },
  { id: 'c4', name: 'Dagmawit Yosef', age: 7, kutrLevel: 1, familyId: 'f1', familyName: 'Tekle Family', guardianContact: '+251 911 111111', registrationDate: '2024-02-10' },
  { id: 'c5', name: 'Elias Gebru', age: 11, kutrLevel: 2, familyId: 'f4', familyName: 'Gebru Family', guardianContact: '+251 911 444444', registrationDate: '2024-02-15' },
  { id: 'c6', name: 'Feven Abraham', age: 13, kutrLevel: 3, familyId: 'f5', familyName: 'Abraham Family', guardianContact: '+251 911 555555', registrationDate: '2024-03-01' },
  { id: 'c7', name: 'Gelila Shiferaw', age: 9, kutrLevel: 2, familyId: 'f6', familyName: 'Shiferaw Family', guardianContact: '+251 911 666666', registrationDate: '2024-03-10' },
  { id: 'c8', name: 'Henok Alemayehu', age: 8, kutrLevel: 1, familyId: 'f7', familyName: 'Alemayehu Family', guardianContact: '+251 911 777777', registrationDate: '2024-03-15' },
];

export const mockMembers: Member[] = [
  { id: 'm1', studentId: 'STU001', name: 'Almaz Tesfaye', yearOfStudy: 3, phone: '+251 911 100001', email: 'almaz@email.com', subDepartments: ['Timhert'], families: ['f1', 'f2'], joinDate: '2023-09-01' },
  { id: 'm2', studentId: 'STU002', name: 'Dawit Mengistu', yearOfStudy: 4, phone: '+251 911 100002', email: 'dawit@email.com', subDepartments: ['Timhert', 'Mezmur'], families: ['f3'], joinDate: '2022-09-01' },
  { id: 'm3', studentId: 'STU003', name: 'Tsion Haile', yearOfStudy: 2, phone: '+251 911 100003', email: 'tsion@email.com', subDepartments: ['Mezmur'], families: ['f4', 'f5'], joinDate: '2024-01-15' },
  { id: 'm4', studentId: 'STU004', name: 'Daniel Assefa', yearOfStudy: 5, phone: '+251 911 100004', email: 'daniel@email.com', subDepartments: ['Kinetibeb'], families: ['f6'], joinDate: '2021-09-01' },
  { id: 'm5', studentId: 'STU005', name: 'Kidus Worku', yearOfStudy: 3, phone: '+251 911 100005', email: 'kidus@email.com', subDepartments: ['Kuttr'], families: ['f7'], joinDate: '2023-09-01' },
  { id: 'm6', studentId: 'STU006', name: 'Martha Negash', yearOfStudy: 4, phone: '+251 911 100006', email: 'martha@email.com', subDepartments: ['Ekd', 'Kuttr'], families: ['f1'], joinDate: '2022-09-01' },
];

export const mockWeeklyPrograms: WeeklyProgram[] = [
  { id: 'wp1', date: '2026-04-05', day: 'Saturday', subDepartmentId: 'sd1', type: 'Lesson', description: 'Bible Study - Grade 1', assignedMembers: ['m1', 'm2'], childrenGroup: ['c1', 'c4', 'c8'], status: 'scheduled' },
  { id: 'wp2', date: '2026-04-05', day: 'Saturday', subDepartmentId: 'sd2', type: 'Practice', description: 'Choir Practice - New Songs', assignedMembers: ['m3'], childrenGroup: ['c2', 'c5', 'c7'], status: 'scheduled' },
  { id: 'wp3', date: '2026-04-06', day: 'Sunday', subDepartmentId: 'sd1', type: 'Lesson', description: 'Bible Study - Grade 2', assignedMembers: ['m1'], childrenGroup: ['c2', 'c5', 'c7'], status: 'scheduled' },
  { id: 'wp4', date: '2026-04-06', day: 'Sunday', subDepartmentId: 'sd3', type: 'Activity', description: 'Art Workshop', assignedMembers: ['m4'], childrenGroup: ['c3', 'c6'], status: 'scheduled' },
];

export const mockChildEvents: ChildEvent[] = [
  { id: 'ce1', name: 'Timker Celebration', type: 'Timker', date: '2026-01-19', description: 'Annual Timker celebration with baptism ceremony', participants: 45, supervisors: ['m1', 'm2', 'm3'], status: 'completed' },
  { id: 'ce2', name: 'Hosana Festival', type: 'Hosana', date: '2026-04-13', description: 'Palm Sunday celebration and procession', participants: 52, supervisors: ['m2', 'm4', 'm5'], status: 'upcoming' },
  { id: 'ce3', name: 'Meskel Celebration', type: 'Meskel', date: '2026-09-27', description: 'Finding of the True Cross celebration', participants: 0, supervisors: [], status: 'upcoming' },
];

export const mockMemberActivities: MemberActivity[] = [
  { id: 'ma1', name: 'Adar Program Planning', subDepartmentId: 'sd1', date: '2026-04-15', description: 'Monthly Adar program preparation and coordination', assignedMembers: [{ memberId: 'm1', role: 'Leader' }, { memberId: 'm2', role: 'Assistant' }], status: 'planned' },
  { id: 'ma2', name: 'Mezmur Recording Session', subDepartmentId: 'sd2', date: '2026-04-20', description: 'Studio recording for new hymn album', assignedMembers: [{ memberId: 'm3', role: 'Coordinator' }], status: 'planned' },
];

export const mockTimhertActivities: TimhertActivity[] = [
  { id: 'ta1', name: 'Midterm Exam - January', type: 'Midterm', kutrLevel: 1, maxScore: 50, date: '2026-01-25', status: 'completed' },
  { id: 'ta2', name: 'Final Exam - March', type: 'Final', kutrLevel: 1, maxScore: 100, date: '2026-03-20', status: 'completed' },
  { id: 'ta3', name: 'Assignment - April', type: 'Assignment', kutrLevel: 2, maxScore: 25, date: '2026-04-10', status: 'scheduled' },
  { id: 'ta4', name: 'Midterm Exam - April', type: 'Midterm', kutrLevel: 3, maxScore: 50, date: '2026-04-28', status: 'scheduled' },
];

export const mockAttendance: AttendanceRecord[] = [
  { id: 'att1', entityType: 'child', entityId: 'c1', entityName: 'Abigail Tekle', programId: 'wp1', date: '2026-03-29', status: 'present', markedBy: 'm1' },
  { id: 'att2', entityType: 'child', entityId: 'c2', entityName: 'Bemnet Hailu', programId: 'wp1', date: '2026-03-29', status: 'absent', markedBy: 'm1' },
  { id: 'att3', entityType: 'child', entityId: 'c3', entityName: 'Caleb Mekonnen', eventId: 'ce1', date: '2026-01-19', status: 'present', markedBy: 'm2' },
  { id: 'att4', entityType: 'member', entityId: 'm1', entityName: 'Almaz Tesfaye', programId: 'wp1', date: '2026-03-29', status: 'present', markedBy: 'm5' },
];

// Dashboard statistics
export const getDashboardStats = () => {
  return {
    totalChildren: mockChildren.length,
    totalMembers: mockMembers.length,
    upcomingPrograms: mockWeeklyPrograms.filter(p => p.status === 'scheduled').length,
    upcomingEvents: mockChildEvents.filter(e => e.status === 'upcoming').length,
    attendanceRate: 87,
    activeSubDepartments: subDepartments.length,
  };
};

// Attendance trend data for charts
export const getAttendanceTrends = () => {
  return [
    { week: 'Week 1', children: 82, members: 90 },
    { week: 'Week 2', children: 78, members: 88 },
    { week: 'Week 3', children: 85, members: 92 },
    { week: 'Week 4', children: 87, members: 89 },
  ];
};

// Performance data for Timhert
export const getPerformanceData = () => {
  return [
    { kutr: 'Kutr 1', average: 78 },
    { kutr: 'Kutr 2', average: 82 },
    { kutr: 'Kutr 3', average: 85 },
  ];
};

// Sub-department activity data
export const getSubDepartmentActivity = () => {
  return subDepartments.map(sd => ({
    name: sd.name,
    programs: Math.floor(Math.random() * 10) + 5,
    attendance: Math.floor(Math.random() * 20) + 80,
  }));
};

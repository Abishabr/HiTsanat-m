/**
 * Role-Based Access Control (RBAC) for Hitsanat KFL System
 * Based on the official RBAC documentation.
 */

export type UserRole =
  | 'chairperson'
  | 'vice-chairperson'
  | 'secretary'
  | 'subdept-leader'
  | 'subdept-vice-leader'
  | 'member'
  | 'teacher'        // Timhert-specific: records academic scores
  | 'kuttr-member'   // Kuttr-specific: marks children attendance
  | 'viewer';        // Read-only access

// ── Role display labels ────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  'chairperson':        'Chairperson',
  'vice-chairperson':   'Vice Chairperson',
  'secretary':          'Secretary',
  'subdept-leader':     'Sub-Department Leader',
  'subdept-vice-leader':'Sub-Department Vice Leader',
  'member':             'Member',
  'teacher':            'Teacher (Timhert)',
  'kuttr-member':       'Kuttr Member',
  'viewer':             'Viewer',
};

// ── Role groupings ─────────────────────────────────────────────────────────

/** Full department-level leadership */
export const DEPT_LEADERSHIP: UserRole[] = ['chairperson', 'vice-chairperson'];

/** Can read/write across the whole department */
export const DEPT_WIDE_WRITE: UserRole[] = ['chairperson', 'vice-chairperson', 'secretary'];

/** Sub-department scoped leadership */
export const SUBDEPT_LEADERSHIP: UserRole[] = ['subdept-leader', 'subdept-vice-leader'];

// ── Permission helpers ─────────────────────────────────────────────────────

/** Full CRUD on all records */
export function canManageAll(role: UserRole): boolean {
  return role === 'chairperson' || role === 'vice-chairperson';
}

/** Can create/edit basic records (children, members, attendance) */
export function canWrite(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role) || SUBDEPT_LEADERSHIP.includes(role);
}

/** Can view all department data */
export function canViewAll(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role);
}

/** Can manage users (register, assign roles, deactivate) */
export function canManageUsers(role: UserRole): boolean {
  return role === 'chairperson' || role === 'vice-chairperson';
}

/** Can approve assignments and events */
export function canApprove(role: UserRole): boolean {
  return role === 'chairperson' || role === 'vice-chairperson' || role === 'subdept-leader';
}

/** Can generate and export reports */
export function canExportReports(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role) || SUBDEPT_LEADERSHIP.includes(role);
}

/** Can mark children attendance */
export function canMarkAttendance(role: UserRole, subDepartment?: string): boolean {
  if (DEPT_WIDE_WRITE.includes(role)) return true;
  if (role === 'kuttr-member') return true;
  if ((role === 'subdept-leader' || role === 'subdept-vice-leader') && subDepartment === 'Kuttr') return true;
  return false;
}

/** Can access Timhert academic module (record scores) */
export function canManageAcademics(role: UserRole, subDepartment?: string): boolean {
  if (DEPT_WIDE_WRITE.includes(role)) return true;
  if (role === 'teacher') return true;
  if ((role === 'subdept-leader' || role === 'subdept-vice-leader') && subDepartment === 'Timhert') return true;
  return false;
}

/** Can view academic scores */
export function canViewAcademics(role: UserRole, subDepartment?: string): boolean {
  if (canManageAcademics(role, subDepartment)) return true;
  if (role === 'viewer') return true;
  return false;
}

/** Can manage children (register, edit, delete) — chairperson/vice/secretary only */
export function canManageChildren(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role);
}

/** Can manage members (register, edit, delete) — chairperson/vice/secretary only */
export function canManageMembers(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role);
}

/** Can manage weekly program slots */
export function canManagePrograms(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role) || SUBDEPT_LEADERSHIP.includes(role);
}

/** Can manage events */
export function canManageEvents(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role) || SUBDEPT_LEADERSHIP.includes(role);
}

/** Can manage member activities */
export function canManageActivities(role: UserRole): boolean {
  return DEPT_WIDE_WRITE.includes(role) || SUBDEPT_LEADERSHIP.includes(role);
}

/** Determines which dashboard to show */
export function getDashboardType(role: UserRole): 'chairperson' | 'subdept' | 'member' | 'teacher' | 'kuttr' | 'viewer' {
  if (role === 'chairperson' || role === 'vice-chairperson' || role === 'secretary') return 'chairperson';
  if (role === 'subdept-leader' || role === 'subdept-vice-leader') return 'subdept';
  if (role === 'teacher') return 'teacher';
  if (role === 'kuttr-member') return 'kuttr';
  if (role === 'viewer') return 'viewer';
  return 'member';
}

/** Nav items visible per role */
export function getVisibleNav(role: UserRole, subDepartment?: string): string[] {
  const all = ['dashboard', 'children', 'members', 'weekly-programs', 'events', 'member-activities', 'timhert', 'attendance', 'reports'];

  if (canManageAll(role)) return all;

  if (role === 'secretary') return ['dashboard', 'children', 'members', 'weekly-programs', 'events', 'member-activities', 'timhert', 'attendance', 'reports'];

  if (role === 'subdept-leader' || role === 'subdept-vice-leader') {
    const base = ['dashboard', 'children', 'members', 'weekly-programs', 'events', 'member-activities', 'reports'];
    if (subDepartment === 'Kuttr') base.push('attendance');
    if (subDepartment === 'Timhert') base.push('timhert');
    return base;
  }

  if (role === 'teacher') return ['dashboard', 'timhert', 'children'];

  if (role === 'kuttr-member') return ['dashboard', 'attendance', 'children'];

  if (role === 'viewer') return ['dashboard', 'reports'];

  // member
  return ['dashboard', 'weekly-programs', 'member-activities'];
}

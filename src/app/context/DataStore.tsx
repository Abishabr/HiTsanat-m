import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { mockMembers, mockChildren, Member, Child } from '../data/mockData';
import { supabase } from '../../lib/supabase';

// ─── camelCase ↔ snake_case mapping helpers (task 6.4) ───────────────────────

interface MemberRow {
  id: string;
  student_id: string;
  name: string;
  given_name?: string | null;
  father_name?: string | null;
  grandfather_name?: string | null;
  spiritual_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  campus?: string | null;
  academic_department?: string | null;
  telegram?: string | null;
  kehnet_roles?: string[];
  year_of_study: number;
  phone: string;
  email: string;
  sub_departments: string[];
  families: string[];
  photo?: string | null;
  join_date: string;
  created_at?: string;
}

interface ChildRow {
  id: string;
  name: string;
  given_name?: string | null;
  father_name?: string | null;
  grandfather_name?: string | null;
  spiritual_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  age: number;
  kutr_level: 1 | 2 | 3;
  family_id: string;
  family_name: string;
  guardian_contact: string;
  registration_date: string;
  photo?: string | null;
  created_at?: string;
}

// ─── Normalized table row types (migration 003) ───────────────────────────────

interface NormalizedMemberRow {
  member_id: string;
  first_name: string;
  father_name: string;
  grandfather_name: string;
  christian_name?: string | null;
  gender?: string | null;
  phone_number: string;
  email?: string | null;
  telegram_username?: string | null;
  profile_photo_url?: string | null;
  created_at?: string;
}

interface NormalizedChildRow {
  child_id: string;
  first_name: string;
  father_name: string;
  grandfather_name: string;
  gender?: string | null;
  village?: string | null;
  kutr_level: 'Kutr1' | 'Kutr2' | 'Kutr3';
  photo_url?: string | null;
  registered_by?: string | null;
  created_at?: string;
}

// Map kutr_level enum → numeric
function kutrEnumToNumber(k: 'Kutr1' | 'Kutr2' | 'Kutr3'): 1 | 2 | 3 {
  return k === 'Kutr1' ? 1 : k === 'Kutr2' ? 2 : 3;
}

function normalizedRowToMember(row: NormalizedMemberRow): Member {
  const fullName = `${row.first_name} ${row.father_name}`.trim();
  return {
    id: row.member_id,
    studentId: row.member_id, // no student_id in normalized table
    name: fullName,
    givenName: row.first_name,
    fatherName: row.father_name,
    grandfatherName: row.grandfather_name,
    spiritualName: row.christian_name ?? undefined,
    gender: (row.gender as 'Male' | 'Female') ?? undefined,
    phone: row.phone_number,
    email: row.email ?? '',
    telegram: row.telegram_username ?? undefined,
    photo: row.profile_photo_url ?? undefined,
    subDepartments: [],
    families: [],
    yearOfStudy: 0,
    joinDate: row.created_at?.split('T')[0] ?? '',
    kehnetRoles: [],
  };
}

function normalizedRowToChild(row: NormalizedChildRow): Child {
  const fullName = `${row.first_name} ${row.father_name}`.trim();
  return {
    id: row.child_id,
    name: fullName,
    givenName: row.first_name,
    fatherName: row.father_name,
    grandfatherName: row.grandfather_name,
    gender: (row.gender as 'Male' | 'Female') ?? undefined,
    address: row.village ?? undefined,
    kutrLevel: kutrEnumToNumber(row.kutr_level),
    photo: row.photo_url ?? undefined,
    age: 0,
    familyId: '',
    familyName: '',
    guardianContact: '',
    registrationDate: row.created_at?.split('T')[0] ?? '',
  };
}

function rowToMember(row: MemberRow): Member {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    givenName: row.given_name ?? undefined,
    fatherName: row.father_name ?? undefined,
    grandfatherName: row.grandfather_name ?? undefined,
    spiritualName: row.spiritual_name ?? undefined,
    gender: (row.gender as 'Male' | 'Female') ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    campus: row.campus ?? undefined,
    academicDepartment: row.academic_department ?? undefined,
    telegram: row.telegram ?? undefined,
    kehnetRoles: row.kehnet_roles ?? [],
    yearOfStudy: row.year_of_study,
    phone: row.phone,
    email: row.email,
    subDepartments: row.sub_departments ?? [],
    families: row.families ?? [],
    photo: row.photo ?? undefined,
    joinDate: row.join_date,
  };
}

function memberToRow(m: Omit<Member, 'id'>): Omit<MemberRow, 'id' | 'created_at'> {
  return {
    student_id: m.studentId,
    name: m.name,
    given_name: m.givenName ?? null,
    father_name: m.fatherName ?? null,
    grandfather_name: m.grandfatherName ?? null,
    spiritual_name: m.spiritualName ?? null,
    gender: m.gender ?? null,
    date_of_birth: m.dateOfBirth ?? null,
    campus: m.campus ?? null,
    academic_department: m.academicDepartment ?? null,
    telegram: m.telegram ?? null,
    kehnet_roles: m.kehnetRoles ?? [],
    year_of_study: m.yearOfStudy,
    phone: m.phone,
    email: m.email,
    sub_departments: m.subDepartments,
    families: m.families,
    photo: m.photo ?? null,
    join_date: m.joinDate,
  };
}

function rowToChild(row: ChildRow): Child {
  return {
    id: row.id,
    name: row.name,
    givenName: row.given_name ?? undefined,
    fatherName: row.father_name ?? undefined,
    grandfatherName: row.grandfather_name ?? undefined,
    spiritualName: row.spiritual_name ?? undefined,
    gender: (row.gender as 'Male' | 'Female') ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    address: row.address ?? undefined,
    age: row.age,
    kutrLevel: row.kutr_level,
    familyId: row.family_id,
    familyName: row.family_name,
    guardianContact: row.guardian_contact,
    registrationDate: row.registration_date,
    photo: row.photo ?? undefined,
  };
}

function childToRow(c: Omit<Child, 'id'>): Omit<ChildRow, 'id' | 'created_at'> {
  return {
    name: c.name,
    given_name: c.givenName ?? null,
    father_name: c.fatherName ?? null,
    grandfather_name: c.grandfatherName ?? null,
    spiritual_name: c.spiritualName ?? null,
    gender: c.gender ?? null,
    date_of_birth: c.dateOfBirth ?? null,
    address: c.address ?? null,
    age: c.age,
    kutr_level: c.kutrLevel,
    family_id: c.familyId,
    family_name: c.familyName,
    guardian_contact: c.guardianContact,
    registration_date: c.registrationDate,
    photo: c.photo ?? null,
  };
}

// ─── Context interface (task 6.6) ─────────────────────────────────────────────

interface DataStoreValue {
  members: Member[];
  children: Child[];
  addMember: (m: Omit<Member, 'id'>) => Promise<void>;
  updateMember: (id: string, m: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  addChild: (c: Omit<Child, 'id'>) => Promise<void>;
  updateChild: (id: string, c: Partial<Child>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  isLoading: boolean;
  lastError: string | null;
}

const DataStoreContext = createContext<DataStoreValue | null>(null);

// ─── localStorage helpers (kept for demo-mode fallback) ───────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

let memberCounter = load<number>('hk_member_counter', mockMembers.length + 1);
let childCounter = load<number>('hk_child_counter', mockChildren.length + 1);

function newMemberId() {
  memberCounter += 1;
  save('hk_member_counter', memberCounter);
  return `m${memberCounter}`;
}

function newChildId() {
  childCounter += 1;
  save('hk_child_counter', childCounter);
  return `c${childCounter}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataStoreProvider({ children: reactChildren }: { children: ReactNode }) {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const [members, setMembers] = useState<Member[]>(() =>
    isDemoMode ? load<Member[]>('hk_members', mockMembers) : []
  );
  const [children, setChildren] = useState<Child[]>(() =>
    isDemoMode ? load<Child[]>('hk_children', mockChildren) : []
  );
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [lastError, setLastError] = useState<string | null>(null);

  // Keep localStorage in sync in demo mode
  useEffect(() => {
    if (isDemoMode) save('hk_members', members);
  }, [members, isDemoMode]);
  useEffect(() => {
    if (isDemoMode) save('hk_children', children);
  }, [children, isDemoMode]);

  // ── task 6.1: fetch on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;

    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);

      // Try normalized tables first (migration 003), fall back to legacy tables
      const [membersResult, childrenResult] = await Promise.all([
        supabase.from('normalized_members').select('*'),
        supabase.from('normalized_children').select('*'),
      ]);

      if (cancelled) return;

      if (membersResult.error) {
        // Fall back to legacy members table
        console.warn('[DataStore] normalized_members unavailable, falling back to members');
        const legacy = await supabase.from('members').select('*');
        if (!cancelled && !legacy.error) {
          setMembers((legacy.data as MemberRow[]).map(rowToMember));
        } else if (legacy.error) {
          console.error(`[supabase:fetch:members] ${legacy.error.message}`);
          setLastError(legacy.error.message);
        }
      } else {
        setMembers((membersResult.data as NormalizedMemberRow[]).map(normalizedRowToMember));
      }

      if (childrenResult.error) {
        // Fall back to legacy children table
        console.warn('[DataStore] normalized_children unavailable, falling back to children');
        const legacy = await supabase.from('children').select('*');
        if (!cancelled && !legacy.error) {
          setChildren((legacy.data as ChildRow[]).map(rowToChild));
        } else if (legacy.error) {
          console.error(`[supabase:fetch:children] ${legacy.error.message}`);
          setLastError(legacy.error.message);
        }
      } else {
        setChildren((childrenResult.data as NormalizedChildRow[]).map(normalizedRowToChild));
      }

      setIsLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // ── task 6.5: Realtime subscriptions ─────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isDemoMode) return;

    const channel = supabase
      .channel('datastore-realtime')
      // Legacy members table
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'members' },
        (payload: { eventType: string; new: MemberRow; old: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, rowToMember(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev =>
              prev.map(m => m.id === payload.new.id ? rowToMember(payload.new) : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      // Normalized members table
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'normalized_members' },
        (payload: { eventType: string; new: NormalizedMemberRow; old: { member_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => {
              if (prev.some(m => m.id === payload.new.member_id)) return prev;
              return [...prev, normalizedRowToMember(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev =>
              prev.map(m => m.id === payload.new.member_id ? normalizedRowToMember(payload.new) : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev => prev.filter(m => m.id !== payload.old.member_id));
          }
        }
      )
      // Legacy children table
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'children' },
        (payload: { eventType: string; new: ChildRow; old: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setChildren(prev => {
              if (prev.some(c => c.id === payload.new.id)) return prev;
              return [...prev, rowToChild(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setChildren(prev =>
              prev.map(c => c.id === payload.new.id ? rowToChild(payload.new) : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setChildren(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      // Normalized children table
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'normalized_children' },
        (payload: { eventType: string; new: NormalizedChildRow; old: { child_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setChildren(prev => {
              if (prev.some(c => c.id === payload.new.child_id)) return prev;
              return [...prev, normalizedRowToChild(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setChildren(prev =>
              prev.map(c => c.id === payload.new.child_id ? normalizedRowToChild(payload.new) : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setChildren(prev => prev.filter(c => c.id !== payload.old.child_id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode]);

  // ── task 6.2: Member CRUD with optimistic updates ─────────────────────────

  const addMember = async (m: Omit<Member, 'id'>) => {
    if (isDemoMode) {
      setMembers(prev => [...prev, { ...m, id: newMemberId() }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Member = { ...m, id: tempId };
    setMembers(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('members')
      .insert(memberToRow(m))
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:members] ${error.message}`);
      setMembers(prev => prev.filter(x => x.id !== tempId));
      setLastError(error.message);
      return;
    }

    const realMember = rowToMember(data as MemberRow);
    setMembers(prev => prev.map(x => x.id === tempId ? realMember : x));

    // Insert emergency contacts into normalized table
    if (m.emergencyContacts && m.emergencyContacts.length > 0) {
      const ecRows = m.emergencyContacts.map(ec => ({
        member_id: realMember.id,
        name: ec.name,
        phone: ec.phone,
      }));
      const { error: ecError } = await supabase.from('member_emergency_contacts').insert(ecRows);
      if (ecError) console.error(`[supabase:insert:member_emergency_contacts] ${ecError.message}`);
    }
  };

  const updateMember = async (id: string, m: Partial<Member>) => {
    if (isDemoMode) {
      setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));
      return;
    }

    const previous = members.find(x => x.id === id);
    setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));

    // Build partial snake_case row from the partial camelCase update
    const partialRow: Partial<MemberRow> = {};
    if (m.studentId !== undefined) partialRow.student_id = m.studentId;
    if (m.name !== undefined) partialRow.name = m.name;
    if (m.givenName !== undefined) partialRow.given_name = m.givenName ?? null;
    if (m.fatherName !== undefined) partialRow.father_name = m.fatherName ?? null;
    if (m.grandfatherName !== undefined) partialRow.grandfather_name = m.grandfatherName ?? null;
    if (m.spiritualName !== undefined) partialRow.spiritual_name = m.spiritualName ?? null;
    if (m.gender !== undefined) partialRow.gender = m.gender ?? null;
    if (m.dateOfBirth !== undefined) partialRow.date_of_birth = m.dateOfBirth ?? null;
    if (m.campus !== undefined) partialRow.campus = m.campus ?? null;
    if (m.academicDepartment !== undefined) partialRow.academic_department = m.academicDepartment ?? null;
    if (m.telegram !== undefined) partialRow.telegram = m.telegram ?? null;
    if (m.kehnetRoles !== undefined) partialRow.kehnet_roles = m.kehnetRoles;
    if (m.yearOfStudy !== undefined) partialRow.year_of_study = m.yearOfStudy;
    if (m.phone !== undefined) partialRow.phone = m.phone;
    if (m.email !== undefined) partialRow.email = m.email;
    if (m.subDepartments !== undefined) partialRow.sub_departments = m.subDepartments;
    if (m.families !== undefined) partialRow.families = m.families;
    if (m.photo !== undefined) partialRow.photo = m.photo ?? null;
    if (m.joinDate !== undefined) partialRow.join_date = m.joinDate;

    const { error } = await supabase.from('members').update(partialRow).eq('id', id);

    if (error) {
      console.error(`[supabase:update:members] ${error.message}`);
      if (previous) setMembers(prev => prev.map(x => x.id === id ? previous : x));
      setLastError(error.message);
    }
  };

  const deleteMember = async (id: string) => {
    if (isDemoMode) {
      setMembers(prev => prev.filter(x => x.id !== id));
      return;
    }

    const previous = members.find(x => x.id === id);
    setMembers(prev => prev.filter(x => x.id !== id));

    const { error } = await supabase.from('members').delete().eq('id', id);

    if (error) {
      console.error(`[supabase:delete:members] ${error.message}`);
      if (previous) setMembers(prev => [...prev, previous]);
      setLastError(error.message);
    }
  };

  // ── task 6.3: Child CRUD with optimistic updates ──────────────────────────

  const addChild = async (c: Omit<Child, 'id'>) => {
    if (isDemoMode) {
      setChildren(prev => [...prev, { ...c, id: newChildId() }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Child = { ...c, id: tempId };
    setChildren(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('children')
      .insert(childToRow(c))
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:children] ${error.message}`);
      setChildren(prev => prev.filter(x => x.id !== tempId));
      setLastError(error.message);
      return;
    }

    const realChild = rowToChild(data as ChildRow);
    setChildren(prev => prev.map(x => x.id === tempId ? realChild : x));

    // Insert parents into normalized child_parents table
    if (c.parents && c.parents.length > 0) {
      const parentRows = c.parents.map(p => ({
        child_id: realChild.id,
        role: p.role,
        full_name: p.fullName,
        phone: p.phone ?? null,
      }));
      const { error: pError } = await supabase.from('child_parents').insert(parentRows);
      if (pError) console.error(`[supabase:insert:child_parents] ${pError.message}`);
    }

    // Insert emergency contacts into normalized child_emergency_contacts table
    if (c.emergencyContacts && c.emergencyContacts.length > 0) {
      const ecRows = c.emergencyContacts.map(ec => ({
        child_id: realChild.id,
        name: ec.name,
        phone: ec.phone,
      }));
      const { error: ecError } = await supabase.from('child_emergency_contacts').insert(ecRows);
      if (ecError) console.error(`[supabase:insert:child_emergency_contacts] ${ecError.message}`);
    }
  };

  const updateChild = async (id: string, c: Partial<Child>) => {
    if (isDemoMode) {
      setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
      return;
    }

    const previous = children.find(x => x.id === id);
    setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));

    const partialRow: Partial<ChildRow> = {};
    if (c.name !== undefined) partialRow.name = c.name;
    if (c.givenName !== undefined) partialRow.given_name = c.givenName ?? null;
    if (c.fatherName !== undefined) partialRow.father_name = c.fatherName ?? null;
    if (c.grandfatherName !== undefined) partialRow.grandfather_name = c.grandfatherName ?? null;
    if (c.spiritualName !== undefined) partialRow.spiritual_name = c.spiritualName ?? null;
    if (c.gender !== undefined) partialRow.gender = c.gender ?? null;
    if (c.dateOfBirth !== undefined) partialRow.date_of_birth = c.dateOfBirth ?? null;
    if (c.address !== undefined) partialRow.address = c.address ?? null;
    if (c.age !== undefined) partialRow.age = c.age;
    if (c.kutrLevel !== undefined) partialRow.kutr_level = c.kutrLevel;
    if (c.familyId !== undefined) partialRow.family_id = c.familyId;
    if (c.familyName !== undefined) partialRow.family_name = c.familyName;
    if (c.guardianContact !== undefined) partialRow.guardian_contact = c.guardianContact;
    if (c.registrationDate !== undefined) partialRow.registration_date = c.registrationDate;
    if (c.photo !== undefined) partialRow.photo = c.photo ?? null;

    const { error } = await supabase.from('children').update(partialRow).eq('id', id);

    if (error) {
      console.error(`[supabase:update:children] ${error.message}`);
      if (previous) setChildren(prev => prev.map(x => x.id === id ? previous : x));
      setLastError(error.message);
    }
  };

  const deleteChild = async (id: string) => {
    if (isDemoMode) {
      setChildren(prev => prev.filter(x => x.id !== id));
      return;
    }

    const previous = children.find(x => x.id === id);
    setChildren(prev => prev.filter(x => x.id !== id));

    const { error } = await supabase.from('children').delete().eq('id', id);

    if (error) {
      console.error(`[supabase:delete:children] ${error.message}`);
      if (previous) setChildren(prev => [...prev, previous]);
      setLastError(error.message);
    }
  };

  return (
    <DataStoreContext.Provider value={{
      members, children,
      addMember, updateMember, deleteMember,
      addChild, updateChild, deleteChild,
      isLoading, lastError,
    }}>
      {reactChildren}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used inside DataStoreProvider');
  return ctx;
}

// Export mapping helpers for use in tests (task 6.4)
export { rowToMember, memberToRow, rowToChild, childToRow };
export type { MemberRow, ChildRow };

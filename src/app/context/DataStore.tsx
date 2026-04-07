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

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;

    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);

      // Your Supabase schema uses: members (member_id), children (child_id)
      const [membersResult, childrenResult] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('children').select('*'),
      ]);

      if (cancelled) return;

      if (membersResult.error) {
        console.error(`[supabase:fetch:members] ${membersResult.error.message}`);
        setLastError(membersResult.error.message);
      } else {
        setMembers((membersResult.data as NormalizedMemberRow[]).map(normalizedRowToMember));
      }

      if (childrenResult.error) {
        console.error(`[supabase:fetch:children] ${childrenResult.error.message}`);
        setLastError(childrenResult.error.message);
      } else {
        setChildren((childrenResult.data as NormalizedChildRow[]).map(normalizedRowToChild));
      }

      setIsLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isDemoMode) return;

    const channel = supabase
      .channel('datastore-realtime')
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'members' },
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
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'children' },
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
    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode]);

  // ── Member CRUD ───────────────────────────────────────────────────────────

  const addMember = async (m: Omit<Member, 'id'>) => {
    if (isDemoMode) {
      setMembers(prev => [...prev, { ...m, id: newMemberId() }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setMembers(prev => [...prev, { ...m, id: tempId }]);

    const row = {
      first_name: m.givenName ?? m.name.split(' ')[0],
      father_name: m.fatherName ?? m.name.split(' ')[1] ?? '',
      grandfather_name: m.grandfatherName ?? '',
      christian_name: m.spiritualName ?? null,
      gender: m.gender ?? null,
      phone_number: m.phone,
      email: m.email || null,
      telegram_username: m.telegram ?? null,
    };

    const { data, error } = await supabase
      .from('members')
      .insert(row)
      .select()
      .single();

    if (error) {
      // Fallback to legacy members table
      console.warn('[DataStore] normalized_members insert failed, trying legacy members table');
      const { data: legacyData, error: legacyError } = await supabase
        .from('members')
        .insert(memberToRow(m))
        .select()
        .single();

      if (legacyError) {
        console.error(`[supabase:insert:members] ${legacyError.message}`);
        setMembers(prev => prev.filter(x => x.id !== tempId));
        setLastError(legacyError.message);
        return;
      }

      const realMember = rowToMember(legacyData as MemberRow);
      setMembers(prev => prev.map(x => x.id === tempId ? realMember : x));
      return;
    }

    const realMember = normalizedRowToMember(data as NormalizedMemberRow);
    setMembers(prev => prev.map(x => x.id === tempId ? realMember : x));
  };

  const updateMember = async (id: string, m: Partial<Member>) => {
    if (isDemoMode) {
      setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));
      return;
    }

    const previous = members.find(x => x.id === id);
    setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));

    const partialRow: Record<string, unknown> = {};
    if (m.givenName !== undefined) partialRow.first_name = m.givenName;
    if (m.fatherName !== undefined) partialRow.father_name = m.fatherName;
    if (m.grandfatherName !== undefined) partialRow.grandfather_name = m.grandfatherName;
    if (m.spiritualName !== undefined) partialRow.christian_name = m.spiritualName ?? null;
    if (m.gender !== undefined) partialRow.gender = m.gender ?? null;
    if (m.phone !== undefined) partialRow.phone_number = m.phone;
    if (m.email !== undefined) partialRow.email = m.email || null;
    if (m.telegram !== undefined) partialRow.telegram_username = m.telegram ?? null;
    if (m.photo !== undefined) partialRow.profile_photo_url = m.photo ?? null;

    const { error } = await supabase.from('members').update(partialRow).eq('member_id', id);
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

    const { error } = await supabase.from('members').delete().eq('member_id', id);
    if (error) {
      console.error(`[supabase:delete:members] ${error.message}`);
      if (previous) setMembers(prev => [...prev, previous]);
      setLastError(error.message);
    }
  };

  // ── Child CRUD ────────────────────────────────────────────────────────────

  const addChild = async (c: Omit<Child, 'id'>) => {
    if (isDemoMode) {
      setChildren(prev => [...prev, { ...c, id: newChildId() }]);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setChildren(prev => [...prev, { ...c, id: tempId }]);

    const kutrMap: Record<number, string> = { 1: 'Kutr1', 2: 'Kutr2', 3: 'Kutr3' };

    const row = {
      first_name: c.givenName ?? c.name.split(' ')[0],
      father_name: c.fatherName ?? c.name.split(' ')[1] ?? '',
      grandfather_name: c.grandfatherName ?? '',
      gender: c.gender ?? null,
      village: c.address ?? c.familyName ?? '',
      kutr_level: kutrMap[c.kutrLevel] ?? 'Kutr1',
      photo_url: c.photo ?? null,
    };

    const { data, error } = await supabase
      .from('children')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:children] ${error.message}`);
      setChildren(prev => prev.filter(x => x.id !== tempId));
      setLastError(error.message);
      return;
    }

    const realChild = normalizedRowToChild(data as NormalizedChildRow);
    setChildren(prev => prev.map(x => x.id === tempId ? realChild : x));

    // Insert parents row (your schema: parents table with father/mother columns)
    if (c.parents && c.parents.length > 0) {
      const father = c.parents.find(p => p.role === 'father');
      const mother = c.parents.find(p => p.role === 'mother');
      const parentRow = {
        child_id: realChild.id,
        father_full_name: father?.fullName ?? '',
        father_phone: father?.phone ?? '',
        mother_full_name: mother?.fullName ?? '',
        mother_phone: mother?.phone ?? '',
      };
      const { error: pError } = await supabase.from('parents').insert(parentRow);
      if (pError) console.error(`[supabase:insert:parents] ${pError.message}`);
    }
  };

  const updateChild = async (id: string, c: Partial<Child>) => {
    if (isDemoMode) {
      setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
      return;
    }

    const previous = children.find(x => x.id === id);
    setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));

    const kutrMap: Record<number, string> = { 1: 'Kutr1', 2: 'Kutr2', 3: 'Kutr3' };
    const partialRow: Record<string, unknown> = {};
    if (c.givenName !== undefined) partialRow.first_name = c.givenName;
    if (c.fatherName !== undefined) partialRow.father_name = c.fatherName;
    if (c.grandfatherName !== undefined) partialRow.grandfather_name = c.grandfatherName;
    if (c.gender !== undefined) partialRow.gender = c.gender ?? null;
    if (c.address !== undefined) partialRow.village = c.address ?? null;
    if (c.kutrLevel !== undefined) partialRow.kutr_level = kutrMap[c.kutrLevel] ?? 'Kutr1';
    if (c.photo !== undefined) partialRow.photo_url = c.photo ?? null;

    const { error } = await supabase.from('children').update(partialRow).eq('child_id', id);
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

    const { error } = await supabase.from('children').delete().eq('child_id', id);
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

export { rowToMember, memberToRow, rowToChild, childToRow };
export type { MemberRow, ChildRow };

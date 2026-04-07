import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Member, Child } from '../data/mockData';
import { supabase } from '../../lib/supabase';

// ── Row types matching the user's Supabase schema ─────────────────────────

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

// ── Mapping helpers ────────────────────────────────────────────────────────

function kutrEnumToNumber(k: 'Kutr1' | 'Kutr2' | 'Kutr3'): 1 | 2 | 3 {
  return k === 'Kutr1' ? 1 : k === 'Kutr2' ? 2 : 3;
}

function rowToMember(row: NormalizedMemberRow): Member {
  return {
    id: row.member_id,
    studentId: row.member_id,
    name: `${row.first_name} ${row.father_name}`.trim(),
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

function rowToChild(row: NormalizedChildRow): Child {
  return {
    id: row.child_id,
    name: `${row.first_name} ${row.father_name}`.trim(),
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

// ── Context ────────────────────────────────────────────────────────────────

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

export function DataStoreProvider({ children: reactChildren }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // ── Fetch on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);
      const [membersResult, childrenResult] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('children').select('*'),
      ]);
      if (cancelled) return;

      if (membersResult.error) {
        console.error(`[supabase:fetch:members] ${membersResult.error.message}`);
        setLastError(membersResult.error.message);
      } else {
        setMembers((membersResult.data as NormalizedMemberRow[]).map(rowToMember));
      }

      if (childrenResult.error) {
        console.error(`[supabase:fetch:children] ${childrenResult.error.message}`);
        setLastError(childrenResult.error.message);
      } else {
        setChildren((childrenResult.data as NormalizedChildRow[]).map(rowToChild));
      }

      setIsLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // ── Realtime subscriptions ─────────────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('datastore-realtime')
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        { event: '*', schema: 'public', table: 'members' },
        (payload: { eventType: string; new: NormalizedMemberRow; old: { member_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => prev.some(m => m.id === payload.new.member_id)
              ? prev : [...prev, rowToMember(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev => prev.map(m =>
              m.id === payload.new.member_id ? rowToMember(payload.new) : m));
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
            setChildren(prev => prev.some(c => c.id === payload.new.child_id)
              ? prev : [...prev, rowToChild(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setChildren(prev => prev.map(c =>
              c.id === payload.new.child_id ? rowToChild(payload.new) : c));
          } else if (payload.eventType === 'DELETE') {
            setChildren(prev => prev.filter(c => c.id !== payload.old.child_id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Member CRUD ────────────────────────────────────────────────────────

  const addMember = async (m: Omit<Member, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    setMembers(prev => [...prev, { ...m, id: tempId }]);

    const { data, error } = await supabase
      .from('members')
      .insert({
        first_name: m.givenName ?? m.name.split(' ')[0],
        father_name: m.fatherName ?? m.name.split(' ')[1] ?? '',
        grandfather_name: m.grandfatherName ?? '',
        christian_name: m.spiritualName ?? null,
        gender: m.gender ?? null,
        phone_number: m.phone,
        email: m.email || null,
        telegram_username: m.telegram ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:members] ${error.message}`);
      setMembers(prev => prev.filter(x => x.id !== tempId));
      setLastError(error.message);
      return;
    }
    setMembers(prev => prev.map(x => x.id === tempId ? rowToMember(data as NormalizedMemberRow) : x));
  };

  const updateMember = async (id: string, m: Partial<Member>) => {
    const previous = members.find(x => x.id === id);
    setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));

    const patch: Record<string, unknown> = {};
    if (m.givenName !== undefined) patch.first_name = m.givenName;
    if (m.fatherName !== undefined) patch.father_name = m.fatherName;
    if (m.grandfatherName !== undefined) patch.grandfather_name = m.grandfatherName;
    if (m.spiritualName !== undefined) patch.christian_name = m.spiritualName ?? null;
    if (m.gender !== undefined) patch.gender = m.gender ?? null;
    if (m.phone !== undefined) patch.phone_number = m.phone;
    if (m.email !== undefined) patch.email = m.email || null;
    if (m.telegram !== undefined) patch.telegram_username = m.telegram ?? null;
    if (m.photo !== undefined) patch.profile_photo_url = m.photo ?? null;

    const { error } = await supabase.from('members').update(patch).eq('member_id', id);
    if (error) {
      console.error(`[supabase:update:members] ${error.message}`);
      if (previous) setMembers(prev => prev.map(x => x.id === id ? previous : x));
      setLastError(error.message);
    }
  };

  const deleteMember = async (id: string) => {
    const previous = members.find(x => x.id === id);
    setMembers(prev => prev.filter(x => x.id !== id));

    const { error } = await supabase.from('members').delete().eq('member_id', id);
    if (error) {
      console.error(`[supabase:delete:members] ${error.message}`);
      if (previous) setMembers(prev => [...prev, previous]);
      setLastError(error.message);
    }
  };

  // ── Child CRUD ─────────────────────────────────────────────────────────

  const addChild = async (c: Omit<Child, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    setChildren(prev => [...prev, { ...c, id: tempId }]);

    const kutrMap: Record<number, string> = { 1: 'Kutr1', 2: 'Kutr2', 3: 'Kutr3' };

    const { data, error } = await supabase
      .from('children')
      .insert({
        first_name: c.givenName ?? c.name.split(' ')[0],
        father_name: c.fatherName ?? c.name.split(' ')[1] ?? '',
        grandfather_name: c.grandfatherName ?? '',
        gender: c.gender ?? null,
        village: c.address ?? c.familyName ?? '',
        kutr_level: kutrMap[c.kutrLevel] ?? 'Kutr1',
        photo_url: c.photo ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error(`[supabase:insert:children] ${error.message}`);
      setChildren(prev => prev.filter(x => x.id !== tempId));
      setLastError(error.message);
      return;
    }

    const realChild = rowToChild(data as NormalizedChildRow);
    setChildren(prev => prev.map(x => x.id === tempId ? realChild : x));

    // Insert parents row if provided
    if (c.parents && c.parents.length > 0) {
      const father = c.parents.find(p => p.role === 'father');
      const mother = c.parents.find(p => p.role === 'mother');
      const { error: pError } = await supabase.from('parents').insert({
        child_id: realChild.id,
        father_full_name: father?.fullName ?? '',
        father_phone: father?.phone ?? '',
        mother_full_name: mother?.fullName ?? '',
        mother_phone: mother?.phone ?? '',
      });
      if (pError) console.error(`[supabase:insert:parents] ${pError.message}`);
    }
  };

  const updateChild = async (id: string, c: Partial<Child>) => {
    const previous = children.find(x => x.id === id);
    setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));

    const kutrMap: Record<number, string> = { 1: 'Kutr1', 2: 'Kutr2', 3: 'Kutr3' };
    const patch: Record<string, unknown> = {};
    if (c.givenName !== undefined) patch.first_name = c.givenName;
    if (c.fatherName !== undefined) patch.father_name = c.fatherName;
    if (c.grandfatherName !== undefined) patch.grandfather_name = c.grandfatherName;
    if (c.gender !== undefined) patch.gender = c.gender ?? null;
    if (c.address !== undefined) patch.village = c.address ?? null;
    if (c.kutrLevel !== undefined) patch.kutr_level = kutrMap[c.kutrLevel] ?? 'Kutr1';
    if (c.photo !== undefined) patch.photo_url = c.photo ?? null;

    const { error } = await supabase.from('children').update(patch).eq('child_id', id);
    if (error) {
      console.error(`[supabase:update:children] ${error.message}`);
      if (previous) setChildren(prev => prev.map(x => x.id === id ? previous : x));
      setLastError(error.message);
    }
  };

  const deleteChild = async (id: string) => {
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

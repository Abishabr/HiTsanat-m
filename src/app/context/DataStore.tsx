import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockMembers, mockChildren, Member, Child } from '../data/mockData';

interface DataStoreValue {
  members: Member[];
  children: Child[];
  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, m: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addChild: (c: Omit<Child, 'id'>) => void;
  updateChild: (id: string, c: Partial<Child>) => void;
  deleteChild: (id: string) => void;
}

const DataStoreContext = createContext<DataStoreValue | null>(null);

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

export function DataStoreProvider({ children: reactChildren }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(() =>
    load<Member[]>('hk_members', mockMembers)
  );
  const [children, setChildren] = useState<Child[]>(() =>
    load<Child[]>('hk_children', mockChildren)
  );

  useEffect(() => { save('hk_members', members); }, [members]);
  useEffect(() => { save('hk_children', children); }, [children]);

  const addMember = (m: Omit<Member, 'id'>) =>
    setMembers(prev => [...prev, { ...m, id: newMemberId() }]);

  const updateMember = (id: string, m: Partial<Member>) =>
    setMembers(prev => prev.map(x => x.id === id ? { ...x, ...m } : x));

  const deleteMember = (id: string) =>
    setMembers(prev => prev.filter(x => x.id !== id));

  const addChild = (c: Omit<Child, 'id'>) =>
    setChildren(prev => [...prev, { ...c, id: newChildId() }]);

  const updateChild = (id: string, c: Partial<Child>) =>
    setChildren(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));

  const deleteChild = (id: string) =>
    setChildren(prev => prev.filter(x => x.id !== id));

  return (
    <DataStoreContext.Provider value={{
      members, children,
      addMember, updateMember, deleteMember,
      addChild, updateChild, deleteChild,
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

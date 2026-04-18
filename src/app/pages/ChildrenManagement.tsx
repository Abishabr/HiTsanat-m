import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Lock, Pencil } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { canManageChildren, UserRole } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { useDataStore } from '../context/DataStore';
import { Child } from '../data/mockData';
import { toast } from 'sonner';
const KUTR_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
};

const FAMILIES = [
  { id: 'f1', name: 'Tekle Family' },
  { id: 'f2', name: 'Hailu Family' },
  { id: 'f3', name: 'Mekonnen Family' },
  { id: 'f4', name: 'Gebru Family' },
  { id: 'f5', name: 'Abraham Family' },
  { id: 'f6', name: 'Shiferaw Family' },
  { id: 'f7', name: 'Alemayehu Family' },
];

function AddChildDialog() {
  const { addChild } = useDataStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [kutr, setKutr] = useState('1');
  const [familyId, setFamilyId] = useState('f1');
  const [guardian, setGuardian] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    const family = FAMILIES.find(f => f.id === familyId)!;
    addChild({
      name: name.trim(),
      age: Number(age) || 0,
      kutrLevel: Number(kutr) as 1 | 2 | 3,
      familyId,
      familyName: family.name,
      guardianContact: guardian.trim(),
      registrationDate: new Date().toISOString().split('T')[0],
    }, user?.id ?? '');
    setOpen(false);
    setName(''); setAge(''); setGuardian('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Child</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register New Child</DialogTitle>
          <DialogDescription>Add a new child to the Hitsanat KFL program</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Full Name *</Label>
            <Input placeholder="Child's full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kutr Level</Label>
            <Select value={kutr} onValueChange={setKutr}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Kutr 1</SelectItem>
                <SelectItem value="2">Kutr 2</SelectItem>
                <SelectItem value="3">Kutr 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Family</Label>
            <Select value={familyId} onValueChange={setFamilyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FAMILIES.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Guardian Contact</Label>
            <Input placeholder="+251 911 ..." value={guardian} onChange={e => setGuardian(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Register Child</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChildrenManagement() {
  const { user } = useAuth();
  const { children, deleteChild, updateChild } = useDataStore();
  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageChildren(role);

  const [search, setSearch] = useState('');
  const [filterKutr, setFilterKutr] = useState('all');
  const [selected, setSelected] = useState<Child | null>(null);
  const [editing, setEditing] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', age: '', kutrLevel: '1', familyName: '', guardianContact: '',
    givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
    gender: '', dateOfBirth: '', address: '',
    fatherFullName: '', motherFullName: '', fatherPhone: '', motherPhone: '',
  });

  const openEdit = (child: Child) => {
    const parents = child.parents ?? [];
    const father = parents.find(p => p.role === 'father');
    const mother = parents.find(p => p.role === 'mother');
    setEditForm({
      name: child.name ?? '',
      age: child.age ? String(child.age) : '',
      kutrLevel: String(child.kutrLevel ?? 1),
      familyName: child.familyName ?? '',
      guardianContact: child.guardianContact ?? '',
      givenName: child.givenName ?? '',
      fatherName: child.fatherName ?? '',
      grandfatherName: child.grandfatherName ?? '',
      spiritualName: child.spiritualName ?? '',
      gender: child.gender ?? '',
      dateOfBirth: child.dateOfBirth ?? '',
      address: child.address ?? '',
      fatherFullName: father?.fullName ?? '',
      motherFullName: mother?.fullName ?? '',
      fatherPhone: father?.phone ?? '',
      motherPhone: mother?.phone ?? '',
    });
    setEditing(child);
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const parents: Child['parents'] = [
      ...(editForm.fatherFullName ? [{ role: 'father' as const, fullName: editForm.fatherFullName, phone: editForm.fatherPhone || undefined }] : []),
      ...(editForm.motherFullName ? [{ role: 'mother' as const, fullName: editForm.motherFullName, phone: editForm.motherPhone || undefined }] : []),
    ];
    await updateChild(editing.id, {
      name: editForm.name.trim() || editing.name,
      age: Number(editForm.age) || editing.age,
      kutrLevel: Number(editForm.kutrLevel) as 1 | 2 | 3,
      familyName: editForm.familyName.trim() || editing.familyName,
      guardianContact: editForm.guardianContact.trim(),
      givenName: editForm.givenName.trim() || undefined,
      fatherName: editForm.fatherName.trim() || undefined,
      grandfatherName: editForm.grandfatherName.trim() || undefined,
      spiritualName: editForm.spiritualName.trim() || undefined,
      gender: (editForm.gender as 'Male' | 'Female') || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined,
      address: editForm.address.trim() || undefined,
      parents: parents.length ? parents : undefined,
    });
    toast.success('Child details updated');
    setEditing(null);
  };

  const setEF = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const filtered = children.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.familyName.toLowerCase().includes(search.toLowerCase());
    const matchKutr = filterKutr === 'all' || c.kutrLevel.toString() === filterKutr;
    return matchSearch && matchKutr;
  });

  const pagination = usePagination(filtered, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Children Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all children in the program</p>
        </div>
        {canManage ? (
          <Link to="/register/child">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />Add Child
            </button>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />View only
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold text-foreground mt-1">{children.length}</p></CardContent></Card>
        {[1,2,3].map(k => (
          <Card key={k}><CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Kutr {k}</p>
            <p className={`text-3xl font-bold mt-1 ${k===1?'text-blue-600':k===2?'text-purple-600':'text-green-600'}`}>
              {children.filter(c => c.kutrLevel === k).length}
            </p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Children</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-56" />
              </div>
              <Select value={filterKutr} onValueChange={setFilterKutr}>
                <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kutrs</SelectItem>
                  <SelectItem value="1">Kutr 1</SelectItem>
                  <SelectItem value="2">Kutr 2</SelectItem>
                  <SelectItem value="3">Kutr 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Kutr</TableHead>
                <TableHead>Father</TableHead>
                <TableHead>Mother</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map(child => {
                const father = child.parents?.find(p => p.role === 'father');
                const mother = child.parents?.find(p => p.role === 'mother');
                return (
                <TableRow key={child.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                          {child.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">
                          {[child.givenName, child.fatherName, child.grandfatherName].filter(Boolean).join(' ') || child.name}
                        </p>
                        {child.spiritualName && (
                          <p className="text-xs text-muted-foreground">{child.spiritualName}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={KUTR_COLORS[child.kutrLevel]}>Kutr {child.kutrLevel}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{father?.fullName || <span className="text-muted-foreground">—</span>}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{mother?.fullName || <span className="text-muted-foreground">—</span>}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {father?.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{father.phone}</span>
                          <span className="text-[10px] text-muted-foreground/60">(F)</span>
                        </div>
                      )}
                      {mother?.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{mother.phone}</span>
                          <span className="text-[10px] text-muted-foreground/60">(M)</span>
                        </div>
                      )}
                      {!father?.phone && !mother?.phone && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(child)}>
                          <Eye className="w-4 h-4 mr-2" />View Details
                        </DropdownMenuItem>
                        {canManage && (
                          <DropdownMenuItem onClick={() => openEdit(child)}>
                            <Pencil className="w-4 h-4 mr-2" />Edit
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteChild(child.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
              {pagination.pageItems.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No children found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            from={pagination.from}
            to={pagination.to}
            totalItems={pagination.totalItems}
            onPageChange={pagination.setPage}
            label="children"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Child Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xl">
                    {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">
                    {[selected.givenName, selected.fatherName, selected.grandfatherName].filter(Boolean).join(' ') || selected.name}
                  </h3>
                  {selected.spiritualName && <p className="text-xs text-muted-foreground">{selected.spiritualName}</p>}
                  <Badge className={`mt-1 ${KUTR_COLORS[selected.kutrLevel]}`}>Kutr {selected.kutrLevel}</Badge>
                </div>
              </div>
              {/* Parents */}
              {(() => {
                const father = selected.parents?.find(p => p.role === 'father');
                const mother = selected.parents?.find(p => p.role === 'mother');
                return (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Father</p><p className="font-medium">{father?.fullName || '—'}</p></div>
                    <div><p className="text-muted-foreground">Father's Phone</p>
                      <p className="font-medium flex items-center gap-1">{father?.phone ? <><Phone className="w-3 h-3" />{father.phone}</> : '—'}</p>
                    </div>
                    <div><p className="text-muted-foreground">Mother</p><p className="font-medium">{mother?.fullName || '—'}</p></div>
                    <div><p className="text-muted-foreground">Mother's Phone</p>
                      <p className="font-medium flex items-center gap-1">{mother?.phone ? <><Phone className="w-3 h-3" />{mother.phone}</> : '—'}</p>
                    </div>
                    <div><p className="text-muted-foreground">Registered</p><p className="font-medium">{new Date(selected.registrationDate).toLocaleDateString()}</p></div>
                    <div><p className="text-muted-foreground">Gender</p><p className="font-medium">{selected.gender || '—'}</p></div>
                  </div>
                );
              })()}
              <div className="flex justify-end gap-2">
                {canManage && (
                  <Button variant="outline" onClick={() => { setSelected(null); openEdit(selected); }}>
                    <Pencil className="w-4 h-4 mr-2" />Edit
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Child Details</DialogTitle>
            <DialogDescription>Update information for {editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">
              {/* Basic info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input value={editForm.name} onChange={e => setEF('name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Given Name</Label>
                    <Input value={editForm.givenName} onChange={e => setEF('givenName', e.target.value)} placeholder="Given name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father's Name</Label>
                    <Input value={editForm.fatherName} onChange={e => setEF('fatherName', e.target.value)} placeholder="Father's name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grandfather's Name</Label>
                    <Input value={editForm.grandfatherName} onChange={e => setEF('grandfatherName', e.target.value)} placeholder="Grandfather's name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Spiritual Name</Label>
                    <Input value={editForm.spiritualName} onChange={e => setEF('spiritualName', e.target.value)} placeholder="Spiritual name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Age</Label>
                    <Input type="number" value={editForm.age} onChange={e => setEF('age', e.target.value)} placeholder="Age" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={editForm.dateOfBirth} onChange={e => setEF('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select value={editForm.gender} onValueChange={v => setEF('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kutr Level</Label>
                    <Select value={editForm.kutrLevel} onValueChange={v => setEF('kutrLevel', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Kutr 1 (Younger)</SelectItem>
                        <SelectItem value="2">Kutr 2 (Middle)</SelectItem>
                        <SelectItem value="3">Kutr 3 (Older)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Family Name</Label>
                    <Input value={editForm.familyName} onChange={e => setEF('familyName', e.target.value)} placeholder="Family name" />
                  </div>
                </div>
                <div className="space-y-1.5 mt-3">
                  <Label>Address</Label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                    rows={2}
                    value={editForm.address}
                    onChange={e => setEF('address', e.target.value)}
                    placeholder="Home address"
                  />
                </div>
              </div>

              {/* Parents */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parents / Guardian</p>                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Father's Full Name</Label>
                    <Input value={editForm.fatherFullName} onChange={e => setEF('fatherFullName', e.target.value)} placeholder="Father's full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father's Phone</Label>
                    <Input type="tel" value={editForm.fatherPhone} onChange={e => setEF('fatherPhone', e.target.value)} placeholder="+251 911 ..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother's Full Name</Label>
                    <Input value={editForm.motherFullName} onChange={e => setEF('motherFullName', e.target.value)} placeholder="Mother's full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother's Phone</Label>
                    <Input type="tel" value={editForm.motherPhone} onChange={e => setEF('motherPhone', e.target.value)} placeholder="+251 911 ..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guardian Contact</Label>
                    <Input type="tel" value={editForm.guardianContact} onChange={e => setEF('guardianContact', e.target.value)} placeholder="+251 911 ..." />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

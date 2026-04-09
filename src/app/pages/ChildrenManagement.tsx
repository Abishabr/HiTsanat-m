import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Lock } from 'lucide-react';
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
  const { children, deleteChild } = useDataStore();
  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageChildren(role);

  const [search, setSearch] = useState('');
  const [filterKutr, setFilterKutr] = useState('all');
  const [selected, setSelected] = useState<Child | null>(null);

  const filtered = children.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.familyName.toLowerCase().includes(search.toLowerCase());
    const matchKutr = filterKutr === 'all' || c.kutrLevel.toString() === filterKutr;
    return matchSearch && matchKutr;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Children Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all children in the program</p>
        </div>
        {canManage ? (
          <Link to="/register/child">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all" style={{ backgroundColor: '#5f0113' }}>
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
                <TableHead>Child</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Kutr</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(child => (
                <TableRow key={child.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                          {child.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{child.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{child.age} yrs</TableCell>
                  <TableCell><Badge className={KUTR_COLORS[child.kutrLevel]}>Kutr {child.kutrLevel}</Badge></TableCell>
                  <TableCell>{child.familyName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />{child.guardianContact}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(child.registrationDate).toLocaleDateString()}</TableCell>
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
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteChild(child.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No children found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
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
                    {selected.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  <p className="text-muted-foreground text-sm">{selected.age} years old</p>
                  <Badge className={`mt-1 ${KUTR_COLORS[selected.kutrLevel]}`}>Kutr {selected.kutrLevel}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Family</p><p className="font-medium">{selected.familyName}</p></div>
                <div><p className="text-muted-foreground">Guardian</p><p className="font-medium">{selected.guardianContact}</p></div>
                <div><p className="text-muted-foreground">Registered</p><p className="font-medium">{new Date(selected.registrationDate).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground">ID</p><p className="font-medium font-mono">{selected.id}</p></div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

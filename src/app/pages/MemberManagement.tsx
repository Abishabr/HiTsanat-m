import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Users, Lock } from 'lucide-react';
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
import { Checkbox } from '../components/ui/checkbox';
import { canManageMembers, UserRole } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { useDataStore } from '../context/DataStore';
import { subDepartments, getSubDeptDisplayName, Member } from '../data/mockData';
const YEAR_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
};

function AddMemberDialog() {
  const { addMember } = useDataStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState('3');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const toggleDept = (deptName: string) =>
    setSelectedDepts(prev =>
      prev.includes(deptName) ? prev.filter(d => d !== deptName) : [...prev, deptName]
    );

  const handleSubmit = () => {
    if (!name.trim() || !studentId.trim()) return;
    addMember({
      studentId: studentId.trim(),
      name: name.trim(),
      yearOfStudy: Number(year),
      phone: phone.trim(),
      email: email.trim(),
      subDepartments: selectedDepts,
      families: [],
      joinDate: new Date().toISOString().split('T')[0],
    });
    setOpen(false);
    setName(''); setStudentId(''); setPhone(''); setEmail(''); setSelectedDepts([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Member</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register New Member</DialogTitle>
          <DialogDescription>Add a new university student member</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input placeholder="Member name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Student ID *</Label>
            <Input placeholder="e.g., STU007" value={studentId} onChange={e => setStudentId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Year of Study</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(y => (
                  <SelectItem key={y} value={String(y)}>
                    {y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input placeholder="+251 911 123456" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Email</Label>
            <Input type="email" placeholder="member@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Sub-Departments</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {subDepartments.map(dept => (
                <div key={dept.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept.id}`}
                    checked={selectedDepts.includes(dept.name)}
                    onCheckedChange={() => toggleDept(dept.name)}
                  />
                  <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">
                    {getSubDeptDisplayName(dept.name)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !studentId.trim()}>
            Register Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MemberManagement() {
  const { user } = useAuth();
  const { members, deleteMember } = useDataStore();
  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageMembers(role);
  const isSubdeptScoped = role === 'subdept-leader' || role === 'subdept-vice-leader';

  const [search, setSearch] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('all');
  const [selected, setSelected] = useState<Member | null>(null);

  // Sub-dept leaders only see members in their own sub-department
  const visibleMembers = isSubdeptScoped && user?.subDepartment
    ? members.filter(m => m.subDepartments.includes(user.subDepartment!))
    : members;

  const filtered = visibleMembers.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.studentId.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterSubDept === 'all' || m.subDepartments.includes(filterSubDept);
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-600 mt-1">
            {isSubdeptScoped
              ? `Members of your sub-department`
              : 'Manage university student members and their assignments'}
          </p>
        </div>
        {canManage ? (
          <Link to="/register/member">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all" style={{ backgroundColor: '#5f0113' }}>
              <Plus className="w-4 h-4" />Add Member
            </button>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Lock className="w-4 h-4" />View only
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{visibleMembers.length}</p>
          </CardContent>
        </Card>
        {[1,2,3,4,5].map(y => (
          <Card key={y}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Year {y}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {visibleMembers.filter(m => m.yearOfStudy === y).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Members</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-56" />
              </div>
              <Select value={filterSubDept} onValueChange={setFilterSubDept}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Departments</SelectItem>
                  {subDepartments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{getSubDeptDisplayName(d.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Sub-Departments</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Families</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.studentId}</TableCell>
                  <TableCell>
                    <Badge className={YEAR_COLORS[member.yearOfStudy] ?? 'bg-gray-100 text-gray-700'}>
                      Year {member.yearOfStudy}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.subDepartments.map((sd: string) => {
                        const dept = subDepartments.find(d => d.name === sd);
                        return (
                          <Badge key={sd} variant="outline" className="text-xs"
                            style={{ borderColor: dept?.color, color: dept?.color }}>
                            {getSubDeptDisplayName(sd)}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />{member.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-3 h-3" />{member.families.length} families
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(member)}>
                          <Eye className="w-4 h-4 mr-2" />View Details
                        </DropdownMenuItem>
                        {canManage && (
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMember(member.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">No members found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Member Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-xl">
                    {selected.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  <p className="text-gray-500 text-sm">{selected.studentId}</p>
                  <Badge className={`mt-1 ${YEAR_COLORS[selected.yearOfStudy]}`}>Year {selected.yearOfStudy}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Email</p><p className="font-medium">{selected.email || '-'}</p></div>
                <div><p className="text-gray-500">Phone</p><p className="font-medium">{selected.phone || '-'}</p></div>
                <div><p className="text-gray-500">Join Date</p><p className="font-medium">{new Date(selected.joinDate).toLocaleDateString()}</p></div>
                <div><p className="text-gray-500">Families</p><p className="font-medium">{selected.families.length}</p></div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Sub-Departments</p>
                <div className="flex flex-wrap gap-2">
                  {selected.subDepartments.map((sd: string) => {
                    const dept = subDepartments.find(d => d.name === sd);
                    return (
                      <Badge key={sd} style={{ backgroundColor: `${dept?.color}20`, color: dept?.color }}>
                        {getSubDeptDisplayName(sd)}
                      </Badge>
                    );
                  })}
                  {selected.subDepartments.length === 0 && <span className="text-gray-400 text-sm">None</span>}
                </div>
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

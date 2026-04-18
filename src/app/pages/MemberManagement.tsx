import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Users, Lock, Pencil } from 'lucide-react';
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
import { Checkbox } from '../components/ui/checkbox';
import { canManageMembers, UserRole } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { useDataStore } from '../context/DataStore';
import { getSubDeptDisplayName, Member, SUBDEPT_COLORS } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { toast } from 'sonner';
const YEAR_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
};

function AddMemberDialog() {
  const { addMember } = useDataStore();
  const { subDepts } = useSchedule();
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
              {subDepts.map(dept => (
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
  const { members, deleteMember, updateMember } = useDataStore();
  const { subDepts } = useSchedule();
  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageMembers(role);
  const isSubdeptScoped = role === 'subdept-leader' || role === 'subdept-vice-leader';

  const [search, setSearch] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('all');
  const [selected, setSelected] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', studentId: '', yearOfStudy: '3',
    phone: '', email: '', telegram: '',
    givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
    gender: '', dateOfBirth: '', campus: '', academicDepartment: '',
    subDepartments: [] as string[],
  });

  const openEdit = (member: Member) => {
    setEditForm({
      name: member.name ?? '',
      studentId: member.studentId ?? '',
      yearOfStudy: String(member.yearOfStudy ?? 3),
      phone: member.phone ?? '',
      email: member.email ?? '',
      telegram: member.telegram ?? '',
      givenName: member.givenName ?? '',
      fatherName: member.fatherName ?? '',
      grandfatherName: member.grandfatherName ?? '',
      spiritualName: member.spiritualName ?? '',
      gender: member.gender ?? '',
      dateOfBirth: member.dateOfBirth ?? '',
      campus: member.campus ?? '',
      academicDepartment: member.academicDepartment ?? '',
      subDepartments: [...(member.subDepartments ?? [])],
    });
    setEditing(member);
  };

  const toggleEditDept = (deptName: string) =>
    setEditForm(prev => ({
      ...prev,
      subDepartments: prev.subDepartments.includes(deptName)
        ? prev.subDepartments.filter(d => d !== deptName)
        : [...prev.subDepartments, deptName],
    }));

  const handleEditSave = async () => {
    if (!editing) return;
    await updateMember(editing.id, {
      name: editForm.name.trim() || editing.name,
      studentId: editForm.studentId.trim() || editing.studentId,
      yearOfStudy: Number(editForm.yearOfStudy) || editing.yearOfStudy,
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      telegram: editForm.telegram.trim() || undefined,
      givenName: editForm.givenName.trim() || undefined,
      fatherName: editForm.fatherName.trim() || undefined,
      grandfatherName: editForm.grandfatherName.trim() || undefined,
      spiritualName: editForm.spiritualName.trim() || undefined,
      gender: (editForm.gender as 'Male' | 'Female') || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined,
      campus: editForm.campus.trim() || undefined,
      academicDepartment: editForm.academicDepartment.trim() || undefined,
      subDepartments: editForm.subDepartments,
    });
    toast.success('Member details updated');
    setEditing(null);
  };

  const setEF = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

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

  const pagination = usePagination(filtered, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Member Management</h1>
          <p className="text-muted-foreground mt-1">
            {isSubdeptScoped
              ? `Members of your sub-department`
              : 'Manage university student members and their assignments'}
          </p>
        </div>
        {canManage ? (
          <Link to="/register/member">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />Add Member
            </button>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />View only
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-bold text-foreground mt-1">{visibleMembers.length}</p>
          </CardContent>
        </Card>
        {[1,2,3,4,5].map(y => (
          <Card key={y}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Year {y}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-56" />
              </div>
              <Select value={filterSubDept} onValueChange={setFilterSubDept}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Departments</SelectItem>
                  {subDepts.map(d => (
                    <SelectItem key={d.id} value={d.name}>{getSubDeptDisplayName(d.name)}</SelectItem>
                  ))}
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
              {pagination.pageItems.map(member => (
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
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.studentId}</TableCell>
                  <TableCell>
                    <Badge className={YEAR_COLORS[member.yearOfStudy] ?? 'bg-muted text-muted-foreground'}>
                      Year {member.yearOfStudy}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.subDepartments.map((sd: string) => {
                        const color = SUBDEPT_COLORS[sd] ?? '#6b7280';
                        return (
                          <Badge key={sd} variant="outline" className="text-xs"
                            style={{ borderColor: color, color }}>
                            {getSubDeptDisplayName(sd)}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />{member.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
                          <DropdownMenuItem onClick={() => openEdit(member)}>
                            <Pencil className="w-4 h-4 mr-2" />Edit
                          </DropdownMenuItem>
                        )}
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
              {pagination.pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No members found</TableCell>
                </TableRow>
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
            label="members"
          />
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
                  <p className="text-muted-foreground text-sm">{selected.studentId}</p>
                  <Badge className={`mt-1 ${YEAR_COLORS[selected.yearOfStudy]}`}>Year {selected.yearOfStudy}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selected.email || '-'}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone || '-'}</p></div>
                <div><p className="text-muted-foreground">Join Date</p><p className="font-medium">{new Date(selected.joinDate).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground">Families</p><p className="font-medium">{selected.families.length}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sub-Departments</p>
                <div className="flex flex-wrap gap-2">
                  {selected.subDepartments.map((sd: string) => {
                    const color = SUBDEPT_COLORS[sd] ?? '#6b7280';
                    return (
                      <Badge key={sd} style={{ backgroundColor: `${color}20`, color }}>
                        {getSubDeptDisplayName(sd)}
                      </Badge>
                    );
                  })}
                  {selected.subDepartments.length === 0 && <span className="text-muted-foreground text-sm">None</span>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {canManage && (
                  <Button variant="outline" onClick={() => { setSelected(null); openEdit(selected!); }}>
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
            <DialogTitle>Edit Member Details</DialogTitle>
            <DialogDescription>Update information for {editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">

              {/* Personal info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input value={editForm.name} onChange={e => setEF('name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Student ID *</Label>
                    <Input value={editForm.studentId} onChange={e => setEF('studentId', e.target.value)} placeholder="e.g. STU007" />
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
                    <Label>Date of Birth</Label>
                    <Input type="date" value={editForm.dateOfBirth} onChange={e => setEF('dateOfBirth', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Academic info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Year of Study</Label>
                    <Select value={editForm.yearOfStudy} onValueChange={v => setEF('yearOfStudy', v)}>
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
                  <div className="space-y-1.5">
                    <Label>Campus</Label>
                    <Input value={editForm.campus} onChange={e => setEF('campus', e.target.value)} placeholder="Campus name" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Academic Department</Label>
                    <Input value={editForm.academicDepartment} onChange={e => setEF('academicDepartment', e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input type="tel" value={editForm.phone} onChange={e => setEF('phone', e.target.value)} placeholder="+251 911 ..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEF('email', e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Telegram</Label>
                    <Input value={editForm.telegram} onChange={e => setEF('telegram', e.target.value)} placeholder="@username" />
                  </div>
                </div>
              </div>

              {/* Sub-departments */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sub-Departments</p>
                <div className="grid grid-cols-2 gap-3">
                  {subDepts.map(dept => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-dept-${dept.id}`}
                        checked={editForm.subDepartments.includes(dept.name)}
                        onCheckedChange={() => toggleEditDept(dept.name)}
                      />
                      <label htmlFor={`edit-dept-${dept.id}`} className="text-sm cursor-pointer">
                        {getSubDeptDisplayName(dept.name)}
                      </label>
                    </div>
                  ))}
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

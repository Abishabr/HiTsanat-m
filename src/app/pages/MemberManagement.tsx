import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Users, Lock, Pencil, Download, Shield } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { canManageMembers, UserRole } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { useMembers, MemberSearchResult } from '../hooks/useMembers';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { toast } from 'sonner';
import { downloadFile } from '../lib/exportUtils';
import { RoleAssignmentDialog } from '../components/RoleAssignmentDialog';

// ── Export helpers ─────────────────────────────────────────────────────────

function escapeCSV(v: string | number | undefined | null): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportMembersCSV(members: MemberSearchResult[]) {
  const header = 'Full Name,Spiritual Name,Gender,Year of Study,Campus,Department,Phone,Email,Telegram,Sub-Departments,Join Date';
  const rows = members.map(m => {
    const subDepts = m.roles.map(r => r.sub_department_name).join(' | ');
    return [
      escapeCSV(m.full_name),
      escapeCSV(m.baptismal_name),
      escapeCSV(m.gender),
      escapeCSV(m.university_year ? `Year ${m.university_year}` : ''),
      escapeCSV(m.campus),
      escapeCSV(m.university_department),
      escapeCSV(m.phone),
      escapeCSV(m.email),
      escapeCSV(m.telegram_username),
      escapeCSV(subDepts),
      escapeCSV(m.join_date),
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `members-list-${date}.csv`, 'text/csv;charset=utf-8;');
}

async function exportMembersExcel(members: MemberSearchResult[]) {
  const XLSX = await import('xlsx');
  const header = ['Full Name', 'Spiritual Name', 'Gender', 'Year of Study', 'Campus', 'Department', 'Phone', 'Email', 'Telegram', 'Sub-Departments', 'Join Date'];
  const rows = members.map(m => {
    const subDepts = m.roles.map(r => r.sub_department_name).join(' | ');
    return [
      m.full_name, m.baptismal_name ?? '', m.gender ?? '',
      m.university_year ? `Year ${m.university_year}` : '',
      m.campus ?? '', m.university_department ?? '',
      m.phone, m.email, m.telegram_username ?? '',
      subDepts,
      m.join_date,
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  header.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[ref]) ws[ref].s = { font: { bold: true } };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Members');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const date = new Date().toISOString().split('T')[0];
  downloadFile(buf, `members-list-${date}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

async function exportMembersPDF(members: MemberSearchResult[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  const date = new Date().toISOString().split('T')[0];

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Members List — Hitsanat KFL', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${date}  |  Total: ${members.length}`, 14, 23);

  const body = members.map(m => {
    const subDepts = m.roles.map(r => r.sub_department_name).join(', ');
    return [
      m.full_name,
      m.baptismal_name ?? '—',
      m.gender ?? '—',
      m.university_year ? `Year ${m.university_year}` : '—',
      m.campus ?? '—',
      m.phone,
      m.email || '—',
      subDepts || '—',
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Full Name', 'Spiritual Name', 'Gender', 'Year', 'Campus', 'Phone', 'Email', 'Sub-Departments']],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fontStyle: 'bold', fillColor: [95, 1, 19] },
    alternateRowStyles: { fillColor: [249, 245, 242] },
    columnStyles: { 0: { cellWidth: 45 }, 7: { cellWidth: 45 } },
  });

  doc.save(`members-list-${date}.pdf`);
}
const YEAR_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
};

export default function MemberManagement() {
  const { user } = useAuth();
  const { members, searchMembers, deleteMember: deleteMemberRPC, updateMember: updateMemberRPC, isLoading: membersLoading } = useMembers();
  const { subDepts } = useSchedule();
  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageMembers(role);
  const isSubdeptScoped = role === 'subdept-leader' || role === 'subdept-vice-leader';

  const [search, setSearch] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('all');
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [editing, setEditing] = useState<MemberSearchResult | null>(null);
  const [roleDialogMember, setRoleDialogMember] = useState<{ id: string; name: string } | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '', baptismal_name: '', university_year: '',
    phone: '', email: '', telegram_username: '',
    gender: '', date_of_birth: '', campus: '', university_department: '',
  });

  // Load members on mount and when filters change
  useEffect(() => {
    const filters = {
      searchTerm: search || undefined,
      subDepartment: filterSubDept !== 'all' ? filterSubDept : undefined,
    };
    searchMembers(filters);
  }, [search, filterSubDept, searchMembers]);

  const openEdit = (member: MemberSearchResult) => {
    setEditForm({
      full_name: member.full_name ?? '',
      baptismal_name: member.baptismal_name ?? '',
      university_year: member.university_year ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      telegram_username: member.telegram_username ?? '',
      gender: member.gender ?? '',
      date_of_birth: member.date_of_birth ?? '',
      campus: member.campus ?? '',
      university_department: member.university_department ?? '',
    });
    setEditing(member);
  };

  const setEF = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const handleEditSave = async () => {
    if (!editing) return;
    
    const success = await updateMemberRPC(editing.member_id, {
      full_name: editForm.full_name.trim() || editing.full_name,
      baptismal_name: editForm.baptismal_name.trim() || null,
      university_year: editForm.university_year.trim() || null,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      telegram_username: editForm.telegram_username.trim() || null,
      gender: editForm.gender || null,
      date_of_birth: editForm.date_of_birth || null,
      campus: editForm.campus.trim() || null,
      university_department: editForm.university_department.trim() || null,
    });
    
    if (success) {
      toast.success('Member details updated');
      setEditing(null);
      // Refresh the list
      searchMembers({
        searchTerm: search || undefined,
        subDepartment: filterSubDept !== 'all' ? filterSubDept : undefined,
      });
    } else {
      toast.error('Failed to update member. You may not have permission.');
    }
  };

  const handleDelete = async (memberId: string) => {
    const success = await deleteMemberRPC(memberId);
    if (success) {
      toast.success('Member deleted');
      // Refresh the list
      searchMembers({
        searchTerm: search || undefined,
        subDepartment: filterSubDept !== 'all' ? filterSubDept : undefined,
      });
    } else {
      toast.error('Failed to delete member. You may not have permission.');
    }
  };

  const handleRoleChanged = () => {
    // Refresh the member list after role changes
    searchMembers({
      searchTerm: search || undefined,
      subDepartment: filterSubDept !== 'all' ? filterSubDept : undefined,
    });
  };

  const pagination = usePagination(members, 10);

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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportMembersCSV(members)}>
                  Export CSV ({members.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMembersExcel(members).catch(() => toast.error('Export failed'))}>
                  Export Excel ({members.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMembersPDF(members).catch(() => toast.error('Export failed'))}>
                  Export PDF ({members.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/register/member">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />Add Member
              </button>
            </Link>
          </div>
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
            <p className="text-3xl font-bold text-foreground mt-1">{members.length}</p>
          </CardContent>
        </Card>
        {[1,2,3,4,5].map(y => (
          <Card key={y}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Year {y}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {members.filter(m => m.university_year === String(y)).length}
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
                    <SelectItem key={d.id} value={d.id}>{getSubDeptDisplayName(d.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading members...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Sub-Departments & Roles</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.pageItems.map(member => (
                      <TableRow key={member.member_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                                {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-sm text-muted-foreground">{member.email || 'No email'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.university_year ? (
                            <Badge className={YEAR_COLORS[Number(member.university_year)] ?? 'bg-muted text-muted-foreground'}>
                              Year {member.university_year}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((role, idx) => {
                              const color = SUBDEPT_COLORS[role.sub_department_name] ?? '#6b7280';
                              return (
                                <Badge key={idx} variant="outline" className="text-xs"
                                  style={{ borderColor: color, color }}>
                                  {getSubDeptDisplayName(role.sub_department_name)} - {role.role_name}
                                </Badge>
                              );
                            })}
                            {member.roles.length === 0 && (
                              <span className="text-sm text-muted-foreground">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />{member.phone || '—'}
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
                                <DropdownMenuItem onClick={() => setRoleDialogMember({ id: member.member_id, name: member.full_name })}>
                                  <Shield className="w-4 h-4 mr-2" />Manage Roles
                                </DropdownMenuItem>
                              )}
                              {canManage && (
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(member.member_id)}>
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
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No members found</TableCell>
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
            </>
          )}
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
                    {selected.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{selected.full_name}</h3>
                  <p className="text-muted-foreground text-sm">{selected.email || 'No email'}</p>
                  {selected.university_year && (
                    <Badge className={`mt-1 ${YEAR_COLORS[Number(selected.university_year)]}`}>
                      Year {selected.university_year}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Baptismal Name</p><p className="font-medium">{selected.baptismal_name || '—'}</p></div>
                <div><p className="text-muted-foreground">Gender</p><p className="font-medium">{selected.gender || '—'}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone || '—'}</p></div>
                <div><p className="text-muted-foreground">Campus</p><p className="font-medium">{selected.campus || '—'}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Department</p><p className="font-medium">{selected.university_department || '—'}</p></div>
                <div><p className="text-muted-foreground">Join Date</p><p className="font-medium">{selected.join_date ? new Date(selected.join_date).toLocaleDateString() : '—'}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium">{selected.status || 'active'}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Roles & Sub-Departments</p>
                <div className="flex flex-wrap gap-2">
                  {selected.roles.map((role, idx) => {
                    const color = SUBDEPT_COLORS[role.sub_department_name] ?? '#6b7280';
                    return (
                      <Badge key={idx} style={{ backgroundColor: `${color}20`, color }}>
                        {getSubDeptDisplayName(role.sub_department_name)} - {role.role_name}
                      </Badge>
                    );
                  })}
                  {selected.roles.length === 0 && <span className="text-muted-foreground text-sm">No roles assigned</span>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {canManage && (
                  <>
                    <Button variant="outline" onClick={() => { setSelected(null); openEdit(selected!); }}>
                      <Pencil className="w-4 h-4 mr-2" />Edit
                    </Button>
                    <Button variant="outline" onClick={() => { setSelected(null); setRoleDialogMember({ id: selected.member_id, name: selected.full_name }); }}>
                      <Shield className="w-4 h-4 mr-2" />Manage Roles
                    </Button>
                  </>
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
            <DialogDescription>Update information for {editing?.full_name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">

              {/* Personal info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Full Name *</Label>
                    <Input value={editForm.full_name} onChange={e => setEF('full_name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Baptismal Name</Label>
                    <Input value={editForm.baptismal_name} onChange={e => setEF('baptismal_name', e.target.value)} placeholder="Baptismal name" />
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
                    <Input type="date" value={editForm.date_of_birth} onChange={e => setEF('date_of_birth', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Academic info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Year of Study</Label>
                    <Select value={editForm.university_year} onValueChange={v => setEF('university_year', v)}>
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
                    <Input value={editForm.university_department} onChange={e => setEF('university_department', e.target.value)} placeholder="e.g. Computer Science" />
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
                    <Input value={editForm.telegram_username} onChange={e => setEF('telegram_username', e.target.value)} placeholder="@username" />
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

      {/* Role Assignment Dialog */}
      <RoleAssignmentDialog
        memberId={roleDialogMember?.id ?? null}
        memberName={roleDialogMember?.name ?? ''}
        open={!!roleDialogMember}
        onOpenChange={(open) => { if (!open) setRoleDialogMember(null); }}
        onRoleChanged={handleRoleChanged}
      />
    </div>
  );
}

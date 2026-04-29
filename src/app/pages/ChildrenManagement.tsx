import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Trash2, Eye, Lock, Pencil, Download } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import { PaginationBar } from '../components/PaginationBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { canManageChildren, UserRole } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { useChildren, ChildSearchResult, KutrLevel } from '../hooks/useChildren';
import { toast } from 'sonner';
import { downloadFile } from '../lib/exportUtils';

// ── Export helpers ─────────────────────────────────────────────────────────

function escapeCSV(v: string | number | undefined | null): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportChildrenCSV(children: ChildSearchResult[]) {
  const header = 'Full Name,Baptismal Name,Gender,Age,Kutr Level,Grade,Father,Mother,Father Phone,Mother Phone,Address,Family,Confession Father,Status';
  const rows = children.map(c => [
    escapeCSV(c.full_name),
    escapeCSV(c.baptismal_name),
    escapeCSV(c.gender),
    escapeCSV(c.age),
    escapeCSV(c.kutr_level_name),
    escapeCSV(c.grade),
    escapeCSV(c.father_name),
    escapeCSV(c.mother_name),
    escapeCSV(c.father_phone),
    escapeCSV(c.mother_phone),
    escapeCSV(c.address_summary),
    escapeCSV(c.family_name),
    escapeCSV(c.confession_father),
    escapeCSV(c.status),
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `children-list-${date}.csv`, 'text/csv;charset=utf-8;');
}

async function exportChildrenExcel(children: ChildSearchResult[]) {
  const XLSX = await import('xlsx');
  const header = ['Full Name', 'Baptismal Name', 'Gender', 'Age', 'Kutr Level', 'Grade',
    'Father', 'Mother', 'Father Phone', 'Mother Phone', 'Address', 'Family', 'Confession Father', 'Status'];
  const rows = children.map(c => [
    c.full_name, c.baptismal_name ?? '', c.gender ?? '', c.age ?? '',
    c.kutr_level_name ?? '', c.grade ?? '',
    c.father_name ?? '', c.mother_name ?? '',
    c.father_phone ?? '', c.mother_phone ?? '',
    c.address_summary ?? '', c.family_name ?? '',
    c.confession_father ?? '', c.status,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  header.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[ref]) ws[ref].s = { font: { bold: true } };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Children');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const date = new Date().toISOString().split('T')[0];
  downloadFile(buf, `children-list-${date}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

async function exportChildrenPDF(children: ChildSearchResult[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  const date = new Date().toISOString().split('T')[0];
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Children List — Hitsanat KFL', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${date}  |  Total: ${children.length}`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [['Full Name', 'Baptismal', 'Gender', 'Kutr', 'Father', 'Mother', 'Contact', 'Address']],
    body: children.map(c => [
      c.full_name, c.baptismal_name ?? '—', c.gender ?? '—',
      c.kutr_level_name ?? '—',
      c.father_name ?? '—', c.mother_name ?? '—',
      [c.father_phone, c.mother_phone].filter(Boolean).join('\n') || '—',
      c.address_summary ?? '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fontStyle: 'bold', fillColor: [95, 1, 19] },
    alternateRowStyles: { fillColor: [249, 245, 242] },
    columnStyles: { 0: { cellWidth: 40 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 } },
  });
  doc.save(`children-list-${date}.pdf`);
}

// ── Kutr color map ─────────────────────────────────────────────────────────

const KUTR_FALLBACK_COLORS: Record<string, string> = {
  'Kutr 1': 'bg-blue-100 text-blue-700',
  'Kutr 2': 'bg-purple-100 text-purple-700',
  'Kutr 3': 'bg-green-100 text-green-700',
};

function kutrBadgeClass(name: string | null): string {
  return KUTR_FALLBACK_COLORS[name ?? ''] ?? 'bg-muted text-muted-foreground';
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ChildrenManagement() {
  const { user } = useAuth();
  const {
    children, isLoading,
    searchChildren, deleteChild, updateChild,
    getKutrLevels,
  } = useChildren();

  const role = (user?.role ?? 'member') as UserRole;
  const canManage = canManageChildren(role);

  const [search, setSearch]           = useState('');
  const [filterKutr, setFilterKutr]   = useState('all');
  const [kutrLevels, setKutrLevels]   = useState<KutrLevel[]>([]);
  const [selected, setSelected]       = useState<ChildSearchResult | null>(null);
  const [editing, setEditing]         = useState<ChildSearchResult | null>(null);
  const [editForm, setEditForm]       = useState({
    first_name: '', last_name: '', baptismal_name: '',
    gender: '', date_of_birth: '', grade: '', level: '',
    father_name: '', father_phone: '',
    mother_name: '', mother_phone: '',
  });

  // Load kutr levels once
  useEffect(() => {
    getKutrLevels().then(setKutrLevels);
  }, [getKutrLevels]);

  // Search whenever filters change
  useEffect(() => {
    const kutrId = filterKutr !== 'all' ? filterKutr : undefined;
    searchChildren({ searchTerm: search || undefined, kutrLevelId: kutrId, status: 'active' });
  }, [search, filterKutr, searchChildren]);

  const openEdit = (child: ChildSearchResult) => {
    setEditForm({
      first_name:      child.first_name,
      last_name:       child.last_name,
      baptismal_name:  child.baptismal_name ?? '',
      gender:          child.gender ?? '',
      date_of_birth:   child.date_of_birth ?? '',
      grade:           child.grade ?? '',
      level:           child.level ?? '',
      father_name:     child.father_name ?? '',
      father_phone:    child.father_phone ?? '',
      mother_name:     child.mother_name ?? '',
      mother_phone:    child.mother_phone ?? '',
    });
    setEditing(child);
  };

  const setEF = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const handleEditSave = async () => {
    if (!editing) return;
    const success = await updateChild(editing.child_id, {
      first_name:     editForm.first_name.trim()     || editing.first_name,
      last_name:      editForm.last_name.trim()      || editing.last_name,
      baptismal_name: editForm.baptismal_name.trim() || null,
      gender:         editForm.gender                || null,
      date_of_birth:  editForm.date_of_birth         || null,
      grade:          editForm.grade.trim()          || null,
      level:          editForm.level.trim()          || null,
    } as any);
    if (success) {
      toast.success('Child details updated');
      setEditing(null);
      searchChildren({ searchTerm: search || undefined, kutrLevelId: filterKutr !== 'all' ? filterKutr : undefined, status: 'active' });
    } else {
      toast.error('Failed to update. You may not have permission.');
    }
  };

  const handleDelete = async (childId: string) => {
    const success = await deleteChild(childId);
    if (success) {
      toast.success('Child removed');
    } else {
      toast.error('Failed to delete. You may not have permission.');
    }
  };

  const pagination = usePagination(children, 10);

  // Stats
  const kutrCounts = kutrLevels.map(kl => ({
    ...kl,
    count: children.filter(c => c.kutr_level_name === kl.name).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Children Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all children in the program</p>
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
                <DropdownMenuItem onClick={() => exportChildrenCSV(children)}>
                  Export CSV ({children.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChildrenExcel(children).catch(() => toast.error('Export failed'))}>
                  Export Excel ({children.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChildrenPDF(children).catch(() => toast.error('Export failed'))}>
                  Export PDF ({children.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/register/child">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />Add Child
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />View only
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-bold text-foreground mt-1">{children.length}</p>
          </CardContent>
        </Card>
        {kutrCounts.map(kl => (
          <Card key={kl.id}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{kl.name}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: kl.color }}>{kl.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Children</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full sm:w-56" />
              </div>
              <Select value={filterKutr} onValueChange={setFilterKutr}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kutrs</SelectItem>
                  {kutrLevels.map(kl => (
                    <SelectItem key={kl.id} value={kl.id}>{kl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading children...</div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden space-y-3">
                {pagination.pageItems.map(child => (
                  <div key={child.child_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                            {child.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{child.full_name}</p>
                          {child.baptismal_name && (
                            <p className="text-xs text-muted-foreground truncate">{child.baptismal_name}</p>
                          )}
                        </div>
                      </div>
                      {child.kutr_level_name ? (
                        <Badge className={`shrink-0 ${kutrBadgeClass(child.kutr_level_name)}`}>
                          {child.kutr_level_name}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {child.father_name && (
                        <div>
                          <span className="text-muted-foreground text-xs">Father: </span>
                          <span className="font-medium">{child.father_name}</span>
                        </div>
                      )}
                      {child.mother_name && (
                        <div>
                          <span className="text-muted-foreground text-xs">Mother: </span>
                          <span className="font-medium">{child.mother_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        {child.father_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{child.father_phone}
                            <span className="opacity-60">(F)</span>
                          </div>
                        )}
                        {child.mother_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{child.mother_phone}
                            <span className="opacity-60">(M)</span>
                          </div>
                        )}
                        {!child.father_phone && !child.mother_phone && (
                          <span className="text-xs text-muted-foreground">No contact</span>
                        )}
                      </div>
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
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(child.child_id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {pagination.pageItems.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No children found</p>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {pagination.pageItems.map(child => (
                      <TableRow key={child.child_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                                {child.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium leading-tight">{child.full_name}</p>
                              {child.baptismal_name && (
                                <p className="text-xs text-muted-foreground">{child.baptismal_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {child.kutr_level_name ? (
                            <Badge className={kutrBadgeClass(child.kutr_level_name)}>
                              {child.kutr_level_name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{child.father_name || <span className="text-muted-foreground">—</span>}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{child.mother_name || <span className="text-muted-foreground">—</span>}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {child.father_phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />{child.father_phone}
                                <span className="text-[10px] opacity-60">(F)</span>
                              </div>
                            )}
                            {child.mother_phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />{child.mother_phone}
                                <span className="text-[10px] opacity-60">(M)</span>
                              </div>
                            )}
                            {!child.father_phone && !child.mother_phone && (
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
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(child.child_id)}>
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
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No children found
                        </TableCell>
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
                label="children"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Child Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xl">
                    {selected.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{selected.full_name}</h3>
                  {selected.baptismal_name && (
                    <p className="text-xs text-muted-foreground">{selected.baptismal_name}</p>
                  )}
                  {selected.kutr_level_name && (
                    <Badge className={`mt-1 ${kutrBadgeClass(selected.kutr_level_name)}`}>
                      {selected.kutr_level_name}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Gender</p><p className="font-medium">{selected.gender || '—'}</p></div>
                <div><p className="text-muted-foreground">Age</p><p className="font-medium">{selected.age ?? '—'}</p></div>
                <div><p className="text-muted-foreground">Grade</p><p className="font-medium">{selected.grade || '—'}</p></div>
                <div><p className="text-muted-foreground">Family</p><p className="font-medium">{selected.family_name || '—'}</p></div>
                <div><p className="text-muted-foreground">Father</p><p className="font-medium">{selected.father_name || '—'}</p></div>
                <div><p className="text-muted-foreground">Father Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    {selected.father_phone ? <><Phone className="w-3 h-3" />{selected.father_phone}</> : '—'}
                  </p>
                </div>
                <div><p className="text-muted-foreground">Mother</p><p className="font-medium">{selected.mother_name || '—'}</p></div>
                <div><p className="text-muted-foreground">Mother Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    {selected.mother_phone ? <><Phone className="w-3 h-3" />{selected.mother_phone}</> : '—'}
                  </p>
                </div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{selected.address_summary || '—'}</p></div>
                {selected.confession_father && (
                  <div className="col-span-2"><p className="text-muted-foreground">Confession Father</p><p className="font-medium">{selected.confession_father}</p></div>
                )}
              </div>
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
            <DialogDescription>Update information for {editing?.full_name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input value={editForm.first_name} onChange={e => setEF('first_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name *</Label>
                    <Input value={editForm.last_name} onChange={e => setEF('last_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Baptismal Name</Label>
                    <Input value={editForm.baptismal_name} onChange={e => setEF('baptismal_name', e.target.value)} placeholder="Spiritual name" />
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
                  <div className="space-y-1.5">
                    <Label>Grade</Label>
                    <Input value={editForm.grade} onChange={e => setEF('grade', e.target.value)} placeholder="e.g. Grade 3" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Level</Label>
                    <Input value={editForm.level} onChange={e => setEF('level', e.target.value)} placeholder="Academic/spiritual level" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parents / Guardian</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Father's Full Name</Label>
                    <Input value={editForm.father_name} onChange={e => setEF('father_name', e.target.value)} placeholder="Father's full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father's Phone</Label>
                    <Input type="tel" value={editForm.father_phone} onChange={e => setEF('father_phone', e.target.value)} placeholder="+251 911 ..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother's Full Name</Label>
                    <Input value={editForm.mother_name} onChange={e => setEF('mother_name', e.target.value)} placeholder="Mother's full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother's Phone</Label>
                    <Input type="tel" value={editForm.mother_phone} onChange={e => setEF('mother_phone', e.target.value)} placeholder="+251 911 ..." />
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

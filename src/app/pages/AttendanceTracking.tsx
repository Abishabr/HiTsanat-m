import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule, DayAttendance } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { Calendar, Search, Filter, Users, Baby, CheckCircle2, XCircle, Clock, Download, Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';

type AttendanceStatus = 'present' | 'absent' | 'late';
type TabType = 'members' | 'children';

const TODAY = new Date().toISOString().split('T')[0];

export default function AttendanceTracking() {
  const { user } = useAuth();
  const { attendance, markAttendance } = useSchedule();
  const { members, children } = useDataStore();

  const isKuttr = user?.role === 'subdept-leader' && user?.subDepartment === 'Kuttr';
  const isChairperson = user?.role !== 'subdept-leader' && user?.role !== 'member';
  const canMark = isKuttr;

  const [date, setDate] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [campus, setCampus] = useState('all');
  const [tab, setTab] = useState<TabType>('members');

  // Block non-Kuttr sub-dept leaders
  if (user?.role === 'subdept-leader' && !isKuttr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Access Restricted</h2>
        <p className="text-gray-500 max-w-sm">
          Attendance tracking is managed exclusively by the Kuttr sub-department.
        </p>
      </div>
    );
  }

  // Get attendance status for a person on the selected date
  const getStatus = (id: string): AttendanceStatus | null => {
    const rec = attendance.find(a => a.childId === id && a.date === date);
    return (rec?.status as AttendanceStatus) ?? null;
  };

  // Mark a single person
  const mark = (id: string, name: string, status: AttendanceStatus) => {
    const existing = getStatus(id);
    if (existing === status) return; // already set
    const record: Omit<DayAttendance, 'id'> = {
      date,
      day: new Date(date + 'T12:00:00').getDay() === 6 ? 'Saturday' : 'Sunday',
      childId: id,
      status,
      markedBy: user?.id ?? 'kuttr',
      markedAt: new Date().toISOString(),
    };
    markAttendance([record]);
    toast.success(`${name} marked as ${status}`);
  };

  // Filtered lists
  const allMembers = useMemo(() => members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  }), [members, search]);

  const allChildren = useMemo(() => children.filter(c => {
    return c.name.toLowerCase().includes(search.toLowerCase());
  }), [children, search]);

  const list = tab === 'members' ? allMembers : allChildren;

  // Stats
  const dateRecords = attendance.filter(a => a.date === date);
  const presentCount = dateRecords.filter(a => a.status === 'present').length;
  const absentCount = dateRecords.filter(a => a.status === 'absent').length;
  const lateCount = dateRecords.filter(a => a.status === 'late').length;
  const totalCount = list.length;
  const notMarked = list.filter(p => !getStatus(p.id)).length;

  const markAll = (status: AttendanceStatus) => {
    const records: Omit<DayAttendance, 'id'>[] = list.map(p => ({
      date,
      day: new Date(date + 'T12:00:00').getDay() === 6 ? 'Saturday' : 'Sunday',
      childId: p.id,
      status,
      markedBy: user?.id ?? 'kuttr',
      markedAt: new Date().toISOString(),
    }));
    markAttendance(records);
    toast.success(`All ${tab} marked as ${status}`);
  };

  const clearAll = () => {
    // Re-mark all as null by removing — we'll just mark them absent then clear
    // Actually just notify; clearing would require a removeAttendance action
    toast.info('Clear not supported — mark individually to change');
  };

  const exportCSV = () => {
    const rows = list.map(p => {
      const s = getStatus(p.id) ?? 'not marked';
      return `${p.id},${p.name},${s}`;
    });
    const csv = ['ID,Name,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBtn = ({ id, name, status, current }: { id: string; name: string; status: AttendanceStatus; current: AttendanceStatus | null }) => {
    const active = current === status;
    const styles: Record<AttendanceStatus, { bg: string; icon: any; label: string }> = {
      present: { bg: active ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100', icon: Check, label: 'Present' },
      late:    { bg: active ? 'bg-yellow-400 text-white' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100', icon: Clock, label: 'Late' },
      absent:  { bg: active ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100', icon: X, label: 'Absent' },
    };
    const { bg, icon: Icon } = styles[status];
    return (
      <button
        disabled={!canMark}
        onClick={() => mark(id, name, status)}
        title={styles[status].label}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${active ? 'border-transparent shadow-sm' : 'border-gray-200'} ${bg} ${!canMark ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Attendance Sheet</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track attendance for members and children</p>
      </div>

      {/* Filters bar */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#2c2c2c] focus:outline-none focus:border-[#5f0113]" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Search className="w-3 h-3" />Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-[#2c2c2c] focus:outline-none focus:border-[#5f0113]" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Filter className="w-3 h-3" />Campus</label>
            <select value={campus} onChange={e => setCampus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#2c2c2c] focus:outline-none focus:border-[#5f0113]">
              <option value="all">All Campuses</option>
              <option value="Main">Main</option>
              <option value="Gendeje">Gendeje</option>
              <option value="Station">Station</option>
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all">
              <Eye className="w-3.5 h-3.5" />Preview
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all">
              <Download className="w-3.5 h-3.5" />Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: totalCount, bg: 'bg-gray-50', text: 'text-[#2c2c2c]' },
          { label: 'Present', value: presentCount, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Absent', value: absentCount, bg: 'bg-red-50', text: 'text-red-500' },
          { label: 'Late', value: lateCount, bg: 'bg-yellow-50', text: 'text-yellow-600' },
          { label: 'Not Marked', value: notMarked, bg: 'bg-blue-50', text: 'text-blue-600' },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + bulk actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setTab('members')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'members' ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={tab === 'members' ? { backgroundColor: '#5f0113' } : {}}>
            <Users className="w-4 h-4" />Members
          </button>
          <button onClick={() => setTab('children')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'children' ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={tab === 'children' ? { backgroundColor: '#5f0113' } : {}}>
            <Baby className="w-4 h-4" />Children
          </button>
        </div>
        {canMark && (
          <div className="flex gap-2">
            <button onClick={() => markAll('present')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all">
              <Check className="w-3.5 h-3.5" />Mark All Present
            </button>
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-all">
              <X className="w-3.5 h-3.5" />Clear All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-20">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Campus</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Department</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No records found</td></tr>
            )}
            {list.map((person, idx) => {
              const current = getStatus(person.id);
              const idLabel = tab === 'members' ? `M${String(idx + 1).padStart(3, '0')}` : `C${String(idx + 1).padStart(3, '0')}`;
              const dept = tab === 'members' ? ((person as any).subDepartments?.join(', ') || '-') : `Kutr ${(person as any).kutrLevel ?? '-'}`;
              return (
                <tr key={person.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{idLabel}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{person.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">-</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{dept}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <StatusBtn id={person.id} name={person.name} status="present" current={current} />
                      <StatusBtn id={person.id} name={person.name} status="late" current={current} />
                      <StatusBtn id={person.id} name={person.name} status="absent" current={current} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chairperson: full log */}
      {isChairperson && attendance.filter(a => a.date === date).length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="font-semibold text-foreground mb-3">Submitted by Kuttr — {date}</h3>
          <div className="text-sm text-gray-500">
            {presentCount} present · {absentCount} absent · {lateCount} late
          </div>
        </div>
      )}
    </div>
  );
}

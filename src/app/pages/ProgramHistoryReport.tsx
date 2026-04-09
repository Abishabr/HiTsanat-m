/**
 * Program History Report
 *
 * Shows all weekly programs with attendance summary, filterable by
 * time range (1 week, 1 month, 2 months, 3 months, custom date range).
 * Exportable to CSV.
 */

import { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Download, Calendar, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

type RangePreset = '1w' | '1m' | '2m' | '3m' | '6m' | '1y' | 'custom';

function getDateRange(preset: RangePreset, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().split('T')[0];

  if (preset === 'custom') return { start: customStart || end, end: customEnd || end };

  const start = new Date(today);
  if (preset === '1w') start.setDate(today.getDate() - 7);
  else if (preset === '1m') start.setMonth(today.getMonth() - 1);
  else if (preset === '2m') start.setMonth(today.getMonth() - 2);
  else if (preset === '3m') start.setMonth(today.getMonth() - 3);
  else if (preset === '6m') start.setMonth(today.getMonth() - 6);
  else if (preset === '1y') start.setFullYear(today.getFullYear() - 1);

  return { start: start.toISOString().split('T')[0], end };
}

function exportCSV(rows: ProgramReportRow[]) {
  const header = 'Date,Day,Sub-Department,Start Time,End Time,Assigned Member,Total Children,Present,Absent,Late,Excused,Attendance Rate';
  const lines = rows.map(r =>
    `${r.date},${r.day},${r.subDeptName},${r.startTime},${r.endTime},${r.assignedMember},${r.totalChildren},${r.present},${r.absent},${r.late},${r.excused},${r.rate}%`
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `program-history-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ProgramReportRow {
  id: string;
  date: string;
  day: string;
  subDeptName: string;
  subDeptColor: string;
  startTime: string;
  endTime: string;
  assignedMember: string;
  totalChildren: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

export default function ProgramHistoryReport() {
  const { slots, attendance, subDepts } = useSchedule();
  const { children, members } = useDataStore();

  const [preset, setPreset] = useState<RangePreset>('1m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('all');

  const { start, end } = getDateRange(preset, customStart, customEnd);

  const rows = useMemo<ProgramReportRow[]>(() => {
    return slots
      .filter(slot => slot.date >= start && slot.date <= end)
      .filter(slot => filterSubDept === 'all' || slot.subDepartmentId === filterSubDept)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(slot => {
        const liveDept = subDepts.find(sd => sd.id === slot.subDepartmentId);
        const deptName = liveDept?.name ?? slot.subDepartmentId;
        const color = SUBDEPT_COLORS[deptName] ?? '#6b7280';
        const assignedMember = slot.assignedMemberId
          ? members.find(m => m.id === slot.assignedMemberId)?.name ?? 'Unknown'
          : 'Unassigned';

        // Get attendance for this slot's date
        const slotAttendance = attendance.filter(a => a.date === slot.date);
        const present = slotAttendance.filter(a => a.status === 'present').length;
        const absent = slotAttendance.filter(a => a.status === 'absent').length;
        const late = slotAttendance.filter(a => a.status === 'late').length;
        const excused = slotAttendance.filter(a => a.status === 'excused').length;
        const total = slotAttendance.length || children.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          id: slot.id,
          date: slot.date,
          day: slot.day,
          subDeptName: getSubDeptDisplayName(deptName),
          subDeptColor: color,
          startTime: slot.startTime,
          endTime: slot.endTime,
          assignedMember,
          totalChildren: total,
          present,
          absent,
          late,
          excused,
          rate,
        };
      });
  }, [slots, attendance, children, members, subDepts, start, end, filterSubDept]);

  // Summary totals
  const totals = useMemo(() => ({
    programs: rows.length,
    present: rows.reduce((s, r) => s + r.present, 0),
    absent: rows.reduce((s, r) => s + r.absent, 0),
    avgRate: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length) : 0,
  }), [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Program History Report</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Completed weekly programs with attendance summary
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => exportCSV(rows)} disabled={rows.length === 0}>
          <Download className="w-4 h-4" />Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Time Range</Label>
              <Select value={preset} onValueChange={v => setPreset(v as RangePreset)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1w">Last 1 Week</SelectItem>
                  <SelectItem value="1m">Last 1 Month</SelectItem>
                  <SelectItem value="2m">Last 2 Months</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last 1 Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-36 h-9" />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Sub-Department</Label>
              <Select value={filterSubDept} onValueChange={setFilterSubDept}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Departments</SelectItem>
                  {subDepts.map(sd => (
                    <SelectItem key={sd.id} value={sd.id}>
                      {getSubDeptDisplayName(sd.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground self-end pb-2">
              {start} → {end}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Programs', value: totals.programs, icon: Calendar, color: 'text-blue-600' },
          { label: 'Total Present', value: totals.present, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Total Absent', value: totals.absent, icon: XCircle, color: 'text-red-500' },
          { label: 'Avg Attendance', value: `${totals.avgRate}%`, icon: Users, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`w-8 h-8 ${color} opacity-40`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{rows.length} program{rows.length !== 1 ? 's' : ''} found</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No programs found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Sub-Department</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm font-medium">
                        {new Date(row.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.day}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: row.subDeptColor, color: '#fff' }} className="text-xs">
                          {row.subDeptName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.startTime} – {row.endTime}
                      </TableCell>
                      <TableCell className="text-sm">{row.assignedMember}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-medium">{row.present}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-500 font-medium">{row.absent}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-yellow-600 font-medium">{row.late}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs ${row.rate >= 80 ? 'bg-green-100 text-green-700' : row.rate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {row.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

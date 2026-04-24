/**
 * Program History Report
 * Shows weekly program sessions with attendance summary.
 * Uses Supabase directly — no mock data.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../lib/subDeptUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ExportAllButton } from '../components/ExportAllButton';

type RangePreset = '1w' | '1m' | '2m' | '3m' | '6m' | '1y' | 'custom';

function getDateRange(preset: RangePreset, customStart: string, customEnd: string) {
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

interface SessionRow {
  session_id: string;
  session_date: string;
  program_title: string;
  day_of_week: string;
  sub_department_name: string;
  start_time: string | null;
  end_time: string | null;
  present_count: number;
  attendance_marked_count: number;
  assigned_members_count: number;
}

export default function ProgramHistoryReport() {
  const [preset, setPreset] = useState<RangePreset>('1m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('all');
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('sub_departments').select('id, name').order('name')
      .then(({ data }) => setSubDepts(data ?? []));
  }, []);

  const { start, end } = getDateRange(preset, customStart, customEnd);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('program_sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        status,
        weekly_programs!inner(title, day_of_week, sub_department_id, sub_departments(name)),
        child_attendance(status),
        program_assignments(id)
      `)
      .gte('session_date', start)
      .lte('session_date', end)
      .order('session_date', { ascending: false });

    query.then(({ data }) => {
      const rows: SessionRow[] = (data ?? []).map((s: any) => {
        const att = s.child_attendance ?? [];
        const presentCount = att.filter((a: any) => a.status === 'present').length;
        return {
          session_id: s.id,
          session_date: s.session_date,
          program_title: s.weekly_programs?.title ?? '—',
          day_of_week: s.weekly_programs?.day_of_week ?? '—',
          sub_department_name: s.weekly_programs?.sub_departments?.name ?? '—',
          start_time: s.start_time,
          end_time: s.end_time,
          present_count: presentCount,
          attendance_marked_count: att.length,
          assigned_members_count: s.program_assignments?.length ?? 0,
        };
      });
      const filtered = filterSubDept === 'all'
        ? rows
        : rows.filter(r => {
            const sd = subDepts.find(s => s.id === filterSubDept);
            return sd ? r.sub_department_name === sd.name : true;
          });
      setSessions(filtered);
      setLoading(false);
    });
  }, [start, end, filterSubDept, subDepts]);

  const totals = useMemo(() => ({
    programs: sessions.length,
    present: sessions.reduce((s, r) => s + r.present_count, 0),
    marked: sessions.reduce((s, r) => s + r.attendance_marked_count, 0),
    avgRate: sessions.length > 0
      ? Math.round(sessions.reduce((s, r) => s + (r.attendance_marked_count > 0 ? (r.present_count / r.attendance_marked_count) * 100 : 0), 0) / sessions.length)
      : 0,
  }), [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Program History Report</h2>
          <p className="text-muted-foreground text-sm mt-1">Completed weekly program sessions with attendance summary</p>
        </div>
        <ExportAllButton
          filename={`program-history-${new Date().toISOString().split('T')[0]}`}
          disabled={sessions.length === 0}
          getRows={() => {
            const header = ['Date', 'Day', 'Program', 'Sub-Department', 'Start', 'End', 'Present', 'Total Marked', 'Assigned Members'];
            return [header, ...sessions.map(r => [r.session_date, r.day_of_week, r.program_title, r.sub_department_name, r.start_time ?? '', r.end_time ?? '', String(r.present_count), String(r.attendance_marked_count), String(r.assigned_members_count)])];
          }}
          getSummaryRows={() => [
            ['Total Sessions', String(totals.programs)],
            ['Total Present', String(totals.present)],
            ['Total Marked', String(totals.marked)],
            ['Avg Attendance Rate', `${totals.avgRate}%`],
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Time Range</Label>
              <Select value={preset} onValueChange={v => setPreset(v as RangePreset)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Departments</SelectItem>
                  {subDepts.map(sd => (
                    <SelectItem key={sd.id} value={sd.id}>{getSubDeptDisplayName(sd.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground self-end pb-2">{start} → {end}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sessions', value: totals.programs, icon: Calendar, color: 'text-blue-600' },
          { label: 'Total Present', value: totals.present, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Total Marked', value: totals.marked, icon: XCircle, color: 'text-orange-500' },
          { label: 'Avg Attendance', value: `${totals.avgRate}%`, icon: Users, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>
            <Icon className={`w-8 h-8 ${color} opacity-40`} />
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{sessions.length} session{sessions.length !== 1 ? 's' : ''} found</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No sessions found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Sub-Department</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Marked</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(row => {
                    const color = SUBDEPT_COLORS[row.sub_department_name] ?? '#6b7280';
                    const rate = row.attendance_marked_count > 0
                      ? Math.round((row.present_count / row.attendance_marked_count) * 100)
                      : null;
                    return (
                      <TableRow key={row.session_id}>
                        <TableCell className="text-sm font-medium">
                          {new Date(row.session_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="ml-1 text-xs text-muted-foreground">({row.day_of_week})</span>
                        </TableCell>
                        <TableCell className="text-sm">{row.program_title}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-xs">
                            {getSubDeptDisplayName(row.sub_department_name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.start_time ?? '—'}{row.end_time ? ` – ${row.end_time}` : ''}
                        </TableCell>
                        <TableCell className="text-center"><span className="text-green-600 font-medium">{row.present_count}</span></TableCell>
                        <TableCell className="text-center"><span className="text-muted-foreground">{row.attendance_marked_count}</span></TableCell>
                        <TableCell className="text-center">
                          {rate !== null ? (
                            <Badge className={`text-xs ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {rate}%
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

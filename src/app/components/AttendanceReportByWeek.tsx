/**
 * AttendanceReportByWeek
 *
 * Shows attendance grouped by week. Each week row is clickable
 * and expands to show the full per-child attendance sheet (read-only).
 */

import { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Download, Users } from 'lucide-react';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../data/mockData';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800',
  absent:  'bg-red-100 text-red-800',
  late:    'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800',
};

// Get ISO week label: "Week of Apr 5, 2026"
function weekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  // Find Saturday of that week
  const day = d.getDay();
  const sat = new Date(d);
  sat.setDate(d.getDate() + (6 - day));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return `${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const sat = new Date(d);
  sat.setDate(d.getDate() + (6 - day));
  return sat.toISOString().split('T')[0];
}

function exportWeekCSV(weekKey: string, dates: string[], attendance: ReturnType<typeof useSchedule>['attendance'], children: ReturnType<typeof useDataStore>['children']) {
  const header = 'Child Name,Kutr Level,' + dates.join(',');
  const rows = children.map(c => {
    const statuses = dates.map(d => {
      const rec = attendance.find(a => a.childId === c.id && a.date === d);
      return rec?.status ?? 'not recorded';
    });
    return `${c.name},Kutr ${c.kutrLevel},${statuses.join(',')}`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-week-${weekKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Week sheet (expanded view) ─────────────────────────────────────────────

function WeekSheet({ weekKey, dates, slots, attendance, children, subDepts }: {
  weekKey: string;
  dates: string[];
  slots: ReturnType<typeof useSchedule>['slots'];
  attendance: ReturnType<typeof useSchedule>['attendance'];
  children: ReturnType<typeof useDataStore>['children'];
  subDepts: ReturnType<typeof useSchedule>['subDepts'];
}) {
  const sortedChildren = [...children].sort((a, b) => a.kutrLevel - b.kutrLevel || a.name.localeCompare(b.name));

  return (
    <div className="border-t pt-4 space-y-4">
      {/* Per-date summary */}
      <div className="flex flex-wrap gap-3">
        {dates.map(date => {
          const dayAttendance = attendance.filter(a => a.date === date);
          const present = dayAttendance.filter(a => a.status === 'present').length;
          const total = dayAttendance.length;
          const slot = slots.find(s => s.date === date);
          const dept = subDepts.find(sd => sd.id === slot?.subDepartmentId);
          const color = SUBDEPT_COLORS[dept?.name ?? ''] ?? '#6b7280';
          return (
            <div key={date} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              {total > 0
                ? <Badge className="text-[10px] px-1 py-0 bg-green-100 text-green-700">{present}/{total}</Badge>
                : <Badge variant="outline" className="text-[10px] px-1 py-0">No data</Badge>
              }
            </div>
          );
        })}
      </div>

      {/* Per-child table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">Child</th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">Kutr</th>
              {dates.map(d => (
                <th key={d} className="text-center py-2 px-2 font-medium text-muted-foreground text-xs min-w-[80px]">
                  {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedChildren.map(child => (
              <tr key={child.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2 pr-4 font-medium">{child.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">Kutr {child.kutrLevel}</td>
                {dates.map(d => {
                  const rec = attendance.find(a => a.childId === child.id && a.date === d);
                  return (
                    <td key={d} className="py-2 px-2 text-center">
                      {rec ? (
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${STATUS_COLORS[rec.status as AttendanceStatus]}`}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {sortedChildren.length === 0 && (
              <tr><td colSpan={dates.length + 2} className="py-6 text-center text-muted-foreground text-sm">No children registered</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => exportWeekCSV(weekKey, dates, attendance, sortedChildren)}>
          <Download className="w-3.5 h-3.5" />Export Week CSV
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AttendanceReportByWeek() {
  const { slots, attendance, subDepts } = useSchedule();
  const { children } = useDataStore();

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [filterSubDept, setFilterSubDept] = useState('all');
  const [filterMonths, setFilterMonths] = useState('3');

  // Build week groups from slots
  const weekGroups = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(filterMonths));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filteredSlots = slots.filter(s =>
      s.date >= cutoffStr &&
      (filterSubDept === 'all' || s.subDepartmentId === filterSubDept)
    );

    const byWeek: Record<string, string[]> = {};
    for (const slot of filteredSlots) {
      const wk = getWeekKey(slot.date);
      if (!byWeek[wk]) byWeek[wk] = [];
      if (!byWeek[wk].includes(slot.date)) byWeek[wk].push(slot.date);
    }

    return Object.entries(byWeek)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, dates]) => {
        const sortedDates = [...dates].sort();
        const weekAttendance = attendance.filter(a => sortedDates.includes(a.date));
        const present = weekAttendance.filter(a => a.status === 'present').length;
        const absent = weekAttendance.filter(a => a.status === 'absent').length;
        const total = weekAttendance.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : null;
        return { weekKey, dates: sortedDates, present, absent, total, rate };
      });
  }, [slots, attendance, filterSubDept, filterMonths]);

  // Overall stats
  const totalPresent = weekGroups.reduce((s, w) => s + w.present, 0);
  const totalAbsent = weekGroups.reduce((s, w) => s + w.absent, 0);
  const avgRate = weekGroups.length > 0
    ? Math.round(weekGroups.filter(w => w.rate !== null).reduce((s, w) => s + (w.rate ?? 0), 0) / weekGroups.filter(w => w.rate !== null).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Period</p>
          <Select value={filterMonths} onValueChange={setFilterMonths}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 Month</SelectItem>
              <SelectItem value="2">Last 2 Months</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Sub-Department</p>
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
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Weeks', value: weekGroups.length, icon: Calendar, color: 'text-blue-600' },
          { label: 'Total Present', value: totalPresent, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Total Absent', value: totalAbsent, icon: XCircle, color: 'text-red-500' },
          { label: 'Avg Rate', value: `${avgRate}%`, icon: Users, color: 'text-purple-600' },
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

      {/* Week list */}
      {weekGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No attendance data for the selected period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {weekGroups.map(({ weekKey, dates, present, absent, total, rate }) => {
            const isOpen = expandedWeek === weekKey;
            return (
              <Card key={weekKey} className="overflow-hidden">
                {/* Week header — click to expand */}
                <button
                  className="w-full text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedWeek(isOpen ? null : weekKey)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        }
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            Week of {weekLabel(dates[0])}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {dates.length} program day{dates.length !== 1 ? 's' : ''}
                            {total > 0 && ` · ${total} records`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {total > 0 ? (
                          <>
                            <Badge className="text-xs bg-green-100 text-green-700">{present} present</Badge>
                            <Badge className="text-xs bg-red-100 text-red-700">{absent} absent</Badge>
                            {rate !== null && (
                              <Badge className={`text-xs ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {rate}%
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">No attendance recorded</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Expanded sheet */}
                {isOpen && (
                  <CardContent className="pt-0">
                    <WeekSheet
                      weekKey={weekKey}
                      dates={dates}
                      slots={slots}
                      attendance={attendance}
                      children={children}
                      subDepts={subDepts}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

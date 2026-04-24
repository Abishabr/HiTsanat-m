import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { ClipboardCheck, Users, Calendar, TrendingUp } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '../lib/permissions';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

export default function KuttrDashboard() {
  const { user } = useAuth();
  const roleLabel = ROLE_LABELS[(user?.role ?? 'member') as UserRole] ?? user?.role ?? '';

  const [stats, setStats] = useState({ totalChildren: 0, kutr1: 0, kutr2: 0, kutr3: 0, presentCount: 0, totalAttendance: 0 });
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [childrenRes, attRes, sessionsRes] = await Promise.all([
        supabase.from('children').select('id, kutr_levels(name)').eq('status', 'active'),
        supabase.from('child_attendance').select('status').limit(200),
        supabase.from('upcoming_sessions').select('*').limit(3),
      ]);
      const children = childrenRes.data ?? [];
      const att = attRes.data ?? [];
      setStats({
        totalChildren: children.length,
        kutr1: children.filter((c: any) => c.kutr_levels?.name === 'Kutr 1').length,
        kutr2: children.filter((c: any) => c.kutr_levels?.name === 'Kutr 2').length,
        kutr3: children.filter((c: any) => c.kutr_levels?.name === 'Kutr 3').length,
        presentCount: att.filter((a: any) => a.status === 'present').length,
        totalAttendance: att.length,
      });
      setUpcomingSessions(sessionsRes.data ?? []);
    }
    load();
  }, []);

  const rate = stats.totalAttendance > 0 ? Math.round((stats.presentCount / stats.totalAttendance) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kuttr Sub-Department · {roleLabel}</p>
          <h1 className="text-2xl font-black text-foreground">{user?.name ?? ''}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Attendance tracking and children management</p>
        </div>
        <Link to="/attendance">
          <Button size="sm" className="gap-2" style={{ backgroundColor: '#10b981' }}>
            <ClipboardCheck className="w-4 h-4" />Mark Attendance
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: stats.totalChildren, icon: Users, color: 'text-blue-600' },
          { label: 'Attendance Records', value: stats.totalAttendance, icon: ClipboardCheck, color: 'text-green-600' },
          { label: 'Present', value: stats.presentCount, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Attendance Rate', value: `${rate}%`, icon: Calendar, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>
            <Icon className={`w-8 h-8 ${color} opacity-40`} />
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Kutr 1', value: stats.kutr1 }, { label: 'Kutr 2', value: stats.kutr2 }, { label: 'Kutr 3', value: stats.kutr3 }].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="text-3xl font-bold mt-1">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">children</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
            <Link to="/weekly-programs"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming sessions</p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((s: any) => (
                <div key={s.session_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{s.program_title}</p>
                    <p className="text-xs text-muted-foreground">{s.start_time} · {s.sub_department_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{s.session_date}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/attendance"><Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs"><ClipboardCheck className="w-5 h-5" />Mark Attendance</Button></Link>
            <Link to="/children"><Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs"><Users className="w-5 h-5" />View Children</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

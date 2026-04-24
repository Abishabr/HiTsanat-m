import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { Film, Users, Calendar } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '../lib/permissions';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

export default function KinetibebDashboard() {
  const { user } = useAuth();
  const roleLabel = ROLE_LABELS[(user?.role ?? 'member') as UserRole] ?? user?.role ?? '';
  const [stats, setStats] = useState({ memberCount: 0, programCount: 0 });
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [sdRes, sessionsRes] = await Promise.all([
        supabase.from('sub_departments').select('id').eq('name', 'Kinetibeb').single(),
        supabase.from('upcoming_sessions').select('*').limit(3),
      ]);
      const sdId = sdRes.data?.id;
      if (sdId) {
        const [membersRes, programsRes] = await Promise.all([
          supabase.from('member_sub_departments').select('member_id').eq('sub_department_id', sdId).eq('is_active', true),
          supabase.from('weekly_programs').select('id').eq('sub_department_id', sdId).eq('status', 'active'),
        ]);
        setStats({ memberCount: membersRes.data?.length ?? 0, programCount: programsRes.data?.length ?? 0 });
      }
      setUpcomingSessions(sessionsRes.data ?? []);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kinetibeb Sub-Department · {roleLabel}</p>
          <h1 className="text-2xl font-black text-foreground">{user?.name ?? ''}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Arts, film, and cultural activities management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Members', value: stats.memberCount, icon: Users, color: 'text-pink-600' },
          { label: 'Active Programs', value: stats.programCount, icon: Calendar, color: 'text-blue-600' },
          { label: 'Sub-Dept', value: 'Kinetibeb', icon: Film, color: 'text-rose-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>
            <Icon className={`w-8 h-8 ${color} opacity-40`} />
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
                    <p className="text-xs text-muted-foreground">{s.session_date} · {s.start_time}</p>
                  </div>
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
            <Link to="/weekly-programs"><Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs"><Calendar className="w-5 h-5" />Weekly Programs</Button></Link>
            <Link to="/members"><Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs"><Users className="w-5 h-5" />Members</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

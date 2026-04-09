import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { ClipboardCheck, Users, Calendar, TrendingUp } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '../lib/permissions';

export default function KuttrDashboard() {
  const { user } = useAuth();
  const { attendance, slots } = useSchedule();
  const { children } = useDataStore();

  const userName = user?.name ?? '';
  const roleLabel = ROLE_LABELS[(user?.role ?? 'member') as UserRole] ?? user?.role ?? '';

  const totalChildren = children.length;
  const totalAttendance = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const rate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
  const upcomingSlots = slots.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with user name */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Kuttr Sub-Department · {roleLabel}
          </p>
          <h1 className="text-2xl font-black text-foreground">{userName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Attendance tracking and children management</p>
        </div>
        <div className="flex gap-2">
          <Link to="/attendance">
            <Button size="sm" className="gap-2" style={{ backgroundColor: '#10b981' }}>
              <ClipboardCheck className="w-4 h-4" />Mark Attendance
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: totalChildren, icon: Users, color: 'text-blue-600' },
          { label: 'Attendance Records', value: totalAttendance, icon: ClipboardCheck, color: 'text-green-600' },
          { label: 'Present', value: presentCount, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Attendance Rate', value: `${rate}%`, icon: Calendar, color: 'text-purple-600' },
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

      {/* Children by Kutr */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(k => (
          <Card key={k}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Kutr {k}</p>
              <p className="text-3xl font-bold mt-1">{children.filter(c => c.kutrLevel === k).length}</p>
              <p className="text-xs text-muted-foreground mt-1">children</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming programs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Programs</CardTitle>
            <Link to="/weekly-programs"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming programs</p>
          ) : (
            <div className="space-y-2">
              {upcomingSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{slot.day}</p>
                    <p className="text-xs text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{slot.date}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/attendance">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs">
                <ClipboardCheck className="w-5 h-5" />Mark Attendance
              </Button>
            </Link>
            <Link to="/children">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs">
                <Users className="w-5 h-5" />View Children
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

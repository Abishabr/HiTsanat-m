import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router';
import { BookOpen, Users, Calendar, BarChart3 } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '../lib/permissions';

export default function TimhertAcademic() {
  const { user } = useAuth();
  const { slots } = useSchedule();
  const { children, members } = useDataStore();

  const userName = user?.name ?? '';
  const roleLabel = ROLE_LABELS[(user?.role ?? 'member') as UserRole] ?? user?.role ?? '';
  const timhertMembers = members.filter(m => m.subDepartments.includes('Timhert'));
  const upcomingSlots = slots.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Timhert Academic · {roleLabel}
          </p>
          <h1 className="text-2xl font-black text-foreground">{userName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Academic education and exam management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: children.length, icon: Users, color: 'text-blue-600' },
          { label: 'Kutr 1', value: children.filter(c => c.kutrLevel === 1).length, icon: BookOpen, color: 'text-green-600' },
          { label: 'Kutr 2', value: children.filter(c => c.kutrLevel === 2).length, icon: BookOpen, color: 'text-purple-600' },
          { label: 'Kutr 3', value: children.filter(c => c.kutrLevel === 3).length, icon: BookOpen, color: 'text-orange-600' },
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card>
          <CardHeader><CardTitle className="text-base">Teachers ({timhertMembers.length})</CardTitle></CardHeader>
          <CardContent>
            {timhertMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No teachers assigned</p>
            ) : (
              <div className="space-y-2">
                {timhertMembers.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                      {m.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="text-sm font-medium">{m.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/children">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs">
                <Users className="w-5 h-5" />Children
              </Button>
            </Link>
            <Link to="/weekly-programs">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs">
                <Calendar className="w-5 h-5" />Programs
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1.5 text-xs">
                <BarChart3 className="w-5 h-5" />Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

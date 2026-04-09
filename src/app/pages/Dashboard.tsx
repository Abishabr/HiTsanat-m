import { 
  Users, 
  UserCog, 
  Calendar, 
  PartyPopper,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../data/mockData';
import { useDataStore } from '../context/DataStore';
import { useSchedule } from '../context/ScheduleStore';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router';

export default function Dashboard() {
  const { user } = useAuth();
  const { members, children } = useDataStore();
  const { attendance, slots, subDepts } = useSchedule();

  // Derive attendance trends from live attendance records
  const attendanceTrends = (() => {
    if (attendance.length === 0) {
      return [
        { week: 'Week 1', children: 0, members: 0 },
        { week: 'Week 2', children: 0, members: 0 },
        { week: 'Week 3', children: 0, members: 0 },
        { week: 'Week 4', children: 0, members: 0 },
      ];
    }
    const byWeek: Record<string, { present: number; total: number }> = {};
    for (const rec of attendance) {
      const d = new Date(rec.date);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${weekNum}`;
      if (!byWeek[key]) byWeek[key] = { present: 0, total: 0 };
      byWeek[key].total += 1;
      if (rec.status === 'present') byWeek[key].present += 1;
    }
    const weeks = Object.keys(byWeek).sort().slice(-4);
    return weeks.map((key, i) => {
      const w = byWeek[key];
      const rate = w.total > 0 ? Math.round((w.present / w.total) * 100) : 0;
      return { week: `Week ${i + 1}`, children: rate, members: rate };
    });
  })();

  // Derive performance data from children by kutrLevel
  const performanceData = [1, 2, 3].map(level => ({
    kutr: `Kutr ${level}`,
    average: children.filter(c => c.kutrLevel === level).length,
  }));

  // Derive sub-dept activity from live members and slots
  const subDeptActivity = subDepts.map(sd => ({
    name: sd.name,
    programs: slots.filter(s => s.subDepartmentId === sd.id).length,
    members: members.filter(m => m.subDepartments.includes(sd.name)).length,
  }));

  const upcomingPrograms = slots.slice(0, 4);

  const statCards = [
    { 
      title: 'Total Children', 
      value: children.length, 
      icon: Users, 
      color: 'bg-blue-500',
      change: '+12%',
      trend: 'up'
    },
    { 
      title: 'Total Members', 
      value: members.length, 
      icon: UserCog, 
      color: 'bg-purple-500',
      change: '+8%',
      trend: 'up'
    },
    { 
      title: 'Weekly Programs', 
      value: slots.length, 
      icon: Calendar, 
      color: 'bg-green-500',
      change: 'This week',
      trend: 'neutral'
    },
    { 
      title: 'Upcoming Events', 
      value: 0, 
      icon: PartyPopper, 
      color: 'bg-orange-500',
      change: 'Next 30 days',
      trend: 'neutral'
    },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive view of Hitsanat KFL operations and activities
        </p>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-sm px-3 py-1">
          Role: {(user?.role ?? '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Badge>
        {user?.subDepartment && (
          <Badge className="text-sm px-3 py-1">
            {user.subDepartment}
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {stat.trend === 'neutral' && <Activity className="w-4 h-4 text-muted-foreground" />}
                      <span className={`text-sm ${
                        stat.trend === 'up' ? 'text-green-600' : 
                        stat.trend === 'down' ? 'text-red-600' : 
                        'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`${stat.color} w-14 h-14 rounded-xl flex items-center justify-center`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Weekly attendance rates for children and members</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line key="children-line" type="monotone" dataKey="children" stroke="#3b82f6" strokeWidth={2} />
                <Line key="members-line" type="monotone" dataKey="members" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timhert Performance</CardTitle>
            <CardDescription>Children count by Kutr level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="kutr" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#10b981" name="Children" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sub-department activity & distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sub-Department Activity</CardTitle>
            <CardDescription>Programs and members by sub-department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subDepts.map((dept) => {
                const activity = subDeptActivity.find(a => a.name === dept.name) ?? { programs: 0, members: 0 };
                const totalMembers = members.length || 1;
                const pct = Math.round((activity.members / totalMembers) * 100);
                const color = SUBDEPT_COLORS[dept.name] ?? '#6b7280';
                return (
                  <div key={dept.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{getSubDeptDisplayName(dept.name)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{activity.programs} programs</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Distribution</CardTitle>
            <CardDescription>Members across sub-departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subDepts.map(sd => ({
                    name: getSubDeptDisplayName(sd.name),
                    value: members.filter(m => m.subDepartments.includes(sd.name)).length || 0,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subDepts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming programs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Weekly Programs</CardTitle>
              <CardDescription>Scheduled program slots</CardDescription>
            </div>
            <Link to="/weekly-programs">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingPrograms.map((program) => {
              const subDept = subDepts.find(sd => sd.id === program.subDepartmentId);
              const color = SUBDEPT_COLORS[subDept?.name ?? ''] ?? '#6b7280';
              return (
                <div key={program.id} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    <Calendar className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {subDept ? getSubDeptDisplayName(subDept.name) : 'Program'} — {program.day}
                    </p>
                    <p className="text-sm text-muted-foreground">{program.startTime} – {program.endTime}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(program.date).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
            {upcomingPrograms.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No programs scheduled</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/children">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="w-6 h-6" />
                <span>Add Child</span>
              </Button>
            </Link>
            <Link to="/members">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <UserCog className="w-6 h-6" />
                <span>Add Member</span>
              </Button>
            </Link>
            <Link to="/weekly-programs">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span>Schedule Program</span>
              </Button>
            </Link>
            <Link to="/attendance">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Activity className="w-6 h-6" />
                <span>Mark Attendance</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

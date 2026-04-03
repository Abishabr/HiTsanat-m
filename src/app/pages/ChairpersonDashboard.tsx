import { 
  Users, 
  UserCog, 
  Calendar, 
  PartyPopper,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  getDashboardStats, 
  getAttendanceTrends, 
  getPerformanceData,
  getSubDepartmentActivity,
  mockWeeklyPrograms,
  mockChildEvents,
  subDepartments,
  getSubDeptDisplayName,
} from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { useDataStore } from '../context/DataStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router';

export default function ChairpersonDashboard() {
  const { members, children } = useDataStore();
  const attendanceTrends = getAttendanceTrends();
  const performanceData = getPerformanceData();
  const subDeptActivity = getSubDepartmentActivity();
  const upcomingPrograms = mockWeeklyPrograms.filter(p => p.status === 'scheduled').slice(0, 4);
  const upcomingEvents = mockChildEvents.filter(e => e.status === 'upcoming').slice(0, 3);
  const { attendance, slots } = useSchedule();

  const statCards = [
    { 
      title: 'Total Children', 
      value: children.length, 
      icon: Users, 
      color: 'bg-[#5f0113]',
      change: '+12%',
      trend: 'up'
    },
    { 
      title: 'Total Members', 
      value: members.length, 
      icon: UserCog, 
      color: 'bg-[#f3c913]',
      change: '+8%',
      trend: 'up'
    },
    { 
      title: 'Weekly Programs', 
      value: slots.length, 
      icon: Calendar, 
      color: 'bg-[#2c2c2c]',
      change: 'This week',
      trend: 'neutral'
    },
    { 
      title: 'Upcoming Events', 
      value: upcomingEvents.length, 
      icon: PartyPopper, 
      color: 'bg-[#5f0113]',
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

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {stat.trend === 'neutral' && <Activity className="w-4 h-4 text-gray-600" />}
                      <span className={`text-sm ${
                        stat.trend === 'up' ? 'text-green-600' : 
                        stat.trend === 'down' ? 'text-red-600' : 
                        'text-gray-600'
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
        {/* Attendance trends */}
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
                <Line key="children-line" type="monotone" dataKey="children" stroke="#5f0113" strokeWidth={2} />
                <Line key="members-line" type="monotone" dataKey="members" stroke="#f3c913" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance data */}
        <Card>
          <CardHeader>
            <CardTitle>Timhert Performance</CardTitle>
            <CardDescription>Average scores by Kutr level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="kutr" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#f3c913" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sub-department activity & distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sub-department activity */}
        <Card>
          <CardHeader>
            <CardTitle>Sub-Department Activity</CardTitle>
            <CardDescription>Programs and attendance by sub-department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subDepartments.map((dept, index) => {
                const activity = subDeptActivity[index];
                return (
                  <div key={dept.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="text-sm font-medium">{getSubDeptDisplayName(dept.name)}</span>
                      </div>
                      <span className="text-sm text-gray-600">{activity.programs} programs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ 
                          width: `${activity.attendance}%`,
                          backgroundColor: dept.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Member distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Member Distribution</CardTitle>
            <CardDescription>Members across sub-departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subDepartments.map(sd => ({ name: getSubDeptDisplayName(sd.name), value: sd.memberCount }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subDepartments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming programs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Weekly Programs</CardTitle>
                <CardDescription>Scheduled for this week</CardDescription>
              </div>
              <Link to="/weekly-programs">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPrograms.map((program) => {
                const subDept = subDepartments.find(sd => sd.id === program.subDepartmentId);
                return (
                  <div key={program.id} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${subDept?.color}20` }}
                    >
                      <Calendar className="w-6 h-6" style={{ color: subDept?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">{program.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {program.day}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {subDept ? getSubDeptDisplayName(subDept.name) : ''} • {program.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(program.date).toLocaleDateString()} • {program.assignedMembers.length} members assigned
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Special children events</CardDescription>
              </div>
              <Link to="/events">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PartyPopper className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{event.name}</p>
                      <Badge className="text-xs">{event.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.date).toLocaleDateString()} • {event.supervisors.length} supervisors
                    </p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <PartyPopper className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No upcoming events</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>        <CardHeader>
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

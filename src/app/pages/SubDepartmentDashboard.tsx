import { useParams } from 'react-router';
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Download, 
  UserPlus, 
  CalendarPlus, 
  MessageSquare,
  Target,
  Award,
  BellRing,
  Settings,
  ArrowUpRight,
  TrendingDown,
  MoreVertical,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { subDepartments, mockMembers, mockWeeklyPrograms, currentUser } from '../data/mockData';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export default function SubDepartmentDashboard() {
  const { id } = useParams();
  const subDept = subDepartments.find(sd => sd.id === id);
  
  if (!subDept) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">Sub-department not found</p>
      </div>
    );
  }

  const members = mockMembers.filter(m => m.subDepartments.includes(subDept.name));
  const programs = mockWeeklyPrograms.filter(p => p.subDepartmentId === subDept.id);

  // Check if current user is a leader of this sub-department
  const isLeader = currentUser.role === 'chairperson' || 
                   currentUser.role === 'vice-chairperson' || 
                   currentUser.role === 'secretary' ||
                   (currentUser.role === 'subdept-leader' && currentUser.subDepartment === subDept.name);

  // Mock data for dashboard
  const activityData = [
    { week: 'Week 1', programs: 4, attendance: 85, engagement: 78 },
    { week: 'Week 2', programs: 5, attendance: 88, engagement: 82 },
    { week: 'Week 3', programs: 3, attendance: 92, engagement: 89 },
    { week: 'Week 4', programs: 6, attendance: 87, engagement: 85 },
    { week: 'Week 5', programs: 5, attendance: 90, engagement: 88 },
  ];

  const memberEngagement = [
    { name: 'Highly Active', value: 12, color: '#10b981' },
    { name: 'Active', value: 8, color: '#3b82f6' },
    { name: 'Moderate', value: 4, color: '#f59e0b' },
    { name: 'Low', value: 1, color: '#ef4444' },
  ];

  const upcomingTasks = [
    { id: 1, title: 'Prepare Sunday Program', priority: 'high', dueDate: '2026-04-02', assignee: 'Sara Wolde', status: 'in-progress' },
    { id: 2, title: 'Review Member Applications', priority: 'medium', dueDate: '2026-04-05', assignee: 'Dawit Mengistu', status: 'pending' },
    { id: 3, title: 'Monthly Report Submission', priority: 'high', dueDate: '2026-04-07', assignee: 'Almaz Tesfaye', status: 'pending' },
    { id: 4, title: 'Coordinate with Kuttr Team', priority: 'low', dueDate: '2026-04-10', assignee: 'Sara Wolde', status: 'completed' },
  ];

  const recentActivity = [
    { id: 1, type: 'program', message: 'Sunday Program completed successfully', time: '2 hours ago', icon: CheckCircle2, color: 'text-green-600' },
    { id: 2, type: 'member', message: 'New member joined: Elias Tadesse', time: '5 hours ago', icon: UserPlus, color: 'text-blue-600' },
    { id: 3, type: 'task', message: 'Task assigned to Michael Bekele', time: '1 day ago', icon: FileText, color: 'text-purple-600' },
    { id: 4, type: 'alert', message: 'Low attendance alert for Saturday program', time: '2 days ago', icon: AlertCircle, color: 'text-orange-600' },
  ];

  const performanceMetrics = [
    { label: 'Program Success Rate', value: 94, target: 90, trend: 'up' },
    { label: 'Member Retention', value: 96, target: 95, trend: 'up' },
    { label: 'Task Completion', value: 88, target: 90, trend: 'down' },
    { label: 'Budget Utilization', value: 75, target: 80, trend: 'up' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ backgroundColor: subDept.color }}
          >
            {subDept.name.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{subDept.name} Dashboard</h1>
            <p className="text-gray-600 mt-1">{subDept.description}</p>
          </div>
        </div>
        
        {isLeader && (
          <div className="flex flex-wrap gap-2">
            <Button style={{ backgroundColor: subDept.color }} className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              Schedule Program
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Announcement
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4" style={{ borderLeftColor: subDept.color }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{members.length}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-3 h-3" />
                  +3 this month
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${subDept.color}20` }}>
                <Users className="w-6 h-6" style={{ color: subDept.color }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Programs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{programs.length}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-3 h-3" />
                  5 upcoming
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Attendance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">88%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-3 h-3" />
                  +2% from last month
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">92%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-3 h-3" />
                  Excellent
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leadership Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Leadership Team</CardTitle>
                <CardDescription>Current sub-department leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 border-2 rounded-lg hover:shadow-md transition-all" style={{ borderColor: `${subDept.color}40` }}>
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="text-white" style={{ backgroundColor: subDept.color }}>
                        {subDept.chairperson.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-gray-600">Chairperson</p>
                      <p className="font-medium">{subDept.chairperson}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">Leader</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border-2 rounded-lg hover:shadow-md transition-all" style={{ borderColor: `${subDept.color}40` }}>
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="text-white" style={{ backgroundColor: subDept.color }}>
                        {subDept.viceChairperson.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-gray-600">Vice Chair</p>
                      <p className="font-medium">{subDept.viceChairperson}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">Leader</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border-2 rounded-lg hover:shadow-md transition-all" style={{ borderColor: `${subDept.color}40` }}>
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="text-white" style={{ backgroundColor: subDept.color }}>
                        {subDept.secretary.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-gray-600">Secretary</p>
                      <p className="font-medium">{subDept.secretary}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">Leader</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2" style={{ borderColor: subDept.color }}>
                    <CalendarPlus className="w-4 h-4" />
                    Create Program
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Send className="w-4 h-4" />
                    Send Announcement
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators for your sub-department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.label}</span>
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold">{metric.value}%</span>
                      <span className="text-xs text-gray-500">Target: {metric.target}%</span>
                    </div>
                    <Progress value={metric.value} className="h-2" style={{ 
                      backgroundColor: '#e5e7eb',
                    }} />
                    <p className="text-xs text-gray-500">
                      {metric.value >= metric.target ? 'Above target' : 'Below target'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>Weekly programs and attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar key="programs-bar" dataKey="programs" fill={subDept.color} radius={[8, 8, 0, 0]} />
                    <Bar key="attendance-bar" dataKey="attendance" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Engagement</CardTitle>
                <CardDescription>Distribution by activity level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={memberEngagement}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {memberEngagement.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and events</CardDescription>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color} bg-opacity-10`}>
                          <Icon className={`w-5 h-5 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">8</p>
                  </div>
                  <Clock className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
                  </div>
                  <Activity className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks requiring attention</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button size="sm" style={{ backgroundColor: subDept.color }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {task.dueDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {task.assignee}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Reassign</DropdownMenuItem>
                        <DropdownMenuItem>Mark Complete</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sub-Department Members</CardTitle>
                  <CardDescription>All members in {subDept.name}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button size="sm" style={{ backgroundColor: subDept.color }}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-4 border-2 rounded-lg hover:shadow-lg transition-all group" style={{ borderColor: `${subDept.color}20` }}>
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="text-white" style={{ backgroundColor: subDept.color }}>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-sm text-gray-600">Year {member.yearOfStudy}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                        <Badge variant="outline" className="text-xs">{member.families.length} families</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>5-week attendance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line key="attendance-line" type="monotone" dataKey="attendance" stroke={subDept.color} strokeWidth={3} dot={{ r: 6 }} />
                  <Line key="engagement-line" type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Members with highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.slice(0, 5).map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm" style={{ 
                        backgroundColor: index < 3 ? subDept.color : '#e5e7eb',
                        color: index < 3 ? 'white' : '#6b7280'
                      }}>
                        {index + 1}
                      </div>
                      <Avatar>
                        <AvatarFallback style={{ backgroundColor: `${subDept.color}40` }}>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">Engagement: {95 - index * 3}%</p>
                      </div>
                      {index < 3 && <Award className="w-5 h-5" style={{ color: subDept.color }} />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Statistics</CardTitle>
                <CardDescription>Last 30 days overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Saturday Programs</span>
                      <span className="text-sm font-bold">12/13</span>
                    </div>
                    <Progress value={92} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">92% completion rate</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Sunday Programs</span>
                      <span className="text-sm font-bold">13/13</span>
                    </div>
                    <Progress value={100} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">100% completion rate</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Special Events</span>
                      <span className="text-sm font-bold">3/4</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">75% completion rate</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Member Activities</span>
                      <span className="text-sm font-bold">8/10</span>
                    </div>
                    <Progress value={80} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">80% completion rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
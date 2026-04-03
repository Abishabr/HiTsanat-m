import { BarChart3, Download, Filter, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { useDataStore } from '../context/DataStore';
import { useSchedule } from '../context/ScheduleStore';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { members, children } = useDataStore();
  const { attendance, slots } = useSchedule();

  // Attendance trends: group attendance records by week
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

  // Performance data: children count per kutr level
  const performanceData = [1, 2, 3].map(level => ({
    kutr: `Kutr ${level}`,
    average: children.filter(c => c.kutrLevel === level).length,
  }));

  // Sub-dept activity: member count and program slots per sub-department
  const subDeptActivity = subDepartments.map(sd => ({
    name: getSubDeptDisplayName(sd.name),
    programs: slots.filter(s => s.subDepartmentId === sd.id).length,
    members: members.filter(m => m.subDepartments.includes(sd.name)).length,
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and data visualizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Data</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{members.length}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Children</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{children.length}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Program Slots</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{slots.length}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Records</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{attendance.length}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Weekly attendance rates</CardDescription>
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
            <CardTitle>Academic Performance</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Sub-Department Distribution</CardTitle>
            <CardDescription>Members across sub-departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subDeptActivity.map(a => ({ name: a.name, value: a.members }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subDeptActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Activity</CardTitle>
            <CardDescription>Program slots and members by sub-department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subDeptActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="programs" fill="#3b82f6" name="Programs" />
                <Bar dataKey="members" fill="#10b981" name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download reports in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span>Export as PDF</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span>Export as Excel</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span>Export as CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

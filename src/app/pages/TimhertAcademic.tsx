import { useState } from 'react';
import { GraduationCap, Plus, FileText, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { mockTimhertActivities, mockChildren } from '../data/mockData';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TimhertAcademic() {
  const [activities] = useState(mockTimhertActivities);
  const [selectedKutr, setSelectedKutr] = useState<'all' | '1' | '2' | '3'>('all');

  const filteredActivities = activities.filter(a => 
    selectedKutr === 'all' || a.kutrLevel.toString() === selectedKutr
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Midterm': return 'bg-blue-100 text-blue-700';
      case 'Final': return 'bg-purple-100 text-purple-700';
      case 'Assignment': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
  };

  // Mock performance data
  const performanceTrend = [
    { month: 'Jan', kutr1: 75, kutr2: 78, kutr3: 82 },
    { month: 'Feb', kutr1: 78, kutr2: 80, kutr3: 84 },
    { month: 'Mar', kutr1: 80, kutr2: 82, kutr3: 85 },
    { month: 'Apr', kutr1: 82, kutr2: 84, kutr3: 87 },
  ];

  const topPerformers = [
    { name: 'Abigail Tekle', kutr: 1, average: 95 },
    { name: 'Caleb Mekonnen', kutr: 3, average: 93 },
    { name: 'Bemnet Hailu', kutr: 2, average: 92 },
    { name: 'Feven Abraham', kutr: 3, average: 90 },
    { name: 'Elias Gebru', kutr: 2, average: 89 },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timhert Academic Module</h1>
          <p className="text-gray-600 mt-1">
            Manage exams, assignments, and track children's academic performance
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Academic Activity</DialogTitle>
              <DialogDescription>
                Set up a new exam, test, or assignment for children
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activityName">Activity Name</Label>
                <Input id="activityName" placeholder="e.g., Midterm Exam - January" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activityType">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Midterm">Midterm</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                      <SelectItem value="Assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kutrLevel">Kutr Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Kutr 1</SelectItem>
                      <SelectItem value="2">Kutr 2</SelectItem>
                      <SelectItem value="3">Kutr 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxScore">Maximum Score</Label>
                  <Input id="maxScore" type="number" placeholder="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activityDate">Date</Label>
                  <Input id="activityDate" type="date" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Create Activity</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activities.length}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {activities.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <Award className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Performance</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">82%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Participating</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {mockChildren.length}
                </p>
              </div>
              <GraduationCap className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Average scores by Kutr level over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line key="kutr1" type="monotone" dataKey="kutr1" stroke="#3b82f6" name="Kutr 1" />
                <Line key="kutr2" type="monotone" dataKey="kutr2" stroke="#8b5cf6" name="Kutr 2" />
                <Line key="kutr3" type="monotone" dataKey="kutr3" stroke="#10b981" name="Kutr 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Highest average scores across all activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((student, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-600">Kutr {student.kutr}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{student.average}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities tabs */}
      <Tabs value={selectedKutr} onValueChange={(v) => setSelectedKutr(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="1">Kutr 1</TabsTrigger>
          <TabsTrigger value="2">Kutr 2</TabsTrigger>
          <TabsTrigger value="3">Kutr 3</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedKutr} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Activities</CardTitle>
              <CardDescription>
                {selectedKutr === 'all' ? 'All activities' : `Activities for Kutr ${selectedKutr}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Kutr Level</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeColor(activity.type)}>
                          {activity.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Kutr {activity.kutrLevel}</Badge>
                      </TableCell>
                      <TableCell>{activity.maxScore}</TableCell>
                      <TableCell>
                        {new Date(activity.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(activity.status)}>
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          {activity.status === 'completed' ? 'View Scores' : 'Enter Scores'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
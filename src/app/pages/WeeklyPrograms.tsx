import { useState } from 'react';
import { Calendar, Plus, Clock, Users, CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
import { Textarea } from '../components/ui/textarea';
import { mockWeeklyPrograms, subDepartments, mockMembers, mockChildren } from '../data/mockData';

export default function WeeklyPrograms() {
  const [programs] = useState(mockWeeklyPrograms);
  const [selectedDay, setSelectedDay] = useState<'all' | 'Saturday' | 'Sunday'>('all');

  const filteredPrograms = programs.filter(p => 
    selectedDay === 'all' || p.day === selectedDay
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'ongoing': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return Clock;
      case 'ongoing': return PlayCircle;
      case 'completed': return CheckCircle2;
      default: return Clock;
    }
  };

  const groupProgramsByDate = () => {
    const grouped = filteredPrograms.reduce((acc, program) => {
      if (!acc[program.date]) {
        acc[program.date] = [];
      }
      acc[program.date].push(program);
      return acc;
    }, {} as Record<string, typeof programs>);

    return Object.entries(grouped).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Programs</h1>
          <p className="text-gray-600 mt-1">
            Manage Saturday and Sunday program schedules
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Program</DialogTitle>
              <DialogDescription>
                Create a new weekly program for children activities
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                      <SelectItem value="Sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdept">Sub-Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-department" />
                  </SelectTrigger>
                  <SelectContent>
                    {subDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Program Type</Label>
                <Input id="type" placeholder="e.g., Lesson, Practice, Activity" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the program activities" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Schedule Program</Button>
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
                <p className="text-sm text-gray-600">Total Programs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{programs.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {programs.filter(p => p.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ongoing</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {programs.filter(p => p.status === 'ongoing').length}
                </p>
              </div>
              <PlayCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">
                  {programs.filter(p => p.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day tabs */}
      <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All Days</TabsTrigger>
          <TabsTrigger value="Saturday">Saturday</TabsTrigger>
          <TabsTrigger value="Sunday">Sunday</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedDay} className="space-y-6 mt-6">
          {groupProgramsByDate().map(([date, datePrograms]) => (
            <Card key={date}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {datePrograms.length} programs scheduled
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {datePrograms.map((program) => {
                  const subDept = subDepartments.find(sd => sd.id === program.subDepartmentId);
                  const StatusIcon = getStatusIcon(program.status);
                  
                  return (
                    <div 
                      key={program.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${subDept?.color}20` }}
                            >
                              <StatusIcon className="w-5 h-5" style={{ color: subDept?.color }} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{program.description}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  style={{ borderColor: subDept?.color, color: subDept?.color }}
                                >
                                  {subDept?.name}
                                </Badge>
                                <Badge variant="outline">{program.type}</Badge>
                                <Badge className={getStatusColor(program.status)}>
                                  {program.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Assigned Members</p>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {program.assignedMembers.length} members
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Children Group</p>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {program.childrenGroup.length} children
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">View Details</Button>
                          <Button size="sm">Edit</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {filteredPrograms.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No programs found</h3>
                <p className="text-gray-600 mb-4">
                  There are no programs scheduled for {selectedDay === 'all' ? 'this period' : selectedDay}
                </p>
                <Button>Schedule New Program</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
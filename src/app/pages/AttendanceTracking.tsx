import { useState } from 'react';
import { ClipboardCheck, Calendar, Users, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { mockAttendance, mockChildren, mockMembers } from '../data/mockData';

export default function AttendanceTracking() {
  const [attendance] = useState(mockAttendance);
  const [filterType, setFilterType] = useState<'all' | 'child' | 'member'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredAttendance = attendance.filter(record => {
    const matchesType = filterType === 'all' || record.entityType === filterType;
    const matchesDate = !dateFilter || record.date === dateFilter;
    return matchesType && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'excused': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'absent': return XCircle;
      case 'excused': return AlertCircle;
      default: return ClipboardCheck;
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const attendanceRate = Math.round((presentCount / attendance.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-600 mt-1">
            Mark and track attendance for children and members
          </p>
        </div>
        <Button className="gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Mark Attendance
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{attendance.length}</p>
              </div>
              <ClipboardCheck className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{presentCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{absentCount}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{attendanceRate}%</p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="child">Children</SelectItem>
                  <SelectItem value="member">Members</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((record) => {
                const StatusIcon = getStatusIcon(record.status);
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className={
                            record.entityType === 'child' 
                              ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                              : 'bg-gradient-to-br from-purple-400 to-pink-500 text-white'
                          }>
                            {record.entityName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{record.entityName}</p>
                          <p className="text-sm text-gray-500">ID: {record.entityId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.entityType === 'child' ? 'Child' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {record.programId ? 'Weekly Program' : 'Event'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4" />
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {record.markedBy}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

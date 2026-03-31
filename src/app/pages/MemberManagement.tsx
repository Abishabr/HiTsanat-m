import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Mail, Edit, Trash2, Eye, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { mockMembers, subDepartments } from '../data/mockData';

export default function MemberManagement() {
  const [members] = useState(mockMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubDept, setFilterSubDept] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<typeof mockMembers[0] | null>(null);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubDept = filterSubDept === 'all' || member.subDepartments.includes(filterSubDept);
    return matchesSearch && matchesSubDept;
  });

  const getYearColor = (year: number) => {
    const colors = {
      1: 'bg-blue-100 text-blue-700',
      2: 'bg-purple-100 text-purple-700',
      3: 'bg-green-100 text-green-700',
      4: 'bg-orange-100 text-orange-700',
      5: 'bg-red-100 text-red-700',
    };
    return colors[year as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-600 mt-1">
            Manage university student members and their assignments
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Member</DialogTitle>
              <DialogDescription>
                Add a new university student member to the system
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">Full Name</Label>
                <Input id="memberName" placeholder="Enter member's name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" placeholder="e.g., STU001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year of Study</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+251 911 123456" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="member@email.com" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Sub-Departments</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {subDepartments.map(dept => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox id={dept.id} />
                      <label htmlFor={dept.id} className="text-sm cursor-pointer">
                        {dept.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Register Member</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Members</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{members.length}</p>
          </CardContent>
        </Card>
        {[1, 2, 3, 4, 5].map(year => (
          <Card key={year}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {members.filter(m => m.yearOfStudy === year).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Members</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterSubDept} onValueChange={setFilterSubDept}>
                <SelectTrigger className="w-52">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Departments</SelectItem>
                  {subDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Sub-Departments</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Families</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.studentId}</TableCell>
                  <TableCell>
                    <Badge className={getYearColor(member.yearOfStudy)}>
                      Year {member.yearOfStudy}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.subDepartments.map(sd => {
                        const dept = subDepartments.find(d => d.name === sd);
                        return (
                          <Badge 
                            key={sd} 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: dept?.color, color: dept?.color }}
                          >
                            {sd}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-3 h-3" />
                      {member.families.length} families
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member details dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-2xl">
                    {selectedMember.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                  <p className="text-gray-600">{selectedMember.studentId}</p>
                  <Badge className={`mt-2 ${getYearColor(selectedMember.yearOfStudy)}`}>
                    Year {selectedMember.yearOfStudy}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Email</Label>
                  <p className="font-medium mt-1">{selectedMember.email}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Phone</Label>
                  <p className="font-medium mt-1">{selectedMember.phone}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Join Date</Label>
                  <p className="font-medium mt-1">
                    {new Date(selectedMember.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Assigned Families</Label>
                  <p className="font-medium mt-1">{selectedMember.families.length} families</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-600">Sub-Departments</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMember.subDepartments.map(sd => {
                    const dept = subDepartments.find(d => d.name === sd);
                    return (
                      <Badge 
                        key={sd}
                        style={{ backgroundColor: `${dept?.color}20`, color: dept?.color }}
                      >
                        {sd}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedMember(null)}>
                  Close
                </Button>
                <Button>Edit Details</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

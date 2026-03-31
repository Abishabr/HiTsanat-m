import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Phone, Mail, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import { mockChildren } from '../data/mockData';

export default function ChildrenManagement() {
  const [children] = useState(mockChildren);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKutr, setFilterKutr] = useState<string>('all');
  const [selectedChild, setSelectedChild] = useState<typeof mockChildren[0] | null>(null);

  const filteredChildren = children.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         child.familyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKutr = filterKutr === 'all' || child.kutrLevel.toString() === filterKutr;
    return matchesSearch && matchesKutr;
  });

  const getKutrBadgeColor = (level: number) => {
    const colors = {
      1: 'bg-blue-100 text-blue-700',
      2: 'bg-purple-100 text-purple-700',
      3: 'bg-green-100 text-green-700',
    };
    return colors[level as keyof typeof colors];
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Children Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all children in the program
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Child</DialogTitle>
              <DialogDescription>
                Add a new child to the Hitsanat KFL program
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="childName">Full Name</Label>
                <Input id="childName" placeholder="Enter child's name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" placeholder="Enter age" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kutr">Kutr Level</Label>
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
              <div className="space-y-2">
                <Label htmlFor="family">Family</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="f1">Tekle Family</SelectItem>
                    <SelectItem value="f2">Hailu Family</SelectItem>
                    <SelectItem value="f3">Mekonnen Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="guardian">Guardian Contact</Label>
                <Input id="guardian" placeholder="Phone number" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Register Child</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Children</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{children.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Kutr Level 1</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {children.filter(c => c.kutrLevel === 1).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Kutr Level 2</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {children.filter(c => c.kutrLevel === 2).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Kutr Level 3</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {children.filter(c => c.kutrLevel === 3).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Children</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search children..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterKutr} onValueChange={setFilterKutr}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kutrs</SelectItem>
                  <SelectItem value="1">Kutr 1</SelectItem>
                  <SelectItem value="2">Kutr 2</SelectItem>
                  <SelectItem value="3">Kutr 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Kutr Level</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Guardian Contact</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChildren.map((child) => (
                <TableRow key={child.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                          {child.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-gray-500">ID: {child.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{child.age} years</TableCell>
                  <TableCell>
                    <Badge className={getKutrBadgeColor(child.kutrLevel)}>
                      Kutr {child.kutrLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{child.familyName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />
                      {child.guardianContact}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(child.registrationDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedChild(child)}>
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

      {/* Child details dialog */}
      <Dialog open={!!selectedChild} onOpenChange={() => setSelectedChild(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Child Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedChild?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedChild && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl">
                    {selectedChild.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedChild.name}</h3>
                  <p className="text-gray-600">{selectedChild.age} years old</p>
                  <Badge className={`mt-2 ${getKutrBadgeColor(selectedChild.kutrLevel)}`}>
                    Kutr {selectedChild.kutrLevel}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Family</Label>
                  <p className="font-medium mt-1">{selectedChild.familyName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Guardian Contact</Label>
                  <p className="font-medium mt-1">{selectedChild.guardianContact}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Registration Date</Label>
                  <p className="font-medium mt-1">
                    {new Date(selectedChild.registrationDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Child ID</Label>
                  <p className="font-medium mt-1">{selectedChild.id}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedChild(null)}>
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

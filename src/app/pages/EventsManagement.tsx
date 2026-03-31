import { useState } from 'react';
import { PartyPopper, Plus, Calendar, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { mockChildEvents } from '../data/mockData';

export default function EventsManagement() {
  const [events] = useState(mockChildEvents);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-700';
      case 'ongoing': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Timker': 'from-blue-500 to-cyan-500',
      'Hosana': 'from-green-500 to-emerald-500',
      'Meskel': 'from-orange-500 to-yellow-500',
      'Other': 'from-purple-500 to-pink-500',
    };
    return colors[type] || colors['Other'];
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 mt-1">
            Special children events like Timker, Hosana, and Meskel celebrations
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Schedule a special event for children
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input id="eventName" placeholder="e.g., Timker Celebration" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Timker">Timker</SelectItem>
                      <SelectItem value="Hosana">Hosana</SelectItem>
                      <SelectItem value="Meskel">Meskel</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Date</Label>
                  <Input id="eventDate" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea id="eventDescription" placeholder="Describe the event" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Create Event</Button>
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
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{events.length}</p>
              </div>
              <PartyPopper className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {events.filter(e => e.status === 'upcoming').length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {events.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Participants</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {events.reduce((sum, e) => sum + e.participants, 0)}
                </p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-32 bg-gradient-to-br ${getTypeColor(event.type)} relative`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <PartyPopper className="w-16 h-16 text-white opacity-50" />
              </div>
              <div className="absolute top-4 right-4">
                <Badge className={getStatusColor(event.status)}>
                  {event.status}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                  <Badge variant="outline">{event.type}</Badge>
                </div>
                <p className="text-gray-600 text-sm">{event.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <span className="font-medium">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Participants</span>
                  </div>
                  <span className="font-medium">{event.participants} children</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Supervisors</span>
                  </div>
                  <span className="font-medium">{event.supervisors.length} members</span>
                </div>
              </div>

              {event.status === 'completed' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">View Details</Button>
                <Button className="flex-1">Manage</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <PartyPopper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first special event for children
            </p>
            <Button>Create Event</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

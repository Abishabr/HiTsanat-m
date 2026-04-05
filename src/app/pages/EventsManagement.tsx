import { useState, useEffect } from 'react';
import { PartyPopper, Plus, Calendar, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
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
import { type ChildEvent } from '../data/mockData';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// DB row shape returned by Supabase
interface ChildEventRow {
  id: string;
  name: string;
  type: 'Timker' | 'Hosana' | 'Meskel' | 'Other';
  date: string;
  description: string;
  participants: number;
  supervisors: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  created_at?: string;
}

function rowToChildEvent(row: ChildEventRow): ChildEvent {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: row.date,
    description: row.description,
    participants: row.participants,
    supervisors: row.supervisors ?? [],
    status: row.status,
  };
}

interface UseChildEventsResult {
  data: ChildEvent[];
  isLoading: boolean;
  error: string | null;
  create: (event: Omit<ChildEvent, 'id'>) => Promise<void>;
}

function useChildEvents(): UseChildEventsResult {
  const [data, setData] = useState<ChildEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchEvents() {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: rows, error: fetchError } = await supabase
          .from('child_events')
          .select('*')
          .order('date', { ascending: true });

        if (cancelled) return;

        if (fetchError) {
          console.error('[supabase:fetch:child_events]', fetchError.message);
          setError(fetchError.message);
        } else {
          setData((rows as ChildEventRow[]).map(rowToChildEvent));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[supabase:fetch:child_events]', msg);
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  async function create(event: Omit<ChildEvent, 'id'>) {
    if (DEMO_MODE) {
      const newEvent: ChildEvent = { ...event, id: `ce${Date.now()}` };
      setData(prev => [...prev, newEvent]);
      return;
    }

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: rows, error: insertError } = await supabase
        .from('child_events')
        .insert([{
          name: event.name,
          type: event.type,
          date: event.date,
          description: event.description,
          participants: event.participants,
          supervisors: event.supervisors,
          status: event.status,
        }])
        .select();

      if (insertError) {
        console.error('[supabase:insert:child_events]', insertError.message);
        setError(insertError.message);
        return;
      }

      if (rows && rows.length > 0) {
        setData(prev => [...prev, rowToChildEvent(rows[0] as ChildEventRow)]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[supabase:insert:child_events]', msg);
      setError(msg);
    }
  }

  return { data, isLoading, error, create };
}

export default function EventsManagement() {
  const { data: events, isLoading, error, create } = useChildEvents();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<ChildEvent['type'] | ''>('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');

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

  async function handleCreateEvent() {
    if (!eventName || !eventType || !eventDate) return;
    await create({
      name: eventName,
      type: eventType as ChildEvent['type'],
      date: eventDate,
      description: eventDescription,
      participants: 0,
      supervisors: [],
      status: 'upcoming',
    });
    setEventName('');
    setEventType('');
    setEventDate('');
    setEventDescription('');
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Inline error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 mt-1">
            Special children events like Timker, Hosana, and Meskel celebrations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Input
                  id="eventName"
                  placeholder="e.g., Timker Celebration"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventType} onValueChange={v => setEventType(v as ChildEvent['type'])}>
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
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="Describe the event"
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateEvent} disabled={!eventName || !eventType || !eventDate}>
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Loading events...</p>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      {!isLoading && (
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
      )}

      {/* Events grid */}
      {!isLoading && (
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
      )}

      {!isLoading && events.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <PartyPopper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first special event for children
            </p>
            <Button onClick={() => setDialogOpen(true)}>Create Event</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

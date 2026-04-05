import { useState, useEffect } from 'react';
import { Briefcase, Plus, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { subDepartments, type MemberActivity } from '../data/mockData';
import { supabase } from '../../lib/supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function useMemberActivities() {
  const [data, setData] = useState<MemberActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      setData([]);
      setIsLoading(false);
      return;
    }

    async function fetchActivities() {
      setIsLoading(true);
      setError(null);
      const { data: rows, error: fetchError } = await supabase
        .from('member_activities')
        .select('*');

      if (fetchError) {
        console.error('[supabase:fetch:member_activities]', fetchError.message);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      const mapped: MemberActivity[] = (rows ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        subDepartmentId: row.sub_department_id as string,
        date: row.date as string,
        description: row.description as string,
        assignedMembers: (row.assigned_members as { memberId: string; role: string }[]) ?? [],
        status: row.status as MemberActivity['status'],
      }));

      setData(mapped);
      setIsLoading(false);
    }

    fetchActivities();
  }, []);

  async function create(activity: Omit<MemberActivity, 'id'>) {
    if (DEMO_MODE) {
      const newActivity: MemberActivity = { ...activity, id: `ma${Date.now()}` };
      setData(prev => [...prev, newActivity]);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('member_activities')
      .insert({
        name: activity.name,
        sub_department_id: activity.subDepartmentId,
        date: activity.date,
        description: activity.description,
        assigned_members: activity.assignedMembers,
        status: activity.status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[supabase:insert:member_activities]', insertError.message);
      setError(insertError.message);
      return;
    }

    const newActivity: MemberActivity = {
      id: (inserted as Record<string, unknown>).id as string,
      name: (inserted as Record<string, unknown>).name as string,
      subDepartmentId: (inserted as Record<string, unknown>).sub_department_id as string,
      date: (inserted as Record<string, unknown>).date as string,
      description: (inserted as Record<string, unknown>).description as string,
      assignedMembers: ((inserted as Record<string, unknown>).assigned_members as { memberId: string; role: string }[]) ?? [],
      status: (inserted as Record<string, unknown>).status as MemberActivity['status'],
    };

    setData(prev => [...prev, newActivity]);
  }

  return { data, isLoading, error, create };
}

export default function MemberActivities() {
  const { data: activities, isLoading, error, create } = useMemberActivities();

  function handleCreateActivity() {
    create({
      name: 'New Activity',
      subDepartmentId: 'sd1',
      date: new Date().toISOString().split('T')[0],
      description: 'New activity description',
      assignedMembers: [],
      status: 'planned',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Activities</h1>
          <p className="text-gray-600 mt-1">
            Track Adar programs and sub-department projects
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateActivity}>
          <Plus className="w-4 h-4" />
          Create Activity
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activities.length}</p>
              </div>
              <Briefcase className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {activities.filter(a => a.status !== 'completed').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Participating</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">45</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading activities...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activities.map((activity) => {
            const subDept = subDepartments.find(sd => sd.id === activity.subDepartmentId);
            return (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${subDept?.color}20` }}
                        >
                          <Briefcase className="w-6 h-6" style={{ color: subDept?.color }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{activity.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              style={{ borderColor: subDept?.color, color: subDept?.color }}
                            >
                              {subDept?.name}
                            </Badge>
                            <Badge className={
                              activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                              activity.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }>
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{activity.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium">{new Date(activity.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Assigned Members</p>
                          <p className="font-medium">{activity.assignedMembers.length} members</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">View Details</Button>
                      <Button>Manage</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

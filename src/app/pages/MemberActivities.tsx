import { Briefcase, Plus, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { mockMemberActivities, subDepartments } from '../data/mockData';

export default function MemberActivities() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Activities</h1>
          <p className="text-gray-600 mt-1">
            Track Adar programs and sub-department projects
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{mockMemberActivities.length}</p>
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
                  {mockMemberActivities.filter(a => a.status !== 'completed').length}
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

      <div className="grid grid-cols-1 gap-6">
        {mockMemberActivities.map((activity) => {
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
    </div>
  );
}

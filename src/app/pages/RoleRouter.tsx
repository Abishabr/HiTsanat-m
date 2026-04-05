import { useAuth } from '../context/AuthContext';
import { getDashboardType } from '../lib/permissions';
import ChairpersonDashboard from './ChairpersonDashboard';
import SubDepartmentDashboard from './SubDepartmentDashboard';
import AttendanceTracking from './AttendanceTracking';
import TimhertAcademic from './TimhertAcademic';
import MezmurDashboard from './MezmurDashboard';
import { UserRole } from '../data/mockData';

function NoSubDeptMessage() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-gray-600 text-lg">
        Sub-department not assigned. Please contact your administrator.
      </p>
    </div>
  );
}

function MemberDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your assigned programs and activities</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-2">Weekly Programs</h2>
          <p className="text-muted-foreground text-sm">View your assigned supervision slots for this week.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-2">Member Activities</h2>
          <p className="text-muted-foreground text-sm">Track your participation in sub-department activities.</p>
        </div>
      </div>
    </div>
  );
}

function ViewerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports Overview</h1>
        <p className="text-muted-foreground mt-1">Read-only access to department reports and dashboards.</p>
      </div>
    </div>
  );
}

export default function RoleRouter(): JSX.Element {
  const { user } = useAuth();
  const role = (user?.role ?? 'member') as UserRole;
  const subDepartment = user?.subDepartment;

  const dashType = getDashboardType(role);

  switch (dashType) {
    case 'chairperson':
      return <ChairpersonDashboard />;

    case 'subdept':
      if (!subDepartment?.trim()) return <NoSubDeptMessage />;
      if (subDepartment === 'Timhert') return <TimhertAcademic />;
      if (subDepartment === 'Mezmur') return <MezmurDashboard />;
      return <SubDepartmentDashboard subDepartmentName={subDepartment} />;

    case 'teacher':
      // Teachers go straight to Timhert academic module
      return <TimhertAcademic />;

    case 'kuttr':
      // Kuttr members go straight to attendance tracking
      return <AttendanceTracking />;

    case 'viewer':
      return <ViewerDashboard />;

    case 'member':
    default:
      return <MemberDashboard />;
  }
}

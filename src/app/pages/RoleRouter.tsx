import { currentUser } from '../data/mockData';
import ChairpersonDashboard from './ChairpersonDashboard';
import SubDepartmentDashboard from './SubDepartmentDashboard';

export default function RoleRouter(): JSX.Element {
  const { role, subDepartment } = currentUser;

  if (role === 'subdept-leader') {
    if (subDepartment && subDepartment.trim() !== '') {
      return <SubDepartmentDashboard subDepartmentName={subDepartment} />;
    }
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600 text-lg">
          Sub-department not assigned. Please contact your administrator.
        </p>
      </div>
    );
  }

  // chairperson | vice-chairperson | secretary | unknown role → ChairpersonDashboard
  return <ChairpersonDashboard />;
}

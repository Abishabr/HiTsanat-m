import { useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleStore';
import { getSubDeptDisplayName } from '../data/mockData';
import TimhertAcademic from './TimhertAcademic';
import MezmurDashboard from './MezmurDashboard';
import KuttrDashboard from './KuttrDashboard';
import KinetibebDashboard from './KinetibebDashboard';
import ComingSoon from '../components/ComingSoon';

interface SubDepartmentDashboardProps {
  subDepartmentName?: string;
}

export default function SubDepartmentDashboard({ subDepartmentName }: SubDepartmentDashboardProps = {}) {
  const { id } = useParams();
  const { user } = useAuth();
  const { subDepts } = useSchedule();

  // Resolve sub-dept name:
  // 1. Explicit prop (e.g. from RoleRouter)
  // 2. Match by UUID from live subDepts (production)
  // 3. Match by short ID from mockData (demo mode)
  // 4. Fall back to current user's subDepartment
  let resolvedName: string | undefined = subDepartmentName;

  if (!resolvedName && id) {
    const liveMatch = subDepts.find(sd => sd.id === id);
    resolvedName = liveMatch?.name;
  }

  if (!resolvedName) {
    resolvedName = user?.subDepartment;
  }

  if (!resolvedName) {
    return <ComingSoon title="Sub-Department Not Found" description="This sub-department does not exist or has not been configured." />;
  }

  const displayName = getSubDeptDisplayName(resolvedName);

  switch (resolvedName) {
    case 'Timhert':    return <TimhertAcademic />;
    case 'Mezmur':     return <MezmurDashboard />;
    case 'Kuttr':      return <KuttrDashboard />;
    case 'Kinetibeb':  return <KinetibebDashboard />;
    default:
      return (
        <ComingSoon
          title={`${displayName} Dashboard`}
          description={`${displayName} — dashboard coming soon.`}
        />
      );
  }
}

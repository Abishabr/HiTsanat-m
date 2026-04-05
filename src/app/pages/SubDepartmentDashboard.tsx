import { useParams } from 'react-router';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
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

  const subDept = subDepartmentName
    ? subDepartments.find(sd => sd.name === subDepartmentName)
    : subDepartments.find(sd => sd.id === id);

  if (!subDept) {
    return <ComingSoon title="Sub-Department Not Found" description="This sub-department does not exist or has not been configured." />;
  }

  switch (subDept.name) {
    case 'Timhert':    return <TimhertAcademic />;
    case 'Mezmur':     return <MezmurDashboard />;
    case 'Kuttr':      return <KuttrDashboard />;
    case 'Kinetibeb':  return <KinetibebDashboard />;
    default:
      return (
        <ComingSoon
          title={`${getSubDeptDisplayName(subDept.name)} Dashboard`}
          description={`${subDept.description} — dashboard coming soon.`}
        />
      );
  }
}

import { useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getSubDeptDisplayName } from '../lib/subDeptUtils';
import TimhertAcademic from './TimhertAcademic';
import MezmurDashboard from './MezmurDashboard';
import KuttrDashboard from './KuttrDashboard';
import KinetibebDashboard from './KinetibebDashboard';
import ComingSoon from '../components/ComingSoon';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SubDepartmentDashboardProps {
  subDepartmentName?: string;
}

export default function SubDepartmentDashboard({ subDepartmentName }: SubDepartmentDashboardProps = {}) {
  const { id } = useParams();
  const { user } = useAuth();
  const [resolvedName, setResolvedName] = useState<string | undefined>(subDepartmentName ?? user?.subDepartment);

  useEffect(() => {
    if (resolvedName || !id) return;
    supabase.from('sub_departments').select('name').eq('id', id).single()
      .then(({ data }) => { if (data) setResolvedName(data.name); });
  }, [id, resolvedName]);

  if (!resolvedName) {
    return <ComingSoon title="Sub-Department Not Found" description="This sub-department does not exist or has not been configured." />;
  }

  switch (resolvedName) {
    case 'Timhert':    return <TimhertAcademic />;
    case 'Mezmur':     return <MezmurDashboard />;
    case 'Kuttr':      return <KuttrDashboard />;
    case 'Kinetibeb':  return <KinetibebDashboard />;
    default:
      return (
        <ComingSoon
          title={`${getSubDeptDisplayName(resolvedName)} Dashboard`}
          description={`${getSubDeptDisplayName(resolvedName)} — dashboard coming soon.`}
        />
      );
  }
}

import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useMembers, MemberWithRoles, MemberRole } from '../hooks/useMembers';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface RoleAssignmentDialogProps {
  memberId: string | null;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChanged?: () => void;
}

interface SubDepartment {
  sub_department_id: string;
  name: string;
}

interface LeadershipRole {
  id: string;
  name: string;
  hierarchy_level: number;
}

export function RoleAssignmentDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
  onRoleChanged,
}: RoleAssignmentDialogProps) {
  const { user } = useAuth();
  const { getMemberWithRoles, assignRole, removeRole, toggleRoleStatus, isLoading } = useMembers();
  
  const [member, setMember] = useState<MemberWithRoles | null>(null);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipRole[]>([]);
  const [selectedSubDept, setSelectedSubDept] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);

  const isDepartmentLeader = user?.role === 'chairperson' || user?.role === 'vice-chairperson' || user?.role === 'secretary';

  // Load member data and reference data
  useEffect(() => {
    if (!open || !memberId) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        // Load member with roles
        const memberData = await getMemberWithRoles(memberId);
        setMember(memberData);

        // Load sub-departments
        const { data: subDepts, error: subDeptsError } = await supabase
          .from('sub_departments')
          .select('sub_department_id, name')
          .order('name');

        if (subDeptsError) {
          console.error('[RoleAssignmentDialog:loadSubDepts]', subDeptsError);
          toast.error('Failed to load sub-departments');
        } else {
          // Filter out 'Department' for subdept leaders
          const filtered = isDepartmentLeader
            ? (subDepts ?? [])
            : (subDepts ?? []).filter(sd => sd.name !== 'Department');
          setSubDepartments(filtered);
        }

        // Load leadership roles
        const { data: roles, error: rolesError } = await supabase
          .from('leadership_roles')
          .select('id, name, hierarchy_level')
          .order('hierarchy_level');

        if (rolesError) {
          console.error('[RoleAssignmentDialog:loadRoles]', rolesError);
          toast.error('Failed to load leadership roles');
        } else {
          setLeadershipRoles(roles ?? []);
        }
      } catch (err) {
        console.error('[RoleAssignmentDialog:loadData]', err);
        toast.error('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [open, memberId, getMemberWithRoles, isDepartmentLeader]);

  const handleAssignRole = async () => {
    if (!memberId || !selectedSubDept || !selectedRole) {
      toast.error('Please select both sub-department and role');
      return;
    }

    // Check if this assignment already exists
    const existingAssignment = member?.roles.find(
      r => r.sub_department_id === selectedSubDept && r.role_id === selectedRole
    );

    if (existingAssignment) {
      toast.error('This role assignment already exists');
      return;
    }

    const success = await assignRole(memberId, selectedSubDept, selectedRole);
    if (success) {
      toast.success('Role assigned successfully');
      setSelectedSubDept('');
      setSelectedRole('');
      
      // Reload member data
      const updatedMember = await getMemberWithRoles(memberId);
      setMember(updatedMember);
      
      onRoleChanged?.();
    } else {
      toast.error('Failed to assign role. You may not have permission.');
    }
  };

  const handleRemoveRole = async (role: MemberRole) => {
    if (!role.id) {
      toast.error('Cannot remove role: missing assignment ID');
      return;
    }

    const success = await removeRole(role.id);
    if (success) {
      toast.success('Role removed successfully');
      
      // Reload member data
      if (memberId) {
        const updatedMember = await getMemberWithRoles(memberId);
        setMember(updatedMember);
      }
      
      onRoleChanged?.();
    } else {
      toast.error('Failed to remove role. You may not have permission.');
    }
  };

  const handleToggleStatus = async (role: MemberRole) => {
    if (!role.id) {
      toast.error('Cannot toggle status: missing assignment ID');
      return;
    }

    const newStatus = !role.is_active;
    const success = await toggleRoleStatus(role.id, newStatus);
    if (success) {
      toast.success(`Role ${newStatus ? 'activated' : 'deactivated'}`);
      
      // Reload member data
      if (memberId) {
        const updatedMember = await getMemberWithRoles(memberId);
        setMember(updatedMember);
      }
      
      onRoleChanged?.();
    } else {
      toast.error('Failed to update role status');
    }
  };

  const getRoleColor = (hierarchyLevel?: number): string => {
    if (!hierarchyLevel) return 'bg-gray-100 text-gray-700';
    if (hierarchyLevel === 1) return 'bg-purple-100 text-purple-700';
    if (hierarchyLevel === 2) return 'bg-blue-100 text-blue-700';
    if (hierarchyLevel === 3) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Roles - {memberName}
          </DialogTitle>
          <DialogDescription>
            Assign leadership roles and sub-department memberships
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading member data...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Roles */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Current Roles</h3>
              {member?.roles && member.roles.length > 0 ? (
                <div className="space-y-2">
                  {member.roles.map((role, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleColor(role.hierarchy_level)}>
                          {role.role_name}
                        </Badge>
                        <span className="text-sm text-foreground">
                          {role.sub_department_name}
                        </span>
                        {!role.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(role)}
                          disabled={isLoading}
                          title={role.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {role.is_active ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRole(role)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  No roles assigned yet
                </p>
              )}
            </div>

            {/* Assign New Role */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assign New Role</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sub-Department</Label>
                  <Select value={selectedSubDept} onValueChange={setSelectedSubDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-department" />
                    </SelectTrigger>
                    <SelectContent>
                      {subDepartments.map(sd => (
                        <SelectItem key={sd.sub_department_id} value={sd.sub_department_id}>
                          {sd.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leadership Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadershipRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleAssignRole}
                  disabled={!selectedSubDept || !selectedRole || isLoading}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Assign Role
                </Button>
              </div>
            </div>

            {!isDepartmentLeader && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>Note:</strong> As a sub-department leader, you can only assign roles within your own sub-department(s).
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

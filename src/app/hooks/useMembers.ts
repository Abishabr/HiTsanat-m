import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types matching the RPC function return structure ──────────────────────

export interface MemberRole {
  sub_department_id: string;
  sub_department_name: string;
  role_id: string;
  role_name: string;
  hierarchy_level?: number;
  is_active: boolean;
  id?: string;
}

export interface MemberSearchResult {
  member_id: string;  // maps to members.id in new schema
  full_name: string;
  baptismal_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  campus: string | null;
  university_department: string | null;
  building_name: string | null;
  dorm_name: string | null;
  university_year: string | null;
  phone: string | null;
  email: string | null;
  telegram_username: string | null;
  profile_photo_url: string | null;
  status: string | null;
  join_date: string | null;
  roles: MemberRole[];
}

export interface MemberWithRoles extends MemberSearchResult {
  auth_user_id: string | null;
}

export interface SearchFilters {
  searchTerm?: string;
  campus?: string;
  subDepartment?: string;
  year?: string;
  status?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useMembers() {
  const [members, setMembers] = useState<MemberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search members using the search_members RPC function.
   * All parameters are optional and default to NULL (no filter).
   */
  const searchMembers = useCallback(async (filters: SearchFilters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_members', {
        search_term: filters.searchTerm || null,
        campus_filter: filters.campus || null,
        sub_department_filter: filters.subDepartment || null,
        year_filter: filters.year || null,
        status_filter: filters.status || null,
      });

      if (rpcError) {
        console.error('[useMembers:searchMembers]', rpcError);
        setError(rpcError.message);
        setMembers([]);
        return [];
      }

      const results = (data ?? []) as MemberSearchResult[];
      setMembers(results);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:searchMembers]', message);
      setError(message);
      setMembers([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a single member with all their role assignments.
   */
  const getMemberWithRoles = useCallback(async (memberId: string): Promise<MemberWithRoles | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_member_with_roles', {
        p_member_id: memberId,
      });

      if (rpcError) {
        console.error('[useMembers:getMemberWithRoles]', rpcError);
        setError(rpcError.message);
        return null;
      }

      if (!data || data.length === 0) {
        setError('Member not found');
        return null;
      }

      return data[0] as MemberWithRoles;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:getMemberWithRoles]', message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a member (soft delete by setting status to 'inactive').
   * Uses RLS - only department leaders can delete.
   */
  const deleteMember = useCallback(async (memberId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('members')
        .update({ status: 'inactive' })
        .eq('id', memberId);

      if (updateError) {
        console.error('[useMembers:deleteMember]', updateError);
        setError(updateError.message);
        return false;
      }

      setMembers(prev => prev.filter(m => m.member_id !== memberId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:deleteMember]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a member's basic information.
   * Uses RLS - department leaders can update all, subdept leaders can update their members.
   */
  const updateMember = useCallback(async (
    memberId: string,
    updates: Partial<Omit<MemberSearchResult, 'member_id' | 'roles'>>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', memberId);

      if (updateError) {
        console.error('[useMembers:updateMember]', updateError);
        setError(updateError.message);
        return false;
      }

      // Update local state
      setMembers(prev => prev.map(m =>
        m.member_id === memberId ? { ...m, ...updates } : m
      ));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:updateMember]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Assign a role to a member in a sub-department.
   * Uses RLS - department leaders can assign any role, subdept leaders can assign in their sub-depts.
   */
  const assignRole = useCallback(async (
    memberId: string,
    subDepartmentId: string,
    roleId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('member_sub_departments')
        .insert({
          member_id: memberId,
          sub_department_id: subDepartmentId,
          role_id: roleId,
          is_active: true,
        });

      if (insertError) {
        console.error('[useMembers:assignRole]', insertError);
        setError(insertError.message);
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:assignRole]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a role assignment from a member.
   * Uses RLS - department leaders can remove any, subdept leaders can remove in their sub-depts.
   */
  const removeRole = useCallback(async (assignmentId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('member_sub_departments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) {
        console.error('[useMembers:removeRole]', deleteError);
        setError(deleteError.message);
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:removeRole]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle a role's active status.
   */
  const toggleRoleStatus = useCallback(async (
    assignmentId: string,
    isActive: boolean
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('member_sub_departments')
        .update({ is_active: isActive })
        .eq('id', assignmentId);

      if (updateError) {
        console.error('[useMembers:toggleRoleStatus]', updateError);
        setError(updateError.message);
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMembers:toggleRoleStatus]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    members,
    isLoading,
    error,
    searchMembers,
    getMemberWithRoles,
    deleteMember,
    updateMember,
    assignRole,
    removeRole,
    toggleRoleStatus,
  };
}

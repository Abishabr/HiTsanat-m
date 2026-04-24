import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type ActivityType = 'adar' | 'project' | 'training' | 'meeting' | 'community_service' | 'other';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  adar:             'አዳር Program',
  project:          'Sub-Dept Project',
  training:         'Training Session',
  meeting:          'Meeting',
  community_service:'Community Service',
  other:            'Other',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  adar:             'bg-purple-100 text-purple-700',
  project:          'bg-blue-100 text-blue-700',
  training:         'bg-green-100 text-green-700',
  meeting:          'bg-yellow-100 text-yellow-700',
  community_service:'bg-orange-100 text-orange-700',
  other:            'bg-gray-100 text-gray-700',
};

export interface MemberActivity {
  activity_id:         string;
  title:               string;
  activity_type:       ActivityType | null;
  activity_date:       string | null;
  start_time:          string | null;
  end_time:            string | null;
  location:            string | null;
  description:         string | null;
  status:              string;
  sub_department_id:   string | null;
  sub_department_name: string | null;
  max_participants:    number | null;
  assigned_count:      number;
  attended_count:      number;
  created_at:          string;
}

export interface ActivityParticipant {
  member_id:     string;
  full_name:     string;
  phone:         string | null;
  campus:        string | null;
  role:          string;
  status:        string;
  attended:      boolean;
  check_in_time: string | null;
  notes:         string | null;
  assigned_at:   string;
}

export interface MemberActivityHistoryRow {
  activity_id:         string;
  title:               string;
  activity_type:       ActivityType | null;
  activity_date:       string | null;
  sub_department_name: string | null;
  role:                string;
  status:              string;
  attended:            boolean;
  check_in_time:       string | null;
}

export interface NewActivityData {
  title:              string;
  activity_type:      ActivityType;
  activity_date?:     string;
  start_time?:        string;
  end_time?:          string;
  location?:          string;
  description?:       string;
  sub_department_id?: string;
  max_participants?:  number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useMemberActivities() {
  const [activities, setActivities]     = useState<MemberActivity[]>([]);
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // ── Activities ────────────────────────────────────────────────────────

  const getActivities = useCallback(async (filters: {
    activityType?:    ActivityType;
    subDepartmentId?: string;
    status?:          string;
    searchTerm?:      string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_member_activities', {
        p_activity_type:     filters.activityType     || null,
        p_sub_department_id: filters.subDepartmentId  || null,
        p_status:            filters.status           || null,
        p_search_term:       filters.searchTerm       || null,
      });
      if (rpcError) {
        // Fallback: direct query
        const { data: direct, error: directError } = await supabase
          .from('member_activities')
          .select('*, sub_departments(name)')
          .order('activity_date', { ascending: false });
        if (directError) { setError(directError.message); setActivities([]); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          activity_id:         r.id,
          title:               r.title,
          activity_type:       r.activity_type,
          activity_date:       r.activity_date,
          start_time:          r.start_time,
          end_time:            r.end_time,
          location:            r.location,
          description:         r.description,
          status:              r.status ?? 'scheduled',
          sub_department_id:   r.sub_department_id,
          sub_department_name: r.sub_departments?.name ?? r.sub_department ?? null,
          max_participants:    r.max_participants,
          assigned_count:      0,
          attended_count:      0,
          created_at:          r.created_at,
        }));
        setActivities(mapped);
        return mapped;
      }
      const results = (data ?? []) as MemberActivity[];
      setActivities(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActivities([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createActivity = useCallback(async (data: NewActivityData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: result, error: insertError } = await supabase
        .from('member_activities')
        .insert({
          title:              data.title,
          activity_type:      data.activity_type,
          activity_date:      data.activity_date      ?? null,
          start_time:         data.start_time         ?? null,
          end_time:           data.end_time           ?? null,
          location:           data.location           ?? null,
          description:        data.description        ?? null,
          sub_department_id:  data.sub_department_id  ?? null,
          max_participants:   data.max_participants   ?? null,
          status:             'scheduled',
        })
        .select('id')
        .single();
      if (insertError) { setError(insertError.message); return null; }
      return result.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateActivity = useCallback(async (
    activityId: string,
    updates: Partial<NewActivityData & { status: string }>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('member_activities')
        .update(updates)
        .eq('id', activityId);
      if (updateError) { setError(updateError.message); return false; }
      setActivities(prev => prev.map(a =>
        a.activity_id === activityId ? { ...a, ...updates } : a
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Participants ──────────────────────────────────────────────────────

  const getParticipants = useCallback(async (activityId: string): Promise<ActivityParticipant[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_activity_participants', {
        p_activity_id: activityId,
      });
      if (rpcError) {
        const { data: direct, error: directError } = await supabase
          .from('member_activity_assignments')
          .select('*, members(id, full_name, phone, campus)')
          .eq('activity_id', activityId);
        if (directError) { setError(directError.message); setParticipants([]); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          member_id:     r.member_id,
          full_name:     r.members?.full_name ?? '',
          phone:         r.members?.phone ?? null,
          campus:        r.members?.campus ?? null,
          role:          r.role ?? 'participant',
          status:        r.status ?? 'assigned',
          attended:      r.attended ?? false,
          check_in_time: r.check_in_time,
          notes:         r.notes,
          assigned_at:   r.created_at,
        }));
        setParticipants(mapped);
        return mapped;
      }
      const results = (data ?? []) as ActivityParticipant[];
      setParticipants(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setParticipants([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assignMember = useCallback(async (
    activityId: string,
    memberId:   string,
    role?:      string,
    notes?:     string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('assign_member_to_activity', {
        p_activity_id: activityId,
        p_member_id:   memberId,
        p_role:        role  || 'participant',
        p_notes:       notes || null,
      });
      if (rpcError) { console.error('[useMemberActivities:assignMember]', rpcError); return false; }
      return true;
    } catch (err) {
      console.error('[useMemberActivities:assignMember]', err);
      return false;
    }
  }, []);

  const markAttendance = useCallback(async (
    activityId: string,
    memberId:   string,
    attended:   boolean,
    notes?:     string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('mark_member_activity_attendance', {
        p_activity_id: activityId,
        p_member_id:   memberId,
        p_attended:    attended,
        p_notes:       notes || null,
      });
      if (rpcError) { console.error('[useMemberActivities:markAttendance]', rpcError); return false; }
      setParticipants(prev => prev.map(p =>
        p.member_id === memberId
          ? { ...p, attended, status: attended ? 'completed' : 'absent' }
          : p
      ));
      return true;
    } catch (err) {
      console.error('[useMemberActivities:markAttendance]', err);
      return false;
    }
  }, []);

  const markBulkAttendance = useCallback(async (
    activityId: string,
    records: Array<{ memberId: string; attended: boolean; notes?: string }>
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed  = 0;
    for (const r of records) {
      const ok = await markAttendance(activityId, r.memberId, r.attended, r.notes);
      if (ok) success++; else failed++;
    }
    return { success, failed };
  }, [markAttendance]);

  const getMemberHistory = useCallback(async (
    memberId:  string,
    fromDate?: string,
    toDate?:   string
  ): Promise<MemberActivityHistoryRow[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_member_activity_report', {
        p_member_id: memberId,
        p_from_date: fromDate || null,
        p_to_date:   toDate   || null,
      });
      if (rpcError) { console.error('[useMemberActivities:getMemberHistory]', rpcError); return []; }
      return (data ?? []) as MemberActivityHistoryRow[];
    } catch (err) {
      console.error('[useMemberActivities:getMemberHistory]', err);
      return [];
    }
  }, []);

  return {
    activities,
    participants,
    isLoading,
    error,
    getActivities,
    createActivity,
    updateActivity,
    getParticipants,
    assignMember,
    markAttendance,
    markBulkAttendance,
    getMemberHistory,
  };
}

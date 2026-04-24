import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProgramType {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
}

export interface SubDepartment {
  id: string;
  name: string;
}

export interface WeeklyProgram {
  program_id: string;
  title: string;
  description: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;
  max_capacity: number | null;
  sub_department_id: string | null;
  sub_department_name: string | null;
  program_type_id: string | null;
  program_type_name: string | null;
  program_type_icon: string | null;
  program_type_color: string | null;
  session_count: number;
  next_session_date: string | null;
  created_at: string;
}

export interface ProgramSession {
  session_id: string;
  program_id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  topic: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  total_children: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  late_count: number;
  assigned_members_count: number;
  attendance_marked: boolean;
}

export interface SessionAttendanceRecord {
  child_id: string;
  full_name: string;
  baptismal_name: string | null;
  gender: string | null;
  age: number | null;
  kutr_level_name: string | null;
  kutr_level_color: string | null;
  attendance_id: string | null;
  attendance_status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  recorded_by_name: string | null;
  notes: string | null;
}

export interface NewProgramData {
  title: string;
  description?: string;
  sub_department_id?: string;
  program_type_id?: string;
  day_of_week: 'Saturday' | 'Sunday';
  start_time?: string;
  end_time?: string;
  location?: string;
  target_kutr_levels?: string[];
  is_recurring?: boolean;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
  max_capacity?: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function usePrograms() {
  const [programs, setPrograms]   = useState<WeeklyProgram[]>([]);
  const [sessions, setSessions]   = useState<ProgramSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Reference data ───────────────────────────────────────────────────

  const getProgramTypes = useCallback(async (): Promise<ProgramType[]> => {
    const { data, error } = await supabase
      .from('program_types')
      .select('id, name, description, icon, color')
      .order('name');
    if (error) { console.error('[usePrograms:getProgramTypes]', error); return []; }
    return (data ?? []) as ProgramType[];
  }, []);

  const getSubDepartments = useCallback(async (): Promise<SubDepartment[]> => {
    const { data, error } = await supabase
      .from('sub_departments')
      .select('id, name')
      .order('name');
    if (error) { console.error('[usePrograms:getSubDepartments]', error); return []; }
    return (data ?? []) as SubDepartment[];
  }, []);

  // ── Programs ─────────────────────────────────────────────────────────

  const searchPrograms = useCallback(async (filters: {
    searchTerm?: string;
    subDepartmentId?: string;
    day?: string;
    status?: string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_weekly_programs', {
        p_search_term:       filters.searchTerm       || null,
        p_sub_department_id: filters.subDepartmentId  || null,
        p_day_filter:        filters.day              || null,
        p_status_filter:     filters.status           || null,
      });
      if (rpcError) {
        // Fallback: direct query if RPC not available
        const { data: direct, error: directError } = await supabase
          .from('weekly_programs')
          .select('*, sub_departments(name), program_types(name, icon, color)')
          .order('title');
        if (directError) { setError(directError.message); setPrograms([]); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          program_id: r.id,
          title: r.title,
          description: r.description,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
          location: r.location,
          status: r.status,
          is_recurring: r.is_recurring,
          recurrence_start_date: r.recurrence_start_date,
          recurrence_end_date: r.recurrence_end_date,
          max_capacity: r.max_capacity,
          sub_department_id: r.sub_department_id,
          sub_department_name: r.sub_departments?.name ?? null,
          program_type_id: r.program_type_id,
          program_type_name: r.program_types?.name ?? null,
          program_type_icon: r.program_types?.icon ?? null,
          program_type_color: r.program_types?.color ?? null,
          session_count: 0,
          next_session_date: null,
          created_at: r.created_at,
        }));
        setPrograms(mapped);
        return mapped;
      }
      const results = (data ?? []) as WeeklyProgram[];
      setPrograms(results);
      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setPrograms([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProgram = useCallback(async (data: NewProgramData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: result, error: insertError } = await supabase
        .from('weekly_programs')
        .insert({
          title:                 data.title,
          description:           data.description           || null,
          sub_department_id:     data.sub_department_id     || null,
          program_type_id:       data.program_type_id       || null,
          day_of_week:           data.day_of_week,
          start_time:            data.start_time            || null,
          end_time:              data.end_time              || null,
          location:              data.location              || null,
          target_kutr_levels:    data.target_kutr_levels    || null,
          is_recurring:          data.is_recurring          ?? true,
          recurrence_start_date: data.recurrence_start_date || null,
          recurrence_end_date:   data.recurrence_end_date   || null,
          max_capacity:          data.max_capacity          || null,
          status:                'active',
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

  const updateProgram = useCallback(async (
    programId: string,
    updates: Partial<NewProgramData & { status: string }>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('weekly_programs')
        .update(updates)
        .eq('id', programId);
      if (updateError) { setError(updateError.message); return false; }
      setPrograms(prev => prev.map(p =>
        p.program_id === programId ? { ...p, ...updates } : p
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Sessions ─────────────────────────────────────────────────────────

  const getProgramSessions = useCallback(async (
    programId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProgramSession[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_program_sessions', {
        p_program_id: programId,
        p_start_date: startDate || null,
        p_end_date:   endDate   || null,
      });
      if (rpcError) {
        // Fallback: direct query
        const { data: direct, error: directError } = await supabase
          .from('program_sessions')
          .select('*')
          .eq('program_id', programId)
          .order('session_date', { ascending: false });
        if (directError) { setError(directError.message); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          session_id: r.id,
          program_id: r.program_id,
          session_date: r.session_date,
          start_time: r.start_time,
          end_time: r.end_time,
          topic: r.topic,
          location: r.location,
          status: r.status,
          notes: r.notes,
          total_children: 0,
          present_count: 0,
          absent_count: 0,
          excused_count: 0,
          late_count: 0,
          assigned_members_count: 0,
          attendance_marked: false,
        }));
        setSessions(mapped);
        return mapped;
      }
      const results = (data ?? []) as ProgramSession[];
      setSessions(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateSessions = useCallback(async (
    programId: string,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('generate_program_sessions', {
        p_program_id: programId,
        p_start_date: startDate,
        p_end_date:   endDate,
      });
      if (rpcError) { setError(rpcError.message); return 0; }
      return (data as number) ?? 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSession = useCallback(async (
    sessionId: string,
    updates: { topic?: string; status?: string; notes?: string; location?: string }
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('program_sessions')
        .update(updates)
        .eq('id', sessionId);
      if (updateError) { setError(updateError.message); return false; }
      setSessions(prev => prev.map(s =>
        s.session_id === sessionId ? { ...s, ...updates } : s
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Attendance ────────────────────────────────────────────────────────

  const getSessionAttendance = useCallback(async (
    sessionId: string
  ): Promise<SessionAttendanceRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_session_attendance', {
        p_session_id: sessionId,
      });
      if (rpcError) {
        // Fallback: direct query
        const { data: direct, error: directError } = await supabase
          .from('child_attendance')
          .select('*, children(id, full_name, baptismal_name, gender, kutr_level_id)')
          .eq('session_id', sessionId);
        if (directError) { setError(directError.message); return []; }
        return (direct ?? []).map((r: any) => ({
          child_id: r.child_id,
          full_name: r.children?.full_name ?? '',
          baptismal_name: r.children?.baptismal_name ?? null,
          gender: r.children?.gender ?? null,
          age: null,
          kutr_level_name: null,
          kutr_level_color: null,
          attendance_id: r.id,
          attendance_status: r.status,
          check_in_time: r.check_in_time,
          check_out_time: r.check_out_time,
          recorded_by_name: null,
          notes: r.notes,
        }));
      }
      return (data ?? []) as SessionAttendanceRecord[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (
    sessionId: string,
    childId: string,
    status: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('mark_child_attendance', {
        p_session_id: sessionId,
        p_child_id:   childId,
        p_status:     status,
        p_notes:      notes || null,
      });
      if (rpcError) {
        // Fallback: direct upsert
        const { error: upsertError } = await supabase
          .from('child_attendance')
          .upsert(
            { child_id: childId, session_id: sessionId, status, notes: notes || null },
            { onConflict: 'child_id,session_id' }
          );
        if (upsertError) { console.error('[usePrograms:markAttendance]', upsertError); return false; }
      }
      return true;
    } catch (err) {
      console.error('[usePrograms:markAttendance]', err);
      return false;
    }
  }, []);

  const markBulkAttendance = useCallback(async (
    sessionId: string,
    records: Array<{ childId: string; status: string; notes?: string }>
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;
    for (const r of records) {
      const ok = await markAttendance(sessionId, r.childId, r.status, r.notes);
      if (ok) success++; else failed++;
    }
    return { success, failed };
  }, [markAttendance]);

  return {
    programs,
    sessions,
    isLoading,
    error,
    getProgramTypes,
    getSubDepartments,
    searchPrograms,
    createProgram,
    updateProgram,
    getProgramSessions,
    generateSessions,
    updateSession,
    getSessionAttendance,
    markAttendance,
    markBulkAttendance,
  };
}

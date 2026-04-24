import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type EventType = 'timket' | 'hosana' | 'meskel' | 'other';
export type AttendanceStatus = 'registered' | 'attended' | 'absent' | 'excused';

export const EVENT_COLORS: Record<EventType, string> = {
  timket:  'bg-blue-100 text-blue-700',
  hosana:  'bg-green-100 text-green-700',
  meskel:  'bg-yellow-100 text-yellow-700',
  other:   'bg-gray-100 text-gray-700',
};

export interface ChildEvent {
  id:                         string;
  name:                       string;
  title:                      string;
  event_type:                 EventType | null;
  event_date:                 string;
  start_time:                 string | null;
  end_time:                   string | null;
  location:                   string | null;
  description:                string | null;
  requires_performance_score: boolean;
  max_performance_score:      number | null;
  status:                     string;
  created_at:                 string;
}

export interface EventAttendanceRecord {
  child_id:          string;
  full_name:         string;
  baptismal_name:    string | null;
  gender:            string | null;
  age:               number | null;
  kutr_level_name:   string | null;
  kutr_level_color:  string | null;
  attendance_id:     string | null;
  attendance_status: AttendanceStatus | null;
  performance_score: number | null;
  check_in_time:     string | null;
  notes:             string | null;
  is_registered:     boolean;
}

export interface EventStatistics {
  event_id:         string;
  registered_count: number;
  total_marked:     number;
  attended_count:   number;
  absent_count:     number;
  excused_count:    number;
  avg_performance:  number | null;
  max_performance:  number | null;
  min_performance:  number | null;
  attendance_rate:  number;
}

export interface ChildEventHistory {
  event_id:          string;
  event_name:        string;
  event_type:        EventType | null;
  event_date:        string;
  location:          string | null;
  attendance_status: AttendanceStatus | null;
  performance_score: number | null;
  check_in_time:     string | null;
}

export interface NewEventData {
  name:                       string;
  event_type:                 EventType;
  event_date:                 string;
  start_time?:                string;
  end_time?:                  string;
  location?:                  string;
  description?:               string;
  requires_performance_score?: boolean;
  max_performance_score?:     number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEvents() {
  const [events, setEvents]       = useState<ChildEvent[]>([]);
  const [attendance, setAttendance] = useState<EventAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Events ────────────────────────────────────────────────────────────

  const getEvents = useCallback(async (filters: {
    eventType?: EventType;
    status?:    string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('children_events')
        .select('*')
        .order('event_date', { ascending: false });

      if (filters.eventType) query = query.eq('event_type', filters.eventType);
      if (filters.status)    query = query.eq('status', filters.status);

      const { data, error: queryError } = await query;
      if (queryError) { setError(queryError.message); setEvents([]); return []; }

      const results = (data ?? []).map((r: any) => ({
        id:                         r.id,
        name:                       r.name ?? r.title,
        title:                      r.title ?? r.name,
        event_type:                 r.event_type,
        event_date:                 r.event_date,
        start_time:                 r.start_time,
        end_time:                   r.end_time,
        location:                   r.location,
        description:                r.description,
        requires_performance_score: r.requires_performance_score ?? false,
        max_performance_score:      r.max_performance_score,
        status:                     r.status ?? 'planned',
        created_at:                 r.created_at,
      }));
      setEvents(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (data: NewEventData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: result, error: insertError } = await supabase
        .from('children_events')
        .insert({
          name:                       data.name,
          title:                      data.name,
          event_type:                 data.event_type,
          event_date:                 data.event_date,
          start_time:                 data.start_time                 ?? null,
          end_time:                   data.end_time                   ?? null,
          location:                   data.location                   ?? null,
          description:                data.description                ?? null,
          requires_performance_score: data.requires_performance_score ?? false,
          max_performance_score:      data.max_performance_score      ?? null,
          status:                     'scheduled',
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

  const updateEvent = useCallback(async (
    eventId: string,
    updates: Partial<NewEventData & { status: string }>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('children_events')
        .update(updates)
        .eq('id', eventId);
      if (updateError) { setError(updateError.message); return false; }
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, ...updates } : e
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Registration & Attendance ─────────────────────────────────────────

  const registerChild = useCallback(async (
    eventId: string,
    childId: string,
    notes?:  string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('register_child_for_event', {
        p_event_id: eventId,
        p_child_id: childId,
        p_notes:    notes || null,
      });
      if (rpcError) {
        console.error('[useEvents:registerChild]', rpcError);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[useEvents:registerChild]', err);
      return false;
    }
  }, []);

  const getEventAttendance = useCallback(async (eventId: string): Promise<EventAttendanceRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_event_attendance', {
        p_event_id: eventId,
      });
      if (rpcError) { setError(rpcError.message); setAttendance([]); return []; }
      const results = (data ?? []) as EventAttendanceRecord[];
      setAttendance(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAttendance([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (
    eventId:         string,
    childId:         string,
    status:          AttendanceStatus,
    performanceScore?: number,
    notes?:          string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('mark_event_attendance', {
        p_event_id:          eventId,
        p_child_id:          childId,
        p_status:            status,
        p_performance_score: performanceScore ?? null,
        p_notes:             notes ?? null,
      });
      if (rpcError) {
        console.error('[useEvents:markAttendance]', rpcError);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[useEvents:markAttendance]', err);
      return false;
    }
  }, []);

  const markBulkAttendance = useCallback(async (
    eventId: string,
    records: Array<{ childId: string; status: AttendanceStatus; performanceScore?: number; notes?: string }>
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed  = 0;
    for (const r of records) {
      const ok = await markAttendance(eventId, r.childId, r.status, r.performanceScore, r.notes);
      if (ok) success++; else failed++;
    }
    return { success, failed };
  }, [markAttendance]);

  const getEventStatistics = useCallback(async (eventId: string): Promise<EventStatistics | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_event_statistics', {
        p_event_id: eventId,
      });
      if (rpcError) { console.error('[useEvents:getEventStatistics]', rpcError); return null; }
      return data as EventStatistics;
    } catch (err) {
      console.error('[useEvents:getEventStatistics]', err);
      return null;
    }
  }, []);

  const getChildHistory = useCallback(async (childId: string): Promise<ChildEventHistory[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_child_event_history', {
        p_child_id: childId,
      });
      if (rpcError) { console.error('[useEvents:getChildHistory]', rpcError); return []; }
      return (data ?? []) as ChildEventHistory[];
    } catch (err) {
      console.error('[useEvents:getChildHistory]', err);
      return [];
    }
  }, []);

  return {
    events,
    attendance,
    isLoading,
    error,
    getEvents,
    createEvent,
    updateEvent,
    registerChild,
    getEventAttendance,
    markAttendance,
    markBulkAttendance,
    getEventStatistics,
    getChildHistory,
  };
}

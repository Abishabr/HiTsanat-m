import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type ActivityType = 'Midterm' | 'Final' | 'Assignment';

export const ACTIVITY_WEIGHTS: Record<ActivityType, number> = {
  Midterm:    30,
  Final:      50,
  Assignment: 20,
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Midterm:    'bg-blue-100 text-blue-700',
  Final:      'bg-purple-100 text-purple-700',
  Assignment: 'bg-green-100 text-green-700',
};

export interface KutrLevel {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
  color: string;
}

export interface TimhertActivity {
  activity_id:     string;
  title:           string;
  activity_type:   ActivityType | null;
  activity_date:   string | null;
  max_score:       number;
  passing_score:   number | null;
  academic_year:   string | null;
  status:          string;
  kutr_level_id:   string | null;
  kutr_level_name: string | null;
  weight:          number | null;
  scored_count:    number;
  avg_score:       number | null;
  avg_percentage:  number | null;
  pass_count:      number;
  fail_count:      number;
  created_at:      string;
}

export interface ActivityScore {
  child_id:        string;
  full_name:       string;
  baptismal_name:  string | null;
  gender:          string | null;
  age:             number | null;
  kutr_level_name: string | null;
  score_id:        string | null;
  score:           number | null;
  percentage:      number | null;
  grade_letter:    string | null;
  notes:           string | null;
  recorded_by:     string | null;
  scored_at:       string | null;
}

export interface ChildAcademicReport {
  child_id:        string;
  full_name:       string;
  kutr_level_name: string | null;
  activity_id:     string;
  activity_title:  string;
  activity_type:   ActivityType;
  activity_date:   string | null;
  max_score:       number;
  passing_score:   number | null;
  weight:          number;
  score:           number | null;
  percentage:      number | null;
  grade_letter:    string | null;
  weighted_score:  number | null;
  passed:          boolean | null;
}

export interface KutrLevelReportRow {
  child_id:          string;
  full_name:         string;
  baptismal_name:    string | null;
  gender:            string | null;
  midterm_score:     number | null;
  midterm_pct:       number | null;
  final_score:       number | null;
  final_pct:         number | null;
  assignment_score:  number | null;
  assignment_pct:    number | null;
  weighted_total:    number | null;
  overall_grade:     string | null;
  activities_taken:  number;
  activities_passed: number;
}

export interface NewActivityData {
  title:           string;
  activity_type:   ActivityType;
  kutr_level_id:   string;
  max_score:       number;
  passing_score?:  number;
  activity_date?:  string;
  academic_year?:  string;
  description?:    string;
}

// ── Grade helpers ──────────────────────────────────────────────────────────

export function gradeColor(grade: string | null): string {
  switch (grade) {
    case 'A': return 'bg-green-100 text-green-700';
    case 'B': return 'bg-blue-100 text-blue-700';
    case 'C': return 'bg-yellow-100 text-yellow-700';
    case 'D': return 'bg-orange-100 text-orange-700';
    case 'F': return 'bg-red-100 text-red-700';
    default:  return 'bg-muted text-muted-foreground';
  }
}

export function currentAcademicYear(): string {
  const now = new Date();
  // Ethiopian academic year roughly Sept–June; use Gregorian year
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${year + 1}`;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTimhert() {
  const [activities, setActivities]   = useState<TimhertActivity[]>([]);
  const [scores, setScores]           = useState<ActivityScore[]>([]);
  const [report, setReport]           = useState<KutrLevelReportRow[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // ── Reference data ───────────────────────────────────────────────────

  const getKutrLevels = useCallback(async (): Promise<KutrLevel[]> => {
    const { data, error } = await supabase
      .from('kutr_levels')
      .select('id, name, min_age, max_age, color')
      .order('min_age');
    if (error) { console.error('[useTimhert:getKutrLevels]', error); return []; }
    return (data ?? []) as KutrLevel[];
  }, []);

  // ── Activities ────────────────────────────────────────────────────────

  const getActivities = useCallback(async (filters: {
    kutrLevelId?:  string;
    activityType?: ActivityType;
    academicYear?: string;
    status?:       string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_timhert_activities', {
        p_kutr_level_id: filters.kutrLevelId  || null,
        p_activity_type: filters.activityType || null,
        p_academic_year: filters.academicYear || null,
        p_status:        filters.status       ?? 'active',
      });
      if (rpcError) {
        // Fallback: direct query
        const { data: direct, error: directError } = await supabase
          .from('timhert_activities')
          .select('*, kutr_levels(name)')
          .order('activity_date', { ascending: false });
        if (directError) { setError(directError.message); setActivities([]); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          activity_id:    r.id,
          title:          r.title,
          activity_type:  r.activity_type,
          activity_date:  r.activity_date,
          max_score:      r.max_score,
          passing_score:  r.passing_score,
          academic_year:  r.academic_year,
          status:         r.status ?? 'active',
          kutr_level_id:  r.kutr_level_id,
          kutr_level_name: r.kutr_levels?.name ?? null,
          weight:         ACTIVITY_WEIGHTS[r.activity_type as ActivityType] ?? null,
          scored_count:   0,
          avg_score:      null,
          avg_percentage: null,
          pass_count:     0,
          fail_count:     0,
          created_at:     r.created_at,
        }));
        setActivities(mapped);
        return mapped;
      }
      const results = (data ?? []) as TimhertActivity[];
      setActivities(results);
      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
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
        .from('timhert_activities')
        .insert({
          title:          data.title,
          activity_type:  data.activity_type,
          kutr_level_id:  data.kutr_level_id,
          max_score:      data.max_score,
          passing_score:  data.passing_score  ?? null,
          activity_date:  data.activity_date  ?? null,
          academic_year:  data.academic_year  ?? currentAcademicYear(),
          description:    data.description    ?? null,
          status:         'active',
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
        .from('timhert_activities')
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

  // ── Scores ────────────────────────────────────────────────────────────

  const getActivityScores = useCallback(async (activityId: string): Promise<ActivityScore[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_activity_scores', {
        p_activity_id: activityId,
      });
      if (rpcError) {
        // Fallback
        const { data: direct, error: directError } = await supabase
          .from('timhert_scores')
          .select('*, children(id, full_name, baptismal_name, gender)')
          .eq('activity_id', activityId);
        if (directError) { setError(directError.message); setScores([]); return []; }
        const mapped = (direct ?? []).map((r: any) => ({
          child_id:       r.child_id,
          full_name:      r.children?.full_name ?? '',
          baptismal_name: r.children?.baptismal_name ?? null,
          gender:         r.children?.gender ?? null,
          age:            null,
          kutr_level_name: null,
          score_id:       r.id,
          score:          r.score,
          percentage:     r.percentage,
          grade_letter:   r.grade_letter,
          notes:          r.notes,
          recorded_by:    r.recorded_by,
          scored_at:      r.created_at,
        }));
        setScores(mapped);
        return mapped;
      }
      const results = (data ?? []) as ActivityScore[];
      setScores(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setScores([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upsertScore = useCallback(async (
    activityId: string,
    childId:    string,
    score:      number,
    notes?:     string
  ): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('upsert_child_score', {
        p_activity_id: activityId,
        p_child_id:    childId,
        p_score:       score,
        p_notes:       notes || null,
      });
      if (rpcError) {
        // Fallback: direct upsert
        const { error: upsertError } = await supabase
          .from('timhert_scores')
          .upsert(
            { activity_id: activityId, child_id: childId, score, notes: notes || null },
            { onConflict: 'activity_id,child_id' }
          );
        if (upsertError) { console.error('[useTimhert:upsertScore]', upsertError); return false; }
      }
      // Update local state
      setScores(prev => prev.map(s =>
        s.child_id === childId
          ? { ...s, score, notes: notes ?? s.notes }
          : s
      ));
      return true;
    } catch (err) {
      console.error('[useTimhert:upsertScore]', err);
      return false;
    }
  }, []);

  const saveBulkScores = useCallback(async (
    activityId: string,
    entries: Array<{ childId: string; score: number; notes?: string }>
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed  = 0;
    for (const e of entries) {
      const ok = await upsertScore(activityId, e.childId, e.score, e.notes);
      if (ok) success++; else failed++;
    }
    return { success, failed };
  }, [upsertScore]);

  // ── Reports ───────────────────────────────────────────────────────────

  const getKutrLevelReport = useCallback(async (
    kutrLevelId:  string,
    academicYear?: string
  ): Promise<KutrLevelReportRow[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_kutr_level_report', {
        p_kutr_level_id: kutrLevelId,
        p_academic_year: academicYear || null,
      });
      if (rpcError) { setError(rpcError.message); setReport([]); return []; }
      const results = (data ?? []) as KutrLevelReportRow[];
      setReport(results);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setReport([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getChildReport = useCallback(async (
    childId:      string,
    academicYear?: string
  ): Promise<ChildAcademicReport[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_child_academic_report', {
        p_child_id:      childId,
        p_academic_year: academicYear || null,
      });
      if (rpcError) { setError(rpcError.message); return []; }
      return (data ?? []) as ChildAcademicReport[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    activities,
    scores,
    report,
    isLoading,
    error,
    getKutrLevels,
    getActivities,
    createActivity,
    updateActivity,
    getActivityScores,
    upsertScore,
    saveBulkScores,
    getKutrLevelReport,
    getChildReport,
  };
}

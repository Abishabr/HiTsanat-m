import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types matching the new normalized schema ──────────────────────────────

export interface ChildSearchResult {
  child_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  baptismal_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age: number | null;
  level: string | null;
  grade: string | null;
  photo_url: string | null;
  status: string;
  enrollment_date: string | null;
  kutr_level_name: string | null;
  kutr_level_color: string | null;
  family_name: string | null;
  family_id: string | null;
  address_summary: string | null;
  confession_father: string | null;
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
}

export interface ChildDetails {
  child: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    baptismal_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    age: number | null;
    level: string | null;
    grade: string | null;
    photo_url: string | null;
    medical_notes: string | null;
    allergies: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    status: string;
    enrollment_date: string | null;
    graduation_date: string | null;
    created_at: string;
  };
  kutr_level: { id: string; name: string; color: string; min_age: number; max_age: number } | null;
  confession_father: { id: string; full_name: string; title: string | null; phone: string | null; church: string | null } | null;
  family: { id: string; family_name: string; home_church: string | null; primary_contact_name: string | null; primary_contact_phone: string | null; status: string } | null;
  address: { id: string; street_address: string | null; sub_city: string | null; woreda: string | null; city: string | null; house_number: string | null } | null;
  parents: Array<{
    id: string;
    full_name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    occupation: string | null;
    is_primary_contact: boolean;
    relationship_type: string;
    is_primary_guardian: boolean;
  }>;
  siblings: Array<{ id: string; full_name: string; gender: string | null; age: number | null; status: string }>;
}

export interface KutrLevel {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
  description: string | null;
  color: string;
}

export interface ConfessionFather {
  id: string;
  full_name: string;
  title: string | null;
  phone: string | null;
  church: string | null;
  status: string;
}

export interface SearchFilters {
  searchTerm?: string;
  kutrLevelId?: string;
  gender?: string;
  status?: string;
  familyId?: string;
  confessionFatherId?: string;
}

export interface NewChildData {
  // Live schema uses full_name (not first_name/last_name)
  full_name: string;
  baptismal_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  level?: string | null;
  grade?: string | null;
  kutr_level_id?: string | null;
  confession_father_id?: string | null;
  family_id?: string | null;
  medical_notes?: string | null;
  allergies?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  // Parents (created alongside child)
  father_name?: string | null;
  father_phone?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useChildren() {
  const [children, setChildren] = useState<ChildSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search children using the search_children RPC function.
   * Falls back to direct table query if RPC not available.
   */
  const searchChildren = useCallback(async (filters: SearchFilters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_children', {
        p_search_term:       filters.searchTerm       || null,
        p_kutr_level_id:     filters.kutrLevelId      || null,
        p_gender:            filters.gender           || null,
        p_status:            filters.status           || null,
        p_family_id:         filters.familyId         || null,
        p_confession_father: filters.confessionFatherId || null,
      });

      // RPC not found — fall back to direct query
      if (rpcError && (rpcError.code === 'PGRST202' || rpcError.message?.includes('not found'))) {
        let query = supabase
          .from('children')
          .select(`
            id,
            full_name,
            baptismal_name,
            gender,
            date_of_birth,
            age,
            level,
            grade,
            photo_url,
            status,
            enrollment_date,
            kutr_level_id,
            family_id,
            confession_father_id,
            kutr_levels ( name, color ),
            families ( family_name ),
            confession_fathers ( full_name )
          `)
          .order('full_name');

        if (filters.searchTerm) {
          query = query.ilike('full_name', `%${filters.searchTerm}%`);
        }
        if (filters.gender) query = query.eq('gender', filters.gender);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.kutrLevelId) query = query.eq('kutr_level_id', filters.kutrLevelId);
        if (filters.familyId) query = query.eq('family_id', filters.familyId);

        const { data: directData, error: directError } = await query;
        if (directError) {
          setError(directError.message);
          setChildren([]);
          return [];
        }

        const results = (directData ?? []).map((row: any) => ({
          child_id: row.id,
          full_name: row.full_name,
          first_name: row.full_name?.split(' ')[0] ?? '',
          last_name: row.full_name?.split(' ').slice(1).join(' ') ?? '',
          baptismal_name: row.baptismal_name,
          gender: row.gender,
          date_of_birth: row.date_of_birth,
          age: row.age,
          level: row.level,
          grade: row.grade,
          photo_url: row.photo_url,
          status: row.status,
          enrollment_date: row.enrollment_date,
          kutr_level_name: row.kutr_levels?.name ?? null,
          kutr_level_color: row.kutr_levels?.color ?? null,
          family_name: row.families?.family_name ?? null,
          family_id: row.family_id,
          address_summary: null,
          confession_father: row.confession_fathers?.full_name ?? null,
          father_name: null,
          father_phone: null,
          mother_name: null,
          mother_phone: null,
        })) as ChildSearchResult[];

        setChildren(results);
        return results;
      }

      if (rpcError) {
        console.error('[useChildren:searchChildren]', rpcError);
        setError(rpcError.message);
        setChildren([]);
        return [];
      }

      const results = (data ?? []) as ChildSearchResult[];
      setChildren(results);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChildren:searchChildren]', message);
      setError(message);
      setChildren([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get full child details including family, parents, siblings.
   */
  const getChildDetails = useCallback(async (childId: string): Promise<ChildDetails | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_child_details', {
        p_child_id: childId,
      });

      if (rpcError) {
        console.error('[useChildren:getChildDetails]', rpcError);
        setError(rpcError.message);
        return null;
      }

      return data as ChildDetails;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChildren:getChildDetails]', message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new child with parents.
   * Creates family if needed, inserts child, links parents.
   */
  const registerChild = useCallback(async (data: NewChildData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Resolve or create family
      let familyId = data.family_id ?? null;

      if (!familyId && (data.father_name || data.mother_name)) {
        const familyName = `${data.father_name || data.mother_name} Family`;

        // Check if family already exists
        const { data: existingFamily } = await supabase
          .from('families')
          .select('id')
          .eq('family_name', familyName)
          .single();

        if (existingFamily) {
          familyId = existingFamily.id;
        } else {
          const { data: newFamily, error: familyError } = await supabase
            .from('families')
            .insert({ family_name: familyName, status: 'active' })
            .select('id')
            .single();

          if (familyError) {
            console.error('[useChildren:registerChild:family]', familyError);
            setError(familyError.message);
            return null;
          }
          familyId = newFamily.id;
        }
      }

      // 2. Insert child — using live schema columns (full_name, not first_name/last_name)
      const { data: childData, error: childError } = await supabase
        .from('children')
        .insert({
          full_name:            data.full_name,
          baptismal_name:       data.baptismal_name   || null,
          gender:               data.gender           || null,
          date_of_birth:        data.date_of_birth    || null,
          level:                data.level            || null,
          grade:                data.grade            || null,
          kutr_level_id:        data.kutr_level_id    || null,
          confession_father_id: data.confession_father_id || null,
          family_id:            familyId,
          medical_notes:        data.medical_notes    || null,
          allergies:            data.allergies        || null,
          emergency_contact_name:         data.emergency_contact_name || null,
          emergency_contact_phone:        data.emergency_contact_phone || null,
          status:               'active',
          enrollment_date:      new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (childError) {
        console.error('[useChildren:registerChild:child]', childError);
        setError(childError.message);
        return null;
      }

      const childId = childData.id;

      // 3. Create parents and link to child
      const parentsToCreate: Array<{ relationship: 'Father' | 'Mother'; name: string; phone: string | null }> = [];
      if (data.father_name) parentsToCreate.push({ relationship: 'Father', name: data.father_name, phone: data.father_phone || null });
      if (data.mother_name) parentsToCreate.push({ relationship: 'Mother', name: data.mother_name, phone: data.mother_phone || null });

      for (const parent of parentsToCreate) {
        if (!familyId) continue;

        // Check if parent already exists in this family
        const { data: existingParent } = await supabase
          .from('child_parents')
          .select('id')
          .eq('family_id', familyId)
          .eq('full_name', parent.name)
          .eq('relationship', parent.relationship)
          .single();

        let parentId: string;

        if (existingParent) {
          parentId = existingParent.id;
        } else {
          const { data: newParent, error: parentError } = await supabase
            .from('child_parents')
            .insert({
              family_id:    familyId,
              full_name:    parent.name,
              relationship: parent.relationship,
              phone:        parent.phone,
              is_primary_contact: parent.relationship === 'Father',
            })
            .select('id')
            .single();

          if (parentError) {
            console.error('[useChildren:registerChild:parent]', parentError);
            continue; // Don't fail the whole registration for a parent error
          }
          parentId = newParent.id;
        }

        // Link parent to child (table may not exist yet — ignore error gracefully)
        const { error: linkError } = await supabase
          .from('child_parent_links')
          .insert({
            child_id:           childId,
            parent_id:          parentId,
            relationship_type:  'biological',
            is_primary_guardian: parent.relationship === 'Father',
          });
        if (linkError) {
          console.warn('[useChildren:registerChild:link]', linkError.message);
          // Don't fail the whole registration — child and parent were created
        }
      }

      return childId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChildren:registerChild]', message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a child's basic information.
   */
  const updateChild = useCallback(async (
    childId: string,
    updates: Partial<Omit<ChildSearchResult, 'child_id' | 'full_name'>>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId);

      if (updateError) {
        console.error('[useChildren:updateChild]', updateError);
        setError(updateError.message);
        return false;
      }

      setChildren(prev => prev.map(c =>
        c.child_id === childId ? { ...c, ...updates } : c
      ));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChildren:updateChild]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Soft delete a child (set status to inactive).
   */
  const deleteChild = useCallback(async (childId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('children')
        .update({ status: 'inactive', is_active: false })
        .eq('id', childId);

      if (updateError) {
        console.error('[useChildren:deleteChild]', updateError);
        setError(updateError.message);
        return false;
      }

      setChildren(prev => prev.filter(c => c.child_id !== childId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChildren:deleteChild]', message);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load kutr levels for dropdowns.
   */
  const getKutrLevels = useCallback(async (): Promise<KutrLevel[]> => {
    try {
      const { data, error } = await supabase.rpc('get_kutr_levels');
      if (error) {
        // Fallback to direct query
        const { data: direct } = await supabase
          .from('kutr_levels')
          .select('*')
          .order('min_age');
        return (direct ?? []) as KutrLevel[];
      }
      return (data ?? []) as KutrLevel[];
    } catch {
      return [];
    }
  }, []);

  /**
   * Load confession fathers for dropdowns.
   */
  const getConfessionFathers = useCallback(async (): Promise<ConfessionFather[]> => {
    try {
      const { data, error } = await supabase.rpc('get_confession_fathers', { p_status: 'active' });
      if (error) {
        const { data: direct } = await supabase
          .from('confession_fathers')
          .select('*')
          .eq('status', 'active')
          .order('full_name');
        return (direct ?? []) as ConfessionFather[];
      }
      return (data ?? []) as ConfessionFather[];
    } catch {
      return [];
    }
  }, []);

  return {
    children,
    isLoading,
    error,
    searchChildren,
    getChildDetails,
    registerChild,
    updateChild,
    deleteChild,
    getKutrLevels,
    getConfessionFathers,
  };
}

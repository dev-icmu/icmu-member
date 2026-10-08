import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';
import { DEFAULT_SKILLS } from '../constants.js';

export const useSkills = () => {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill')
        .select('*')
        .order('skill_name');
      if (error) throw error;

      // Merge default protected skills with DB data.
      // If a default skill already exists in the DB, use the DB version.
      // If it doesn't exist yet, insert it as a placeholder so it always renders.
      const dbSkillNames = new Set(
        (data || []).map(s => s.skill_name.toLowerCase())
      );

      const missingDefaults = DEFAULT_SKILLS
        .filter(ds => !dbSkillNames.has(ds.skill_name.toLowerCase()))
        .map((ds) => ({
          // Use a deterministic placeholder id so React keys stay stable
          id: `default-${ds.skill_name.toLowerCase().replace(/\s+/g, '-')}`,
          ...ds,
          _isLocalDefault: true, // flag to know this hasn't been persisted yet
        }));

      // Ensure protected defaults always appear first, then the rest sorted
      const merged = [...data || []];
      merged.push(...missingDefaults);

      // Sort: protected first, then alphabetical
      merged.sort((a, b) => {
        if (a.is_protected && !b.is_protected) return -1;
        if (!a.is_protected && b.is_protected) return 1;
        return (a.skill_name || '').localeCompare(b.skill_name || '');
      });

      return merged;
    }
  });
};

export const useCreateSkill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('skill').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] })
  });
};

export const useUpdateSkill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { error } = await supabase.from('skill').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] })
  });
};

export const useDeleteSkill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('skill').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] })
  });
};

/**
 * Hook to seed default protected skills into the DB if they don't exist yet.
 * Call this once from AdminPage or an app-level effect.
 */
export const useSeedDefaultSkills = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      for (const ds of DEFAULT_SKILLS) {
        // Upsert: insert if not exists, skip if already present
        const { error } = await supabase
          .from('skill')
          .upsert(
            { skill_name: ds.skill_name, skill_desc: ds.skill_desc, is_protected: true, is_active: true },
            { onConflict: 'skill_name', ignoreDuplicates: true }
          );
        if (error) {
          console.warn(`[Skills] Could not seed "${ds.skill_name}":`, error.message);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] })
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';

// Only persisted catalog rows may be assigned to members or teams.
export const useSkills = () => useQuery({
  queryKey: ['skills'],
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.from('skill')
      .select('id, skill_name, skill_desc, is_active, is_protected')
      .order('is_protected', { ascending: false }).order('skill_name')
      .abortSignal(signal);
    if (error) throw error;
    return data || [];
  },
});

function skillPayload(payload) {
  const result = {};
  if ('skill_name' in payload) {
    result.skill_name = payload.skill_name.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!result.skill_name || result.skill_name.length > 50) throw new Error('Use a skill name between 1 and 50 characters.');
  }
  if ('skill_desc' in payload) {
    result.skill_desc = (payload.skill_desc || '').trim().toLowerCase();
    if (result.skill_desc.length > 50) throw new Error('Keep the description within 50 characters.');
  }
  if (typeof payload.is_active === 'boolean') result.is_active = payload.is_active;
  return result;
}

export const useCreateSkill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const values = skillPayload(payload);
      if (!values.skill_name) throw new Error('A skill name is required.');
      const { data, error } = await supabase.from('skill')
        .insert({ ...values, is_active: true, is_protected: false }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['skills'] }),
      qc.invalidateQueries({ queryKey: ['admin-analytics'] }),
    ]),
  });
};

export const useUpdateSkill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      // Returning the row prevents a denied/zero-row update looking successful.
      const { data, error } = await supabase.from('skill')
        .update(skillPayload(payload)).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['skills'] }),
      qc.invalidateQueries({ queryKey: ['teams'] }),
      qc.invalidateQueries({ queryKey: ['members'] }),
      qc.invalidateQueries({ queryKey: ['admin-analytics'] }),
    ]),
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';

/**
 * Fetch all guardians
 */
export const useGuardians = () => {
  return useQuery({
    queryKey: ['guardians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardian')
        .select('*')
        .order('guardian_name');

      if (error) throw error;
      return data;
    }
  });
};

/**
 * Fetch a single guardian by id
 * @param {string} id 
 */
export const useGuardian = (id) => {
  return useQuery({
    queryKey: ['guardians', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardian')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });
};

/**
 * Create a new guardian
 */
export const useCreateGuardian = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('guardian')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
    }
  });
};

/**
 * Update an existing guardian
 */
export const useUpdateGuardian = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('guardian')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', variables.id] });
    }
  });
};

/**
 * Delete a guardian
 */
export const useDeleteGuardian = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('guardian')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
    }
  });
};

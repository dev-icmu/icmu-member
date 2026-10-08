import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch members with pagination and search
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search
 */
export const useMembers = ({ page = 1, limit = 20, search = '' } = {}) => {
  return useQuery({
    queryKey: ['members', { page, limit, search }],
    queryFn: async () => {
      let query = supabase.from('member').select('*, guardian(*)', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,member_id.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, count, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, count };
    }
  });
};

/**
 * Fetch a single member by id
 * @param {string} id
 */
export const useMember = (id) => {
  return useQuery({
    queryKey: ['members', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member')
        .select(`
          *,
          guardian(*),
          member_team_assignment(*, production_team(*)),
          member_skill_possession(*, skill(*))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });
};

/**
 * Create a new member
 */
export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      let guardian_id = payload.guardian_id;

      // 1. If guardian data exists in the payload, insert guardian first
      if (payload.guardian && !guardian_id) {
        guardian_id = crypto.randomUUID();
        const { error: guardianError } = await supabase
          .from('guardian')
          .insert({ ...payload.guardian, id: guardian_id });
        
        if (guardianError) throw guardianError;
      }

      const memberDbId = crypto.randomUUID();
      const memberData = {
        ...payload,
        id: memberDbId,
        guardian_id,
        membership_status: 'pending',
        interests: payload.skills || []
      };
      
      // Remove extraneous properties before insert
      delete memberData.guardian;
      delete memberData.skills;
      delete memberData.production_team;

      // 2. Insert member
      const { error: memberError } = await supabase
        .from('member')
        .insert(memberData);

      if (memberError) throw memberError;

      return { id: memberDbId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

export const useApproveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberDbId) => {
      const { data, error } = await supabase.rpc('approve_member', {
        p_id: memberDbId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

export const useRejectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberDbId) => {
      const { error } = await supabase
        .from('member')
        .update({ membership_status: 'rejected' })
        .eq('id', memberDbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

/**
 * Update an existing member
 */
export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('member')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members', variables.id] });
    }
  });
};

/**
 * Delete a member
 */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('member')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

/**
 * Assign a team to a member
 */
export const useAssignTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { data, error } = await supabase
        .from('member_team_assignment')
        .insert({ member_id, team_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.member_id] });
    }
  });
};

/**
 * Remove a team from a member
 */
export const useRemoveTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { error } = await supabase
        .from('member_team_assignment')
        .delete()
        .match({ member_id, team_id });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.member_id] });
    }
  });
};

/**
 * Assign a skill to a member
 */
export const useAssignSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ member_id, skill_id }) => {
      const { data, error } = await supabase
        .from('member_skill_possession')
        .insert({ member_id, skill_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.member_id] });
    }
  });
};

/**
 * Remove a skill from a member
 */
export const useRemoveSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ member_id, skill_id }) => {
      const { error } = await supabase
        .from('member_skill_possession')
        .delete()
        .match({ member_id, skill_id });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.member_id] });
    }
  });
};


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';

export const useTeams = () => useQuery({
  queryKey: ['teams'],
  queryFn: async ({ signal }) => {
    // The aggregate includes every assignment, beyond the API's row-return limit.
    const { data, error } = await supabase.from('production_team')
      .select('id, team_name, required_skills, is_active, is_protected, assignments:member_team_assignment(count)')
      .order('is_protected', { ascending: false }).order('team_name')
      .abortSignal(signal);
    if (error) throw error;
    return (data || []).map(({ assignments, ...team }) => ({
      ...team, member_count: assignments?.[0]?.count ?? 0,
    }));
  },
});

export const useTeamRoster = (teamId, { page = 1, limit = 10 } = {}) => useQuery({
  queryKey: ['team-members', teamId, { page, limit }],
  enabled: !!teamId,
  queryFn: async ({ signal }) => {
    const from = (page - 1) * limit;
    const { data, count, error } = await supabase.from('member_team_assignment')
      .select('member_id, team_id, assigned_at, member:member_id(id, full_name, member_id, index_number, membership_status, is_active)', { count: 'exact' })
      .eq('team_id', teamId).order('assigned_at', { ascending: false }).order('member_id')
      .range(from, from + limit - 1).abortSignal(signal);
    if (error) throw error;
    return { data: data || [], count: count ?? 0 };
  },
});

// Compatibility for the earlier detail panel; new admin views use pagination.
export const useTeamMembers = (teamId) => {
  const query = useTeamRoster(teamId, { page: 1, limit: 100 });
  return { ...query, data: query.data?.data };
};

function teamPayload(payload) {
  const result = {};
  if ('team_name' in payload) {
    result.team_name = payload.team_name.trim();
    if (!result.team_name || result.team_name.length > 100) throw new Error('Use a team name between 1 and 100 characters.');
  }
  if ('required_skills' in payload) {
    if (!Array.isArray(payload.required_skills)) throw new Error('Select valid required skills.');
    result.required_skills = [...new Set(payload.required_skills)];
  }
  if (typeof payload.is_active === 'boolean') result.is_active = payload.is_active;
  return result;
}

function invalidateTeams(qc) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['teams'] }),
    qc.invalidateQueries({ queryKey: ['team-members'] }),
    qc.invalidateQueries({ queryKey: ['members'] }),
    qc.invalidateQueries({ queryKey: ['admin-analytics'] }),
  ]);
}

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const values = teamPayload(payload);
      if (!values.team_name) throw new Error('A team name is required.');
      const { data, error } = await supabase.from('production_team')
        .insert({ ...values, is_active: true, is_protected: false }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTeams(qc),
  });
};

export const useUpdateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase.from('production_team')
        .update(teamPayload(payload)).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTeams(qc),
  });
};

export const useUpdateTeamSkills = () => {
  const update = useUpdateTeam();
  return {
    ...update,
    mutate: ({ teamId, skillIds }, options) => update.mutate({ id: teamId, required_skills: skillIds }, options),
    mutateAsync: ({ teamId, skillIds }, options) => update.mutateAsync({ id: teamId, required_skills: skillIds }, options),
  };
};

export const useAssignMemberToTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { data, error } = await supabase.from('member_team_assignment')
        .insert({ member_id, team_id }).select('member_id, team_id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTeams(qc),
  });
};

export const useRemoveMemberFromTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { data, error } = await supabase.from('member_team_assignment')
        .delete().match({ member_id, team_id }).select('member_id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTeams(qc),
  });
};

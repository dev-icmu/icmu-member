import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch all production teams with member count.
 * Teams are sorted: protected first, then alphabetical.
 */
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      // Fetch teams
      const { data: teams, error } = await supabase
        .from('production_team')
        .select('*')
        .order('team_name');
      if (error) throw error;

      // Fetch assignment counts per team
      const { data: assignments, error: assignError } = await supabase
        .from('member_team_assignment')
        .select('team_id');
      if (assignError) throw assignError;

      // Count members per team
      const countMap = {};
      (assignments || []).forEach(a => {
        countMap[a.team_id] = (countMap[a.team_id] || 0) + 1;
      });

      // Enrich teams with member count
      const enriched = (teams || []).map(t => ({
        ...t,
        member_count: countMap[t.id] || 0,
      }));

      // Sort: protected first, then alphabetical
      enriched.sort((a, b) => {
        if (a.is_protected && !b.is_protected) return -1;
        if (!a.is_protected && b.is_protected) return 1;
        return (a.team_name || '').localeCompare(b.team_name || '');
      });

      return enriched;
    }
  });
};

/**
 * Fetch members assigned to a specific team, with member details.
 */
export const useTeamMembers = (teamId) => {
  return useQuery({
    queryKey: ['team-members', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_team_assignment')
        .select('*, member:member_id(id, full_name, member_id, index_number, email_address, membership_status)')
        .eq('team_id', teamId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });
};

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('production_team').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  });
};

export const useUpdateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { error } = await supabase.from('production_team').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  });
};

/**
 * Update the required_skills array on a team.
 */
export const useUpdateTeamSkills = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, skillIds }) => {
      const { error } = await supabase
        .from('production_team')
        .update({ required_skills: skillIds })
        .eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  });
};

/**
 * Assign a member to a team (insert into member_team_assignment).
 */
export const useAssignMemberToTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { error } = await supabase
        .from('member_team_assignment')
        .insert({ member_id, team_id });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['team-members', variables.team_id] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

/**
 * Remove a member from a team (delete from member_team_assignment).
 */
export const useRemoveMemberFromTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, team_id }) => {
      const { error } = await supabase
        .from('member_team_assignment')
        .delete()
        .match({ member_id, team_id });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['team-members', variables.team_id] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    }
  });
};

export const useDeleteTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('production_team').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  });
};

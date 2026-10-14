import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase.js';
import { buildMemberPayload, buildMemberSearchFilter, normalizeMemberListOptions } from '../lib/memberPayload.js';

const LIST_COLUMNS = 'id,member_id,form_number,index_number,full_name,name_with_initials,date_of_birth,joined_date,batch_year,city,school_class,address,other_skills,application_source,fee_amount,fee_paid_at,processed_by,processed_by_name,processed_at,approved_by,approved_by_name,approved_at,whatsapp_number,email_address,interests,membership_status,is_active,deactivated_at,created_at,updated_at,member_team_assignment(team_id)';

export const useMembers = (options = {}) => {
  const filters = normalizeMemberListOptions(options);
  return useQuery({
    queryKey: ['members', 'list', filters],
    enabled: options.enabled ?? true,
    queryFn: async ({ signal }) => {
      let query = supabase.from('member').select(LIST_COLUMNS, { count: 'exact' });
      if (filters.skill) query = query.contains('interests', [filters.skill]);
      if (filters.statuses?.length) query = query.in('membership_status', filters.statuses);
      else if (filters.status !== 'all') query = query.eq('membership_status', filters.status);
      if (filters.activity !== 'all') query = query.eq('is_active', filters.activity === 'active');
      if (filters.batch !== null) query = query.eq('batch_year', filters.batch);
      if (filters.search) query = query.or(buildMemberSearchFilter(filters.search));

      let sortColumn = 'created_at';
      let sortAscending = false;

      switch (filters.sort) {
        case 'oldest': sortColumn = 'created_at'; sortAscending = true; break;
        case 'newest': sortColumn = 'created_at'; sortAscending = false; break;
        case 'name':
        case 'name_asc': sortColumn = 'full_name'; sortAscending = true; break;
        case 'name_desc': sortColumn = 'full_name'; sortAscending = false; break;
        case 'id_asc': sortColumn = 'member_id'; sortAscending = true; break;
        case 'id_desc': sortColumn = 'member_id'; sortAscending = false; break;
        case 'admission_asc': sortColumn = 'index_number'; sortAscending = true; break;
        case 'admission_desc': sortColumn = 'index_number'; sortAscending = false; break;
        case 'batch_asc': sortColumn = 'batch_year'; sortAscending = true; break;
        case 'batch_desc': sortColumn = 'batch_year'; sortAscending = false; break;
        case 'status_asc': sortColumn = 'membership_status'; sortAscending = true; break;
        case 'status_desc': sortColumn = 'membership_status'; sortAscending = false; break;
        case 'form_asc': sortColumn = 'form_number'; sortAscending = true; break;
        case 'form_desc': sortColumn = 'form_number'; sortAscending = false; break;
        case 'joined_asc': sortColumn = 'joined_date'; sortAscending = true; break;
        case 'joined_desc': sortColumn = 'joined_date'; sortAscending = false; break;
        default: sortColumn = 'created_at'; sortAscending = false;
      }

      const from = (filters.page - 1) * filters.limit;
      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortAscending, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, from + filters.limit - 1)
        .abortSignal(signal);

      if (error) throw error;
      return { data: data || [], count: count ?? 0 };
    },
    staleTime: 20_000,
  });
};

export const useMember = (id) => useQuery({
  queryKey: ['members', 'detail', id],
  enabled: Boolean(id),
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.from('member')
      .select('*, guardian(*), member_team_assignment(*, production_team(*))')
      .eq('id', id)
      .single()
      .abortSignal(signal);
    if (error) throw error;
    return data;
  },
});

export const useAdminAnalytics = () => useQuery({
  queryKey: ['admin-analytics'],
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.rpc('admin_member_analytics').abortSignal(signal);
    if (error) throw error;
    if (!data?.counts) throw new Error('The dashboard summary could not be loaded. Please refresh.');
    return data;
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
});

async function callMemberRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function useMemberMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // A failed mutation must never be retried automatically, especially a create.
    retry: false,
    onSuccess: () => Promise.all(
      ['members', 'member-batches', 'membership-revenue', 'application-activity', 'admin-analytics', 'teams', 'team-members', 'skills', 'whatsapp-status']
        .map(key => queryClient.invalidateQueries({ queryKey: [key] })),
    ),
  });
}

// Public registration keeps its existing input contract; both rows are now saved atomically.
export const useCreateMember = () => useMemberMutation(payload => callMemberRpc('submit_member_application', {
  p_payload: buildMemberPayload(payload, { requireGuardian: true }),
}));

export const useMemberBatches = () => useQuery({
  queryKey: ['member-batches'],
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.rpc('admin_member_batches').abortSignal(signal);
    if (error) throw error;
    return data || [];
  },
  staleTime: 30_000,
});

export const useApplicationActivity = period => useQuery({
  queryKey: ['application-activity', period],
  queryFn: async ({ signal }) => {
    const { data, error } = await supabase.rpc('admin_application_activity', { p_period: period }).abortSignal(signal);
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
});

export const useAdminCreateMember = () => useMemberMutation(payload => callMemberRpc('admin_save_member', {
  p_id: null,
  p_payload: buildMemberPayload(payload, { requireGuardian: true, admin: true }),
}));

export const useUpdateMember = () => useMemberMutation(({ id, payload, ...updates }) => {
  if (!id) throw new Error('Choose a member to edit.');
  return callMemberRpc('admin_save_member', {
    p_id: id,
    p_payload: buildMemberPayload(payload || updates, { partial: true, admin: true }),
  });
});

// Manual wa.me sharing is separate from approval; do not enqueue WAHA messages.
export const useApproveMember = () => useMemberMutation(({id}) => callMemberRpc('approve_member_with_notification', { p_id:id, p_whatsapp_consent:false }));

export const useWhatsappStatus = id => useQuery({
  queryKey:['whatsapp-status',id], enabled:Boolean(id),
  queryFn:()=>callMemberRpc('admin_whatsapp_status',{p_id:id}),
  staleTime:10_000, refetchInterval:30_000, refetchIntervalInBackground:false,
});

export const useRejectMember = () => useMemberMutation(id => callMemberRpc('admin_review_member', {
  p_id: id,
  p_status: 'rejected',
}));

export const useReviewMember = () => useMemberMutation(({ id, status }) => {
  if (!['pending', 'rejected'].includes(status)) throw new Error('Choose a valid application status.');
  return callMemberRpc('admin_review_member', { p_id: id, p_status: status });
});

export const useSetMemberActive = () => useMemberMutation(({ id, is_active }) => {
  if (typeof is_active !== 'boolean') throw new Error('Choose whether the member is active.');
  return callMemberRpc('admin_set_member_active', { p_id: id, p_active: is_active });
});

export const useAssignTeam = () => useMemberMutation(async ({ member_id, team_id }) => {
  const { data, error } = await supabase.from('member_team_assignment')
    .insert({ member_id, team_id }).select().single();
  if (error) throw error;
  return data;
});

export const useRemoveTeam = () => useMemberMutation(async ({ member_id, team_id }) => {
  const { data, error } = await supabase.from('member_team_assignment')
    .delete().match({ member_id, team_id }).select('member_id').single();
  if (error) throw error;
  return data;
});

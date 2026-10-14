import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const DEFAULT_ACADEMIC_YEAR = '2026/2027';
export const DEFAULT_CUTOFF_BATCH = 2008;
export const DEFAULT_FEE_LKR = 500;

export function useAppConfig() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .abortSignal(signal);

      if (error) {
        // Fallback for local environments or before table migration
        return {
          ACADEMIC_YEAR: DEFAULT_ACADEMIC_YEAR,
          ACADEMIC_BATCH_YEAR: DEFAULT_CUTOFF_BATCH,
          MEMBERSHIP_FEE_LKR: DEFAULT_FEE_LKR,
          raw: [
            { key: 'ACADEMIC_YEAR', value: DEFAULT_ACADEMIC_YEAR, description: 'Active academic cycle for membership fee collection (March to March)' },
            { key: 'ACADEMIC_BATCH_YEAR', value: String(DEFAULT_CUTOFF_BATCH), description: 'Cutoff batch year: only batches above this year count towards active fees' },
            { key: 'MEMBERSHIP_FEE_LKR', value: String(DEFAULT_FEE_LKR), description: 'Standard yearly membership fee in LKR' },
          ],
        };
      }

      const map = {};
      for (const row of data || []) {
        map[row.key] = row.value;
      }

      return {
        ACADEMIC_YEAR: map.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR,
        ACADEMIC_BATCH_YEAR: map.ACADEMIC_BATCH_YEAR ? Number(map.ACADEMIC_BATCH_YEAR) : DEFAULT_CUTOFF_BATCH,
        MEMBERSHIP_FEE_LKR: map.MEMBERSHIP_FEE_LKR ? Number(map.MEMBERSHIP_FEE_LKR) : DEFAULT_FEE_LKR,
        raw: data || [],
      };
    },
    staleTime: 60_000,
  });
}

export function getActiveFee(member, activeYear = DEFAULT_ACADEMIC_YEAR) {
  if (!member) return null;
  if (Array.isArray(member.membership_fee)) {
    const found = member.membership_fee.find(f => f.academic_year === activeYear);
    if (found) return found;
    for (const item of member.membership_fee) {
      if (Array.isArray(item?.fees)) {
        const nested = item.fees.find(f => f.academic_year === activeYear);
        if (nested) return nested;
      }
    }
  } else if (member.membership_fee && typeof member.membership_fee === 'object') {
    if (Array.isArray(member.membership_fee.fees)) {
      return member.membership_fee.fees.find(f => f.academic_year === activeYear) || null;
    }
    if (member.membership_fee.academic_year === activeYear) {
      return member.membership_fee;
    }
  }
  if (member.fee_paid_at) {
    return {
      academic_year: activeYear,
      fee_amount: member.fee_amount || DEFAULT_FEE_LKR,
      paid_date: member.fee_paid_at,
    };
  }
  return null;
}

export function isFeePaid(member, activeYear = DEFAULT_ACADEMIC_YEAR) {
  return Boolean(getActiveFee(member, activeYear));
}

export function useAcademicFees(selectedAcademicYear) {
  const configQuery = useAppConfig();
  const activeYear = selectedAcademicYear || configQuery.data?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR;
  const cutoffBatch = configQuery.data?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH;
  const defaultFeeAmount = configQuery.data?.MEMBERSHIP_FEE_LKR || DEFAULT_FEE_LKR;

  return useQuery({
    queryKey: ['fees', 'academic-year', activeYear, cutoffBatch, defaultFeeAmount],
    queryFn: async ({ signal }) => {
      // 1. Fetch accepted members who are active students (batch strictly > cutoffBatch, i.e. > 2008)
      const { data: members, error: membersError } = await supabase
        .from('member')
        .select('id, full_name, name_with_initials, member_id, form_number, index_number, batch_year, membership_status, is_active, created_at, whatsapp_number')
        .eq('membership_status', 'accepted')
        .gt('batch_year', cutoffBatch)
        .order('batch_year', { ascending: false })
        .order('full_name', { ascending: true })
        .abortSignal(signal);

      if (membersError) throw membersError;

      // 2. Fetch fees for the academic year from 1-row-per-member JSONB array
      const { data: feeRows, error: feeError } = await supabase
        .from('membership_fee')
        .select('id, member_id, fees')
        .abortSignal(signal);

      const feeMap = new Map();
      const allCycles = new Set([activeYear]);
      if (!feeError && feeRows) {
        for (const row of feeRows) {
          const feesList = Array.isArray(row.fees) ? row.fees : [];
          for (const f of feesList) {
            if (f.academic_year) allCycles.add(f.academic_year);
          }
          const activeEntry = feesList.find(f => f.academic_year === activeYear);
          if (activeEntry) {
            feeMap.set(row.member_id, activeEntry);
          }
        }
      }

      // Strictly ensure batches <= cutoffBatch (<= 2008) are ignored from fees and payments
      const filteredMembers = (members || []).filter(m => Number(m.batch_year) > cutoffBatch);

      const enriched = filteredMembers.map(m => {
        const feeRecord = feeMap.get(m.id);
        const isPaid = Boolean(feeRecord);
        const paidAmount = Number(feeRecord?.fee_amount || (isPaid ? defaultFeeAmount : 0));
        const paidDate = feeRecord?.paid_date || null;
        const paymentMethod = feeRecord?.payment_method || 'cash';

        return {
          ...m,
          isPaid,
          feeRecord: feeRecord || null,
          paidAmount,
          paidDate,
          paymentMethod,
        };
      });

      const paidStudents = enriched.filter(m => m.isPaid);
      const unpaidStudents = enriched.filter(m => !m.isPaid);
      const collectedAmount = paidStudents.reduce((sum, m) => sum + (m.paidAmount || defaultFeeAmount), 0);
      const collectionRate = enriched.length ? Math.round((paidStudents.length / enriched.length) * 100) : 0;

      return {
        academicYear: activeYear,
        cutoffBatch,
        totalEligible: enriched.length,
        paidCount: paidStudents.length,
        unpaidCount: unpaidStudents.length,
        collectedAmount,
        collectionRate,
        cycles: Array.from(allCycles).sort().reverse(),
        all: enriched,
        paid: paidStudents,
        unpaid: unpaidStudents,
      };
    },
    staleTime: 20_000,
  });
}

export function useMemberFeeHistory(memberId) {
  return useQuery({
    queryKey: ['member-fee-history', memberId],
    enabled: Boolean(memberId),
    queryFn: async ({ signal }) => {
      // 1. Try RPC first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('admin_get_member_fee_history', { p_member_id: memberId })
        .abortSignal(signal);

      if (!rpcError && Array.isArray(rpcData)) {
        return rpcData;
      }

      // 2. Fallback to direct select from membership_fee
      const { data: tableData, error: tableError } = await supabase
        .from('membership_fee')
        .select('fees')
        .eq('member_id', memberId)
        .maybeSingle()
        .abortSignal(signal);

      if (!tableError && tableData?.fees && Array.isArray(tableData.fees)) {
        return tableData.fees;
      }

      return [];
    },
    staleTime: 20_000,
  });
}

export function useRecordMemberFee() {
  const queryClient = useQueryClient();
  const configQuery = useAppConfig();
  const defaultYear = configQuery.data?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR;
  const defaultFee = configQuery.data?.MEMBERSHIP_FEE_LKR || DEFAULT_FEE_LKR;

  return useMutation({
    mutationFn: async ({
      memberId,
      academicYear = defaultYear,
      feeAmount = defaultFee,
      notes = null,
      paymentMethod = 'cash',
    }) => {
      if (!memberId) throw new Error('Member ID is required.');
      if (!academicYear) throw new Error('Academic year is required.');

      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_record_membership_fee', {
        p_member_id: memberId,
        p_academic_year: academicYear,
        p_fee_amount: Number(feeAmount),
        p_notes: notes,
        p_payment_method: paymentMethod,
      });

      if (rpcError) throw rpcError;
      return rpcData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['membership-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['member-fee-history', variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ['members', 'paid-list'] });
    },
  });
}

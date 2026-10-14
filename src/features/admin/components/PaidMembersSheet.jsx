import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Wallet, Calendar, CheckCircle2, Clock3, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminDialog } from './AdminDialog';
import { AdminLoading, AdminNumber } from './AdminMotion';
import { MemberDetails, MemberStatus, displayDate } from './MemberDirectory';
import { titleCase, nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { Button } from '@/components/motion/button/base';
import { useAppConfig, DEFAULT_CUTOFF_BATCH, DEFAULT_FEE_LKR } from '@/entities/members/hooks/useFees';

export function usePaidMembers() {
  const configQuery = useAppConfig();
  const cutoffBatch = configQuery.data?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH;

  return useQuery({
    queryKey: ['members', 'paid-list', cutoffBatch],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('membership_fee')
        .select(`
          id,
          fees,
          member:member_id (
            id,
            member_id,
            form_number,
            index_number,
            full_name,
            name_with_initials,
            batch_year,
            membership_status,
            is_active
          )
        `)
        .abortSignal(signal);
      if (error) throw error;
      const rows = [];
      for (const r of data || []) {
        if (!r.member || !r.member.batch_year || Number(r.member.batch_year) <= cutoffBatch) continue;
        const feesList = Array.isArray(r.fees) ? r.fees : [];
        for (const fee of feesList) {
          rows.push({
            id: r.member.id,
            member_id: r.member.member_id,
            form_number: r.member.form_number,
            index_number: r.member.index_number,
            full_name: r.member.full_name,
            name_with_initials: r.member.name_with_initials,
            batch_year: r.member.batch_year,
            fee_amount: fee.fee_amount,
            fee_paid_at: fee.paid_date,
            academic_year: fee.academic_year,
            receipt_number: fee.receipt_number,
            recorded_by_name: fee.recorded_by_name,
            notes: fee.notes,
            membership_status: r.member.membership_status,
            is_active: r.member.is_active,
          });
        }
      }
      return rows.sort((a, b) => new Date(b.fee_paid_at || 0) - new Date(a.fee_paid_at || 0));
    },
    staleTime: 20_000,
  });
}

export function usePendingMembers() {
  const configQuery = useAppConfig();
  const cutoffBatch = configQuery.data?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH;

  return useQuery({
    queryKey: ['members', 'pending-student-list', cutoffBatch],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('member')
        .select(`
          id,
          member_id,
          form_number,
          index_number,
          full_name,
          name_with_initials,
          batch_year,
          membership_status,
          is_active,
          created_at,
          membership_fee (
            id,
            fees
          )
        `)
        .eq('membership_status', 'pending')
        .gt('batch_year', cutoffBatch)
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      return (data || [])
        .filter(r => Number(r.batch_year) > cutoffBatch)
        .map(r => {
          const mf = Array.isArray(r.membership_fee) ? r.membership_fee[0] : r.membership_fee;
          const fee = (mf?.fees || [])[0];
          return {
            ...r,
            fee_amount: fee?.fee_amount || null,
            fee_paid_at: fee?.paid_date || null,
          };
        });
    },
    staleTime: 20_000,
  });
}

export function PaidMembersSheet({ open, onClose, initialTab = 'paid' }) {
  const [tab, setTab] = useState(initialTab);
  const configQuery = useAppConfig();
  const cutoffBatch = configQuery.data?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH;
  const defaultFee = configQuery.data?.MEMBERSHIP_FEE_LKR ?? DEFAULT_FEE_LKR;

  const paidQuery = usePaidMembers();
  const pendingQuery = usePendingMembers();
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSelectedBatch('all');
      setSearch('');
    }
  }, [open, initialTab]);

  const paidRows = useMemo(() => {
    return (paidQuery.data || []).filter(r => Number(r.batch_year) > cutoffBatch);
  }, [paidQuery.data, cutoffBatch]);

  const pendingRows = useMemo(() => {
    return (pendingQuery.data || []).filter(r => Number(r.batch_year) > cutoffBatch);
  }, [pendingQuery.data, cutoffBatch]);

  const isPendingTab = tab === 'pending';
  const query = isPendingTab ? pendingQuery : paidQuery;
  const currentRows = isPendingTab ? pendingRows : paidRows;

  // Batch breakdown stats
  const batchStats = useMemo(() => {
    const map = new Map();
    let totalSum = 0;

    for (const row of currentRows) {
      const bKey = row.batch_year ? String(row.batch_year) : 'unassigned';
      const amt = isPendingTab ? defaultFee : Number(row.fee_amount || 0);
      totalSum += amt;

      const current = map.get(bKey) || { count: 0, totalAmount: 0 };
      map.set(bKey, {
        count: current.count + 1,
        totalAmount: current.totalAmount + amt,
      });
    }

    const sortedBatches = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'unassigned') return 1;
      if (b === 'unassigned') return -1;
      return Number(b) - Number(a);
    });

    return { map, sortedBatches, totalSum };
  }, [currentRows, isPendingTab, defaultFee]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return currentRows.filter(row => {
      const bKey = row.batch_year ? String(row.batch_year) : 'unassigned';
      const matchesBatch = selectedBatch === 'all' || bKey === selectedBatch;
      if (!matchesBatch) return false;

      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      const name = (row.full_name || '').toLowerCase();
      const initials = (row.name_with_initials || '').toLowerCase();
      const memberId = (row.member_id || '').toLowerCase();
      const indexNum = (row.index_number || '').toLowerCase();
      const formNum = (row.form_number || '').toLowerCase();

      return (
        name.includes(term) ||
        initials.includes(term) ||
        memberId.includes(term) ||
        indexNum.includes(term) ||
        formNum.includes(term)
      );
    });
  }, [currentRows, selectedBatch, search]);

  const activeBatchTotal = useMemo(() => {
    if (selectedBatch === 'all') return batchStats.totalSum;
    return batchStats.map.get(selectedBatch)?.totalAmount || 0;
  }, [selectedBatch, batchStats]);

  return (
    <>
      <AdminDialog
        open={open}
        onClose={onClose}
        title={isPendingTab ? "Pending membership applications" : "Recorded fee payments"}
        description={
          isPendingTab
            ? `${pendingRows.length} pending applications · Est. LKR ${batchStats.totalSum.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
            : `${paidRows.length} confirmed payments · LKR ${batchStats.totalSum.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
        }
        drawer={true}
        wide={true}
        footer={
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="adm-paid-sheet">
          {/* Dual Segment Switcher */}
          <div className="adm-sheet-tabs" role="tablist" aria-label="Revenue record tabs">
            <button
              type="button"
              role="tab"
              aria-selected={!isPendingTab}
              className={`adm-sheet-tab ${!isPendingTab ? 'adm-sheet-tab-active' : ''}`}
              onClick={() => { setTab('paid'); setSelectedBatch('all'); setSearch(''); }}
            >
              <CheckCircle2 size={14} />
              <span>Paid records</span>
              <span className="adm-sheet-tab-count">{paidRows.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isPendingTab}
              className={`adm-sheet-tab ${isPendingTab ? 'adm-sheet-tab-active' : ''}`}
              onClick={() => { setTab('pending'); setSelectedBatch('all'); setSearch(''); }}
            >
              <Clock3 size={14} />
              <span>Pending applications</span>
              <span className="adm-sheet-tab-count">{pendingRows.length}</span>
            </button>
          </div>
          {/* Quick Summary Pill Bar */}
          <div className="adm-paid-summary-bar">
            <div className="adm-paid-summary-stat">
              <span className="adm-paid-summary-label">{isPendingTab ? 'Est. Dues' : 'Collected'}</span>
              <strong className="adm-paid-summary-val">
                LKR <AdminNumber value={activeBatchTotal} />
              </strong>
            </div>
            <div className="adm-paid-summary-stat">
              <span className="adm-paid-summary-label">{isPendingTab ? 'Applicants' : 'Students'}</span>
              <strong className="adm-paid-summary-val">
                <AdminNumber value={filteredRows.length} />
              </strong>
            </div>
            <div className="adm-paid-summary-stat">
              <span className="adm-paid-summary-label">Batches</span>
              <strong className="adm-paid-summary-val">
                {batchStats.sortedBatches.length}
              </strong>
            </div>
          </div>

          {/* Batch Selector Pills */}
          <div className="adm-paid-batch-nav" role="tablist" aria-label="Filter by batch">
            <button
              type="button"
              role="tab"
              aria-selected={selectedBatch === 'all'}
              className="adm-paid-batch-pill"
              onClick={() => setSelectedBatch('all')}
            >
              <span>All batches</span>
              <span className="adm-paid-pill-badge">{currentRows.length}</span>
            </button>

            {batchStats.sortedBatches.map(([bKey, data]) => (
              <button
                type="button"
                key={bKey}
                role="tab"
                aria-selected={selectedBatch === bKey}
                className="adm-paid-batch-pill"
                onClick={() => setSelectedBatch(bKey)}
              >
                <span>{bKey === 'unassigned' ? 'Unassigned' : `Batch ${bKey}`}</span>
                <span className="adm-paid-pill-badge">{data.count}</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="adm-paid-search-wrap">
            <Search size={15} className="adm-paid-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="adm-paid-search-input"
              placeholder={isPendingTab ? "Search pending applicant name, admission or form..." : "Search paid student name, ID or admission..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={isPendingTab ? "Search pending applicants" : "Search paid students"}
            />
            {search && (
              <button
                type="button"
                className="adm-paid-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Content / Paid Student List */}
          {query.isPending ? (
            <div className="adm-paid-state">
              <AdminLoading>{isPendingTab ? "Loading pending applications..." : "Loading paid students..."}</AdminLoading>
            </div>
          ) : query.isError ? (
            <div className="adm-paid-state" role="alert">
              <p>{isPendingTab ? "Could not load pending applications." : "Could not load paid students."}</p>
              <Button type="button" variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="adm-paid-state">
              <Wallet size={28} className="adm-paid-empty-icon" />
              <h3>{isPendingTab ? "No pending applications found" : "No paid students found"}</h3>
              <p>
                {search
                  ? `No students matching "${search}" in this batch.`
                  : isPendingTab
                    ? 'No pending applications for this selection.'
                    : 'No payments have been confirmed for this selection.'}
              </p>
            </div>
          ) : (
            <div className="adm-paid-list" role="list">
              {filteredRows.map(member => {
                const displayName =
                  (member.name_with_initials || nameWithInitials(member.full_name) || titleCase(member.full_name)).toUpperCase();
                const feeAmt = Number(member.fee_amount || (isPendingTab ? defaultFee : 0));

                return (
                  <button
                    type="button"
                    key={member.id}
                    className="adm-paid-item"
                    onClick={() => setDetailId(member.id)}
                    aria-label={`View details for ${displayName}`}
                  >
                    <div className="adm-paid-item-main">
                      <span className="adm-avatar" aria-hidden="true">
                        {member.full_name?.charAt(0).toUpperCase() || 'M'}
                      </span>
                      <div className="adm-paid-item-info">
                        <strong>{displayName}</strong>
                        <div className="adm-paid-item-meta">
                          {member.batch_year ? (
                            <span className="adm-paid-batch-tag">Batch {member.batch_year}</span>
                          ) : (
                            <span className="adm-paid-batch-tag is-muted">No batch</span>
                          )}
                          <span>
                            {member.form_number ? `Form: ${member.form_number}` : member.index_number ? `Adm: ${member.index_number}` : member.member_id ? `ID: ${member.member_id}` : 'Online'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="adm-paid-item-payment">
                      {isPendingTab ? (
                        <>
                          <div className="adm-pending-amount">
                            LKR {feeAmt.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="adm-pending-date">
                            <Clock3 size={12} className="inline mr-1 text-amber-400" />
                            Awaiting review
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="adm-paid-amount">
                            LKR {feeAmt.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="adm-paid-date">
                            <CheckCircle2 size={12} className="inline mr-1 text-emerald-400" />
                            {displayDate(member.fee_paid_at)}
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </AdminDialog>

      {/* Member Details Modal if user clicks on a student in the sheet */}
      {detailId && (
        <MemberDetails
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => {}}
        />
      )}
    </>
  );
}

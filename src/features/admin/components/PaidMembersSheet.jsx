import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Wallet, Calendar, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminDialog } from './AdminDialog';
import { AdminLoading, AdminNumber } from './AdminMotion';
import { MemberDetails, MemberStatus, displayDate } from './MemberDirectory';
import { titleCase, nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { Button } from '@/components/motion/button/base';

export function usePaidMembers() {
  return useQuery({
    queryKey: ['members', 'paid-list'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('member')
        .select('id, member_id, form_number, index_number, full_name, name_with_initials, batch_year, fee_amount, fee_paid_at, membership_status, is_active, application_source')
        .not('fee_paid_at', 'is', null)
        .order('fee_paid_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      return data || [];
    },
    staleTime: 20_000,
  });
}

export function PaidMembersSheet({ open, onClose }) {
  const query = usePaidMembers();
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  const rows = query.data || [];

  // Batch breakdown stats
  const batchStats = useMemo(() => {
    const map = new Map();
    let totalSum = 0;

    for (const row of rows) {
      const bKey = row.batch_year ? String(row.batch_year) : 'unassigned';
      const amt = Number(row.fee_amount || 0);
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
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
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
  }, [rows, selectedBatch, search]);

  const activeBatchTotal = useMemo(() => {
    if (selectedBatch === 'all') return batchStats.totalSum;
    return batchStats.map.get(selectedBatch)?.totalAmount || 0;
  }, [selectedBatch, batchStats]);

  return (
    <>
      <AdminDialog
        open={open}
        onClose={onClose}
        title="Recorded fee payments"
        description={`${rows.length} confirmed payments · LKR ${batchStats.totalSum.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
        drawer={true}
        wide={true}
        footer={
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="adm-paid-sheet">
          {/* Quick Summary Pill Bar */}
          <div className="adm-paid-summary-bar">
            <div className="adm-paid-summary-stat">
              <span className="adm-paid-summary-label">Collected</span>
              <strong className="adm-paid-summary-val">
                LKR <AdminNumber value={activeBatchTotal} />
              </strong>
            </div>
            <div className="adm-paid-summary-stat">
              <span className="adm-paid-summary-label">Students</span>
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
              <span className="adm-paid-pill-badge">{rows.length}</span>
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
              placeholder="Search paid student name, ID or admission..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search paid students"
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
              <AdminLoading>Loading paid students...</AdminLoading>
            </div>
          ) : query.isError ? (
            <div className="adm-paid-state" role="alert">
              <p>Could not load paid students.</p>
              <Button type="button" variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="adm-paid-state">
              <Wallet size={28} className="adm-paid-empty-icon" />
              <h3>No paid students found</h3>
              <p>
                {search
                  ? `No students matching "${search}" in this batch.`
                  : 'No payments have been confirmed for this selection.'}
              </p>
            </div>
          ) : (
            <div className="adm-paid-list" role="list">
              {filteredRows.map(member => {
                const displayName =
                  (member.name_with_initials || nameWithInitials(member.full_name) || titleCase(member.full_name)).toUpperCase();
                const feeAmt = Number(member.fee_amount || 0);

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
                            {member.member_id ? `ID: ${member.member_id}` : `Adm: ${member.index_number || '–'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="adm-paid-item-payment">
                      <div className="adm-paid-amount">
                        LKR {feeAmt.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="adm-paid-date">
                        <CheckCircle2 size={12} className="inline mr-1 text-emerald-400" />
                        {displayDate(member.fee_paid_at)}
                      </div>
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

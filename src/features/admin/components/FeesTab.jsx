import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Receipt,
  CheckCircle2,
  Clock3,
  Check,
  Copy,
  X,
  SlidersHorizontal,
  Eye,
  MoreHorizontal,
  MessageCircle,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import {
  useAppConfig,
  useAcademicFees,
  useMemberFeeHistory,
  useRecordMemberFee,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_FEE_LKR,
} from '@/entities/members/hooks/useFees';
import { useMemberBatches } from '@/entities/members/hooks/useMembers';
import { AdminLoading, AdminPagination } from './AdminMotion';
import { AdminDialog } from './AdminDialog';
import { MemberDetails, displayDate } from './MemberDirectory';
import { titleCase, nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { buildFeePaymentWhatsappLink } from '@/entities/members/lib/whatsappLink';
import { Button } from '@/components/motion/button/base';
import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleIndicator,
} from '@/components/motion/collapsible';
import { useToast } from '@/context/ToastContext';
import '../fees.css';

const PAGE_SIZE = 20;

export function FeesTab() {
  const configQuery = useAppConfig();
  const config = configQuery.data;
  const activeYear = config?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR;
  const cutoffBatch = config?.ACADEMIC_BATCH_YEAR ?? 2008;
  const defaultFeeAmount = config?.MEMBERSHIP_FEE_LKR || DEFAULT_FEE_LKR;

  const [selectedCycle, setSelectedCycle] = useState(activeYear);
  useEffect(() => {
    if (activeYear) {
      setSelectedCycle(prev => (prev === '2026/2027' ? activeYear : prev || activeYear));
    }
  }, [activeYear]);

  const feesQuery = useAcademicFees(selectedCycle);
  const batchesQuery = useMemberBatches();
  const recordFeeMutation = useRecordMemberFee();
  const { addToast } = useToast();

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [batchFilter, setBatchFilter] = useState(null); // string batch or null for all
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);

  // Modals & Drawers
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperTargetMember, setStepperTargetMember] = useState(null);
  const [receiptMember, setReceiptMember] = useState(null);
  const [detailId, setDetailId] = useState(null);

  // Available batches for tabs (only active student batches strictly > cutoffBatch)
  const availableBatches = useMemo(() => {
    const batchSet = new Set();
    (batchesQuery.data || []).forEach(b => {
      const year = Number(b.batch_year);
      if (!Number.isNaN(year) && year > cutoffBatch) {
        batchSet.add(year);
      }
    });
    (feesQuery.data?.all || []).forEach(m => {
      const year = Number(m.batch_year);
      if (!Number.isNaN(year) && year > cutoffBatch) {
        batchSet.add(year);
      }
    });
    return Array.from(batchSet).sort((a, b) => b - a);
  }, [batchesQuery.data, feesQuery.data?.all, cutoffBatch]);

  // Academic year options: dynamically generated from activeYear (active cycle + next 2 years)
  const academicYearOptions = useMemo(() => {
    const match = String(activeYear).match(/^(\d{4})\/(\d{4})$/);
    if (!match) return [activeYear];
    const start = parseInt(match[1], 10);
    return [
      `${start}/${start + 1}`,
      `${start + 1}/${start + 2}`,
      `${start + 2}/${start + 3}`,
    ];
  }, [activeYear]);

  // Eligible members from query
  const eligibleMembers = feesQuery.data?.all || [];

  // Filter members by selected batch pill first
  const batchMembers = useMemo(() => {
    if (!batchFilter) return eligibleMembers;
    return eligibleMembers.filter(m => String(m.batch_year) === String(batchFilter));
  }, [eligibleMembers, batchFilter]);

  // Selected batch statistics for dynamic tab badges & summary
  const batchStats = useMemo(() => {
    const total = batchMembers.length;
    const paid = batchMembers.filter(m => m.isPaid).length;
    const unpaid = batchMembers.filter(m => !m.isPaid).length;
    const collected = batchMembers
      .filter(m => m.isPaid)
      .reduce((sum, m) => sum + (m.paidAmount || defaultFeeAmount), 0);
    const collectionRate = total ? Math.round((paid / total) * 100) : 0;
    return { total, paid, unpaid, collected, collectionRate };
  }, [batchMembers, defaultFeeAmount]);

  // Filtered members list based on status filter, search query and sorting
  const filteredMembers = useMemo(() => {
    let list = [...batchMembers];

    // Status filter
    if (statusFilter === 'paid') {
      list = list.filter(m => m.isPaid);
    } else if (statusFilter === 'unpaid') {
      list = list.filter(m => !m.isPaid);
    }

    // Search query
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(m => {
        const fullName = (m.full_name || '').toLowerCase();
        const initialsName = (m.name_with_initials || '').toLowerCase();
        const memberId = (m.member_id || '').toLowerCase();
        const indexNumber = (m.index_number || '').toLowerCase();
        const formNumber = (m.form_number || '').toLowerCase();
        return (
          fullName.includes(term) ||
          initialsName.includes(term) ||
          memberId.includes(term) ||
          indexNumber.includes(term) ||
          formNumber.includes(term)
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'name_desc':
          return (b.full_name || '').localeCompare(a.full_name || '');
        case 'unpaid_first':
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'paid_first':
          if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1;
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'id_asc':
          return (a.member_id || 'ZZZZ').localeCompare(b.member_id || 'ZZZZ');
        case 'admission_asc': {
          const numA = Number(a.index_number) || 999999;
          const numB = Number(b.index_number) || 999999;
          return numA - numB;
        }
        case 'batch_desc':
          return (Number(b.batch_year) || 0) - (Number(a.batch_year) || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [batchMembers, statusFilter, search, sort]);

  // Pagination
  const totalCount = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  // Actions
  function handleOpenStepper(member = null) {
    setStepperTargetMember(member);
    setStepperOpen(true);
  }

  function handleCloseStepper() {
    setStepperOpen(false);
    setStepperTargetMember(null);
  }

  async function handleRecordFeeSubmit({ memberId, academicYear, feeAmount, notes, student }) {
    try {
      await recordFeeMutation.mutateAsync({
        memberId,
        academicYear,
        feeAmount,
        paymentMethod: 'cash',
        notes,
      });

      addToast({
        type: 'success',
        message: `LKR ${Number(feeAmount).toLocaleString('en-LK')} recorded for ${titleCase(student?.full_name || 'member')} (${academicYear}).`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to record fee payment.',
      });
      throw err;
    }
  }

  async function handleCopyMemberId(member) {
    if (!member?.member_id) return;
    try {
      await navigator.clipboard.writeText(member.member_id);
      addToast({ type: 'success', message: `Copied Member ID: ${member.member_id}` });
    } catch {
      addToast({ type: 'error', message: 'Could not copy Member ID.' });
    }
  }

  return (
    <div className="adm-directory adm-fees-page">
      {/* 1. Header Section */}
      <div className="adm-section-heading">
        <div>
          <h1>Membership fees</h1>
          <p>Track annual dues, verify payment status, and record membership fees.</p>
        </div>
        <Button type="button" onClick={() => handleOpenStepper(null)}>
          <Plus size={17} /> Record payment
        </Button>
      </div>

      {/* 2. Batch Navigation Tabs (native component from MemberDirectory) */}
      <nav className="adm-batch-tabs" aria-label="Filter by batch">
        <button
          type="button"
          aria-pressed={!batchFilter}
          onClick={() => {
            setBatchFilter(null);
            setPage(1);
          }}
        >
          All batches
        </button>
        {availableBatches.map(b => (
          <button
            type="button"
            key={b}
            aria-pressed={String(b) === String(batchFilter)}
            onClick={() => {
              setBatchFilter(String(b) === String(batchFilter) ? null : String(b));
              setPage(1);
            }}
          >
            {b}
          </button>
        ))}
      </nav>

      {/* 3. beUI Animated Paid / Unpaid Tabs with dynamic batch counts */}
      <div className="adm-fees-status-tabs">
        <Tabs
          value={statusFilter}
          onValueChange={val => {
            setStatusFilter(val);
            setPage(1);
          }}
          variant="pill"
        >
          <TabsList>
            <TabsTrigger value="all">
              All eligible ({batchStats.total})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid ({batchStats.paid})
            </TabsTrigger>
            <TabsTrigger value="unpaid">
              Unpaid ({batchStats.unpaid})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 3. Main Roster Panel */}
      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search-area">
            <div className="adm-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, ID, admission, form..."
              />
            </div>
            {search && (
              <button
                type="button"
                className="adm-clear-search"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="adm-filters">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Filter fee status"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid only</option>
              <option value="unpaid">Unpaid only</option>
            </select>

            <select
              aria-label="Academic cycle"
              value={selectedCycle}
              onChange={e => {
                setSelectedCycle(e.target.value);
                setPage(1);
              }}
            >
              {academicYearOptions.map(c => (
                <option key={c} value={c}>
                  {c}{c === activeYear ? ' (Active)' : ''}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort members"
              value={sort}
              onChange={e => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="name">Name A to Z</option>
              <option value="name_desc">Name Z to A</option>
              <option value="unpaid_first">Unpaid first</option>
              <option value="paid_first">Paid first</option>
              <option value="id_asc">Member ID</option>
              <option value="admission_asc">Admission No.</option>
              <option value="batch_desc">Batch (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="adm-table-summary">
          <span>
            {feesQuery.isPending
              ? 'Loading fee records...'
              : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'member' : 'members'} · ${batchStats.paid} paid, ${batchStats.unpaid} unpaid [${selectedCycle}]`}
          </span>
          {feesQuery.isFetching && !feesQuery.isPending && <AdminLoading>Updating...</AdminLoading>}
          <span className="adm-fees-collected-badge">
            LKR {batchStats.collected.toLocaleString('en-LK', { minimumFractionDigits: 2 })} collected ({batchStats.collectionRate}%)
          </span>
        </div>

        {/* Table Content */}
        {feesQuery.isError ? (
          <div className="adm-state" role="alert">
            <Receipt size={28} />
            <h3>Could not load fee records</h3>
            <p>{feesQuery.error?.message || 'A network error occurred while loading fees.'}</p>
            <Button type="button" variant="secondary" onClick={() => feesQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : feesQuery.isPending ? (
          <div className="adm-skeleton-table" aria-busy="true">
            <AdminLoading>Loading fee records...</AdminLoading>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="adm-state">
            <Receipt size={28} />
            <h3>No members found</h3>
            <p>
              {search
                ? 'Try a different search term or clear the filter.'
                : statusFilter === 'unpaid'
                  ? `All members in this selection have completed fee payments for ${selectedCycle}!`
                  : `No records match the current filter criteria for ${selectedCycle}.`}
            </p>
            {page > 1 && (
              <Button type="button" onClick={() => setPage(1)}>
                Back to first page
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) matching media_1792018536837.png */}
            <div className="adm-table-wrap hidden md:block">
              <table className="adm-fees-table">
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th>PAYMENT STATUS ({selectedCycle})</th>
                    <th>PAYMENT DETAILS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map(m => {
                    const initialsName = nameWithInitials(m.full_name);

                    return (
                      <tr key={m.id}>
                        {/* Member avatar & info */}
                        <td>
                          <button
                            type="button"
                            className="adm-person"
                            onClick={() => setDetailId(m.id)}
                          >
                            <span className="adm-avatar-box">
                              {m.full_name?.charAt(0).toUpperCase()}
                            </span>
                            <span>
                              <strong title={titleCase(m.full_name)}>
                                {initialsName}
                              </strong>
                              <small>
                                Admission {m.index_number || '–'} · Batch {m.batch_year || '–'} · {m.member_id || 'Pending ID'}
                              </small>
                            </span>
                          </button>
                        </td>

                        {/* Fee status badge */}
                        <td>
                          <span
                            className={`adm-fee-badge ${m.isPaid ? 'is-paid' : 'is-unpaid'}`}
                          >
                            <span className="adm-fee-dot" />
                            {m.isPaid
                              ? `PAID - LKR ${Number(m.paidAmount || defaultFeeAmount).toLocaleString('en-LK')}`
                              : 'UNPAID'}
                          </span>
                        </td>

                        {/* Payment details */}
                        <td>
                          {m.isPaid ? (
                            <div className="adm-fee-detail-text">
                              <strong>{displayDate(m.paidDate)}</strong>
                              <small>
                                {titleCase(m.feeRecord?.payment_method || 'cash')}
                                {m.feeRecord?.notes ? ` · ${m.feeRecord.notes}` : ''}
                              </small>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Awaiting payment
                            </span>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="adm-row-actions">
                            {/* Primary quick action: Receipt if paid, Record Payment if unpaid */}
                            {m.isPaid ? (
                              <button
                                type="button"
                                className="adm-btn-action-receipt"
                                title="View payment receipt"
                                onClick={() => setReceiptMember(m)}
                              >
                                <Receipt size={13} />
                                <span>Receipt</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="adm-btn-action-record"
                                title="Record membership fee payment"
                                onClick={() => handleOpenStepper(m)}
                              >
                                <Plus size={13} />
                                <span>Record</span>
                              </button>
                            )}

                            {/* Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="adm-more-btn"
                                  aria-label={`Options for ${initialsName}`}
                                >
                                  <MoreHorizontal size={18} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="adm-member-menu">
                                {m.isPaid ? (
                                  <>
                                    <DropdownMenuItem onSelect={() => setReceiptMember(m)}>
                                      <Receipt /> View receipt
                                    </DropdownMenuItem>
                                    {m.whatsapp_number && (
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          const url = buildFeePaymentWhatsappLink({
                                            member: m,
                                            academicYear: selectedCycle,
                                            amount: m.paidAmount || defaultFeeAmount,
                                            paymentMethod: 'cash',
                                            paidDate: m.paidDate,
                                          });
                                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                        }}
                                      >
                                        <MessageCircle /> Send WhatsApp receipt
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <DropdownMenuItem onSelect={() => handleOpenStepper(m)}>
                                    <Plus /> Record fee payment
                                  </DropdownMenuItem>
                                )}
                                {m.member_id && (
                                  <DropdownMenuItem onSelect={() => handleCopyMemberId(m)}>
                                    <Copy /> Copy Member ID
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setDetailId(m.id)}>
                                  <Eye /> View profile
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Collapsible View (< 768px) */}
            <div className="adm-mobile-members md:hidden">
              {paginatedRows.map(m => {
                const initialsName = nameWithInitials(m.full_name);

                return (
                  <div className="adm-mobile-member" key={m.id}>
                    <Collapsible className="adm-member-collapse">
                      <CollapsibleTrigger className="adm-member-collapse-trigger">
                        <span className="flex items-center gap-3">
                          <span className="adm-avatar-box text-xs">
                            {m.full_name?.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{initialsName}</strong>
                            <small>
                              Batch {m.batch_year || '–'} · {m.member_id || m.index_number || 'No ID'}
                            </small>
                          </span>
                        </span>
                        <span className={`adm-fee-badge ${m.isPaid ? 'is-paid' : 'is-unpaid'} mr-1`}>
                          {m.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                        <CollapsibleIndicator />
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="adm-mobile-member-body">
                          <dl>
                            <div>
                              <dt>Admission no.</dt>
                              <dd>{m.index_number || '–'}</dd>
                            </div>
                            <div>
                              <dt>Cycle {selectedCycle}</dt>
                              <dd>
                                {m.isPaid
                                  ? `Paid (LKR ${Number(m.paidAmount || defaultFeeAmount).toLocaleString('en-LK')})`
                                  : `Unpaid (LKR ${Number(defaultFeeAmount).toLocaleString('en-LK')})`}
                              </dd>
                            </div>
                            {m.isPaid && (
                              <div>
                                <dt>Paid date</dt>
                                <dd>
                                  {displayDate(m.paidDate)} (Cash)
                                </dd>
                              </div>
                            )}
                            <div>
                              <dt>Member ID</dt>
                              <dd>{m.member_id || 'Pending issue'}</dd>
                            </div>
                          </dl>

                          <div className="adm-mobile-row-actions">
                            {!m.isPaid ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenStepper(m)}
                                className="flex-1 min-h-[44px]"
                              >
                                <Plus size={16} /> Pay fee
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setReceiptMember(m)}
                                className="flex-1 min-h-[44px]"
                              >
                                <Receipt size={16} /> Receipt
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailId(m.id)}
                              className="min-h-[44px]"
                              aria-label="View member profile"
                            >
                              <Eye size={16} /> Details
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination matching Members tab */}
        <div className="adm-pagination">
          <span>
            {totalCount
              ? `${Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`
              : '0 records'}
          </span>
          <AdminPagination
            page={page}
            pages={totalPages}
            busy={feesQuery.isFetching || feesQuery.isPending}
            onChange={p => setPage(p)}
          />
        </div>
      </section>

      {/* 4. Stepper Payment Modal */}
      <FeePaymentStepperModal
        open={stepperOpen}
        onClose={handleCloseStepper}
        initialMember={stepperTargetMember}
        eligibleMembers={eligibleMembers}
        academicYearOptions={academicYearOptions}
        activeYear={activeYear}
        defaultFeeAmount={defaultFeeAmount}
        cutoffBatch={cutoffBatch}
        onRecordSuccess={handleRecordFeeSubmit}
      />

      {/* 5. Official Receipt Modal */}
      {receiptMember && (
        <FeeReceiptModal
          member={receiptMember}
          cycle={selectedCycle}
          defaultFeeAmount={defaultFeeAmount}
          onClose={() => setReceiptMember(null)}
        />
      )}

      {/* 7. Member Profile Drawer */}
      {detailId && (
        <MemberDetails
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}

/**
 * 3-Step Stepper Payment Modal:
 * Step 1: Search student and view student (no paid badge)
 * Step 2: Pay student (academic year dropdown starting 2026/2027 + next 2 years, checks if paid, constant fee amount, cash only)
 * Step 3: Confirmation and done, with WhatsApp receipt sending
 */
function FeePaymentStepperModal({
  open,
  onClose,
  initialMember,
  eligibleMembers,
  academicYearOptions,
  activeYear = DEFAULT_ACADEMIC_YEAR,
  defaultFeeAmount,
  cutoffBatch = 2008,
  onRecordSuccess,
}) {
  const [step, setStep] = useState(initialMember ? 2 : 1);
  const [student, setStudent] = useState(initialMember || null);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(academicYearOptions?.[0] || activeYear);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [recordedData, setRecordedData] = useState(null);

  // Fetch full fee history for the selected student to verify paid cycles
  const historyQuery = useMemberFeeHistory(student?.id);
  const studentFeeHistory = historyQuery.data || [];

  // Check if student has already paid for the selected year
  const existingPaymentForYear = useMemo(() => {
    if (!year || !studentFeeHistory.length) return null;
    return studentFeeHistory.find(f => f.academic_year === year) || null;
  }, [studentFeeHistory, year]);

  // Check if student belongs to an exempt / top board batch (<= 2008)
  const isExemptBatch = useMemo(() => {
    if (!student) return false;
    const by = Number(student.batch_year);
    return Number.isNaN(by) || by <= (cutoffBatch ?? 2008);
  }, [student, cutoffBatch]);

  // Sync initialMember when modal opens
  useEffect(() => {
    if (initialMember) {
      setStudent(initialMember);
      setStep(2);
    } else {
      setStep(1);
      setStudent(null);
    }
    setYear(academicYearOptions?.[0] || activeYear);
    setNotes('');
    setDone(false);
    setRecordedData(null);
    setSearch('');
  }, [open, initialMember, academicYearOptions, activeYear]);

  // Live filter for student search (Step 1)
  const matches = useMemo(() => {
    if (!search.trim()) return eligibleMembers.slice(0, 8);
    const q = search.trim().toLowerCase();
    return eligibleMembers
      .filter(m => {
        const fn = (m.full_name || '').toLowerCase();
        const ini = (m.name_with_initials || '').toLowerCase();
        const mid = (m.member_id || '').toLowerCase();
        const idx = (m.index_number || '').toLowerCase();
        return fn.includes(q) || ini.includes(q) || mid.includes(q) || idx.includes(q);
      })
      .slice(0, 8);
  }, [eligibleMembers, search]);

  const handleSubmitPayment = async () => {
    if (!student?.id || !year || existingPaymentForYear || isExemptBatch) return;
    setBusy(true);
    try {
      await onRecordSuccess({
        memberId: student.id,
        academicYear: year,
        feeAmount: Number(defaultFeeAmount),
        paymentMethod: 'cash',
        notes: notes.trim() || null,
        student,
      });
      setRecordedData({
        student,
        year,
        amount: Number(defaultFeeAmount),
        method: 'cash',
        notes: notes.trim() || null,
        paidDate: new Date().toISOString(),
      });
      setDone(true);
    } catch {
      // Error is toasted by caller
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setStudent(null);
    setSearch('');
    setStep(1);
    setDone(false);
    setRecordedData(null);
    setNotes('');
    setYear(academicYearOptions?.[0] || activeYear);
  };

  if (!open) return null;

  const whatsappReceiptLink = recordedData && recordedData.student?.whatsapp_number
    ? buildFeePaymentWhatsappLink({
        member: recordedData.student,
        academicYear: recordedData.year,
        amount: recordedData.amount,
        paymentMethod: 'cash',
        paidDate: recordedData.paidDate,
      })
    : null;

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={done ? 'Payment Recorded' : 'Record Membership Fee'}
      description={
        done
          ? 'Payment confirmed and receipt generated'
          : step === 1
            ? 'Step 1 of 3: Search and view student'
            : step === 2
              ? 'Step 2 of 3: Enter payment details'
              : 'Step 3 of 3: Review and confirm'
      }
      footer={
        done ? (
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="secondary" onClick={handleReset}>
              Record Another
            </Button>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : step === 1 ? (
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!student}
              onClick={() => setStep(2)}
            >
              Continue to Payment →
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button
              type="button"
              disabled={Boolean(existingPaymentForYear) || isExemptBatch}
              onClick={() => setStep(3)}
            >
              {isExemptBatch
                ? 'Batch Exempt from Fees'
                : existingPaymentForYear
                  ? 'Already Paid for Cycle'
                  : 'Review & Confirm →'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button
              type="button"
              disabled={busy || Boolean(existingPaymentForYear) || isExemptBatch}
              onClick={handleSubmitPayment}
            >
              {busy ? 'Recording...' : 'Confirm & Record Payment'}
            </Button>
          </div>
        )
      }
    >
      {/* 3-Step Progress Header */}
      {!done && (
        <div className="adm-stepper-progress" aria-label="Payment steps">
          <div className="adm-stepper-track">
            <div
              className="adm-stepper-track-fill"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />
          </div>
          <button
            type="button"
            className="adm-stepper-step"
            data-state={step === 1 ? 'active' : 'completed'}
            onClick={() => setStep(1)}
          >
            <span className="adm-stepper-bubble">1</span>
            <span className="adm-stepper-label">Student</span>
          </button>
          <button
            type="button"
            className="adm-stepper-step"
            data-state={step === 2 ? 'active' : step > 2 ? 'completed' : 'pending'}
            disabled={!student}
            onClick={() => student && setStep(2)}
          >
            <span className="adm-stepper-bubble">2</span>
            <span className="adm-stepper-label">Payment</span>
          </button>
          <button
            type="button"
            className="adm-stepper-step"
            data-state={step === 3 ? 'active' : 'pending'}
            disabled={!student || Boolean(existingPaymentForYear)}
            onClick={() => student && !existingPaymentForYear && setStep(3)}
          >
            <span className="adm-stepper-bubble">3</span>
            <span className="adm-stepper-label">Confirm</span>
          </button>
        </div>
      )}

      {/* Step 1: Search student & View student (no paid badge) */}
      {!done && step === 1 && (
        <div className="space-y-4">
          <div className="adm-fee-picker-search">
            <Search className="adm-fee-picker-icon" size={16} />
            <input
              type="text"
              className="adm-fee-picker-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student name, ID, or index number..."
              autoFocus
            />
          </div>

          <div className="adm-fee-picker-list" role="listbox">
            {matches.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No matching members found.
              </div>
            ) : (
              matches.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className="adm-fee-picker-item"
                  data-selected={student?.id === m.id}
                  onClick={() => setStudent(m)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="adm-avatar text-xs">{m.full_name?.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0 text-left">
                      <strong className="block text-xs font-semibold truncate text-white">
                        {nameWithInitials(m.full_name)}
                      </strong>
                      <small className="text-[10px] text-gray-400">
                        {m.member_id ? `ID: ${m.member_id} · ` : ''}Batch {m.batch_year || '–'}
                      </small>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {student && (
            <div className="adm-student-preview-card">
              <div className="adm-student-preview-info">
                <div className="adm-student-preview-avatar">
                  {student.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {titleCase(student.full_name)}
                  </h4>
                  <p className="text-xs text-gray-400">
                    Batch {student.batch_year || '–'} · {student.member_id ? `ID: ${student.member_id}` : 'No Member ID'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {student.whatsapp_number ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check size={12} /> WhatsApp: {student.whatsapp_number}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400">
                        No WhatsApp recorded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Pay student (dropdown starts 2026/2027 + next 2 years, checks if paid, constant fee amount, cash only) */}
      {!done && step === 2 && (
        <div className="space-y-4">
          {student && (
            <div className="adm-student-preview-card" style={{ marginTop: 0 }}>
              <div className="adm-student-preview-info">
                <span className="adm-avatar">{student.full_name?.charAt(0).toUpperCase()}</span>
                <div>
                  <strong className="block text-sm text-white">{nameWithInitials(student.full_name)}</strong>
                  <span className="text-xs text-gray-400">
                    Batch {student.batch_year || '–'} · {student.member_id ? `ID: ${student.member_id}` : 'Pending ID'}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Change
              </Button>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1" htmlFor="stepper-academic-year">
              Academic Year *
            </label>
            <select
              id="stepper-academic-year"
              className="w-full px-3 py-2 bg-black/40 border border-emerald-950/60 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              value={year}
              onChange={e => setYear(e.target.value)}
              required
            >
              {academicYearOptions.map((y, idx) => (
                <option key={y} value={y} className="bg-[#0b1710] text-white">
                  {y}{y === activeYear ? ' (Active Cycle)' : idx === 1 ? ' (Next Year)' : ''}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">
              Standard media academic cycle (March to March)
            </span>
          </div>

          {/* Alert if student belongs to an exempt / top board batch (<= 2008) */}
          {isExemptBatch && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Exempt from Membership Fees</strong>
                <span>
                  Batch {student.batch_year || 'prior'} members (≤ {cutoffBatch ?? 2008}) are top board / alumni and exempt from active annual fee obligations.
                </span>
              </div>
            </div>
          )}

          {/* Alert if the student has already paid for the selected year */}
          {existingPaymentForYear && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Already Paid for {year}</strong>
                <span>
                  This student has already paid LKR {Number(existingPaymentForYear.fee_amount || defaultFeeAmount).toLocaleString('en-LK')} for {year} on {displayDate(existingPaymentForYear.paid_date)}.
                </span>
              </div>
            </div>
          )}

          {/* Fee Amount: constant from config table */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
              Fee Amount (LKR)
            </label>
            <div className="w-full px-3 py-2.5 bg-black/40 border border-emerald-950/60 rounded-lg text-sm font-semibold text-emerald-400 flex items-center justify-between">
              <span>LKR {Number(defaultFeeAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              <span className="text-[11px] text-gray-400 font-normal">Standard configured fee</span>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1" htmlFor="stepper-notes">
              Notes (Optional)
            </label>
            <input
              id="stepper-notes"
              type="text"
              className="w-full px-3 py-2 bg-black/40 border border-emerald-950/60 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Receipt slip number, reference, or note"
            />
          </div>
        </div>
      )}

      {/* Step 3: Confirmation and Review */}
      {!done && step === 3 && (
        <div className="space-y-4">
          <section className="adm-receipt adm-receipt-paid" style={{ marginTop: 0 }}>
            <div className="adm-receipt-heading">
              <div>
                <span className="adm-eyebrow adm-eyebrow-paid">CONFIRMATION</span>
                <h3>Payment review for {year}</h3>
              </div>
              <span className="adm-id">{student?.member_id || 'Pending ID'}</span>
            </div>
            <dl>
              <div><dt>Student</dt><dd>{titleCase(student?.full_name)}</dd></div>
              <div><dt>Academic Cycle</dt><dd>{year}</dd></div>
              <div>
                <dt>Amount to Record</dt>
                <dd className="adm-receipt-amount">
                  LKR {Number(defaultFeeAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </dd>
              </div>
              <div><dt>Payment Method</dt><dd>Cash</dd></div>
              <div><dt>Admission No</dt><dd>{student?.index_number || 'Not recorded'}</dd></div>
              <div><dt>Batch</dt><dd>Batch {student?.batch_year || '–'}</dd></div>
            </dl>
            {notes && (
              <div className="adm-receipt-audit" style={{ marginBottom: 8 }}>
                <span>Notes: {notes}</span>
              </div>
            )}
          </section>

          <div className="p-3 bg-black/30 border border-emerald-950/40 rounded-xl text-xs text-gray-300 flex items-start gap-2">
            <MessageCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>WhatsApp Receipt</strong>
              <p className="text-gray-400 mt-0.5">
                {student?.whatsapp_number
                  ? `Once confirmed, you will be able to send an official receipt message to ${student.whatsapp_number}.`
                  : 'Student has no WhatsApp number on file. Receipt will be generated without messaging.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Done State */}
      {done && recordedData && (
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Payment Recorded Successfully</h3>
            <p className="text-xs text-gray-400 mt-1">
              LKR {Number(recordedData.amount).toLocaleString('en-LK')} recorded for{' '}
              {titleCase(recordedData.student?.full_name)} ({recordedData.year}).
            </p>
          </div>

          <section className="adm-receipt adm-receipt-paid text-left" style={{ marginTop: 12 }}>
            <div className="adm-receipt-heading">
              <div>
                <span className="adm-eyebrow adm-eyebrow-paid">
                  <CheckCircle2 size={12} aria-hidden="true" /> PAID
                </span>
                <h3>Receipt: {recordedData.year}</h3>
              </div>
              <span className="adm-id">{recordedData.student?.member_id || 'Pending ID'}</span>
            </div>
            <dl>
              <div><dt>Student</dt><dd>{titleCase(recordedData.student?.full_name)}</dd></div>
              <div><dt>Member ID</dt><dd className="adm-receipt-id">{recordedData.student?.member_id || '–'}</dd></div>
              <div>
                <dt>Fee Amount</dt>
                <dd className="adm-receipt-amount">
                  LKR {Number(recordedData.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </dd>
              </div>
              <div><dt>Date Received</dt><dd>{displayDate(recordedData.paidDate)}</dd></div>
            </dl>
          </section>

          {whatsappReceiptLink ? (
            <div className="adm-whatsapp-share-card text-left">
              <p className='pb-2'>Send receipt to <strong>{recordedData.student.whatsapp_number}</strong>:</p>
              <a
                href={whatsappReceiptLink}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-whatsapp-btn"
              >
                <MessageCircle size={17} />
                Send WhatsApp Receipt
                <ArrowUpRight size={15} />
              </a>
            </div>
          ) : (
            <div className="p-3 bg-black/30 border border-emerald-950/40 rounded-xl text-xs text-gray-400 text-left">
              No WhatsApp number recorded on file for this student.
            </div>
          )}
        </div>
      )}
    </AdminDialog>
  );
}

/**
 * Official Receipt Modal (Replaces Ledger)
 * Displays the clean tear-off / paid receipt with WhatsApp receipt action
 */
function FeeReceiptModal({ member, cycle, defaultFeeAmount, onClose }) {
  if (!member) return null;

  const activeFee = member.feeRecord || {};
  const amount = Number(member.paidAmount || activeFee.fee_amount || defaultFeeAmount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
  });
  const paidDate = member.paidDate || activeFee.paid_date || new Date().toISOString();

  const whatsappReceiptLink = member.whatsapp_number
    ? buildFeePaymentWhatsappLink({
        member,
        academicYear: cycle,
        amount: member.paidAmount || activeFee.fee_amount || defaultFeeAmount,
        paymentMethod: 'cash',
        paidDate,
      })
    : null;

  return (
    <AdminDialog
      open={Boolean(member)}
      onClose={onClose}
      title="Membership Fee Receipt"
      description={`Cycle ${cycle} Official Receipt`}
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <section className="adm-receipt adm-receipt-paid" aria-label="Membership fee payment confirmation">
        <div className="adm-receipt-heading">
          <div>
            <span className="adm-eyebrow adm-eyebrow-paid">
              <CheckCircle2 size={12} aria-hidden="true" /> PAID
            </span>
            <h3>Membership fee received ({cycle})</h3>
          </div>
          <span className="adm-id">Form {member.form_number || 'not recorded'}</span>
        </div>
        <p>Payment of <strong>LKR {amount}</strong> was confirmed on {displayDate(paidDate)}.</p>
        <dl>
          <div><dt>Name</dt><dd>{titleCase(member.full_name)}</dd></div>
          <div><dt>Member ID</dt><dd className="adm-receipt-id">{member.member_id || 'Pending issue'}</dd></div>
          <div><dt>Fee amount</dt><dd className="adm-receipt-amount">LKR {amount}</dd></div>
          <div><dt>Payment method</dt><dd>Cash</dd></div>
          <div><dt>Fee received</dt><dd>{displayDate(paidDate)}</dd></div>
          <div><dt>Admission No</dt><dd>{member.index_number || 'Not recorded'}</dd></div>
        </dl>
        {activeFee.notes && (
          <div className="adm-receipt-audit" style={{ marginBottom: 10 }}>
            <span>Notes: {activeFee.notes}</span>
          </div>
        )}
        <div className="adm-receipt-audit">
          <span>Processed by: {activeFee.recorded_by_name || 'Admin / System'}</span>
        </div>
      </section>

      {whatsappReceiptLink ? (
        <div className="adm-whatsapp-share-card">
          <p className='pb-2'>Send receipt to <strong>{member.whatsapp_number}</strong>:</p>
          <a
            href={whatsappReceiptLink}
            target="_blank"
            rel="noopener noreferrer"
            className="adm-whatsapp-btn"
          >
            <MessageCircle size={17} />
            Send WhatsApp Receipt
            <ArrowUpRight size={15} />
          </a>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-black/30 border border-emerald-950/40 rounded-xl text-xs text-gray-400">
          No WhatsApp number recorded on file for this student.
        </div>
      )}
    </AdminDialog>
  );
}



import { useState } from 'react';
import { ArrowLeft, SlidersHorizontal, Tags, Users, UserCheck, Clock3 } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { MemberDataTable } from './MemberDataTable';
import { MemberDetails, MemberStatus, ConfirmMemberAction, parseSortParam, formatSortParam } from './MemberDirectory';
import { MemberEditor, memberError } from './MemberEditor';
import { AdminSearch } from './AdminSearch';
import { AdminLoading, AdminPagination, AdminNumber } from './AdminMotion';
import { useMembers } from '@/entities/members/hooks/useMembers';
import './catalog.css';

export function SkillMembersView({ skill, onBack }) {
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [status, setStatus] = useState('all'); // 'all' (pending & accepted), 'accepted', 'pending'
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  // By default, query all students with states pending and approved
  const statuses = status === 'all' ? ['pending', 'accepted'] : [status];

  const query = useMembers({
    page,
    limit: 20,
    search: committedSearch,
    skill: skill.id,
    statuses,
    sort,
  });

  // Queries to get the counts for the overview cards
  const allCountQuery = useMembers({ page: 1, limit: 1, skill: skill.id, statuses: ['pending', 'accepted'] });
  const approvedCountQuery = useMembers({ page: 1, limit: 1, skill: skill.id, status: 'accepted' });
  const pendingCountQuery = useMembers({ page: 1, limit: 1, skill: skill.id, status: 'pending' });

  const rows = query.data?.data || [];
  const count = query.data?.count || 0;
  const pages = Math.max(1, Math.ceil(count / 20));

  const totalEnrolled = allCountQuery.data?.count ?? count;
  const approvedCount = approvedCountQuery.data?.count ?? 0;
  const pendingCount = pendingCountQuery.data?.count ?? 0;

  const tableSort = parseSortParam(sort, status === 'pending');
  const handleSortChange = (nextSort) => {
    const nextParam = formatSortParam(nextSort, status === 'pending');
    setSort(nextParam || 'newest');
    setPage(1);
  };

  const action = (type, member) => setModal({ type: 'action', action: { type, member } });

  return (
    <div className="adm-skill-view">
      <div className="adm-skill-header">
        <Button
          type="button"
          variant="ghost"
          className="adm-back-to-skills"
          onClick={onBack}
          aria-label="Back to skills catalog"
        >
          <ArrowLeft size={16} /> Back to skills
        </Button>

        <div className="adm-skill-heading">
          <div className="adm-eyebrow">
            <span /> SKILL ENROLMENT
          </div>
          <div className="adm-skill-title-row">
            <h1>{skill.skill_name}</h1>
            <span className={`adm-status ${skill.is_active === false ? 'adm-status-inactive' : 'adm-status-active'}`}>
              <i /> {skill.is_active === false ? 'Inactive' : 'Active'}
            </span>
          </div>
          <p className="adm-skill-desc">
            {skill.skill_desc || 'Students enrolled and interested in this skill across pending applications and approved members.'}
          </p>
        </div>
      </div>

      <div className="adm-member-analytics adm-skill-analytics" role="group" aria-label="Skill student breakdown">
        {allCountQuery.isPending && !allCountQuery.data ? (
          [1, 2, 3].map(n => <div key={n} className="adm-member-card adm-card-skeleton" />)
        ) : (
          <>
            <button
              type="button"
              className="adm-member-card"
              data-active={status === 'all'}
              onClick={() => { setStatus('all'); setPage(1); }}
              aria-label="Show all pending and approved students"
            >
              <div className="adm-member-card-head">
                <span className="adm-member-card-icon"><Users size={16} /></span>
                {status === 'all' ? (
                  <span className="adm-card-active-dot" aria-label="Active filter" />
                ) : (
                  <span className="adm-member-card-pct">All</span>
                )}
              </div>
              <div className="adm-member-card-body">
                <div className="adm-member-card-value">
                  <AdminNumber value={totalEnrolled} />
                </div>
                <div className="adm-member-card-label">
                  <span className="adm-label-desktop">All interested</span>
                  <span className="adm-label-mobile">All</span>
                </div>
                <div className="adm-member-card-note">
                  <span className="adm-label-desktop">Pending & approved</span>
                  <span className="adm-label-mobile">Total</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              className="adm-member-card"
              data-active={status === 'accepted'}
              onClick={() => { setStatus('accepted'); setPage(1); }}
              aria-label="Filter by approved members"
            >
              <div className="adm-member-card-head">
                <span className="adm-member-card-icon"><UserCheck size={16} /></span>
                {status === 'accepted' ? (
                  <span className="adm-card-active-dot" aria-label="Active filter" />
                ) : (
                  <span className="adm-member-card-pct">
                    {totalEnrolled > 0 ? `${Math.round((approvedCount / totalEnrolled) * 100)}%` : '0%'}
                  </span>
                )}
              </div>
              <div className="adm-member-card-body">
                <div className="adm-member-card-value">
                  <AdminNumber value={approvedCount} />
                </div>
                <div className="adm-member-card-label">
                  <span className="adm-label-desktop">Approved members</span>
                  <span className="adm-label-mobile">Approved</span>
                </div>
                <div className="adm-member-card-note">
                  <span className="adm-label-desktop">{approvedCount === 1 ? '1 active member' : `${approvedCount} active members`}</span>
                  <span className="adm-label-mobile">Active</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              className="adm-member-card"
              data-active={status === 'pending'}
              onClick={() => { setStatus('pending'); setPage(1); }}
              aria-label="Filter by pending applicants"
            >
              <div className="adm-member-card-head">
                <span className="adm-member-card-icon"><Clock3 size={16} /></span>
                {status === 'pending' ? (
                  <span className="adm-card-active-dot" aria-label="Active filter" />
                ) : (
                  <span className="adm-member-card-pct">
                    {totalEnrolled > 0 ? `${Math.round((pendingCount / totalEnrolled) * 100)}%` : '0%'}
                  </span>
                )}
              </div>
              <div className="adm-member-card-body">
                <div className="adm-member-card-value">
                  <AdminNumber value={pendingCount} />
                </div>
                <div className="adm-member-card-label">
                  <span className="adm-label-desktop">Pending applicants</span>
                  <span className="adm-label-mobile">Pending</span>
                </div>
                <div className="adm-member-card-note">
                  <span className="adm-label-desktop">{pendingCount === 1 ? '1 awaiting review' : `${pendingCount} awaiting review`}</span>
                  <span className="adm-label-mobile">Review</span>
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search-area">
            <AdminSearch
              placeholder={committedSearch ? `Search: ${committedSearch}` : 'Search students with this skill...'}
              onView={id => setModal({ type: 'detail', id })}
              onFilter={q => { setCommittedSearch(q); setPage(1); }}
            />
            {committedSearch && (
              <button
                type="button"
                className="adm-clear-search"
                onClick={() => { setCommittedSearch(''); setSearch(''); setPage(1); }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="adm-filters">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Filter by status"
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="all">All (Pending & Approved)</option>
              <option value="accepted">Approved members only</option>
              <option value="pending">Pending applications only</option>
            </select>

            <select
              aria-label="Sort students"
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A to Z</option>
              <option value="name_desc">Name Z to A</option>
              <option value="admission_asc">Admission No.</option>
              <option value="id_asc">Member ID</option>
            </select>
          </div>
        </div>

        <div className="adm-table-summary">
          <span>
            {query.isPending
              ? 'Loading students...'
              : `${count.toLocaleString()} ${count === 1 ? 'student' : 'students'} with this skill`}
          </span>
          {query.isFetching && !query.isPending && <AdminLoading>Updating...</AdminLoading>}
        </div>

        {query.isError ? (
          <div className="adm-state" role="alert">
            <h3>Could not load students</h3>
            <p>{memberError(query.error)}</p>
            <Button type="button" variant="secondary" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : query.isPending ? (
          <div className="adm-skeleton-table" aria-busy="true">
            <AdminLoading>Loading students...</AdminLoading>
            {[1, 2, 3, 4, 5].map(n => <div key={n} />)}
          </div>
        ) : !rows.length ? (
          <div className="adm-state">
            <Tags size={28} />
            <h3>{count && page > pages ? 'No records on this page' : 'No matching students'}</h3>
            <p>
              {committedSearch
                ? 'Try another name or clear your search.'
                : status === 'pending'
                ? 'No pending applicants have chosen this skill.'
                : status === 'accepted'
                ? 'No approved members have chosen this skill.'
                : 'No students have selected this skill yet.'}
            </p>
            {page > 1 && (
              <Button type="button" onClick={() => setPage(1)}>
                Back to first page
              </Button>
            )}
          </div>
        ) : (
          <MemberDataTable
            key={`${status}:${committedSearch}:${sort}`}
            rows={rows}
            applications={status === 'pending'}
            selecting={false}
            onStopSelection={() => {}}
            onView={id => setModal({ type: 'detail', id })}
            onEdit={id => setModal({ type: 'edit', id })}
            onAction={action}
            renderStatus={MemberStatus}
            sort={tableSort}
            onSortChange={handleSortChange}
          />
        )}

        <div className="adm-pagination">
          <span>{count ? `${Math.min((page - 1) * 20 + 1, count)}–${Math.min(page * 20, count)} of ${count}` : '0 records'}</span>
          <AdminPagination
            page={page}
            pages={pages}
            busy={query.isFetching || query.isPending}
            onChange={setPage}
          />
        </div>
      </section>

      {modal?.type === 'edit' && <MemberEditor id={modal.id} onClose={() => setModal(null)} />}
      {modal?.type === 'detail' && (
        <MemberDetails
          id={modal.id}
          onClose={() => setModal(null)}
          onEdit={id => setModal({ type: 'edit', id })}
        />
      )}
      {modal?.type === 'action' && (
        <ConfirmMemberAction
          action={modal.action}
          onClose={() => setModal(null)}
          onApproved={id => setModal({ type: 'detail', id })}
        />
      )}
    </div>
  );
}

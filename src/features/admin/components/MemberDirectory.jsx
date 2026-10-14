import { useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { UserPlus, SlidersHorizontal, Pencil, MoreHorizontal, ListChecks, MessageCircle, ArrowUpRight, Users, GraduationCap } from 'lucide-react';
import { Button, ButtonLink } from '@/components/motion/button/base';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MemberDataTable } from './MemberDataTable';
import { useMembers, useMember, useApproveMember, useRejectMember, useReviewMember, useSetMemberActive, useMemberBatches, useAdminAnalytics } from '@/entities/members/hooks/useMembers';
import { useSkills } from '@/entities/skills/hooks/useSkills';
import { useToast } from '@/context/ToastContext';
import { AdminSearch } from './AdminSearch';
import { AdminLoading, AdminPagination, AdminNumber } from './AdminMotion';
import { AdminDialog } from './AdminDialog';
import { MemberEditor, memberError } from './MemberEditor';
import { titleCase, displayDate } from '@/entities/members/lib/memberDisplay';
import { buildApprovalWhatsappLink } from '@/entities/members/lib/whatsappLink';

export function MemberStatus({ member }) { const status=member.membership_status==='accepted' ? member.is_active===false ? 'inactive' : 'active' : member.membership_status; return <span className={`adm-status adm-status-${status}`}><i />{status}</span>; }
export { displayDate };
export const feeLabel=member=>member.fee_paid_at ? `LKR ${Number(member.fee_amount).toLocaleString('en-LK')} received` : member.application_source==='paper' ? 'Fee not received' : 'Not recorded';
function ReceiptDetails({member}) {
  return <section className="adm-receipt" aria-label="Paper receipt details"><div className="adm-receipt-heading"><div><span className="adm-eyebrow">TEAR-OFF RECEIPT</span><h3>Ready to write on the receipt</h3></div><span className="adm-id">Form {member.form_number || 'not recorded'}</span></div><p>Copy these details onto the student's paper receipt, then tear it off and return it.</p><dl><div><dt>Name</dt><dd>{titleCase(member.full_name)}</dd></div><div><dt>Member ID</dt><dd className="adm-receipt-id">{member.member_id}</dd></div><div><dt>Joined date</dt><dd>{displayDate(member.joined_date)}</dd></div></dl><div className="adm-receipt-audit"><span>Processed by: {member.processed_by_name || 'Not recorded'}</span><span>Approved by: {member.approved_by_name || 'Not recorded'}</span></div></section>;
}
export function MemberDetails({ id, onClose, onEdit }) {
  const query=useMember(id); const skills=useSkills();
  const m=query.data;
  const whatsappLink=buildApprovalWhatsappLink(m);
  return <AdminDialog open onClose={onClose} title="Member profile" wide drawer footer={<><Button type="button" variant="secondary" onClick={onClose}>Close</Button>{m&&<Button type="button" onClick={()=>onEdit(id)}><Pencil size={16} /> Edit details</Button>}</>}>
    {query.isPending ? <div className="adm-state" role="status">Loading profile...</div> : query.isError ? <div className="adm-state" role="alert"><p>{memberError(query.error)}</p><Button type="button" onClick={()=>query.refetch()}>Try again</Button></div> : <>
      <div className="adm-profile-head"><span className="adm-avatar adm-avatar-large">{m.full_name?.charAt(0).toUpperCase()}</span><div><h3>{titleCase(m.full_name)}</h3><p>{m.member_id || 'Member ID assigned after approval'} · <MemberStatus member={m} /></p></div></div>
      {m.membership_status==='accepted'&&m.is_active===true&&<section className="adm-profile-section adm-whatsapp-share" aria-label="Share approval"><h3>Share approval</h3>{whatsappLink?<><p>Open the prepared message, then tap Send in WhatsApp.</p><ButtonLink href={whatsappLink} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="adm-whatsapp-link"><MessageCircle size={18} aria-hidden="true"/>Open WhatsApp<ArrowUpRight size={16} aria-hidden="true"/></ButtonLink><small>Uses the WhatsApp account signed in on this device.</small></>:<p>Add a valid international WhatsApp number and complete the member's name, ID and joined date to share their approval.</p>}</section>}
      {m.membership_status==='accepted'&&m.member_id&&<ReceiptDetails member={m}/>}
      <dl className="adm-details">{[['Form number',m.form_number],['Membership fee',feeLabel(m)],['Fee received on',m.fee_paid_at?displayDate(m.fee_paid_at):null],['Admission number',m.index_number],['Batch',m.batch_year],['Date of birth',displayDate(m.date_of_birth)],['Joined',displayDate(m.joined_date)],['City / town',titleCase(m.city)],['WhatsApp',m.whatsapp_number],['Email',m.email_address],['Guardian',titleCase(m.guardian?.guardian_name)],['Guardian contact',m.guardian?.contact_number],['Guardian occupation',titleCase(m.guardian?.occupation)],['Last updated',displayDate(m.updated_at)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
      <div className="adm-profile-section"><h3>Relevant skills</h3><div className="adm-pills">{(m.interests || []).length ? m.interests.map(id=><span key={id}>{titleCase(skills.data?.find(s=>s.id===id)?.skill_name) || 'Skill unavailable'}</span>):<p>No skills recorded.</p>}{m.other_skills&&<span>Other: {titleCase(m.other_skills)}</span>}</div></div>
      <div className="adm-profile-section"><h3>Team assignments</h3><div className="adm-pills">{m.member_team_assignment?.length ? m.member_team_assignment.map(a=><span key={a.team_id}>{titleCase(a.production_team?.team_name) || 'Team unavailable'}</span>):<p>No team assignments yet.</p>}</div></div>
    </>}
  </AdminDialog>;
}

export function ConfirmMemberAction({ action, onClose, onApproved }) {
  const approve=useApproveMember(); const reject=useRejectMember(); const review=useReviewMember(); const active=useSetMemberActive();
  const [error,setError]=useState(''); const locked=useRef(false); const {addToast}=useToast();
  const busy=[approve,reject,review,active].some(m=>m.isPending);
  const labels={approve:'Approve application',reject:'Reject application',reopen:'Reopen application',deactivate:'Deactivate member',restore:'Restore member'};
  const hints={approve:'A permanent member ID will be assigned. Approval and fee payment are irreversible once approved.',reject:'The application stays on record and can be reopened later.',reopen:'Move this application back to the pending review queue.',deactivate:'Keep their details, member ID and team history. They will be marked inactive and cannot receive new team assignments.',restore:'Mark this member active again. Their existing member ID is preserved.'};
  async function run(){if(locked.current)return;locked.current=true;setError('');try{
    if(action.type==='approve')await approve.mutateAsync({id:action.member.id});
    if(action.type==='reject')await reject.mutateAsync(action.member.id);
    if(action.type==='reopen')await review.mutateAsync({id:action.member.id,status:'pending'});
    if(['deactivate','restore'].includes(action.type))await active.mutateAsync({id:action.member.id,is_active:action.type==='restore'});
    addToast({type:'success',message:action.type==='approve'?'Application approved. The member ID is ready for the paper receipt.':'Member record updated.'});if(action.type==='approve')onApproved(action.member.id);else onClose();
  }catch(err){setError(memberError(err));}finally{locked.current=false;}}
  const feeMissing=action.type==='approve'&&!action.member.fee_paid_at;
  return <AdminDialog open onClose={onClose} busy={busy} title={labels[action.type]} description={titleCase(action.member.full_name)}>
    <p className="adm-confirm-copy">{hints[action.type]}</p>
    {action.type==='approve'&&<div className="adm-paper-note">
      <div className="adm-approve-irreversible-banner">
        <strong>Permanent & Irreversible Approval</strong>
        <span>Once approved, the member ID is assigned and payment cannot be undone or reverted to pending.</span>
      </div>
      <div>Form {action.member.form_number || 'not recorded'} · {feeLabel(action.member)}</div>
      {feeMissing&&<p className="adm-fee-warning">Edit the application and record the received fee before approving. Unpaid applications cannot be approved.</p>}
      {!feeMissing&&<p>After approval, open the member's profile to send their approval through WhatsApp.</p>}
    </div>}
    {error&&<div className="adm-error" role="alert">{error}</div>}
    <div className="adm-dialog-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
      <Button type="button" disabled={busy||feeMissing} onClick={run} className={['reject','deactivate'].includes(action.type)?'adm-danger-button':''}>{busy?'Saving...':labels[action.type]}</Button>
    </div>
  </AdminDialog>;
}

export function parseSortParam(sortParam, applications = false) {
  switch (sortParam) {
    case 'name':
    case 'name_asc': return { key: 'full_name', direction: 'asc' };
    case 'name_desc': return { key: 'full_name', direction: 'desc' };
    case 'id_asc': return { key: 'member_id', direction: 'asc' };
    case 'id_desc': return { key: 'member_id', direction: 'desc' };
    case 'admission_asc': return { key: 'index_number', direction: 'asc' };
    case 'admission_desc': return { key: 'index_number', direction: 'desc' };
    case 'batch_asc': return { key: 'batch_year', direction: 'asc' };
    case 'batch_desc': return { key: 'batch_year', direction: 'desc' };
    case 'status_asc': return { key: 'membership_status', direction: 'asc' };
    case 'status_desc': return { key: 'membership_status', direction: 'desc' };
    case 'form_asc': return { key: 'form_number', direction: 'asc' };
    case 'form_desc': return { key: 'form_number', direction: 'desc' };
    case 'oldest': return { key: applications ? 'created_at' : 'joined_date', direction: 'asc' };
    case 'newest': return applications ? { key: 'created_at', direction: 'desc' } : null;
    default: return null;
  }
}

export function formatSortParam(sortObj, applications = false) {
  if (!sortObj) return 'newest';
  const { key, direction } = sortObj;
  const isAsc = direction === 'asc';
  if (key === 'full_name') return isAsc ? 'name' : 'name_desc';
  if (key === 'member_id') return isAsc ? 'id_asc' : 'id_desc';
  if (key === 'index_number') return isAsc ? 'admission_asc' : 'admission_desc';
  if (key === 'batch_year') return isAsc ? 'batch_asc' : 'batch_desc';
  if (key === 'membership_status') return isAsc ? 'status_asc' : 'status_desc';
  if (key === 'form_number') return isAsc ? 'form_asc' : 'form_desc';
  if (key === 'created_at' || key === 'joined_date') return isAsc ? 'oldest' : 'newest';
  return isAsc ? `${key}_asc` : `${key}_desc`;
}

export function MemberDirectory({ applications=false }) {
  const [params,setParams]=useSearchParams();
  const location=useLocation();
  const [selectionKey,setSelectionKey]=useState(null);
  const selecting=selectionKey===location.key;
  const draft=params.get('q')||'';
  const [localModal,setModal]=useState(null);
  const profile=params.get('profile');
  const modal=localModal || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile || '') ? {type:'detail',id:profile} : null);
  const rawPage=Number(params.get('page'));
  const page=Number.isFinite(rawPage)?Math.min(1_000_000,Math.max(1,Math.floor(rawPage)||1)):1;
  const status=applications ? (['pending','rejected','accepted','all'].includes(params.get('status')) ? params.get('status') : 'pending') : 'accepted';
  const activity=applications?'all':(['active','inactive'].includes(params.get('activity'))?params.get('activity'):'all');
  const rawSort=params.get('sort')||'newest';
  const sort=['newest','oldest','name','name_asc','name_desc','id_asc','id_desc','admission_asc','admission_desc','batch_asc','batch_desc','status_asc','status_desc','form_asc','form_desc','joined_asc','joined_desc'].includes(rawSort)?rawSort:'newest';
  function change(values){setParams(old=>{const next=new URLSearchParams(old);Object.entries(values).forEach(([k,v])=>v?next.set(k,String(v)):next.delete(k));return next;},{replace:true});}
  function closeModal(){setModal(null);if(profile)change({profile:null});}
  const batch = /^\d{4}$/.test(params.get('batch') || '') ? params.get('batch') : null;
  const batches = useMemberBatches();
  const analyticsQuery = useAdminAnalytics();
  const query=useMembers({page,limit:20,search:params.get('q')||'',status,activity,sort,batch});
  const rows=query.data?.data||[]; const count=query.data?.count||0; const pages=Math.max(1,Math.ceil(count/20));
  const action=(type,member)=>setModal({type:'action',action:{type,member}});

  const totalAcceptedMembers = analyticsQuery.data?.counts?.accepted ?? (batches.data || []).reduce((sum, b) => sum + (Number(b.accepted ?? b.total ?? 0) || 0), 0);

  const mainBatches = useMemo(() => {
    const list = [...(batches.data || [])];
    return list
      .sort((a, b) => (Number(b.accepted ?? b.total ?? 0) - Number(a.accepted ?? a.total ?? 0)) || (Number(b.batch_year) - Number(a.batch_year)))
      .slice(0, 3)
      .sort((a, b) => Number(b.batch_year) - Number(a.batch_year));
  }, [batches.data]);

  const tableSort = parseSortParam(sort, applications);
  const handleSortChange = (nextSort) => {
    const nextParam = formatSortParam(nextSort, applications);
    change({ sort: nextParam === 'newest' ? null : nextParam, page: null });
  };

  return <div className="adm-directory">
    <div className="adm-section-heading"><div><h1>{applications?'Member applications':'Members'}</h1><p>{applications?'Submit applications, confirm payments and approve new members.':'Find member details, paper receipts and team assignments.'}</p></div><Button type="button" onClick={()=>setModal({type:'edit'})}><UserPlus size={17}/> Submit an application</Button></div>
    {applications&&<ol className="adm-process"><li><span>1</span> Submit an application</li><li><span>2</span> Confirm fee received</li><li><span>3</span> Approve and issue ID</li><li><span>4</span> Return paper receipt</li></ol>}
    {!applications && (
      <div className="adm-member-analytics" aria-label="Member analytics overview">
        {batches.isPending && !batches.data ? (
          [1, 2, 3, 4].map(n => <div key={n} className="adm-member-card adm-card-skeleton" />)
        ) : (
          <>
            <button
              type="button"
              className="adm-member-card"
              data-active={!batch}
              onClick={() => change({ batch: null, page: null })}
              aria-label="Show all members"
            >
              <div className="adm-member-card-head">
                <span className="adm-member-card-icon"><Users size={16}/></span>
                {!batch ? (
                  <span className="adm-card-active-dot" aria-label="Active filter"/>
                ) : (
                  <span className="adm-member-card-pct">All</span>
                )}
              </div>
              <div className="adm-member-card-body">
                <div className="adm-member-card-value">
                  <AdminNumber value={totalAcceptedMembers}/>
                </div>
                <div className="adm-member-card-label">All members</div>
                <div className="adm-member-card-note">Total active</div>
              </div>
            </button>
            {mainBatches.map(item => {
              const isCardActive = batch === String(item.batch_year);
              const batchCount = Number(item.accepted ?? item.total ?? 0);
              return (
                <button
                  type="button"
                  key={item.batch_year}
                  className="adm-member-card"
                  data-active={isCardActive}
                  onClick={() => change({ batch: isCardActive ? null : item.batch_year, page: null })}
                  aria-label={`Filter by Batch ${item.batch_year}`}
                >
                  <div className="adm-member-card-head">
                    <span className="adm-member-card-icon"><GraduationCap size={16}/></span>
                    {isCardActive ? (
                      <span className="adm-card-active-dot" aria-label="Active filter"/>
                    ) : (
                      <span className="adm-member-card-pct">
                        {totalAcceptedMembers > 0 ? `${Math.round((batchCount / totalAcceptedMembers) * 100)}%` : ''}
                      </span>
                    )}
                  </div>
                  <div className="adm-member-card-body">
                    <div className="adm-member-card-value">
                      <AdminNumber value={batchCount}/>
                    </div>
                    <div className="adm-member-card-label">Batch {item.batch_year}</div>
                    <div className="adm-member-card-note">{batchCount === 1 ? '1 member' : `${batchCount} members`}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    )}
    <nav className="adm-batch-tabs" aria-label="Filter by batch">
      <button type="button" aria-pressed={!batch} onClick={()=>change({batch:null,page:null})}>All batches</button>
      {(batches.data || []).map(item=><button type="button" key={item.batch_year} aria-pressed={String(item.batch_year)===batch} onClick={()=>change({batch:item.batch_year,page:null})}>{item.batch_year}</button>)}
      {batch && !(batches.data || []).some(item=>String(item.batch_year)===batch) && <button type="button" aria-pressed="true" onClick={()=>change({batch:null,page:null})}>{batch} · Clear</button>}
      {batches.isPending && <span role="status">Loading batches...</span>}
      {batches.isError && <button type="button" onClick={()=>batches.refetch()}>Retry batches</button>}
    </nav>
    <section className="adm-panel">
      <div className="adm-toolbar"><div className="adm-search-area"><AdminSearch placeholder={draft ? `Search: ${draft}` : 'Search members...'} onView={id=>setModal({type:'detail',id})} onFilter={q=>change({q,page:null,profile:null})}/>{draft&&<button type="button" className="adm-clear-search" onClick={()=>change({q:null,page:null})}>Clear</button>}</div><div className="adm-filters"><SlidersHorizontal size={16}/><select aria-label={applications?'Application status':'Member activity'} value={applications?status:activity} onChange={e=>change({[applications?'status':'activity']:e.target.value,page:null})}>{(applications?[['pending','Pending'],['accepted','Approved'],['rejected','Rejected'],['all','All statuses']]:[['all','All'],['active','Active'],['inactive','Inactive']]).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><select aria-label="Sort members" value={sort} onChange={e=>change({sort:e.target.value==='newest'?null:e.target.value,page:null})}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A to Z</option><option value="name_desc">Name Z to A</option><option value="batch_desc">Batch (High to Low)</option><option value="batch_asc">Batch (Low to High)</option><option value="id_asc">Member ID</option><option value="admission_asc">Admission No.</option></select><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="adm-directory-options" aria-label="Directory options" disabled={!rows.length}><MoreHorizontal size={19}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="adm-member-menu"><DropdownMenuItem onSelect={()=>setSelectionKey(selecting ? null : location.key)}><ListChecks/>{selecting ? 'Finish selecting' : 'Select records'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
      <div className="adm-table-summary"><span>{query.isPending?'Loading records...':`${count.toLocaleString()} ${applications ? count===1?'application':'applications' : count===1?'member':'members'}`}</span>{query.isFetching&&!query.isPending&&<AdminLoading>Updating...</AdminLoading>}</div>
      {query.isError ? <div className="adm-state" role="alert"><h3>Could not load members</h3><p>{memberError(query.error)}</p><Button type="button" variant="secondary" onClick={()=>query.refetch()}>Try again</Button></div> : query.isPending ? <div className="adm-skeleton-table" aria-busy="true"><AdminLoading>Loading members...</AdminLoading>{[1,2,3,4,5].map(n=><div key={n}/>)}</div> : !rows.length ? <div className="adm-state"><UserPlus size={28}/><h3>{count&&page>pages?'No records on this page':'No matching records'}</h3><p>{draft?'Try another name or clear your search.':applications?'Add a completed paper form to start an application.':'Approved members will appear here.'}</p>{page>1&&<Button type="button" onClick={()=>change({page:null})}>Back to first page</Button>}</div> : <MemberDataTable key={`${location.key}:${selecting}`} rows={rows} applications={applications} selecting={selecting} onStopSelection={()=>setSelectionKey(null)} onView={id=>setModal({type:'detail',id})} onEdit={id=>setModal({type:'edit',id})} onAction={action} renderStatus={MemberStatus} sort={tableSort} onSortChange={handleSortChange}/>}
      <div className="adm-pagination"><span>{count?`${Math.min((page-1)*20+1,count)}–${Math.min(page*20,count)} of ${count}`:'0 records'}</span><AdminPagination page={page} pages={pages} busy={query.isFetching||query.isPending} onChange={page=>change({page})}/></div>
    </section>
    {modal?.type==='edit'&&<MemberEditor id={modal.id} onClose={closeModal}/>}{modal?.type==='detail'&&<MemberDetails id={modal.id} onClose={closeModal} onEdit={id=>setModal({type:'edit',id})}/>}{modal?.type==='action'&&<ConfirmMemberAction action={modal.action} onClose={closeModal} onApproved={id=>setModal({type:'detail',id})}/>}
  </div>;
}

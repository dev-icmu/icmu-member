import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, UserPlus, SlidersHorizontal, Pencil, Eye, Check, X, RotateCcw, UserRoundMinus } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useMembers, useMember, useApproveMember, useRejectMember, useReviewMember, useSetMemberActive } from '@/entities/members/hooks/useMembers';
import { useSkills } from '@/entities/skills/hooks/useSkills';
import { useToast } from '@/context/ToastContext';
import { AdminDialog } from './AdminDialog';
import { MemberEditor, memberError } from './MemberEditor';

export function MemberStatus({ member }) { const status=member.membership_status==='accepted' ? member.is_active===false ? 'inactive' : 'active' : member.membership_status; return <span className={`adm-status adm-status-${status}`}><i />{status}</span>; }
export const displayDate=value=>value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Colombo'}).format(new Date(value)) : 'Not recorded';
const feeLabel=member=>member.fee_paid_at ? `LKR ${Number(member.fee_amount).toLocaleString('en-LK')} received` : member.application_source==='paper' ? 'Fee not received' : 'Not recorded';
function ReceiptDetails({member}) {
  return <section className="adm-receipt" aria-label="Paper receipt details"><div className="adm-receipt-heading"><div><span className="adm-eyebrow">TEAR-OFF RECEIPT</span><h3>Ready to write on the receipt</h3></div><span className="adm-id">Form {member.form_number || 'not recorded'}</span></div><p>Copy these details onto the student's paper receipt, then tear it off and return it.</p><dl><div><dt>Name</dt><dd>{member.full_name}</dd></div><div><dt>Member ID</dt><dd className="adm-receipt-id">{member.member_id}</dd></div><div><dt>Joined date</dt><dd>{displayDate(member.joined_date)}</dd></div></dl><div className="adm-receipt-audit"><span>Processed by: {member.processed_by_name || 'Not recorded'}</span><span>Approved by: {member.approved_by_name || 'Not recorded'}</span></div></section>;
}
export function MemberDetails({ id, onClose, onEdit }) {
  const query=useMember(id); const skills=useSkills();
  const m=query.data;
  return <AdminDialog open onClose={onClose} title="Member profile" wide>
    {query.isPending ? <div className="adm-state" role="status">Loading profile...</div> : query.isError ? <div className="adm-state" role="alert"><p>{memberError(query.error)}</p><Button type="button" onClick={()=>query.refetch()}>Try again</Button></div> : <>
      <div className="adm-profile-head"><span className="adm-avatar adm-avatar-large">{m.full_name?.charAt(0)}</span><div><h3>{m.full_name}</h3><p>{m.member_id || 'Member ID assigned after approval'} · <MemberStatus member={m} /></p></div></div>
      {m.membership_status==='accepted'&&m.member_id&&<ReceiptDetails member={m}/>}
      <dl className="adm-details">{[['Form number',m.form_number],['Membership fee',feeLabel(m)],['Fee received on',m.fee_paid_at?displayDate(m.fee_paid_at):null],['Name with initials',m.name_with_initials],['Admission number',m.index_number],['Class',m.school_class],['Batch',m.batch_year],['Date of birth',displayDate(m.date_of_birth)],['Joined',displayDate(m.joined_date)],['Address',m.address || m.city],['WhatsApp',m.whatsapp_number],['Email',m.email_address],['Guardian',m.guardian?.guardian_name],['Guardian contact',m.guardian?.contact_number],['Guardian occupation',m.guardian?.occupation],['Last updated',displayDate(m.updated_at)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
      <div className="adm-profile-section"><h3>Relevant skills</h3><div className="adm-pills">{(m.interests || []).length ? m.interests.map(id=><span key={id}>{skills.data?.find(s=>s.id===id)?.skill_name || 'Skill unavailable'}</span>):<p>No skills recorded.</p>}{m.other_skills&&<span>Other: {m.other_skills}</span>}</div></div>
      <div className="adm-profile-section"><h3>Team assignments</h3><div className="adm-pills">{m.member_team_assignment?.length ? m.member_team_assignment.map(a=><span key={a.team_id}>{a.production_team?.team_name || 'Team unavailable'}</span>):<p>No team assignments yet.</p>}</div></div>
      <div className="adm-dialog-actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" onClick={()=>onEdit(id)}><Pencil size={16} /> Edit details</Button></div>
    </>}
  </AdminDialog>;
}

function ConfirmMemberAction({ action, onClose, onApproved }) {
  const approve=useApproveMember(); const reject=useRejectMember(); const review=useReviewMember(); const active=useSetMemberActive();
  const [error,setError]=useState(''); const locked=useRef(false); const {addToast}=useToast();
  const busy=[approve,reject,review,active].some(m=>m.isPending);
  const labels={approve:'Approve application',reject:'Reject application',reopen:'Reopen application',deactivate:'Deactivate member',restore:'Restore member'};
  const hints={approve:'A member ID will be assigned. The application will move to Members.',reject:'The application stays on record and can be reopened later.',reopen:'Move this application back to the pending review queue.',deactivate:'Keep their details, member ID and team history. They will be marked inactive and cannot receive new team assignments.',restore:'Mark this member active again. Their existing member ID is preserved.'};
  async function run(){if(locked.current)return;locked.current=true;setError('');try{
    if(action.type==='approve')await approve.mutateAsync(action.member.id);
    if(action.type==='reject')await reject.mutateAsync(action.member.id);
    if(action.type==='reopen')await review.mutateAsync({id:action.member.id,status:'pending'});
    if(['deactivate','restore'].includes(action.type))await active.mutateAsync({id:action.member.id,is_active:action.type==='restore'});
    addToast({type:'success',message:action.type==='approve'?'Application approved. The member ID is ready for the paper receipt.':'Member record updated.'});if(action.type==='approve')onApproved(action.member.id);else onClose();
  }catch(err){setError(memberError(err));}finally{locked.current=false;}}
  const feeMissing=action.type==='approve'&&action.member.application_source==='paper'&&!action.member.fee_paid_at;
  return <AdminDialog open onClose={onClose} busy={busy} title={labels[action.type]} description={action.member.full_name}><p className="adm-confirm-copy">{hints[action.type]}</p>{action.type==='approve'&&<div className="adm-paper-note">Form {action.member.form_number || 'not recorded'} · {feeLabel(action.member)}{feeMissing&&<p>Edit the application and record the received fee before approving.</p>}</div>}{error&&<div className="adm-error" role="alert">{error}</div>}<div className="adm-dialog-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="button" disabled={busy||feeMissing} onClick={run} className={['reject','deactivate'].includes(action.type)?'adm-danger-button':''}>{busy?'Saving...':labels[action.type]}</Button></div></AdminDialog>;
}

export function MemberDirectory({ applications=false }) {
  const [params,setParams]=useSearchParams();
  const location=useLocation();
  const [searchInput,setSearchInput]=useState(null);
  const draft=searchInput?.locationKey===location.key ? searchInput.value : params.get('q')||'';
  const [modal,setModal]=useState(null);
  const rawPage=Number(params.get('page'));
  const page=Number.isFinite(rawPage)?Math.min(1_000_000,Math.max(1,Math.floor(rawPage)||1)):1;
  const status=applications ? (['pending','rejected','accepted','all'].includes(params.get('status')) ? params.get('status') : 'pending') : 'accepted';
  const activity=applications?'all':(['active','inactive'].includes(params.get('activity'))?params.get('activity'):'all');
  const sort=['name','oldest'].includes(params.get('sort'))?params.get('sort'):'newest';
  function change(values){setParams(old=>{const next=new URLSearchParams(old);if(searchInput?.locationKey===location.key){draft?next.set('q',draft):next.delete('q');}Object.entries(values).forEach(([k,v])=>v?next.set(k,String(v)):next.delete(k));return next;},{replace:true});}
  useEffect(()=>{
    if(!searchInput||searchInput.locationKey!==location.key||searchInput.value===(params.get('q')||''))return;
    const timeout=setTimeout(()=>setParams(old=>{const p=new URLSearchParams(old);searchInput.value?p.set('q',searchInput.value):p.delete('q');p.delete('page');return p;},{replace:true}),300);
    return()=>clearTimeout(timeout);
  },[searchInput,location.key,params,setParams]);
  const query=useMembers({page,limit:20,search:params.get('q')||'',status,activity,sort});
  const rows=query.data?.data||[]; const count=query.data?.count||0; const pages=Math.max(1,Math.ceil(count/20));
  const action=(type,member)=>setModal({type:'action',action:{type,member}});
  return <div className="adm-directory">
    <div className="adm-section-heading"><div><h1>{applications?'Member applications':'Members'}</h1><p>{applications?'Enter paper forms, record fees and approve new members.':'Find member details, paper receipts and team assignments.'}</p></div><Button type="button" onClick={()=>setModal({type:'edit'})}><UserPlus size={17}/> Add application</Button></div>
    {applications&&<ol className="adm-process"><li><span>1</span> Enter paper form</li><li><span>2</span> Confirm fee received</li><li><span>3</span> Approve and issue ID</li><li><span>4</span> Return paper receipt</li></ol>}
    <section className="adm-panel">
      <div className="adm-toolbar"><label className="adm-search"><Search size={17}/><input type="search" placeholder="Search name, form no., ID or admission no." aria-label="Search members" value={draft} maxLength={150} onChange={e=>setSearchInput({locationKey:location.key,value:e.target.value})}/></label><div className="adm-filters"><SlidersHorizontal size={16}/><select aria-label={applications?'Application status':'Member activity'} value={applications?status:activity} onChange={e=>change({[applications?'status':'activity']:e.target.value,page:null})}>{(applications?[['pending','Pending review'],['accepted','Approved'],['rejected','Rejected'],['all','All applications']]:[['all','All members'],['active','Active'],['inactive','Inactive']]).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><select aria-label="Sort members" value={sort} onChange={e=>change({sort:e.target.value,page:null})}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A to Z</option></select></div></div>
      <div className="adm-table-summary"><span>{query.isPending?'Loading records...':`${count.toLocaleString()} ${applications?'applications':'members'}`}</span>{query.isFetching&&!query.isPending&&<span role="status">Updating...</span>}</div>
      {query.isError ? <div className="adm-state" role="alert"><h3>Could not load members</h3><p>{memberError(query.error)}</p><Button type="button" variant="secondary" onClick={()=>query.refetch()}>Try again</Button></div> : query.isPending ? <div className="adm-skeleton-table" role="status" aria-label="Loading members">{[1,2,3,4,5].map(n=><div key={n}/>)}</div> : !rows.length ? <div className="adm-state"><UserPlus size={28}/><h3>{count&&page>pages?'No records on this page':'No matching records'}</h3><p>{draft?'Try another name or clear your search.':applications?'Add a completed paper form to start an application.':'Approved members will appear here.'}</p>{page>1&&<Button type="button" onClick={()=>change({page:null})}>Back to first page</Button>}</div> : <div className="adm-table-wrap"><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Member ID</TableHead><TableHead>{applications ? 'Form no. / fee' : 'Admission no.'}</TableHead><TableHead>Class / Batch</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{rows.map(m=><TableRow key={m.id}>
        <TableCell><button type="button" className="adm-person" onClick={()=>setModal({type:'detail',id:m.id})}><span className="adm-avatar">{m.full_name?.charAt(0)}</span><span><strong>{m.full_name}</strong><small>{m.email_address || `Joined ${displayDate(m.joined_date)}`}</small></span></button></TableCell><TableCell><span className="adm-id">{m.member_id || 'Not issued'}</span></TableCell><TableCell>{applications ? <span className="adm-form-cell"><strong>{m.form_number || 'Not recorded'}</strong><small>{feeLabel(m)}</small></span> : m.index_number || 'Not recorded'}</TableCell><TableCell>{m.school_class || m.batch_year || 'Not recorded'}</TableCell><TableCell><MemberStatus member={m}/></TableCell>
        <TableCell><div className="adm-row-actions"><Button type="button" variant="ghost" size="icon" aria-label={`View ${m.full_name}`} onClick={()=>setModal({type:'detail',id:m.id})}><Eye size={16}/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Edit ${m.full_name}`} onClick={()=>setModal({type:'edit',id:m.id})}><Pencil size={15}/></Button>{m.membership_status==='pending'?<><Button type="button" variant="secondary" size="sm" onClick={()=>action('approve',m)}><Check size={15}/>Approve</Button><Button type="button" variant="ghost" size="icon" aria-label={`Reject ${m.full_name}`} onClick={()=>action('reject',m)}><X size={16}/></Button></>:m.membership_status==='rejected'?<Button type="button" variant="secondary" size="sm" onClick={()=>action('reopen',m)}><RotateCcw size={15}/>Reopen</Button>:<Button type="button" variant="ghost" size="icon" aria-label={`${m.is_active?'Deactivate':'Restore'} ${m.full_name}`} onClick={()=>action(m.is_active?'deactivate':'restore',m)}>{m.is_active?<UserRoundMinus size={16}/>:<RotateCcw size={16}/>}</Button>}</div></TableCell>
      </TableRow>)}</TableBody></Table></div>}
      <div className="adm-pagination"><span>{count?`${Math.min((page-1)*20+1,count)}–${Math.min(page*20,count)} of ${count}`:'0 records'}</span><div><Button type="button" variant="secondary" size="icon" disabled={page<=1||query.isFetching} aria-label="Previous page" onClick={()=>change({page:page-1})}><ArrowLeft size={16}/></Button><span>Page {page} of {pages}</span><Button type="button" variant="secondary" size="icon" disabled={page>=pages||query.isFetching} aria-label="Next page" onClick={()=>change({page:page+1})}><ArrowRight size={16}/></Button></div></div>
    </section>
    {modal?.type==='edit'&&<MemberEditor id={modal.id} onClose={()=>setModal(null)}/>}{modal?.type==='detail'&&<MemberDetails id={modal.id} onClose={()=>setModal(null)} onEdit={id=>setModal({type:'edit',id})}/>}{modal?.type==='action'&&<ConfirmMemberAction action={modal.action} onClose={()=>setModal(null)} onApproved={id=>setModal({type:'detail',id})}/>}
  </div>;
}

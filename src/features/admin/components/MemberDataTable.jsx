import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Eye, MoreHorizontal, Pencil, Check, X, RotateCcw, UserRoundMinus, Copy } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from '@/components/motion/collapsible';
import { AdminLoading } from './AdminMotion';
import { Checkbox } from '@/components/motion/checkbox';
import { Button } from '@/components/motion/button/base';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { titleCase, nameWithInitials, displayDate } from '@/entities/members/lib/memberDisplay';
import { memberCsv } from '@/entities/members/lib/memberExport';
import { useToast } from '@/context/ToastContext';

const DesktopTable = lazy(() => import('@/components/motion/table').then(module => ({ default:module.Table })));

export function MemberDataTable({ rows, applications, selecting, onStopSelection, onView, onEdit, onAction, renderStatus: Status, sort, onSortChange }) {
  const [selection, setSelection] = useState([]);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width:767px)').matches);
  const [drawerMember, setDrawerMember] = useState(null);
  const { addToast } = useToast();
  useEffect(() => {
    const media = window.matchMedia('(max-width:767px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!drawerMember) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [Boolean(drawerMember)]);
  const selected = rows.filter(m => selection.includes(m.id));
  const selectedIds = selected.map(m => m.id);
  const toggle = id => setSelection(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]);
  function exportRows() {
    const url = URL.createObjectURL(new Blob([memberCsv(selected)], { type:'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'icmu-selected-members.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast({ type:'success', message:`Exported ${selected.length} selected records.` });
  }
  async function copyId(member) {
    try { await navigator.clipboard.writeText(member.member_id || member.form_number); addToast({type:'success',message:'Copied to clipboard.'}); }
    catch { addToast({type:'error',message:'Copy was unavailable. Open the profile to select and copy the ID.'}); }
  }
  const fee = m => m.fee_paid_at ? `LKR ${Number(m.fee_amount).toLocaleString('en-LK')} received` : m.application_source === 'paper' ? 'Awaiting payment' : 'Not recorded';
  const form = m => m.form_number ? `Form ${m.form_number}` : m.application_source === 'online' ? 'Online application' : 'No paper form recorded';
  const submitted = m => m.created_at ? new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Colombo' }).format(new Date(m.created_at)) : 'Not recorded';
  const joined = m => (m.joined_date || m.created_at) ? `Joined ${displayDate(m.joined_date || m.created_at)}` : 'Joined date not recorded';
  function stopSelecting() { onStopSelection(); setSelection([]); }
  const actions = m => <div className="adm-row-actions">
    <div className="adm-quick-actions">
      <Button type="button" variant="ghost" size="icon" className="adm-quick-action adm-quick-view" aria-label={`View ${titleCase(m.full_name)}`} onClick={() => onView(m.id)}><Eye size={17}/></Button>
      <Button type="button" variant="ghost" size="icon" className="adm-quick-action adm-quick-edit" aria-label={`Edit ${titleCase(m.full_name)}`} onClick={() => onEdit(m.id)}><Pencil size={16}/></Button>
    </div>
    <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="adm-more-btn" aria-label={`More options for ${titleCase(m.full_name)}`}><MoreHorizontal size={19}/></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="adm-member-menu">
        <DropdownMenuItem onSelect={() => onView(m.id)}><Eye/>View profile and receipt</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(m.id)}><Pencil/>Edit details</DropdownMenuItem>
        {(m.member_id || m.form_number) && <DropdownMenuItem onSelect={() => copyId(m)}><Copy/>Copy {m.member_id ? 'member ID' : 'form number'}</DropdownMenuItem>}
        <DropdownMenuSeparator/>
        {m.membership_status === 'pending' ? <><DropdownMenuItem onSelect={() => onAction('approve',m)}><Check/>Review and approve</DropdownMenuItem><DropdownMenuItem onSelect={() => onAction('reject',m)}><X/>Reject application</DropdownMenuItem></>
          : m.membership_status === 'rejected' ? <DropdownMenuItem onSelect={() => onAction('reopen',m)}><RotateCcw/>Reopen application</DropdownMenuItem>
            : <DropdownMenuItem onSelect={() => onAction(m.is_active ? 'deactivate' : 'restore',m)}><UserRoundMinus/>{m.is_active ? 'Deactivate member' : 'Restore member'}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
  const person = m => <button type="button" className="adm-person" onClick={() => onView(m.id)}><span className="adm-avatar">{m.full_name?.charAt(0).toUpperCase()}</span><span><strong title={titleCase(m.full_name)}>{nameWithInitials(m.full_name)}</strong><small>{applications ? `Admission ${m.index_number || 'not recorded'} · Batch ${m.batch_year || 'not recorded'}` : joined(m)}</small></span></button>;
  const columns = [
    { key:'full_name',header:applications ? 'Applicant' : 'Member',width:`calc(100% - ${(applications ? 575 : 600) + (selecting ? 48 : 0)}px)`,minWidth:280,sortable:true,sortValue:m=>(m.full_name||'').toLowerCase(),cell:person },
    ...(applications ? [
      { key:'form_number',header:'Application / fee',width:'185px',sortable:true,sortValue:m=>Number(m.form_number)||m.form_number||'',cell:m => <span className="adm-form-cell"><strong>{form(m)}</strong><small>{fee(m)}</small></span> },
      { key:'created_at',header:'Submitted',width:'130px',sortable:true,sortValue:m=>new Date(m.created_at||0).getTime(),cell:submitted },
    ] : [
      { key:'member_id',header:'Member ID',width:'120px',sortable:true,sortValue:m=>m.member_id||'',cell:m => m.member_id ? <span className="adm-table-id">{m.member_id}</span> : <span className="adm-cell-empty">Not issued</span> },
      { key:'index_number',header:'Admission no.',width:'130px',sortable:true,sortValue:m=>{const n=Number(m.index_number);return Number.isFinite(n)?n:(m.index_number||'');},cell:m => m.index_number ? <span className="adm-table-index">{m.index_number}</span> : <span className="adm-cell-empty">Not recorded</span> },
      { key:'batch_year',header:'Batch',width:'90px',sortable:true,sortValue:m=>Number(m.batch_year)||0 },
    ]),
    { key:'membership_status',header:'Status',width:'110px',sortable:true,sortValue:m=>(m.is_active===false?'inactive':m.membership_status||''),cell:m => <Status member={m}/> },
    { key:'actions',header:'Actions',width:'150px',cell:actions },
  ];
  return <div className="adm-member-data" data-selecting={selecting}>
    {selecting && <div className="adm-selection-bar" aria-label="Record selection">
      <Checkbox aria-label="Select this page" checked={rows.length > 0 && selected.length === rows.length} indeterminate={selected.length > 0 && selected.length < rows.length} onCheckedChange={checked => setSelection(checked ? rows.map(m=>m.id) : [])} label={selected.length ? `${selected.length} selected on this page` : 'Select this page'}/>
      <div>{selected.length > 0 && <Button type="button" variant="secondary" onClick={exportRows}><Download size={16}/>Export ({selected.length})</Button>}<Button type="button" variant="ghost" onClick={stopSelecting}>Done</Button></div>
    </div>}
    {mobile ? <div className="adm-mobile-members">{rows.map(m => <div className="adm-mobile-member" key={m.id} data-selected={selection.includes(m.id)}>
      {selecting && <Checkbox checked={selection.includes(m.id)} onCheckedChange={() => toggle(m.id)} aria-label={`Select ${titleCase(m.full_name)}`}/>}
      <Collapsible className="adm-member-collapse"><CollapsibleTrigger className="adm-member-collapse-trigger"><span><strong title={titleCase(m.full_name)}>{nameWithInitials(m.full_name)}</strong><small>{m.batch_year || 'No batch'} · {applications ? form(m) : m.member_id || 'No member ID'}</small></span><CollapsibleIndicator/></CollapsibleTrigger>
        <CollapsibleContent>
        <div className="adm-mobile-member-body"><Status member={m}/><dl>{[['Admission no.',m.index_number],['City',titleCase(m.city)],...(applications ? [['Membership fee',fee(m)],['Submitted',submitted(m)]] : [['Joined',joined(m)]])].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
          <div className="adm-mobile-row-actions">
            <Button type="button" variant="secondary" className="adm-mobile-details-btn" onClick={() => onView(m.id)}>
              <Eye size={16}/> Details
            </Button>
            <Button type="button" variant="ghost" size="icon" className="adm-mobile-icon-btn" aria-label={`Edit ${titleCase(m.full_name)}`} onClick={() => onEdit(m.id)}>
              <Pencil size={16}/>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="adm-mobile-icon-btn" aria-label={`More options for ${titleCase(m.full_name)}`} onClick={() => setDrawerMember(m)}>
              <MoreHorizontal size={19}/>
            </Button>
          </div>
        </div>
        </CollapsibleContent>
      </Collapsible>
    </div>)}</div> : <Suspense fallback={<div className="adm-state"><AdminLoading>Loading table...</AdminLoading></div>}><DesktopTable className="adm-beui-table" data={rows} columns={columns} getRowId={m=>m.id} selectable={selecting} selectedRowIds={selectedIds} onSelectionChange={setSelection} sort={sort} onSortChange={onSortChange} resizable minColumnWidth={80} rowHeight={80} height={Math.min(600,(rows.length+1)*80)} /></Suspense>}
    <AnimatePresence>
      {drawerMember && (
        <div className="adm-action-drawer-root" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
          <motion.div
            className="adm-action-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => setDrawerMember(null)}
          />
          <motion.div
            className="adm-action-drawer-sheet"
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(0%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="adm-drawer-handle-bar" aria-hidden="true"><span className="adm-drawer-handle" /></div>
            <div className="adm-action-drawer-header">
              <div>
                <h3 id="adm-drawer-title">{titleCase(drawerMember.full_name)}</h3>
                <p>{drawerMember.member_id || form(drawerMember)} · <Status member={drawerMember} /></p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="adm-drawer-close" aria-label="Close options" onClick={() => setDrawerMember(null)}>
                <X size={18} />
              </Button>
            </div>
            <div className="adm-action-drawer-menu">
              <button type="button" className="adm-drawer-item" onClick={() => { onView(drawerMember.id); setDrawerMember(null); }}>
                <Eye size={18} />
                <span>View profile and receipt</span>
              </button>
              <button type="button" className="adm-drawer-item" onClick={() => { onEdit(drawerMember.id); setDrawerMember(null); }}>
                <Pencil size={18} />
                <span>Edit details</span>
              </button>
              {(drawerMember.member_id || drawerMember.form_number) && (
                <button type="button" className="adm-drawer-item" onClick={() => { copyId(drawerMember); setDrawerMember(null); }}>
                  <Copy size={18} />
                  <span>Copy {drawerMember.member_id ? 'member ID' : 'form number'}</span>
                </button>
              )}
              <hr className="adm-drawer-divider" />
              {drawerMember.membership_status === 'pending' ? (
                <>
                  <button type="button" className="adm-drawer-item adm-drawer-item-success" onClick={() => { onAction('approve', drawerMember); setDrawerMember(null); }}>
                    <Check size={18} />
                    <span>Review and approve</span>
                  </button>
                  <button type="button" className="adm-drawer-item adm-drawer-item-danger" onClick={() => { onAction('reject', drawerMember); setDrawerMember(null); }}>
                    <X size={18} />
                    <span>Reject application</span>
                  </button>
                </>
              ) : drawerMember.membership_status === 'rejected' ? (
                <button type="button" className="adm-drawer-item" onClick={() => { onAction('reopen', drawerMember); setDrawerMember(null); }}>
                  <RotateCcw size={18} />
                  <span>Reopen application</span>
                </button>
              ) : (
                <button type="button" className={`adm-drawer-item ${drawerMember.is_active ? 'adm-drawer-item-danger' : ''}`} onClick={() => { onAction(drawerMember.is_active ? 'deactivate' : 'restore', drawerMember); setDrawerMember(null); }}>
                  <UserRoundMinus size={18} />
                  <span>{drawerMember.is_active ? 'Deactivate member' : 'Restore member'}</span>
                </button>
              )}
            </div>
            <div className="adm-action-drawer-footer">
              <Button type="button" variant="secondary" className="adm-drawer-cancel-btn" onClick={() => setDrawerMember(null)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CirclePause, CirclePlay, LockKeyhole, Pencil, Plus, Search, Tags, Users } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';
import { Checkbox } from '@/components/motion/checkbox';
import { useToast } from '@/context/ToastContext';
import { useMembers } from '@/entities/members/hooks/useMembers';
import { useAssignMemberToTeam, useRemoveMemberFromTeam, useTeamRoster } from '@/entities/teams/hooks/useTeams';
import { AdminDialog } from './AdminDialog';
import './catalog.css';

function explainError(error, duplicateMessage) {
  if (error?.code === '23505') return duplicateMessage || 'This record already exists.';
  if (error?.code === '42501') return 'You do not have permission to make this change. Sign in again or contact an administrator.';
  if (error?.code === 'PGRST116') return 'This record could not be updated. Refresh the list and try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

function QueryState({ query, subject, empty, children }) {
  if (query.isPending) return <div className="adm-catalog-state" role="status"><span className="adm-catalog-spinner" />Loading {subject}...</div>;
  if (query.isError) return <div className="adm-catalog-state" role="alert"><strong>Could not load {subject}</strong><p>{explainError(query.error)}</p><Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>Try again</Button></div>;
  if (empty) return <div className="adm-catalog-state"><p>{empty}</p></div>;
  return children;
}

function Pagination({ page, count, limit, onChange, busy }) {
  const pages = Math.max(1, Math.ceil(count / limit));
  return <div className="adm-catalog-pagination">
    <span>{count.toLocaleString()} {count === 1 ? 'member' : 'members'} · Page {page} of {pages}</span>
    <div><Button type="button" variant="secondary" disabled={page <= 1 || busy} onClick={() => onChange(page - 1)} aria-label="Previous page"><ArrowLeft size={16} /></Button><Button type="button" variant="secondary" disabled={page >= pages || busy} onClick={() => onChange(page + 1)} aria-label="Next page"><ArrowRight size={16} /></Button></div>
  </div>;
}

function CatalogEditor({ record, kind, skillsQuery, mutation, onClose }) {
  const isTeam = kind === 'team';
  const nameKey = isTeam ? 'team_name' : 'skill_name';
  const [name, setName] = useState(record?.[nameKey] || '');
  const [description, setDescription] = useState(record?.skill_desc || '');
  const [skillIds, setSkillIds] = useState(record?.required_skills || []);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const { addToast } = useToast();
  const pending = mutation.isPending;
  const selectableSkills = (skillsQuery?.data || []).filter(skill => skill.is_active !== false || skillIds.includes(skill.id));

  async function save(event) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmed = name.trim();
    if (!trimmed) { setError(`Enter a ${kind} name.`); return; }
    submitting.current = true;
    setError('');
    try {
      const values = { [nameKey]: trimmed, ...(isTeam ? { required_skills: skillIds } : { skill_desc: description.trim() }) };
      await mutation.mutateAsync(record ? { id: record.id, ...values } : values);
      addToast({ message: `${trimmed} ${record ? 'updated' : 'created'}.`, type: 'success' });
      onClose();
    } catch (caught) {
      setError(explainError(caught, `A ${kind} with this name already exists.`));
    } finally { submitting.current = false; }
  }

  return <AdminDialog open onClose={onClose} title={`${record ? 'Edit' : 'Add'} ${kind}`} description={isTeam ? 'Name the team and choose the skills useful for its work.' : 'Keep skills clear so members can find the right fit.'} busy={pending}>
    <form onSubmit={save} className="adm-catalog-form">
      <Input label={`${isTeam ? 'Team' : 'Skill'} name`} value={name} onChange={setName} required maxLength={isTeam ? 100 : 50} autoFocus disabled={pending} autoComplete="off" />
      {!isTeam && <div><Input label="Short description (optional)" value={description} onChange={setDescription} maxLength={50} disabled={pending} /><p className="adm-catalog-hint">{description.length}/50 characters</p></div>}
      {isTeam && <fieldset className="adm-catalog-fieldset" disabled={pending}><legend>Required skills <span>Optional</span></legend>
        <QueryState query={skillsQuery} subject="skills" empty={selectableSkills.length === 0 ? 'No active skills yet. You can add skills later.' : null}>
          <div className="adm-catalog-skill-picker">{selectableSkills.map(skill => <Checkbox key={skill.id} checked={skillIds.includes(skill.id)} onCheckedChange={checked => setSkillIds(current => checked ? [...current, skill.id] : current.filter(id => id !== skill.id))} disabled={pending} label={`${skill.skill_name}${skill.is_active === false ? ' (inactive)' : ''}`} />)}</div>
        </QueryState>
      </fieldset>}
      {error && <p className="adm-catalog-error" role="alert">{error}</p>}
      <div className="adm-dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending || !name.trim() || (isTeam && (skillsQuery.isPending || skillsQuery.isError))}>{pending ? 'Saving...' : record ? 'Save changes' : `Add ${kind}`}</Button></div>
    </form>
  </AdminDialog>;
}

function ActivityDialog({ record, kind, mutation, onClose }) {
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const { addToast } = useToast();
  const activating = record.is_active === false;
  const action = activating ? 'Reactivate' : 'Deactivate';
  const name = record.team_name || record.skill_name;

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      await mutation.mutateAsync({ id: record.id, is_active: activating });
      addToast({ message: `${name} ${activating ? 'reactivated' : 'deactivated'}.`, type: 'success' });
      onClose();
    } catch (caught) { setError(explainError(caught)); }
    finally { submitting.current = false; }
  }

  return <AdminDialog open onClose={onClose} title={`${action} ${name}?`} description={activating ? `This ${kind} will be available for new assignments again.` : `This ${kind} will no longer be available for new assignments. Existing records and assignments will stay in place.`} busy={mutation.isPending}>
    {error && <p className="adm-catalog-error" role="alert">{error}</p>}
    <div className="adm-dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="button" onClick={confirm} disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : action}</Button></div>
  </AdminDialog>;
}

function AddTeamMember({ team, onBack, onPendingChange }) {
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState([]);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => { setCommittedSearch(search); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const searchPending = search !== committedSearch;
  const query = useMembers({ page, limit: 8, search: committedSearch, status: 'accepted', activity: 'active' });
  const assign = useAssignMemberToTeam();
  const { addToast } = useToast();
  const members = query.data?.data || [];
  const count = query.data?.count || 0;

  async function add(member) {
    if (submitting.current) return;
    submitting.current = true;
    onPendingChange(true);
    setError('');
    try {
      await assign.mutateAsync({ team_id: team.id, member_id: member.id });
      setAdded(current => [...current, member.id]);
      addToast({ message: `${member.full_name} added to ${team.team_name}.`, type: 'success' });
    } catch (caught) { setError(explainError(caught, 'This member already belongs to this team.')); }
    finally { submitting.current = false; onPendingChange(false); }
  }

  return <div className="adm-catalog-roster">
    <Button type="button" variant="ghost" onClick={onBack} disabled={assign.isPending}><ArrowLeft size={16} /> Back to roster</Button>
    <Input label="Find an active member" placeholder="Search name or member ID" leftIcon={<Search />} value={search} onChange={setSearch} />
    <p className="adm-catalog-hint">Only accepted, active members can join a team.</p>
    {error && <p className="adm-catalog-error" role="alert">{error}</p>}
    <QueryState query={query} subject="members" empty={members.length === 0 ? search ? 'No active members match this search.' : 'No accepted, active members are available.' : null}>
      <div className="adm-catalog-member-list">{members.map(member => {
        const assigned = added.includes(member.id) || member.member_team_assignment?.some(assignment => assignment.team_id === team.id);
        return <div className="adm-catalog-member" key={member.id}><span className="adm-catalog-avatar" aria-hidden="true">{member.full_name?.trim().charAt(0) || 'M'}</span><div><strong>{member.full_name}</strong><span>{member.member_id || `Index ${member.index_number || 'not recorded'}`}</span></div><Button type="button" variant={assigned ? 'ghost' : 'secondary'} disabled={assigned || assign.isPending || searchPending} onClick={() => add(member)} aria-label={assigned ? `${member.full_name} is assigned` : `Add ${member.full_name}`}>
          {assigned ? <><Check size={16} /> Added</> : assign.isPending && assign.variables?.member_id === member.id ? 'Adding...' : <><Plus size={16} /> Add</>}
        </Button></div>;
      })}</div>
    </QueryState>
    {!query.isError && <Pagination page={page} count={count} limit={8} onChange={setPage} busy={query.isFetching || assign.isPending || searchPending} />}
  </div>;
}

function TeamRoster({ team, onClose }) {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const query = useTeamRoster(team.id, { page, limit: 8 });
  const remove = useRemoveMemberFromTeam();
  const { addToast } = useToast();
  const rows = query.data?.data || [];
  const count = query.data?.count ?? team.member_count;
  const pending = remove.isPending || assignmentPending;

  async function confirmRemove() {
    if (submitting.current || !removing) return;
    submitting.current = true;
    setError('');
    try {
      await remove.mutateAsync({ team_id: team.id, member_id: removing.member_id });
      addToast({ message: 'Member removed from this team.', type: 'success' });
      if (rows.length === 1 && page > 1) setPage(current => current - 1);
      setRemoving(null);
    } catch (caught) { setError(explainError(caught)); }
    finally { submitting.current = false; }
  }

  return <AdminDialog open onClose={onClose} title={team.team_name} description={`${count} ${count === 1 ? 'member' : 'members'} assigned${team.is_active === false ? ' · Inactive team' : ''}`} wide busy={pending}>
    {adding ? <AddTeamMember team={team} onBack={() => setAdding(false)} onPendingChange={setAssignmentPending} /> : removing ? <div className="adm-catalog-roster">
      <h3>Remove {removing.member?.full_name || 'this member'}?</h3><p className="adm-catalog-hint">Their membership record will stay in place. Only their assignment to this team will be removed.</p>
      {error && <p className="adm-catalog-error" role="alert">{error}</p>}
      <div className="adm-dialog-actions"><Button type="button" variant="secondary" disabled={pending} onClick={() => { setRemoving(null); setError(''); }}>Keep member</Button><Button type="button" disabled={pending} onClick={confirmRemove}>{pending ? 'Removing...' : 'Remove from team'}</Button></div>
    </div> : <div className="adm-catalog-roster">
      <div className="adm-catalog-roster-heading"><h3>Team members</h3><Button type="button" onClick={() => setAdding(true)} disabled={team.is_active === false}><Plus size={16} /> Add member</Button></div>
      {team.is_active === false && <p className="adm-catalog-hint">Reactivate this team to add members. Existing assignments remain visible.</p>}
      <QueryState query={query} subject="the roster" empty={rows.length === 0 ? 'No members assigned yet. Add a member to build this team.' : null}>
        <div className="adm-catalog-member-list">{rows.map(row => <div className="adm-catalog-member" key={row.member_id}><span className="adm-catalog-avatar" aria-hidden="true">{row.member?.full_name?.trim().charAt(0) || 'M'}</span><div><strong>{row.member?.full_name || 'Member unavailable'}</strong><span>{row.member?.member_id || `Index ${row.member?.index_number || 'not recorded'}`}{row.member?.is_active === false ? ' · Inactive' : ''}{row.member?.membership_status !== 'accepted' ? ` · ${row.member?.membership_status || 'Unknown status'}` : ''}</span></div><Button type="button" variant="ghost" onClick={() => { setRemoving(row); setError(''); }} aria-label={`Remove ${row.member?.full_name || 'member'} from this team`}>Remove</Button></div>)}</div>
      </QueryState>
      {!query.isError && <Pagination page={page} count={count} limit={8} onChange={setPage} busy={query.isFetching} />}
    </div>}
  </AdminDialog>;
}

export function CatalogPanel({ kind, query, createMutation, updateMutation, skillsQuery }) {
  const isTeam = kind === 'team';
  const title = isTeam ? 'Teams' : 'Skills';
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState('all');
  const [editor, setEditor] = useState(null);
  const [activityRecord, setActivityRecord] = useState(null);
  const [rosterId, setRosterId] = useState(null);
  const rows = query.data || [];
  const activeCount = rows.filter(row => row.is_active !== false).length;
  const filtered = rows.filter(row => {
    const matchingActivity = activity === 'all' || (activity === 'active' ? row.is_active !== false : row.is_active === false);
    return matchingActivity && `${row.team_name || row.skill_name} ${row.skill_desc || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const roster = rows.find(row => row.id === rosterId);
  const mutationPending = createMutation.isPending || updateMutation.isPending;

  return <section className="adm-catalog" aria-label={`${title} management`}>
    <div className="adm-catalog-top"><div><span className="adm-catalog-eyebrow">UNIT ORGANISATION</span><h2>{title}</h2><p>{isTeam ? 'Build production teams and keep their member lists up to date.' : 'Manage the skills members can learn and bring to the unit.'}</p></div><Button type="button" onClick={() => setEditor({ mode: 'create' })} disabled={query.isPending || query.isError || mutationPending}><Plus size={17} /> Add {kind}</Button></div>
    <div className="adm-catalog-toolbar"><Input aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}`} leftIcon={<Search />} value={search} onChange={setSearch} className="adm-catalog-search" /><div className="adm-catalog-filters" role="group" aria-label="Filter by status">{[['all', 'All', rows.length], ['active', 'Active', activeCount], ['inactive', 'Inactive', rows.length - activeCount]].map(([value, label, count]) => <button type="button" aria-pressed={activity === value} key={value} onClick={() => setActivity(value)}>{label}<span>{query.isPending || query.isError ? '–' : count}</span></button>)}</div></div>
    <QueryState query={query} subject={title.toLowerCase()} empty={filtered.length === 0 ? rows.length === 0 ? `No ${title.toLowerCase()} have been created yet. Use Add ${kind} to get started.` : `No ${title.toLowerCase()} match these filters.` : null}>
      <div className={`adm-catalog-grid ${isTeam ? '' : 'adm-catalog-skills'}`}>{filtered.map(row => <article className="adm-catalog-card" key={row.id}>
        <div className="adm-catalog-card-head"><span className="adm-catalog-symbol">{isTeam ? <Users size={20} /> : <Tags size={20} />}</span><span className={`adm-catalog-status ${row.is_active === false ? 'is-inactive' : ''}`}><i />{row.is_active === false ? 'Inactive' : 'Active'}</span></div>
        <h3>{row.team_name || row.skill_name}</h3>
        {isTeam ? <><p className="adm-catalog-count"><strong>{row.member_count}</strong> {row.member_count === 1 ? 'member' : 'members'} assigned</p><div className="adm-catalog-tags">{(row.required_skills || []).length ? row.required_skills.map(id => <span key={id}>{skillsQuery.data?.find(skill => skill.id === id)?.skill_name || 'Skill unavailable'}</span>) : <span className="is-empty">No required skills</span>}</div></> : <p className="adm-catalog-description">{row.skill_desc || 'No description added.'}</p>}
        <div className="adm-catalog-card-actions">{isTeam && <Button type="button" variant="secondary" onClick={() => setRosterId(row.id)}>View members <ArrowRight size={15} /></Button>}<div className="adm-catalog-utilities">
          {row.is_protected ? <span className="adm-catalog-protected" title="Standard catalog entries are protected from editing and deactivation."><LockKeyhole size={14} /> Protected</span> : <><Button type="button" variant="ghost" onClick={() => setEditor({ mode: 'edit', record: row })} disabled={mutationPending} aria-label={`Edit ${row.team_name || row.skill_name}`}><Pencil size={15} /><span>Edit</span></Button><Button type="button" variant="ghost" disabled={mutationPending} onClick={() => setActivityRecord(row)} aria-label={`${row.is_active === false ? 'Reactivate' : 'Deactivate'} ${row.team_name || row.skill_name}`}>{row.is_active === false ? <CirclePlay size={17} /> : <CirclePause size={17} />}<span>{row.is_active === false ? 'Reactivate' : 'Deactivate'}</span></Button></>}
        </div></div>
      </article>)}</div>
    </QueryState>
    {isTeam && skillsQuery.isError && <p className="adm-catalog-error" role="alert">Skill names could not be loaded. <button type="button" onClick={() => skillsQuery.refetch()}>Retry skills</button></p>}
    <p className="adm-catalog-footnote"><LockKeyhole size={14} /> Protected entries are part of the unit&apos;s standard setup. Deactivation keeps existing records.</p>
    {editor && <CatalogEditor key={editor.record?.id || 'new'} record={editor.record} kind={kind} skillsQuery={skillsQuery} mutation={editor.mode === 'edit' ? updateMutation : createMutation} onClose={() => setEditor(null)} />}
    {activityRecord && <ActivityDialog record={activityRecord} kind={kind} mutation={updateMutation} onClose={() => setActivityRecord(null)} />}
    {roster && <TeamRoster key={roster.id} team={roster} onClose={() => setRosterId(null)} />}
  </section>;
}
